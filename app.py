"""DataPulse Streamlit app.  Run:  streamlit run app.py"""
import json
from pathlib import Path

import pandas as pd
import streamlit as st

from datapulse.core import guess_target, load_dataset, report_to_markdown, scan

st.set_page_config(page_title="DataPulse", page_icon="🩺", layout="wide")
DEMO = Path(__file__).parent / "demo" / "demo_loans.csv"
COLORS = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "⚪"}


@st.cache_data(show_spinner=False)
def columns_of(data: bytes, name: str):
    raw, *_ = load_dataset(data, name)
    return list(raw.columns)


@st.cache_data(show_spinner="Scanning dataset…")
def run_scan(data: bytes, name: str, target, use_model: bool):
    return scan(data, name, target, use_model)


st.title("🩺 DataPulse")
st.caption("Find the data problems that will break or quietly degrade your model, ranked by likely impact, "
           "before you train.")

with st.sidebar:
    up = st.file_uploader("Upload CSV or JSONL", type=["csv", "tsv", "txt", "jsonl", "ndjson", "json"])
    if st.button("Use demo dataset (loan approvals)"):
        if not DEMO.exists():
            from make_demo import generate
            DEMO.parent.mkdir(exist_ok=True)
            DEMO.write_text(generate()[0])
        st.session_state.file = (DEMO.read_bytes(), DEMO.name)
        st.session_state.verify = {}
    if up is not None and st.session_state.get("file", (None, None))[1] != up.name:
        st.session_state.file = (up.getvalue(), up.name)
        st.session_state.verify = {}

if "file" not in st.session_state:
    st.info("Upload a CSV/JSONL file or load the demo dataset from the sidebar.")
    st.stop()

data, name = st.session_state.file
cols = columns_of(data, name)
with st.sidebar:
    guess = guess_target(cols)
    target = st.selectbox("Target (label) column", ["(none)"] + cols,
                          index=(cols.index(guess) + 1) if guess in cols else 0)
    target = None if target == "(none)" else target
    use_model = st.checkbox("Model-based checks", value=True,
                            help="Label noise, leakage and column importance. Needs a target column.")

try:
    rep = run_scan(data, name, target, use_model)
except Exception as e:  # show parsing problems instead of a stack trace
    st.error(f"Could not scan this file: {e}")
    st.stop()

m, issues = rep.meta, rep.issues
c = st.columns(5)
c[0].metric("Rows", f"{m['rows']:,}")
c[1].metric("Columns", m["columns"])
c[2].metric("Issues", len(issues))
c[3].metric("Critical / High", sum(i.priority in ("Critical", "High") for i in issues))
if "cv_score" in m:
    c[4].metric(f"Baseline CV {m['cv_metric']}", f"{m['cv_score']:.3f}",
                help=f"Trivial baseline: {m['trivial_baseline']:.3f}. {m.get('model', '')}")
else:
    c[4].metric("Model checks", "off", help=m.get("model_checks", ""))
if m.get("note"):
    st.caption(m["note"])

tab_issues, tab_profile, tab_export = st.tabs(["Ranked issues", "Column profile", "Export"])

with tab_issues:
    if not issues:
        st.success("No issues found by the enabled checks.")
    summary = pd.DataFrame([{"#": k, "priority": f"{COLORS[i.priority]} {i.priority}", "impact": i.impact,
                             "effect": i.effect, "issue": i.title, "rows": i.n_rows or None,
                             "severity": i.base_severity, "col. weight": i.weight}
                            for k, i in enumerate(issues, 1)])
    st.dataframe(summary, hide_index=True, use_container_width=True)
    st.caption("impact = 100 × severity × column weight × extent(affected rows). Column weight comes from mutual "
               "information with the target; pipeline-breaking issues get at least 0.8. Use **Measure impact** to "
               "check a ranking empirically.")

    for k, it in enumerate(issues, 1):
        with st.expander(f"{COLORS[it.priority]} {k}. {it.title} — impact {it.impact}"):
            st.markdown(f"**What:** {it.detail}\n\n**Fix:** {it.fix}\n\n*Effect: {it.effect}*")
            if it.check == "label_noise":
                ev = pd.DataFrame.from_dict(it.evidence["rows"], orient="index")
                ev.index.name = "row"
                st.markdown("Top suspects (highest disagreement first):")
                st.dataframe(ev.head(50).join(rep.ctx.raw, rsuffix="_data"), use_container_width=True)
            elif it.check == "malformed":
                st.dataframe(pd.DataFrame(it.evidence["records"]), hide_index=True, use_container_width=True)
            elif it.rows:
                sample = rep.ctx.raw.loc[it.rows[:25]].copy()
                sample.insert(0, "file line", [rep.ctx.line_numbers[r] for r in sample.index])
                st.dataframe(sample, use_container_width=True)
            if it.rows and target and use_model and m.get("model_checks") == "ok":
                if st.button("Measure impact (retrain with vs. without these rows)", key=f"v{k}"):
                    from datapulse.impact import verify_row_issue
                    with st.spinner("Retraining 3× with and without the flagged rows…"):
                        st.session_state.setdefault("verify", {})[it.key] = verify_row_issue(rep.ctx, it)
                r = st.session_state.get("verify", {}).get(it.key)
                if r and r["ok"]:
                    st.metric(f"Held-out {r['metric']} after removing {r['removed']} rows", f"{r['after']:.3f}",
                              f"{r['delta']:+.3f} (± {r['spread']:.3f})")
                    st.caption(f"Before: {r['before']:.3f}. Protocol: {r['protocol']}, {r['repeats']} repeats. "
                               "A change smaller than the ± spread is not a real effect. For duplicates, a drop "
                               "usually means the earlier score was inflated by train/test overlap.")
                elif r:
                    st.warning(r["reason"])

with tab_profile:
    st.dataframe(rep.profile, hide_index=True, use_container_width=True)
    if rep.ctx.id_like:
        st.caption(f"ID-like columns (excluded from duplicate keys and models): {rep.ctx.id_like}")

with tab_export:
    st.download_button("Download report (Markdown)", report_to_markdown(rep, name), file_name="datapulse_report.md")
    payload = {"meta": m, "issues": [i.to_dict() for i in issues]}
    st.download_button("Download report (JSON)", json.dumps(payload, indent=2, default=str),
                       file_name="datapulse_report.json")
    row_issues = [i for i in issues if i.rows]
    picked = st.multiselect("Drop rows flagged by:", [i.title for i in row_issues],
                            default=[i.title for i in row_issues if i.check in
                                     ("duplicate_exact", "missing_target", "label_conflict")])
    drop = sorted({r for i in row_issues if i.title in picked for r in i.rows})
    cleaned = rep.ctx.raw.drop(index=drop)
    st.write(f"Cleaned dataset: {len(cleaned):,} rows ({len(drop):,} removed). Review label-noise rows by hand "
             "rather than deleting them wholesale.")
    st.download_button("Download cleaned CSV", cleaned.to_csv(index=False), file_name="cleaned.csv")
