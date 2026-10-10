"""DataPulse core: robust loading, schema inference, rule-based checks and impact scoring.

Every check returns a list of `Issue` objects. Impact is computed afterwards by
`score_issues`, so checks only have to describe *what* is wrong and how bad that
kind of problem is in general (base_severity); the ranking layer decides how much
it matters for *this* dataset and target.
"""
from __future__ import annotations

import csv
import io
import json
import re
from dataclasses import asdict, dataclass, field

import numpy as np
import pandas as pd

MISSING_TOKENS = {"", "na", "n/a", "nan", "null", "none", "?", "-", "--", "missing",
                  "undefined", "#n/a", "nil"}
SENTINELS = (-1.0, -99.0, -999.0, -9999.0, 999.0, 9999.0, 99999.0)
TARGET_NAME_HINTS = {"label", "labels", "target", "class", "y", "outcome"}
ID_NAME = re.compile(r"(^|[_\-\s])(id|uuid|guid|idx|index)($|[_\-\s])", re.I)

# Effect categories: what the issue does to an ML project.
BREAKS = "breaks pipeline"
DEGRADES = "degrades model"
INFLATES = "inflates metrics"

PRIORITY_BANDS = [(60, "Critical"), (35, "High"), (15, "Medium"), (0, "Low")]


@dataclass
class Issue:
    check: str
    title: str
    column: str | None
    rows: list
    affected_frac: float
    base_severity: float          # 0..1, how bad this kind of problem is in general
    effect: str
    detail: str
    fix: str
    evidence: dict = field(default_factory=dict)
    weight: float = 1.0           # importance of the column for the target
    impact: float = 0.0           # final 0..100 score
    priority: str = "Low"

    @property
    def n_rows(self) -> int:
        return len(self.rows)

    @property
    def key(self) -> str:
        return f"{self.check}:{self.column}"

    def to_dict(self, max_rows: int = 200) -> dict:
        d = asdict(self)
        d["n_rows"] = len(self.rows)
        d["rows"] = [int(r) for r in self.rows[:max_rows]]
        return d


@dataclass
class ScanContext:
    raw: pd.DataFrame             # every value as a string, exactly as read
    typed: pd.DataFrame           # numeric columns parsed, text stripped, missing -> NaN
    schema: dict
    target: str | None
    task: str | None              # "classification" | "regression" | None
    line_numbers: list
    bad_records: list
    header_problems: list
    id_like: list = field(default_factory=list)
    leak_cols: list = field(default_factory=list)


@dataclass
class Report:
    ctx: ScanContext
    issues: list
    meta: dict
    profile: pd.DataFrame


# --------------------------------------------------------------------------- loading
def _decode(data: bytes) -> str:
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1")


def _dedupe_header(header):
    problems, seen, out = [], set(), []
    for i, h in enumerate(header):
        h = str(h).strip()
        if not h:
            problems.append(f"column {i + 1} has an empty header")
            h = f"unnamed_{i + 1}"
        base, k = h, 2
        if h in seen:
            problems.append(f"duplicate header '{h}'")
            while h in seen:
                h, k = f"{base}__{k}", k + 1
        seen.add(h)
        out.append(h)
    return out, problems


def _load_csv(text: str):
    try:
        delim = csv.Sniffer().sniff(text[:20000], delimiters=",;\t|").delimiter
    except csv.Error:  # sniffer gives up on irregular files: fall back to the header line
        first = next((ln for ln in text.splitlines() if ln.strip()), "")
        delim = max(",;\t|", key=first.count) if first else ","
    reader = csv.reader(io.StringIO(text), delimiter=delim)
    header, rows, lines, bad = None, [], [], []
    while True:
        try:
            rec = next(reader)
        except StopIteration:
            break
        except csv.Error as e:
            bad.append({"line": reader.line_num, "error": str(e), "content": ""})
            continue
        if not any(f.strip() for f in rec):
            continue
        if header is None:
            header = rec
            continue
        if len(rec) != len(header):
            bad.append({"line": reader.line_num,
                        "error": f"{len(rec)} fields, expected {len(header)}",
                        "content": delim.join(rec)[:200]})
            continue
        rows.append(rec)
        lines.append(reader.line_num)
    cols, problems = _dedupe_header(header or [])
    raw = pd.DataFrame(rows, columns=cols, dtype=object) if cols else pd.DataFrame()
    return raw, lines, bad, problems


