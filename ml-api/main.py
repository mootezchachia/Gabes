from __future__ import annotations
import numpy as np
import joblib
from pathlib import Path
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE = Path(__file__).parent

model        = joblib.load(BASE / "nafas_model.pkl")
scaler       = joblib.load(BASE / "nafas_scaler.pkl")
le_label     = joblib.load(BASE / "nafas_label_encoder.pkl")
feature_cols = joblib.load(BASE / "nafas_feature_cols.pkl")

try:
    imputer = joblib.load(BASE / "nafas_imputer.pkl")
except FileNotFoundError:
    from sklearn.impute import SimpleImputer
    imputer = SimpleImputer(strategy="constant", fill_value=0)

RISK = {"Clean": 0, "Moderate": 1, "Suspect": 2, "Contaminated": 3}
WHO  = {"pb": 0.01, "cd": 0.003, "hg": 0.001, "as": 0.01, "cr": 0.05, "ni": 0.07}

app = FastAPI(title="NAFAS Water Quality API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Reading(BaseModel):
    pb:      Optional[float] = None
    cd:      Optional[float] = None
    ni:      Optional[float] = None
    hg:      Optional[float] = None
    cr:      Optional[float] = None
    as_:     Optional[float] = Field(None, alias="as")
    p:       Optional[float] = None
    n_ox:    Optional[float] = None
    n_other: Optional[float] = None
    temp:    Optional[float] = None
    ph:      Optional[float] = None
    dgas:    Optional[float] = None
    optical: Optional[float] = None
    month:   Optional[int]   = None
    season_enc:     Optional[int] = None
    lat:     Optional[float] = None
    lon:     Optional[float] = None
    elevation:      Optional[float] = None
    water_type_enc: Optional[int]   = None
    model_config = {"populate_by_name": True}


@app.get("/health")
def health():
    return {"status": "ok", "classes": le_label.classes_.tolist()}


@app.post("/predict")
def predict(r: Reading):
    data = r.model_dump(by_alias=True)
    data["as"] = data.pop("as_", None) or data.get("as")

    row = np.array(
        [data.get(c, np.nan) for c in feature_cols],
        dtype=np.float64,
    ).reshape(1, -1)

    try:
        row = imputer.transform(row)
    except Exception:
        row = np.nan_to_num(row, nan=0.0)

    row   = scaler.transform(row.astype(np.float32))
    proba = model.predict_proba(row)[0]
    idx   = int(np.argmax(proba))
    label = le_label.classes_[idx]

    breaches = [
        f"{k.upper()} {data[k]:.4f} > WHO {v} mg/L"
        for k, v in WHO.items()
        if data.get(k) is not None and data[k] > v
    ]

    return {
        "label":                  label,
        "risk_level":             RISK.get(label, -1),
        "confidence":             float(proba[idx]),
        "probabilities":          dict(zip(le_label.classes_.tolist(), proba.tolist())),
        "who_threshold_breaches": breaches,
    }
