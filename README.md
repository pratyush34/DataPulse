# DataPulse — dataset failure predictor

Scan a CSV/JSONL file before training and get a ranked list of the data problems most likely to
**break your pipeline**, **degrade your model**, or **inflate your metrics**.

```bash
pip install -r requirements.txt
python make_demo.py          # demo dataset with known, injected faults
streamlit run app.py
python evaluate.py           # detection quality + measured impact on the demo
```

## How it works

| Layer | What it does | File |
|---|---|---|
| Robust loading | Reads every value as text, captures rows with the wrong field count / invalid JSON instead of silently dropping them, flags duplicate/empty headers | `core.py` |
| Rule checks | Missing + disguised missing (`"N/A"`, `"?"`), type violations, sentinel numbers (`-999`), outliers (robust z), exact/near duplicates, identical inputs with contradicting labels, label spelling variants, rare classes, imbalance, constant and ID columns | `core.py` |
| Model checks | Column importance (mutual information), single-feature leakage test, label noise via out-of-fold probabilities (confident-learning style), unexplained regression targets | `impact.py` |
| Ranking | `impact = 100 × severity × column weight × extent` | `core.score_issues` |
| Verification | "Measure impact": retrain with vs. without the flagged rows on the same held-out rows, 3 repeats | `impact.verify_row_issue` |

Leak suspects are removed before the label-noise model runs, because a leaky feature lets the model
"explain" wrong labels and hides them.

## Results on the demo (2,065 rows, `python evaluate.py`)

- All injected fault types were detected (leakage, label flips, contradicting duplicates, spelling variants,
  missing labels, duplicates, type violations, malformed lines, `-999`, missing values, unit-error outliers).
- Label-noise detector vs. ground truth: precision 0.28, recall 0.69, precision@50 0.52 (base rate of flipped
  labels is ~4%, so the top of the list is ~13× better than random).
- Measured retraining deltas are mostly within noise (±0.01 macro-F1); removing in-fold label-noise
  suspects gave about +0.014. **The heuristic ranking and the measured impact do not always agree.** That is
  why the verify step exists, and it is the most interesting thing to discuss with judges.

## Known limitations

- Severity weights are hand-set; they should be calibrated by injecting faults into several public datasets
  and fitting severity to measured metric drops.
- Free-text columns are ignored by the model checks (add TF-IDF/embeddings).
- Verification measures *removing* rows, not *fixing* them; label-variant impact is invisible to it
  because labels are normalised before modelling.
- Pure-Python CSV parsing; fine to ~100k rows, slow beyond.