def _to_str(v) -> str:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return ""
    if isinstance(v, (list, dict)):
        return json.dumps(v, sort_keys=True)
    return str(v)


def _load_json(text: str):
    bad, records, lines = [], [], []
    if text.lstrip().startswith("["):
        items = list(enumerate(json.loads(text), 1))
    else:
        items = []
        for i, line in enumerate(text.splitlines(), 1):
            if not line.strip():
                continue
            try:
                items.append((i, json.loads(line)))
            except json.JSONDecodeError as e:
                bad.append({"line": i, "error": f"invalid JSON: {e.msg}", "content": line[:200]})
    for i, obj in items:
        if not isinstance(obj, dict):
            bad.append({"line": i, "error": "record is not a JSON object", "content": str(obj)[:200]})
            continue
        records.append(obj)
        lines.append(i)
    df = pd.json_normalize(records) if records else pd.DataFrame()
    raw = df.apply(lambda s: s.map(_to_str)).astype(object) if len(df) else df
    return raw, lines, bad, []


def load_dataset(data: bytes, filename: str):
    text = _decode(data)
    if filename.lower().endswith((".jsonl", ".ndjson", ".json")):
        raw, lines, bad, problems = _load_json(text)
    else:
        raw, lines, bad, problems = _load_csv(text)
    return raw.reset_index(drop=True), lines, bad, problems


# --------------------------------------------------------------------------- schema
def is_missing(s: pd.Series) -> pd.Series:
    return s.fillna("").astype(str).str.strip().str.lower().isin(MISSING_TOKENS)


def canon(v) -> str:
    """Canonical form used to detect spelling variants: 'Approved ' == 'APPROVED'."""
    return re.sub(r"[^0-9a-z]+", "", str(v).lower())


def _to_numeric(s: pd.Series) -> pd.Series:
    out = pd.to_numeric(s.astype(str).str.strip().str.replace(",", "", regex=False), errors="coerce")
    return out.replace([np.inf, -np.inf], np.nan)


def infer_schema(raw: pd.DataFrame):
    schema, typed = {}, {}
    for c in raw.columns:
        s = raw[c].fillna("").astype(str)
        miss = is_missing(s)
        present = s[~miss]
        num = _to_numeric(present)
        if len(present) and num.notna().mean() >= 0.9:
            schema[c] = "numeric"
            col = pd.Series(np.nan, index=raw.index, dtype=float)
            col.loc[present.index] = num.astype(float)
            typed[c] = col
        else:
            schema[c] = "text"
            typed[c] = s.str.strip().where(~miss, np.nan).astype(object)
    return schema, pd.DataFrame(typed, index=raw.index)


def guess_target(columns) -> str | None:
    for c in columns:
        if str(c).strip().lower() in TARGET_NAME_HINTS:
            return c
    return columns[-1] if len(columns) else None


def infer_task(typed, schema, target):
    if not target:
        return None
    y = typed[target].dropna()
    if schema[target] == "numeric" and y.nunique() > 15:
        return "regression"
    return "classification"


def find_id_like(ctx: ScanContext) -> list:
    out, n = [], len(ctx.raw)
    if n < 20:
        return out
    for c in ctx.raw.columns:
        if c == ctx.target:
            continue
        v = ctx.typed[c].dropna()
        if len(v) < 0.5 * n or v.nunique() / len(v) < 0.95:
            continue
        name_hint = bool(ID_NAME.search(str(c))) or bool(re.search(r"[a-z]Id$", str(c)))
        if ctx.schema[c] == "numeric":
            u = np.sort(v.unique())
            consecutive = len(u) > 1 and (np.diff(u) == 1).mean() > 0.9
            if name_hint or consecutive:
                out.append(c)
        else:
            s = v.astype(str)
            if name_hint or (s.str.len().mean() <= 40 and (~s.str.contains(r"\s")).mean() > 0.9):
                out.append(c)
    return out


# --------------------------------------------------------------------------- checks
def _idx(mask: pd.Series) -> list:
    return [int(i) for i in mask[mask].index]


