"""Generate a synthetic loan-approval dataset with *known* injected faults.

Because we know exactly which rows were corrupted, we can measure DataPulse's precision/recall
(see evaluate.py) instead of just claiming it works.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd


def generate(n: int = 2000, seed: int = 7):
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "applicant_id": [f"APP-{i:06d}" for i in range(n)],
        "age": rng.integers(21, 70, n).astype(object),
        "annual_income": np.round(rng.lognormal(13.2, 0.5, n)),
        "loan_amount": np.round(rng.lognormal(12.0, 0.6, n)),
        "credit_score": rng.normal(680, 60, n).clip(300, 850).round(),
        "employment": rng.choice(["salaried", "self-employed", "unemployed", "student"], n, p=[.6, .25, .1, .05]),
        "region": rng.choice(["north", "south", "east", "west"], n),
    })
    # Fairly rule-like decisions (as in a real underwriting policy) so the task is learnable.
    logit = 3.0 * (0.03 * (df.credit_score - 680) + 1.3 * (np.log(df.annual_income / df.loan_amount) - 1.2)
                   - 1.8 * (df.employment == "unemployed") - 0.9 * (df.employment == "student"))
    df["label"] = np.where(rng.random(n) < 1 / (1 + np.exp(-logit)), "approved", "rejected").astype(object)
    truth = {}

    flip = rng.choice(n, int(0.04 * n), replace=False)                       # 4% label noise
    df.loc[flip, "label"] = df.loc[flip, "label"].map({"approved": "rejected", "rejected": "approved"})
    truth["flipped_ids"] = df.loc[flip, "applicant_id"].tolist()

    # Post-outcome field (leakage): written by the review team *after* the decision.
    review = np.where(df.label == "approved", "cleared", "hold").astype(object)
    noise = rng.choice(n, int(0.01 * n), replace=False)
    review[noise] = rng.choice(["cleared", "hold"], len(noise))
    df["review_flag"] = review

    approved = df.index[df.label == "approved"]                               # spelling variants
    var = rng.choice(approved, int(0.03 * n), replace=False)
    df.loc[var, "label"] = rng.choice(["Approved", "APPROVED", " approved "], len(var))

    df["annual_income"] = df["annual_income"].astype(object)
    inc = rng.choice(n, int(0.08 * n), replace=False)                         # missing, some disguised
    df.loc[inc[: int(0.06 * n)], "annual_income"] = ""
    df.loc[inc[int(0.06 * n):], "annual_income"] = "N/A"
    df.loc[rng.choice(n, int(0.03 * n), replace=False), "employment"] = "?"
    df.loc[rng.choice(n, 20, replace=False), "age"] = rng.choice(["thirty-five", "45 yrs", "unknown"], 20)
    df["credit_score"] = df["credit_score"].astype(object)
    df.loc[rng.choice(n, int(0.02 * n), replace=False), "credit_score"] = -999   # sentinel
    big = rng.choice(n, 6, replace=False)                                     # unit error: extra zeros
    df.loc[big, "loan_amount"] = df.loc[big, "loan_amount"] * 1000
    df.loc[rng.choice(n, 15, replace=False), "label"] = ""                    # missing labels

    dups = df.iloc[rng.choice(n, 40, replace=False)]                          # exact duplicates
    conf = df.iloc[rng.choice(n, 25, replace=False)].copy()                   # contradicting duplicates
    conf["label"] = conf["label"].map(lambda v: "rejected" if "approved" in str(v).lower() else "approved")
    truth["conflict_ids"] = conf["applicant_id"].tolist()
    df = pd.concat([df, dups, conf]).sample(frac=1, random_state=seed).reset_index(drop=True)

    lines = df.to_csv(index=False).splitlines()                               # malformed CSV lines
    for pos in sorted(rng.choice(np.arange(2, len(lines)), 3, replace=False), reverse=True):
        lines.insert(int(pos), "APP-999999,44,52000,extra,field,in,this,row,breaks,parsing")
    return "\n".join(lines) + "\n", truth


if __name__ == "__main__":
    out = Path(__file__).parent / "demo"
    out.mkdir(exist_ok=True)
    text, truth = generate()
    (out / "demo_loans.csv").write_text(text)
    (out / "demo_loans_truth.json").write_text(json.dumps(truth, indent=2))
    print(f"Wrote {out / 'demo_loans.csv'} and ground truth.")
