"""Evaluate DataPulse against the demo's ground truth: does it find what we injected, and is the
impact ranking backed by measured retraining deltas?"""
import json
import time
from pathlib import Path

from datapulse.core import scan
from datapulse.impact import verify_row_issue
from make_demo import generate

text, truth = generate()
t0 = time.time()
rep = scan(text.encode(), "demo_loans.csv", target="label")
print(f"Scan time: {time.time() - t0:.1f}s, {rep.meta['rows']} rows\n")

print(f"{'#':>2} {'priority':9} {'impact':>6}  {'effect':17} issue")
for i, it in enumerate(rep.issues, 1):
    print(f"{i:>2} {it.priority:9} {it.impact:>6}  {it.effect:17} {it.title} [{it.n_rows} rows]")

ids = rep.ctx.raw["applicant_id"]
flipped = set(truth["flipped_ids"]) - set(truth["conflict_ids"])
noise = next((i for i in rep.issues if i.check == "label_noise"), None)
if noise:
    flagged = ids.loc[noise.rows]
    tp = flagged.isin(flipped).sum()
    top = ids.loc[noise.rows[:50]].isin(flipped).mean()
    print(f"\nLabel-noise detector: flagged {len(flagged)}, precision {tp / len(flagged):.2f}, "
          f"recall {flagged[flagged.isin(flipped)].nunique() / len(flipped):.2f}, precision@50 {top:.2f}")

print("\nMeasured impact (retrain without flagged rows, 3 repeats):")
for it in rep.issues:
    if it.rows:
        r = verify_row_issue(rep.ctx, it)
        if r["ok"]:
            print(f"  {it.title:45} {r['metric']} {r['before']:.3f} -> {r['after']:.3f} "
                  f"(delta {r['delta']:+.3f} ± {r['spread']:.3f}, removed {r['removed']})")