def check_parsing(ctx):
    out = []
    total = len(ctx.raw) + len(ctx.bad_records)
    if ctx.bad_records:
        k = len(ctx.bad_records)
        out.append(Issue(
            "malformed", "Malformed records dropped during parsing", None, [], k / max(total, 1), 0.7, BREAKS,
            f"{k} record(s) could not be parsed and were excluded (first at line {ctx.bad_records[0]['line']}: "
            f"{ctx.bad_records[0]['error']}).",
            "Look for unquoted delimiters, embedded newlines or truncated writes in the export step. Many loaders "
            "drop or mis-align these rows silently, so your training set is not what you think it is.",
            evidence={"records": ctx.bad_records[:25]}))
    if ctx.header_problems:
        out.append(Issue(
            "header", "Header problems", None, [], 1.0, 0.4, BREAKS,
            "; ".join(ctx.header_problems).capitalize() + ". Columns were renamed to keep them apart.",
            "Give every column a unique, non-empty name; duplicates break column selection and feature mapping."))
    return out


def check_missing(ctx):
    out, n = [], len(ctx.raw)
    for c in ctx.raw.columns:
        s = ctx.raw[c].fillna("").astype(str).str.strip().str.lower()
        miss = s.isin(MISSING_TOKENS)
        k = int(miss.sum())
        if not k:
            continue
        frac = k / n
        disguised = s[miss & (s != "")].value_counts().head(5)
        detail = f"{k} of {n} values ({frac:.1%}) are missing"
        if len(disguised):
            detail += (f"; {int(disguised.sum())} are disguised as placeholder text "
                       f"({', '.join(repr(t) for t in disguised.index)}), which naive loaders read as real values")
        if c == ctx.target:
            out.append(Issue("missing_target", f"Missing labels in target '{c}'", c, _idx(miss), frac, 1.0, BREAKS,
                             detail + ".", "Rows without a label cannot be used for supervised training. "
                             "Drop them, or send them for labelling."))
            continue
        if frac > 0.6:
            fix = "The column is mostly empty; consider dropping it unless the missingness itself is informative."
        else:
            fix = ("Impute (median/mode or a model-based imputer) and add a was-missing indicator. First check "
                   "whether missingness correlates with the label; if it does, the indicator is a real signal.")
        sev = 0.6 if frac > 0.3 else 0.45
        out.append(Issue("missing", f"Missing values in '{c}'", c, _idx(miss), frac, sev, DEGRADES, detail + ".", fix))
    return out


def check_type_violations(ctx):
    out, n = [], len(ctx.raw)
    for c, t in ctx.schema.items():
        if t != "numeric":
            continue
        present = ~is_missing(ctx.raw[c])
        bad = present & ctx.typed[c].isna()
        k = int(bad.sum())
        if not k:
            continue
        examples = ctx.raw.loc[bad, c].drop_duplicates().head(5).tolist()
        out.append(Issue(
            "type_violation", f"Non-numeric values in numeric column '{c}'", c, _idx(bad), k / n, 0.75, BREAKS,
            f"'{c}' is numeric in {1 - k / max(int(present.sum()), 1):.1%} of rows, but {k} values are not numbers, "
            f"e.g. {examples}.",
            "These crash astype(float), or get silently coerced to NaN by pd.to_numeric(errors='coerce'). Fix them "
            "at the source or parse them explicitly (e.g. '45 yrs' -> 45)."))
    return out


def _robust_z(v: pd.Series) -> pd.Series:
    med = v.median()
    mad = (v - med).abs().median()
    if not mad or np.isnan(mad):
        return pd.Series(0.0, index=v.index)
    return 0.6745 * (v - med) / mad


def _sentinel_mask(ctx, c) -> pd.Series:
    v = ctx.typed[c]
    mask = pd.Series(False, index=v.index)
    n = len(v)
    for s in SENTINELS:
        hit = v == s
        if hit.sum() < max(3, 0.005 * n):
            continue
        rest = v[~hit & v.notna()]
        if len(rest) < 10:
            continue
        med, mad = rest.median(), (rest - rest.median()).abs().median()
        if mad and abs(0.6745 * (s - med) / mad) > 5 and not (rest.min() <= s <= rest.max()):
            mask |= hit
    return mask


