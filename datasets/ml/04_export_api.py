"""
NAFAS Gabès — Step 4: Export model as a FastAPI micro-service
Deploy this on Railway / Render / Vercel Serverless so the NAFAS
Next.js dashboard can call /predict with sensor readings and get
back a risk score + label.

Run locally:  uvicorn 04_export_api:app --reload
"""

from __future__ import annotations

import numpy as np
import joblib
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Load artefacts ────────────────────────────────────────────────────────────
MODEL_DIR = Path(__file__).parent

try:
    model = joblib.load(MODEL_DIR / "nafas_model.pkl")
    scaler = joblib.load(MODEL_DIR / "nafas_scaler.pkl")
    le_label = joblib.load(MODEL_DIR / "nafas_label_encoder.pkl")
    feature_cols = joblib.load(MODEL_DIR / "nafas_feature_cols.pkl")
except FileNotFoundError as e:
    raise RuntimeError(f"Model artefacts not found — run 02_train.py first.\n{e}")

LABEL_RISK = {
    "Clean": 0,
    "Moderate": 1,
    "Suspect": 2,
    "Contaminated": 3,
}

# ── Pydantic schema ───────────────────────────────────────────────────────────

class SensorReading(BaseModel):
    # Heavy metals (mg/L)
    pb: Optional[float] = Field(None, description="Lead concentration mg/L")
    cd: Optional[float] = Field(None, description="Cadmium concentration mg/L")
    ni: Optional[float] = Field(None, description="Nickel concentration mg/L")
    hg: Optional[float] = Field(None, description="Mercury concentration mg/L")
    cr: Optional[float] = Field(None, description="Chromium concentration mg/L")
    # Nutrients
    p: Optional[float] = Field(None, description="Total Phosphorus mg/L")
    n_ox: Optional[float] = Field(None, description="Oxidized Nitrogen mg/L")
    n_other: Optional[float] = Field(None, description="Other Nitrogen mg/L")
    # Physical
    temp: Optional[float] = Field(None, description="Water temperature °C")
    ph: Optional[float] = Field(None, description="pH")
    dgas: Optional[float] = Field(None, description="Dissolved gas mg/L")
    optical: Optional[float] = Field(None, description="Optical property (turbidity/NTU)")
    # Context
    month: Optional[int] = Field(None, ge=1, le=12, description="Sample month (1–12)")
    season_enc: Optional[int] = Field(None, description="Season encoded: 0=winter,1=spring,2=summer,3=autumn")
    lat: Optional[float] = Field(None, description="Station latitude")
    lon: Optional[float] = Field(None, description="Station longitude")
    elevation: Optional[float] = Field(None, description="Elevation m")
    water_type_enc: Optional[int] = Field(None, description="Water type code")
    as_: Optional[float] = Field(None, alias="as", description="Arsenic concentration mg/L")

    model_config = {"populate_by_name": True}


class PredictionResponse(BaseModel):
    label: str
    risk_level: int          # 0=Clean, 1=Moderate, 2=Suspect, 3=Contaminated
    confidence: float        # probability of predicted class
    probabilities: dict[str, float]
    who_threshold_breaches: list[str]


# ── WHO thresholds (drinking water guidelines, mg/L) ─────────────────────────
WHO_LIMITS: dict[str, float] = {
    "pb": 0.01,
    "cd": 0.003,
    "hg": 0.001,
    "as": 0.01,
    "cr": 0.05,
    "ni": 0.07,
}


def check_who(reading: SensorReading) -> list[str]:
    breaches = []
    data = reading.model_dump(by_alias=True)
    for param, limit in WHO_LIMITS.items():
        val = data.get(param) or data.get(f"{param}_")
        if val is not None and val > limit:
            breaches.append(f"{param.upper()} {val:.4f} mg/L > WHO limit {limit} mg/L")
    return breaches


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="NAFAS Gabès Water Quality API",
    description="Predicts water contamination risk from sensor readings.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your domain in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": "LightGBM", "classes": le_label.classes_.tolist()}


@app.post("/predict", response_model=PredictionResponse)
def predict(reading: SensorReading):
    # Build feature vector
    data = reading.model_dump(by_alias=True)
    # Alias "as_" → "as" in features
    if "as_" in data:
        data["as"] = data.pop("as_")

    row = np.array(
        [data.get(col, np.nan) for col in feature_cols],
        dtype=np.float32,
    ).reshape(1, -1)

    # Fill NaNs with column medians stored during training (approximated by 0 after scaling)
    nan_mask = np.isnan(row)
    row[nan_mask] = 0.0  # RobustScaler centres at median; 0 = median after scaling

    row_scaled = scaler.transform(row)
    proba = model.predict_proba(row_scaled)[0]
    pred_idx = int(np.argmax(proba))
    label = le_label.classes_[pred_idx]

    return PredictionResponse(
        label=label,
        risk_level=LABEL_RISK.get(label, -1),
        confidence=float(proba[pred_idx]),
        probabilities={cls: float(p) for cls, p in zip(le_label.classes_, proba)},
        who_threshold_breaches=check_who(reading),
    )


# ── Example usage (run directly) ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
