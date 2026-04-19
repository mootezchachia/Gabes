# Water Quality ML — Model, API & Deployment

## What it does

A **LightGBM multiclass classifier** that predicts water contamination risk from chemical measurements. It outputs one of 4 classes:

| Class | Meaning |
|---|---|
| Clean (Bonne qualité) | All WHO thresholds respected |
| Moderate (Modérée) | Minor exceedances, low risk |
| Suspect (Suspecte) | Multiple borderline readings |
| Contaminated (Contaminée) | Clear WHO threshold breach |

Labels are derived from **WHO Drinking Water Guidelines 2024** thresholds:

| Parameter | WHO Limit (mg/L) |
|---|---|
| Lead (Pb) | 0.01 |
| Cadmium (Cd) | 0.003 |
| Mercury (Hg) | 0.001 |
| Arsenic (As) | 0.01 |
| Chromium (Cr) | 0.05 |
| Nickel (Ni) | 0.07 |

---

## Model files

Stored in `ml-api/` (4 pkl files, **not committed to git** — download from Kaggle output):

| File | Purpose |
|---|---|
| `nafas_model.pkl` | Trained LightGBM booster |
| `nafas_scaler.pkl` | RobustScaler (fitted on training data) |
| `nafas_label_encoder.pkl` | LabelEncoder for class names |
| `nafas_feature_cols.pkl` | Ordered list of expected feature names |

Training data: **UNEP GEMS Water Global Freshwater Quality Archive**, filtered to Mediterranean/MENA stations.

Training pipeline: `datasets/ml/01_preprocess.py` → `02_train.py` → `03_evaluate.py`

Key training choices:
- `SimpleImputer(strategy="median")` before SMOTE (handles all-NaN columns)
- `RobustScaler` for outlier-resistant feature scaling
- SMOTE oversampling for class imbalance
- Optuna hyperparameter tuning (50 trials, 5-fold StratifiedKFold)
- **scikit-learn 1.6.1** — pkl files are tied to this version

---

## FastAPI server (`ml-api/`)

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{"status": "ok"}` if model loaded |
| `POST` | `/predict` | Returns prediction for one water sample |

### `/predict` input (JSON)

```json
{
  "pb": 0.025,
  "cd": 0.002,
  "ni": 0.03,
  "hg": 0.0005,
  "cr": 0.02,
  "as": 0.008,
  "p": 0.15,
  "n_ox": 0.5,
  "n_other": 0.3,
  "temp": 24,
  "ph": 7.8,
  "dgas": 6.5,
  "optical": 12,
  "month": 4,
  "season_enc": 1,
  "lat": 33.88,
  "lon": 10.10,
  "elevation": 1,
  "water_type_enc": 2
}
```

### `/predict` response

```json
{
  "label": "Contaminée",
  "risk_level": 3,
  "confidence": 0.924,
  "probabilities": {
    "Bonne qualité": 0.01,
    "Modérée": 0.03,
    "Suspecte": 0.04,
    "Contaminée": 0.92
  },
  "who_threshold_breaches": [
    "Pb: 0.025 mg/L (limit: 0.010)",
    "As: 0.008 mg/L (limit: 0.010)"
  ]
}
```

---

## Deployment (Render)

- **Live URL**: `https://gabes.onrender.com`
- **Platform**: Render free tier (Web Service, Docker)
- **Root directory**: `ml-api/`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Environment variable required in Next.js

In `.env.local` (local dev) and **Vercel dashboard** (production):

```
ML_API_URL=https://gabes.onrender.com
```

---

## Common errors and fixes

### 1. `"Modèle indisponible"` in the UI

The widget shows this when `/api/water-quality` returns an error.

**Cause A — Render free tier is asleep**
Render spins down after 15 min of inactivity. The first request takes ~30 s to wake up.
- **Fix**: Open `https://gabes.onrender.com/health` in a browser to warm it up, then reload the app.

**Cause B — `ML_API_URL` not set in Vercel**
- **Fix**: Vercel Dashboard → project settings → Environment Variables → add `ML_API_URL = https://gabes.onrender.com` → Redeploy.

**Cause C — pkl files missing from `ml-api/`**
- **Fix**: Download the 4 pkl files from Kaggle (output of the training notebook) and push them to the `ml-api/` folder, then trigger a Render redeploy.

---

### 2. `InconsistentVersionWarning` on Render startup

```
Trying to unpickle estimator LabelEncoder from version 1.6.1 when using version 1.8.0
```

**Cause**: Render installed a newer scikit-learn than what was used for training.

**Fix** (already applied): `ml-api/requirements.txt` pins `scikit-learn==1.6.1`. If this warning reappears after a dependency update, re-pin it and trigger a manual redeploy on Render.

---

### 3. `nafas_imputer.pkl not found`

**Cause**: Old version of `main.py` expected a saved imputer file that wasn't generated.

**Fix**: The current `main.py` recreates the imputer inline from the feature columns at startup — no separate pkl file needed. Make sure you are running the latest `ml-api/main.py`.

---

### 4. Model always predicts "Modérée" or wrong class

**Cause**: European comma-decimal format in the training CSV (`"43,3642"` instead of `43.3642`) wasn't converted, so all numeric features became NaN and labels collapsed to one class.

**Fix**: The preprocessing script (`01_preprocess.py`) has a `fix_decimal()` function that handles this. If retraining, make sure to run the full pipeline from `01_preprocess.py`.

---

### 5. Render redeploy after updating pkl files

1. Push the new pkl files to the repo (or upload via Render's environment)
2. Render Dashboard → your service → **Manual Deploy** → Deploy latest commit

---

## How to retrain the model locally

```bash
cd datasets/ml
pip install -r requirements.txt        # includes scikit-learn==1.6.1, lightgbm, etc.
python 01_preprocess.py                # produces nafas_features.parquet
python 02_train.py                     # produces 4 pkl files
python 03_evaluate.py                  # SHAP plots + classification report
```

Copy the 4 pkl files into `ml-api/` and push.

---

## Architecture summary

```
User browser
    │
    ▼
Next.js (Vercel)
  /app/carte          ← WaterQualityBadge (floating pill, bottom-right)
  /app/analytique     ← WaterQualityCard (full card with prob. bars)
    │
    ▼ POST /api/water-quality  (Next.js proxy, app/api/water-quality/route.ts)
    │
    ▼
FastAPI (Render)  https://gabes.onrender.com
  /predict
    │
    ▼
LightGBM model (nafas_model.pkl)
  + RobustScaler (nafas_scaler.pkl)
  + LabelEncoder (nafas_label_encoder.pkl)
  + feature list (nafas_feature_cols.pkl)
```