def check_sentinels(ctx):
    out, n = [], len(ctx.raw)
    for c, t in ctx.schema.items():
        if t != "numeric" or c in ctx.id_like:
            continue
        mask = _sentinel_mask(ctx, c)
        k = int(mask.sum())
        if k:
            vals = sorted(ctx.typed.loc[mask, c].unique().tolist())
            out.append(Issue(
                "sentinel", f"Placeholder numbers in '{c}'", c, _idx(mask), k / n, 0.6, DEGRADES,
                f"{k} rows use {vals}, values far outside the column's normal range that look like 'unknown' codes.",
                "Convert them to NaN before training; otherwise a model treats -999 as a genuine (extreme) value "
                "and scaling/normalisation is distorted for every other row."))
    return out


def check_outliers(ctx):
    out, n = [], len(ctx.raw)
    for c, t in ctx.schema.items():
        if t != "numeric" or c in ctx.id_like:
            continue
        v = ctx.typed[c].where(~_sentinel_mask(ctx, c))
        vv = v.dropna()
        if len(vv) < 20 or vv.nunique() < 10:
            continue
        if vv.min() > 0 and vv.skew() > 2:
            v = np.log(v)
        z = _robust_z(v)
        mask = (z.abs() > 7).fillna(False)
        k = int(mask.sum())
        if k:
            is_t = c == ctx.target
            ex = ctx.raw.loc[mask, c].head(5).tolist()
            out.append(Issue(
                "outlier", f"Extreme values in '{c}'", c, _idx(mask), k / n, 0.6 if is_t else 0.3, DEGRADES,
                f"{k} values are more than 7 robust standard deviations from the median, e.g. {ex}.",
                "Check whether these are unit errors or typos (e.g. an extra zero). If they are real, prefer robust "
                "scaling or tree models over clipping them blindly."))
    return out


def check_duplicates(ctx):
    raw, n, out = ctx.raw, len(ctx.raw), []
    if n < 2:
        return out
    exact = pd.util.hash_pandas_object(raw.astype(str), index=False).duplicated(keep="first")
    k = int(exact.sum())
    if k:
        out.append(Issue(
            "duplicate_exact", "Exact duplicate rows", None, _idx(exact), k / n, 0.55, INFLATES,
            f"{k} rows are byte-for-byte copies of an earlier row.",
            "Drop them (df.drop_duplicates()). If copies land on both sides of a train/test split, test rows "
            "were already seen in training and your evaluation metrics are optimistic."))

    norm = raw.apply(lambda s: s.fillna("").astype(str).str.strip().str.lower()
                     .str.replace(r"\s+", " ", regex=True))
    key_cols = [c for c in raw.columns if c not in ctx.id_like]
    if key_cols:
        near = pd.util.hash_pandas_object(norm[key_cols], index=False).duplicated(keep="first") & ~exact
        k = int(near.sum())
        if k:
            ignored = f" and ignoring ID-like columns {ctx.id_like}" if ctx.id_like else ""
            out.append(Issue(
                "duplicate_near", "Near-duplicate rows", None, _idx(near), k / n, 0.45, INFLATES,
                f"{k} rows are identical to an earlier row after normalising case/whitespace{ignored}.",
                "Usually the same entity recorded twice (re-exports, retries). Deduplicate on the normalised "
                "content, and split train/test by entity rather than by row."))

    if ctx.target and ctx.task == "classification":
        feats = [c for c in key_cols if c != ctx.target]
        if feats:
            has_content = (norm[feats] != "").any(axis=1)
            h = pd.util.hash_pandas_object(norm[feats], index=False)
            y = raw[ctx.target].map(canon).where(~is_missing(raw[ctx.target]))
            nun = y.groupby(h).transform("nunique")
            conflict = (nun > 1) & has_content & y.notna()
            k = int(conflict.sum())
            if k:
                groups = int(h[conflict].nunique())
                out.append(Issue(
                    "label_conflict", "Identical inputs with contradicting labels", ctx.target, _idx(conflict),
                    k / n, 0.95, DEGRADES,
                    f"{groups} groups ({k} rows) have exactly the same features but different labels. No model can "
                    f"fit both, so this sets a hard ceiling on achievable accuracy.",
                    "Resolve each group: re-annotate, take a majority vote, or keep one row. If both labels are "
                    "legitimate, a feature that explains the difference is missing from the data."))
    return out


