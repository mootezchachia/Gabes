"""
NAFAS Gabès — Step 2: Train Water Quality Contamination Classifier
Loads nafas_features.parquet (output of 01_preprocess.py),
applies SMOTE + Gaussian augmentation, tunes LightGBM with Optuna,
trains final model, and saves it as nafas_model.pkl.
"""

import numpy as np
import pandas as pd
import joblib
import optuna
import lightgbm as lgb
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score
from imblearn.over_sampling import SMOTE

optuna.logging.set_verbosity(optuna.logging.WARNING)

# ── CONFIG ───────────────────────────────────────────────────────────────────
DATA_PATH = Path("nafas_features.parquet")
OUT_DIR = Path(".")
OPTUNA_TRIALS = 50
CV_FOLDS = 5
RANDOM_STATE = 42

# Gabes bounding box for targeted augmentation
GABES_LAT = (32.5, 34.5)
GABES_LON = (9.5, 11.0)

FEATURE_COLS = [
    "pb", "cd", "ni", "hg", "cr", "as",
    "p", "n_ox", "n_other",
    "temp", "ph", "dgas", "optical",
    "month", "season_enc",
    "lat", "lon", "elevation", "water_type_enc",
]


# ── DATA LOADING ─────────────────────────────────────────────────────────────

def load_data(path: Path):
    df = pd.read_parquet(path)
    df = df.dropna(subset=["label"])

    # Encode categoricals
    le_season = LabelEncoder()
    df["season_enc"] = le_season.fit_transform(df["season"].fillna("unknown"))

    le_wtype = LabelEncoder()
    df["water_type_enc"] = le_wtype.fit_transform(df.get("water_type", pd.Series(["unknown"] * len(df))).fillna("unknown"))

    le_label = LabelEncoder()
    df["label_enc"] = le_label.fit_transform(df["label"])

    # Keep only feature columns that exist
    available = [c for c in FEATURE_COLS if c in df.columns]
    missing = set(FEATURE_COLS) - set(available)
    if missing:
        print(f"[WARN] Missing feature columns (will fill with 0): {missing}")
        for c in missing:
            df[c] = 0.0

    print(f"Samples: {len(df):,} | Classes: {df['label'].value_counts().to_dict()}")
    return df, le_label


# ── AUGMENTATION ─────────────────────────────────────────────────────────────

def augment(X_train: np.ndarray, y_train: np.ndarray, df_train: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    # SMOTE on rare classes
    class_counts = np.bincount(y_train)
    majority_n = class_counts.max()
    strategy = {
        cls: max(count, majority_n // 3)
        for cls, count in enumerate(class_counts)
        if count < majority_n
    }
    if strategy:
        sm = SMOTE(sampling_strategy=strategy, random_state=RANDOM_STATE, k_neighbors=min(5, min(class_counts) - 1))
        X_train, y_train = sm.fit_resample(X_train, y_train)
        print(f"After SMOTE: {len(X_train):,} samples | {np.bincount(y_train)}")

    # Gaussian noise boost for Gabes-region samples
    lat_idx = FEATURE_COLS.index("lat") if "lat" in FEATURE_COLS else None
    lon_idx = FEATURE_COLS.index("lon") if "lon" in FEATURE_COLS else None

    if lat_idx is not None and lon_idx is not None:
        gabes_mask = (
            (X_train[:, lat_idx] >= GABES_LAT[0]) & (X_train[:, lat_idx] <= GABES_LAT[1]) &
            (X_train[:, lon_idx] >= GABES_LON[0]) & (X_train[:, lon_idx] <= GABES_LON[1])
        )
        gabes_X = X_train[gabes_mask]
        if len(gabes_X) > 0:
            std = gabes_X.std(axis=0) + 1e-8
            noise = np.random.default_rng(RANDOM_STATE).normal(0, 0.04, gabes_X.shape) * std
            synthetic_X = gabes_X + noise
            synthetic_y = y_train[gabes_mask]
            X_train = np.vstack([X_train, synthetic_X])
            y_train = np.concatenate([y_train, synthetic_y])
            print(f"Gabes augmentation: +{len(synthetic_X)} synthetic samples")

    return X_train, y_train


# ── OPTUNA OBJECTIVE ─────────────────────────────────────────────────────────

def make_objective(X_train, y_train, n_classes):
    def objective(trial):
        params = {
            "objective": "multiclass",
            "num_class": n_classes,
            "device": "gpu",
            "metric": "multi_logloss",
            "verbosity": -1,
            "boosting_type": "gbdt",
            "num_leaves": trial.suggest_int("num_leaves", 20, 200),
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 50),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "class_weight": "balanced",
        }

        skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        scores = []
        for tr_idx, val_idx in skf.split(X_train, y_train):
            clf = lgb.LGBMClassifier(**params)
            clf.fit(
                X_train[tr_idx], y_train[tr_idx],
                eval_set=[(X_train[val_idx], y_train[val_idx])],
                callbacks=[lgb.early_stopping(50, verbose=False)],
            )
            proba = clf.predict_proba(X_train[val_idx])
            scores.append(roc_auc_score(y_train[val_idx], proba, multi_class="ovr"))
        return float(np.mean(scores))

    return objective


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=== NAFAS Gabès — Training ===\n")

    df, le_label = load_data(DATA_PATH)

    # Impute before scaling — SimpleImputer handles all-NaN columns (fills with 0)
    imputer = SimpleImputer(strategy="median", fill_value=0)
    X = imputer.fit_transform(df[FEATURE_COLS].values.astype(np.float64)).astype(np.float32)
    y = df["label_enc"].values
    n_classes = len(le_label.classes_)

    scaler = RobustScaler()
    X = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    # Augment training set only
    X_train, y_train = augment(X_train, y_train, df[df.index.isin(df.index[:len(X_train)])])

    # Hyperparameter search
    print(f"\nRunning Optuna ({OPTUNA_TRIALS} trials)...")
    study = optuna.create_study(direction="maximize", study_name="nafas_water_quality")
    study.optimize(make_objective(X_train, y_train, n_classes), n_trials=OPTUNA_TRIALS, show_progress_bar=True)
    print(f"Best CV ROC-AUC: {study.best_value:.4f}")
    print(f"Best params: {study.best_params}")

    # Final model
    best = study.best_params
    best.update({
        "objective": "multiclass",
        "num_class": n_classes,
        "metric": "multi_logloss",
        "class_weight": "balanced",
        "verbosity": -1,
    })

    print("\nTraining final model...")
    model = lgb.LGBMClassifier(**best)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.early_stopping(100, verbose=True), lgb.log_evaluation(50)],
    )

    # Quick test ROC-AUC
    proba = model.predict_proba(X_test)
    test_auc = roc_auc_score(y_test, proba, multi_class="ovr")
    print(f"\nTest ROC-AUC (OVR): {test_auc:.4f}")

    # Save artefacts
    joblib.dump(model,       OUT_DIR / "nafas_model.pkl")
    joblib.dump(scaler,      OUT_DIR / "nafas_scaler.pkl")
    joblib.dump(imputer,     OUT_DIR / "nafas_imputer.pkl")
    joblib.dump(le_label,    OUT_DIR / "nafas_label_encoder.pkl")
    joblib.dump(FEATURE_COLS, OUT_DIR / "nafas_feature_cols.pkl")
    print(f"\nSaved model artefacts to {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
