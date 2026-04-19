"""
NAFAS Gabès — Step 3: Evaluation & SHAP Explainability
Loads test split from nafas_features.parquet + saved model,
prints full classification report, plots confusion matrix and
SHAP summary, and exports a feature-importance CSV.
"""

import numpy as np
import pandas as pd
import joblib
import shap
import matplotlib
matplotlib.use("Agg")  # headless — saves PNGs without a display
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    classification_report,
    ConfusionMatrixDisplay,
    roc_auc_score,
    roc_curve,
    auc,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import label_binarize

OUT_DIR = Path(".")
RANDOM_STATE = 42
SHAP_SAMPLE = 500  # rows to compute SHAP on (slow otherwise)


def load_artefacts():
    model = joblib.load(OUT_DIR / "nafas_model.pkl")
    scaler = joblib.load(OUT_DIR / "nafas_scaler.pkl")
    le_label = joblib.load(OUT_DIR / "nafas_label_encoder.pkl")
    feature_cols = joblib.load(OUT_DIR / "nafas_feature_cols.pkl")
    return model, scaler, le_label, feature_cols


def load_test_split(feature_cols, scaler, le_label):
    df = pd.read_parquet(OUT_DIR / "nafas_features.parquet")
    df = df.dropna(subset=["label"])

    from sklearn.preprocessing import LabelEncoder
    df["season_enc"] = LabelEncoder().fit_transform(df.get("season", pd.Series(["unknown"] * len(df))).fillna("unknown"))
    df["water_type_enc"] = LabelEncoder().fit_transform(df.get("water_type", pd.Series(["unknown"] * len(df))).fillna("unknown"))

    for c in feature_cols:
        if c not in df.columns:
            df[c] = 0.0

    X = df[feature_cols].fillna(df[feature_cols].median()).values.astype(np.float32)
    y = le_label.transform(df["label"])
    X = scaler.transform(X)

    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    return X_test, y_test


def plot_confusion_matrix(y_test, y_pred, class_names):
    fig, ax = plt.subplots(figsize=(7, 6))
    ConfusionMatrixDisplay.from_predictions(
        y_test, y_pred,
        display_labels=class_names,
        ax=ax,
        cmap="Blues",
        colorbar=False,
    )
    ax.set_title("NAFAS Gabès — Water Quality Classifier", fontsize=13, pad=12)
    plt.tight_layout()
    path = OUT_DIR / "confusion_matrix.png"
    plt.savefig(path, dpi=150)
    print(f"Saved → {path}")
    plt.close()


def plot_roc_curves(y_test, y_prob, class_names, n_classes):
    y_bin = label_binarize(y_test, classes=list(range(n_classes)))
    fig, ax = plt.subplots(figsize=(7, 6))
    colors = ["#2196F3", "#4CAF50", "#FF9800", "#F44336"]
    for i, (name, color) in enumerate(zip(class_names, colors)):
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_prob[:, i])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=color, lw=2, label=f"{name} (AUC={roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=1)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curves — One-vs-Rest", fontsize=13)
    ax.legend(loc="lower right")
    plt.tight_layout()
    path = OUT_DIR / "roc_curves.png"
    plt.savefig(path, dpi=150)
    print(f"Saved → {path}")
    plt.close()


def plot_shap(model, X_test, feature_cols, class_names):
    sample = X_test[:SHAP_SAMPLE]
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(sample)

    # Newer SHAP returns a 3D array (samples, features, classes); older returns list of 2D
    if isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
        sv = shap_values[:, :, -1]          # last class = Contaminated
    elif isinstance(shap_values, list):
        sv = shap_values[-1]                # last element = Contaminated
    else:
        sv = shap_values

    feat_arr = np.array(feature_cols)       # numpy array so fancy indexing works
    contaminated_idx = len(class_names) - 1

    fig, ax = plt.subplots(figsize=(8, 6))
    mean_abs = np.abs(sv).mean(axis=0)
    order = np.argsort(mean_abs)[::-1][:15]
    ax.barh(feat_arr[order[::-1]], mean_abs[order[::-1]], color="#1565C0")
    ax.set_xlabel("|SHAP value| mean")
    ax.set_title(f'Feature Importance — "{class_names[contaminated_idx]}" class', fontsize=12)
    plt.tight_layout()
    path = OUT_DIR / "shap_importance.png"
    plt.savefig(path, dpi=150)
    print(f"Saved → {path}")
    plt.close()

    # Save full importance CSV
    importance_df = pd.DataFrame({
        "feature": feature_cols,
        "mean_abs_shap_contaminated": np.abs(sv).mean(axis=0),
        "lgbm_gain": model.booster_.feature_importance(importance_type="gain"),
    }).sort_values("mean_abs_shap_contaminated", ascending=False)
    importance_df.to_csv(OUT_DIR / "feature_importance.csv", index=False)
    print(f"Saved → {OUT_DIR / 'feature_importance.csv'}")


def main():
    print("=== NAFAS Gabès — Evaluation ===\n")

    model, scaler, le_label, feature_cols = load_artefacts()
    class_names = le_label.classes_.tolist()
    n_classes = len(class_names)

    X_test, y_test = load_test_split(feature_cols, scaler, le_label)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    # Classification report
    print("=== Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=class_names, digits=3))

    macro_auc = roc_auc_score(y_test, y_prob, multi_class="ovr", average="macro")
    print(f"Macro ROC-AUC (OVR): {macro_auc:.4f}\n")

    # Plots
    plot_confusion_matrix(y_test, y_pred, class_names)
    plot_roc_curves(y_test, y_prob, class_names, n_classes)
    print("\nComputing SHAP values (this may take a minute)...")
    plot_shap(model, X_test, feature_cols, class_names)

    print("\nDone. All outputs saved to:", OUT_DIR.resolve())


if __name__ == "__main__":
    main()