def check_label_variants(ctx):
    out, n = [], len(ctx.raw)
    cols = []
    if ctx.target and ctx.task == "classification":
        cols.append(ctx.target)
    cols += [c for c, t in ctx.schema.items()
             if t == "text" and c != ctx.target and c not in ctx.id_like and 2 <= ctx.typed[c].nunique() <= 100]
    for c in cols:
        s = ctx.raw[c][~is_missing(ctx.raw[c])]
        groups = {}
        for v, cnt in s.value_counts().items():
            groups.setdefault(canon(v), []).append((v, int(cnt)))
        variants = {k: sorted(g, key=lambda x: -x[1]) for k, g in groups.items() if k and len(g) > 1}
        if not variants:
            continue
        minority, desc = [], []
        for g in variants.values():
            minority += [v for v, _ in g[1:]]
            desc.append(" / ".join(f"{v!r} ({cnt})" for v, cnt in g))
        mask = ctx.raw[c].isin(minority)
        is_t = c == ctx.target
        out.append(Issue(
            "label_variants", f"Inconsistent spellings in {'target ' if is_t else ''}'{c}'", c, _idx(mask),
            mask.sum() / n, 0.9 if is_t else 0.4, DEGRADES,
            f"Values that differ only by case/whitespace/punctuation: {'; '.join(desc[:6])}." +
            (" The model will treat each spelling as a separate class." if is_t else ""),
            "Normalise with a mapping (e.g. .str.strip().str.lower()) and enforce an allowed-values list at "
            "ingestion so it does not come back."))
    return out


def check_class_balance(ctx):
    if ctx.task != "classification":
        return []
    out, n = [], len(ctx.raw)
    y = ctx.raw[ctx.target].map(canon)[~is_missing(ctx.raw[ctx.target])]
    vc = y.value_counts()
    if len(vc) < 2:
        return [Issue("single_class", "Target has a single class", ctx.target, [], 1.0, 1.0, BREAKS,
                      f"Every labelled row has the same class ({vc.index[0] if len(vc) else 'none'}).",
                      "There is nothing to learn. Check the extraction query or the target column choice.")]
    rare = vc[vc < max(5, 0.01 * len(y))]
    if len(rare):
        mask = ctx.raw[ctx.target].map(canon).isin(rare.index) & ~is_missing(ctx.raw[ctx.target])
        out.append(Issue(
            "rare_class", "Classes with too few examples", ctx.target, _idx(mask), mask.sum() / n, 0.5, DEGRADES,
            f"{len(rare)} class(es) have fewer than {max(5, int(0.01 * len(y)))} rows: {rare.to_dict()}.",
            "Collect more examples, merge into a broader class, or drop. Stratified CV may fail on these classes."))
    ratio = vc.max() / vc.min()
    if ratio >= 10:
        out.append(Issue(
            "imbalance", "Severe class imbalance", ctx.target, [], 1.0, 0.35, INFLATES,
            f"Largest/smallest class ratio is {ratio:.0f}:1 ({vc.to_dict()}). Plain accuracy will look good even "
            f"for a model that ignores the minority class.",
            "Report macro-F1 / per-class recall, use stratified splits, and consider class weights."))
    return out


def check_constant_and_ids(ctx):
    out = []
    for c in ctx.raw.columns:
        if c == ctx.target:
            continue
        nun = ctx.typed[c].nunique()
        if nun <= 1:
            out.append(Issue("constant", f"Constant column '{c}'", c, [], 1.0, 0.2, DEGRADES,
                             f"'{c}' has {nun} distinct value(s); it carries no information.",
                             "Drop it before training."))
        elif c in ctx.id_like:
            out.append(Issue("id_column", f"Identifier column '{c}'", c, [], 1.0, 0.35, INFLATES,
                             f"'{c}' is unique per row, so it looks like an identifier.",
                             "Exclude it from features; models can memorise IDs, and if IDs are assigned in time "
                             "order they can leak information about the label."))
    return out


RULE_CHECKS = [check_parsing, check_missing, check_type_violations, check_sentinels, check_outliers,
               check_duplicates, check_label_variants, check_class_balance, check_constant_and_ids]


