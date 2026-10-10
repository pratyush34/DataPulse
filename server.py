"""FastAPI backend providing REST API for DataPulse engine."""
from pathlib import Path
from typing import Optional
import json

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from datapulse.core import scan, load_dataset, guess_target
from datapulse.impact import verify_row_issue

app = FastAPI(title="DataPulse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_FILE = Path(__file__).parent / "demo" / "demo_loans.csv"

# Global memory cache for the active scan context to allow verification requests
CURRENT_SCAN = {
    "rep": None,
    "data": None,
    "name": None,
}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "DataPulse Engine"}


@app.get("/api/demo-dataset")
def get_demo_dataset():
    if not DEMO_FILE.exists():
        from make_demo import generate
        DEMO_FILE.parent.mkdir(exist_ok=True)
        text, _ = generate()
        DEMO_FILE.write_text(text)

    data = DEMO_FILE.read_bytes()
    raw, *_ = load_dataset(data, DEMO_FILE.name)
    cols = list(raw.columns)
    guess = guess_target(cols)

    return {
        "name": DEMO_FILE.name,
        "rows": len(raw),
        "columns": cols,
        "target_guess": guess,
        "preview": raw.head(10).to_dict(orient="records"),
    }


@app.post("/api/scan")
async def scan_dataset(
    file: Optional[UploadFile] = File(None),
    use_demo: bool = Form(False),
    target: Optional[str] = Form(None),
    use_model: bool = Form(True),
):
    global CURRENT_SCAN

    if use_demo:
        if not DEMO_FILE.exists():
            from make_demo import generate
            DEMO_FILE.parent.mkdir(exist_ok=True)
            text, _ = generate()
            DEMO_FILE.write_text(text)
        data = DEMO_FILE.read_bytes()
        name = DEMO_FILE.name
    elif file is not None:
        data = await file.read()
        name = file.filename
    else:
        raise HTTPException(status_code=400, detail="No file or demo selected.")

    if target == "(none)" or target == "":
        target = None

    try:
        rep = scan(data, name, target=target, use_model=use_model)
        CURRENT_SCAN["rep"] = rep
        CURRENT_SCAN["data"] = data
        CURRENT_SCAN["name"] = name
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to scan dataset: {str(e)}")

    serializable_issues = []
    for idx, it in enumerate(rep.issues):
        serializable_issues.append({
            "id": idx,
            "priority": it.priority,
            "impact": round(float(it.impact), 1),
            "effect": it.effect,
            "title": it.title,
            "n_rows": it.n_rows,
            "base_severity": round(float(it.base_severity), 2),
            "weight": round(float(it.weight), 2),
            "detail": it.detail,
            "fix": it.fix,
            "check": it.check,
            "column": it.column,
            "rows_sample": [int(r) for r in it.rows[:50]],
        })

    # Prepare column profiles
    raw_df = rep.ctx.raw
    typed_df = rep.ctx.typed
    col_profiles = []
    for col in raw_df.columns:
        missing_count = int(typed_df[col].isna().sum()) if col in typed_df else 0
        unique_count = int(raw_df[col].nunique())
        col_type = rep.ctx.schema.get(col, "text")
        col_profiles.append({
            "name": col,
            "type": col_type,
            "missing": missing_count,
            "missing_pct": round(missing_count / len(raw_df) * 100, 1),
            "unique": unique_count,
            "is_target": col == target,
            "is_id": col in rep.ctx.id_like,
            "is_leak": col in rep.ctx.leak_cols,
        })

    return {
        "meta": rep.meta,
        "name": name,
        "target": target,
        "issues": serializable_issues,
        "columns": col_profiles,
        "total_issues": len(serializable_issues),
        "critical_high": sum(1 for i in serializable_issues if i["priority"] in ("Critical", "High")),
    }


class VerifyRequest(BaseModel):
    issue_id: int


@app.post("/api/verify-issue")
def verify_issue(payload: VerifyRequest):
    rep = CURRENT_SCAN.get("rep")
    if rep is None:
        raise HTTPException(status_code=400, detail="No active scan found. Run a scan first.")

    if payload.issue_id < 0 or payload.issue_id >= len(rep.issues):
        raise HTTPException(status_code=404, detail="Issue not found.")

    it = rep.issues[payload.issue_id]
    if not it.rows:
        return {"ok": False, "reason": "No specific row indices to remove."}

    res = verify_row_issue(rep.ctx, it)
    return res


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
