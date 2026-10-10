"""Model-based checks. This is what makes the ranking task-aware.

1. Column importance (mutual information with the target) -> weights for scoring.
2. Leakage suspects: a single feature that predicts the target almost perfectly.
3. Label noise (classification): confident-learning-style disagreement between the given label
   and out-of-fold predicted probabilities. Regression: residuals the model cannot explain.
4. verify_row_issue: retrain with vs. without the flagged rows to *measure* impact instead of guessing it.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.metrics import f1_score, r2_score
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_predict, cross_val_score
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from .core import DEGRADES, INFLATES, Issue, ScanContext, canon, is_missing

MAX_ROWS = 20000


def encode_features(ctx: ScanContext, exclude=()):
    """Numeric as-is; low-cardinality text -> category codes; mid-cardinality -> frequency; free text dropped."""
    X, cats = {}, []
    for c in ctx.raw.columns:
        if c == ctx.target or c in exclude or c in ctx.id_like:
            continue
        if ctx.schema[c] == "numeric":
            X[c] = ctx.typed[c].astype(float)
            continue
        s = ctx.typed[c].dropna().astype(str).map(canon).reindex(ctx.typed.index)
        nun = s.nunique()
        if nun <= 1:
            continue
        if nun <= 50:
            codes = pd.Series(pd.Categorical(s).codes, index=s.index).astype(float)
            X[c] = codes.where(codes >= 0)
            cats.append(c)
        elif ctx.typed[c].dropna().astype(str).str.len().mean() <= 30:
            X[c] = s.map(s.value_counts(normalize=True)).astype(float)
        # else: free text. A TF-IDF/embedding branch is a natural extension.
    return pd.DataFrame(X, index=ctx.raw.index), cats


def target_vector(ctx: ScanContext):
    y_raw = ctx.raw[ctx.target]
    valid = ~is_missing(y_raw)
    if ctx.task == "classification":
        y = y_raw.map(canon)
    else:
        y = ctx.typed[ctx.target]
        valid &= y.notna()
    return y, valid


def _model(task, cat_mask, seed=0):
    if task == "classification":
        return HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08, categorical_features=cat_mask,
                                              random_state=seed)
    return HistGradientBoostingRegressor(max_iter=200, learning_rate=0.08, categorical_features=cat_mask,
                                         loss="absolute_error",  # robust to the outliers we are hunting
                                         random_state=seed)


def column_importance(X, y, cats, task, seed=0):
    if X.shape[1] == 0:
        return {}
    Xs, ys = X, y
    if len(X) > 5000:
        Xs = X.sample(5000, random_state=seed)
        ys = y.loc[Xs.index]
    Xf = Xs.copy()
    for c in Xf.columns:
        fill = -1 if c in cats else (Xf[c].median() if Xf[c].notna().any() else 0)
        Xf[c] = Xf[c].fillna(fill)
    discrete = np.array([c in cats for c in Xf.columns])
    if task == "classification":
        mi = mutual_info_classif(Xf.values, pd.factorize(ys)[0], discrete_features=discrete, random_state=seed)
    else:
        mi = mutual_info_regression(Xf.values, ys.values, discrete_features=discrete, random_state=seed)
    top = mi.max()
    return {c: float(v / top) if top > 0 else 0.0 for c, v in zip(Xf.columns, mi)}


def leakage_check(X, y, task, seed=0):
    issues, leaks = [], []
    if len(X) > 5000:
        X = X.sample(5000, random_state=seed)
        y = y.loc[X.index]
    if task == "classification":
        vc = y.value_counts()
        keep = y.isin(vc[vc >= 3].index)
        X, y = X[keep], y[keep]
        if y.nunique() < 2:
            return issues, leaks
        est, cv, scoring = DecisionTreeClassifier(max_depth=4, random_state=seed), \
            StratifiedKFold(3, shuffle=True, random_state=seed), "balanced_accuracy"
    else:
        est, cv, scoring = DecisionTreeRegressor(max_depth=4, random_state=seed), \
            KFold(3, shuffle=True, random_state=seed), "r2"
    for c in X.columns:
        score = cross_val_score(est, X[[c]].fillna(-1e9), y, cv=cv, scoring=scoring).mean()
        if score >= 0.97:
            leaks.append(c)
            issues.append(Issue(
                "leakage", f"Possible target leakage via '{c}'", c, [], 1.0, 0.9, INFLATES,
                f"A depth-4 tree using only '{c}' reaches cross-validated {scoring} = {score:.3f}. Features "
                f"that good on their own are usually recorded after (or derived from) the outcome.",
                "Confirm when this value becomes known. If it is not available at prediction time, drop it; "
                "otherwise the model will look excellent offline and fail in production.",
                evidence={"single_feature_score": round(float(score), 4)}))
    return issues, leaks


def label_noise(ctx, X, y, cats, seed=0):
    vc = y.value_counts()
    keep = y.isin(vc[vc >= 5].index)
    X, y = X[keep], y[keep]
    if len(y) < 50 or y.nunique() < 2 or X.shape[1] == 0:
        return [], {}
    classes, yi = np.unique(y.values, return_inverse=True)
    cat_mask = np.array([c in cats for c in X.columns])
    P = cross_val_predict(_model("classification", cat_mask, seed), X, yi,
                          cv=StratifiedKFold(5, shuffle=True, random_state=seed), method="predict_proba")
    n, k = P.shape
    acc = float((P.argmax(1) == yi).mean())
    f1 = float(f1_score(yi, P.argmax(1), average="macro"))
    majority = float(np.bincount(yi).max() / n)
    meta = {"cv_metric": "accuracy", "cv_score": acc, "cv_macro_f1": f1, "trivial_baseline": majority,
            "model": "HistGradientBoosting, 5-fold out-of-fold"}

    # Per-class confidence thresholds (confident learning, Northcutt et al. 2021).
    t = np.array([P[yi == j, j].mean() for j in range(k)])
    above = P >= t
    best = np.where(above, P, -1).argmax(1)
    flagged = above.any(1) & (best != yi)
    margin = P[np.arange(n), best] - P[np.arange(n), yi]
    order = np.argsort(-margin[flagged])
    rows = X.index[flagged][order]
    if not len(rows):
        return [], meta

    spelling = ctx.raw[ctx.target].groupby(ctx.raw[ctx.target].map(canon)).agg(lambda s: s.value_counts().index[0])
    evidence = {}
    for pos in np.where(flagged)[0][order][:300]:
        r = int(X.index[pos])
        evidence[r] = {"given": ctx.raw.at[r, ctx.target], "suggested": spelling.get(classes[best[pos]], classes[best[pos]]),
                       "p_given": round(float(P[pos, yi[pos]]), 3), "p_suggested": round(float(P[pos, best[pos]]), 3)}
    weak = acc - majority < 0.05
    detail = (f"{len(rows)} rows ({len(rows) / len(ctx.raw):.1%}) carry a label that an out-of-fold model confidently "
              f"disagrees with. Model CV accuracy {acc:.1%} (macro-F1 {f1:.2f}) vs majority-class baseline "
              f"{majority:.1%}. Rows are sorted by disagreement margin.")
    if weak:
        detail += " The model barely beats the baseline, so these flags are low-confidence."
    issue = Issue("label_noise", "Likely mislabeled rows", ctx.target, [int(r) for r in rows],
                  len(rows) / len(ctx.raw), 0.5 if weak else 0.8, DEGRADES, detail,
                  "Review the top of the list by hand; do not auto-relabel. Some flags are hard-but-correct cases, "
                  "and those are exactly what the model needs to keep.", evidence={"rows": evidence})
    return [issue], meta


def residual_check(ctx, X, y, cats, seed=0):
    if len(y) < 50 or X.shape[1] == 0:
        return [], {}
    cat_mask = np.array([c in cats for c in X.columns])
    pred = cross_val_predict(_model("regression", cat_mask, seed), X, y, cv=KFold(5, shuffle=True, random_state=seed))
    r2 = float(r2_score(y, pred))
    meta = {"cv_metric": "R²", "cv_score": r2, "trivial_baseline": 0.0, "model": "HistGradientBoosting, 5-fold"}
    res = pd.Series(y.values - pred, index=y.index)
    med, mad = res.median(), (res - res.median()).abs().median()
    if not mad:
        return [], meta
    z = 0.6745 * (res - med) / mad
    mask = z.abs() > 6
    rows = z[mask].abs().sort_values(ascending=False).index
    if not len(rows):
        return [], meta
    return [Issue("target_residual", "Target values the model cannot explain", ctx.target, [int(r) for r in rows],
                  len(rows) / len(ctx.raw), 0.6, DEGRADES,
                  f"{len(rows)} rows have out-of-fold residuals > 6 robust SDs (model CV R² = {r2:.2f}).",
                  "Check for unit errors, typos or mis-joined records in the target before treating them as signal.")], meta


def model_checks(ctx: ScanContext, seed: int = 0):
    X_all, cats = encode_features(ctx)
    y, valid = target_vector(ctx)
    idx = valid[valid].index
    if len(idx) > MAX_ROWS:
        idx = pd.Index(np.random.default_rng(seed).choice(idx, MAX_ROWS, replace=False))
    X, yv = X_all.loc[idx], y.loc[idx]
    if X.shape[1] == 0 or len(idx) < 30:
        return [], {}, {"model_checks": "skipped (too few usable rows or features)"}

    weights = column_importance(X, yv, cats, ctx.task, seed)
    issues, leaks = leakage_check(X, yv, ctx.task, seed)
    ctx.leak_cols = leaks
    # Leaky features would let the model "explain" wrong labels, masking label noise, so drop them first.
    Xn = X.drop(columns=leaks)
    cats_n = [c for c in cats if c not in leaks]
    if ctx.task == "classification":
        more, meta = label_noise(ctx, Xn, yv, cats_n, seed)
    else:
        more, meta = residual_check(ctx, Xn, yv, cats_n, seed)
    meta = {"model_checks": "ok", **meta}
    if leaks:
        meta["note"] = f"Leak suspects {leaks} were excluded from the label-noise model."
    return issues + more, weights, meta


def _flag_noise_in(X, y, cats, seed):
    """Re-run label-noise detection using only the given (training) rows."""
    vc = y.value_counts()
    keep = y.isin(vc[vc >= 5].index)
    Xk, yk = X[keep], y[keep]
    classes, yi = np.unique(yk.values, return_inverse=True)
    cat_mask = np.array([c in cats for c in X.columns])
    P = cross_val_predict(_model("classification", cat_mask, seed), Xk, yi,
                          cv=StratifiedKFold(5, shuffle=True, random_state=seed), method="predict_proba")
    t = np.array([P[yi == j, j].mean() for j in range(len(classes))])
    above = P >= t
    best = np.where(above, P, -1).argmax(1)
    return Xk.index[above.any(1) & (best != yi)]


def verify_row_issue(ctx: ScanContext, issue: Issue, repeats: int = 3, test_frac: float = 0.25):
    """Measure impact empirically: retrain with vs. without the flagged rows on the same held-out test rows.

    Rule-based issues: flagged rows are kept out of the test pool, so the comparison is on rows we trust.
    Model-based label noise: excluding flagged rows from the test set would be circular (the test would only
    contain rows the model already agrees with), so detection is re-run inside each training split and the
    test set is a plain random sample.
    """
    X_all, cats = encode_features(ctx, exclude=ctx.leak_cols)
    y, valid = target_vector(ctx)
    valid_idx = valid[valid].index
    flagged = valid_idx.intersection(pd.Index(issue.rows))
    if len(flagged) == 0 or len(flagged) > 0.5 * len(valid_idx) or X_all.shape[1] == 0:
        return {"ok": False, "reason": "Needs between 1 row and half the labelled rows flagged, and at least one feature."}
    in_fold = issue.check == "label_noise"
    pool = valid_idx if in_fold else valid_idx.difference(flagged)
    n_test = int(test_frac * len(valid_idx))
    cat_mask = np.array([c in cats for c in X_all.columns])
    before, after, removed = [], [], []
    for seed in range(repeats):
        test = pd.Index(np.random.default_rng(seed).choice(pool, n_test, replace=False))
        train = valid_idx.difference(test)
        drop = _flag_noise_in(X_all.loc[train], y.loc[train], cats, seed) if in_fold else flagged
        removed.append(len(train.intersection(drop)))
        for tr, store in ((train, before), (train.difference(drop), after)):
            m = _model(ctx.task, cat_mask, seed).fit(X_all.loc[tr], y.loc[tr])
            pred = m.predict(X_all.loc[test])
            store.append(f1_score(y.loc[test], pred, average="macro") if ctx.task == "classification"
                         else r2_score(y.loc[test], pred))
    b, a = float(np.mean(before)), float(np.mean(after))
    return {"ok": True, "metric": "macro-F1" if ctx.task == "classification" else "R²",
            "before": b, "after": a, "delta": a - b, "spread": float(np.std(np.array(after) - np.array(before))),
            "removed": int(np.mean(removed)), "repeats": repeats,
            "protocol": "in-fold re-detection, random test set" if in_fold else "flagged rows excluded from test set"}