# --------------------------------------------------------------------------- scoring
def score_issues(issues, ctx, weights):
    """impact = 100 * base_severity * column_weight * extent.

    column_weight: 1.0 for the target and dataset-level issues; 0.3 + 0.7 * normalised importance for features
    (0.5 when importance is unknown). Pipeline-breaking issues get at least 0.8, because a crash does not care
    how important the column is. extent rises with the fraction of affected rows but never drops below 0.35,
    so a handful of contradicting labels still surfaces.
    """
    for it in issues:
        if it.column is None or it.column == ctx.target:
            w = 1.0
        elif it.column in weights:
            w = 0.3 + 0.7 * weights[it.column]
        elif it.column in ctx.id_like:
            w = 0.3
        else:
            w = 0.5
        if it.effect == BREAKS:
            w = max(w, 0.8)
        extent = np.log1p(100 * min(it.affected_frac, 1.0)) / np.log1p(100)
        it.weight = round(float(w), 3)
        it.impact = round(float(100 * it.base_severity * w * (0.35 + 0.65 * extent)), 1)
        it.priority = next(p for t, p in PRIORITY_BANDS if it.impact >= t)
    issues.sort(key=lambda i: -i.impact)
    return issues


def build_profile(ctx, weights) -> pd.DataFrame:
    rows = []
    for c in ctx.raw.columns:
        s = ctx.raw[c]
        miss = is_missing(s)
        role = "target" if c == ctx.target else ("id-like" if c in ctx.id_like else
                                                  ("leak suspect" if c in ctx.leak_cols else "feature"))
        rows.append({"column": c, "type": ctx.schema[c], "role": role,
                     "missing_%": round(100 * miss.mean(), 1), "unique": int(ctx.typed[c].nunique()),
                     "importance": round(weights[c], 3) if c in weights else None,
                     "examples": ", ".join(s[~miss].drop_duplicates().head(3).astype(str))})
    return pd.DataFrame(rows)


def scan(data: bytes, filename: str, target: str | None = None, use_model: bool = True) -> Report:
    raw, lines, bad, problems = load_dataset(data, filename)
    if raw.empty:
        raise ValueError("No data rows could be parsed from this file.")
    if target not in raw.columns:
        target = None
    schema, typed = infer_schema(raw)
    ctx = ScanContext(raw, typed, schema, target, infer_task(typed, schema, target), lines, bad, problems)
    ctx.id_like = find_id_like(ctx)

    issues = []
    for check in RULE_CHECKS:
        issues.extend(check(ctx))

    weights, meta = {}, {"model_checks": "skipped (no target selected)" if not target else "disabled"}
    if use_model and target:
        try:
            from .impact import model_checks
            m_issues, weights, meta = model_checks(ctx)
            issues.extend(m_issues)
        except ImportError:
            meta = {"model_checks": "skipped (scikit-learn not installed)"}
    meta.update({"rows": len(raw), "columns": raw.shape[1], "target": target, "task": ctx.task,
                 "id_like": ctx.id_like, "leak_suspects": ctx.leak_cols})
    score_issues(issues, ctx, weights)
    return Report(ctx, issues, meta, build_profile(ctx, weights))


def report_to_markdown(rep: Report, filename: str = "dataset") -> str:
    m = rep.meta
    lines = [f"# DataPulse report: {filename}", "",
             f"- Rows: {m['rows']} | Columns: {m['columns']} | Target: {m['target']} ({m['task']})",
             f"- Malformed records skipped: {len(rep.ctx.bad_records)}"]
    if "cv_score" in m:
        lines.append(f"- Baseline model CV {m['cv_metric']}: {m['cv_score']:.3f} "
                     f"(trivial baseline {m['trivial_baseline']:.3f})")
    lines += ["", "| # | Priority | Impact | Effect | Issue | Rows |", "|---|---|---|---|---|---|"]
    for i, it in enumerate(rep.issues, 1):
        lines.append(f"| {i} | {it.priority} | {it.impact} | {it.effect} | {it.title} | {it.n_rows or '-'} |")
    lines.append("")
    for i, it in enumerate(rep.issues, 1):
        lines += [f"## {i}. {it.title} ({it.priority}, {it.impact})", "", it.detail, "",
                  f"**Fix:** {it.fix}", ""]
    return "\n".join(lines)
