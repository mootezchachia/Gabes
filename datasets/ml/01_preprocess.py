"""
NAFAS Gabès — Step 1: Data Preprocessing
Filters GEMS Water global data to Mediterranean/MENA stations,
merges chemical parameters, engineers features, and saves a
clean parquet ready for training.
"""

import pandas as pd
import numpy as np
from pathlib import Path

# ── CONFIG ───────────────────────────────────────────────────────────────────
DATA_DIR = Path("../UNEP GEMSWater Global Freshwater Quality Archive")
OUT_DIR  = Path(".")
OUT_DIR.mkdir(exist_ok=True)

MED_MENA_COUNTRIES = [
    "Tunisia", "Algeria", "Morocco", "Libya", "Egypt",
    "Italy", "Spain", "France", "Greece", "Turkey",
    "Lebanon", "Israel", "Syria", "Jordan", "Malta",
    "Croatia", "Slovenia", "Albania", "Montenegro", "Portugal",
]

POLLUTANT_FILES = {
    "pb":      "Lead.csv",
    "cd":      "Cadmium.csv",
    "ni":      "Nickel.csv",
    "hg":      "Mercury.csv",
    "cr":      "Chromium.csv",
    "as":      "Arsenic.csv",
    "p":       "Phosphorus.csv",
    "n_ox":    "Oxidized_Nitrogen.csv",
    "n_other": "Other_Nitrogen.csv",
    "temp":    "Temperature.csv",
    "ph":      "pH.csv",
    "dgas":    "Dissolved_Gas.csv",
    "optical": "Optical.csv",
}

# WHO drinking water guidelines (mg/L) used to derive labels
WHO_LIMITS = {
    "pb": 0.01, "cd": 0.003, "hg": 0.001,
    "as": 0.01, "cr": 0.05,  "ni": 0.07,
}


# ── HELPERS ──────────────────────────────────────────────────────────────────

def fix_decimal(series: pd.Series) -> pd.Series:
    """Convert European comma-decimal strings (e.g. '43,36') to float."""
    if series.dtype == object:
        return pd.to_numeric(series.astype(str).str.replace(",", "."), errors="coerce")
    return pd.to_numeric(series, errors="coerce")


def load_stations(data_dir: Path) -> pd.DataFrame:
    path = data_dir / "GEMStat_station_metadata.csv"
    df = pd.read_csv(path, encoding="latin-1", sep=None, engine="python", on_bad_lines="skip")
    df.columns = df.columns.str.replace(" ", "_").str.replace(".", "_", regex=False)
    for c in df.columns:
        if any(k in c.lower() for k in ["lat", "lon", "elev", "area", "depth", "width", "discharge"]):
            df[c] = fix_decimal(df[c])
    print(f"Loaded {len(df):,} stations globally")
    return df


def filter_med_stations(stations: pd.DataFrame):
    country_col = next((c for c in stations.columns if "country" in c.lower()), None)
    id_col = (
        next((c for c in stations.columns if "station" in c.lower() and "number" in c.lower()), None)
        or next((c for c in stations.columns if "gems" in c.lower() and "station" in c.lower()), None)
    )
    if country_col is None or id_col is None:
        raise ValueError(f"Cannot find required columns. Available: {stations.columns.tolist()}")
    med = stations[stations[country_col].isin(MED_MENA_COUNTRIES)]
    ids = med[id_col].astype(str).tolist()
    print(f"Mediterranean/MENA stations: {len(ids):,}")
    return ids, id_col


def load_param(data_dir: Path, param_name: str, fname: str, station_ids: list) -> pd.DataFrame:
    fpath = data_dir / fname
    if not fpath.exists():
        print(f"  [SKIP] {fname} not found")
        return pd.DataFrame()

    chunks = []
    for chunk in pd.read_csv(fpath, chunksize=200_000, encoding="latin-1",
                              sep=None, engine="python", on_bad_lines="skip"):
        chunk.columns = chunk.columns.str.replace(" ", "_").str.replace(".", "_", regex=False)
        sid_col  = next((c for c in chunk.columns if "station" in c.lower() and "number" in c.lower()), None)
        val_col  = next((c for c in chunk.columns if c.lower() == "value"), None)
        date_col = next((c for c in chunk.columns if "date" in c.lower()), None)
        if not all([sid_col, val_col, date_col]):
            break
        chunk = chunk[chunk[sid_col].astype(str).isin(station_ids)]
        if chunk.empty:
            continue
        chunk = chunk[[sid_col, date_col, val_col]].copy()
        chunk[val_col] = fix_decimal(chunk[val_col])
        chunk.rename(columns={sid_col: "station_id", date_col: "sample_date", val_col: param_name}, inplace=True)
        chunks.append(chunk)

    if not chunks:
        print(f"  [EMPTY] {fname}")
        return pd.DataFrame()

    out = pd.concat(chunks, ignore_index=True)
    print(f"  {fname}: {len(out):,} rows")
    return out


def build_label(merged: pd.DataFrame) -> pd.Categorical:
    """
    WHO-threshold label:
      Clean        — no heavy metal exceeds limit
      Moderate     — max exceedance ratio 1–2×
      Suspect      — max exceedance ratio 2–5×
      Contaminated — any metal exceeds 5× limit OR 3+ metals exceed limit
    """
    present = {p: lim for p, lim in WHO_LIMITS.items() if p in merged.columns}
    if not present:
        return pd.Categorical(
            ["Moderate"] * len(merged),
            categories=["Clean", "Moderate", "Suspect", "Contaminated"],
        )
    ratio_df   = pd.DataFrame({p: merged[p] / lim for p, lim in present.items()})
    max_ratio  = ratio_df.max(axis=1)
    n_exceeded = (ratio_df > 1.0).sum(axis=1)

    label = pd.Series("Clean", index=merged.index)
    label[max_ratio >= 1.0]                        = "Moderate"
    label[max_ratio >= 2.0]                        = "Suspect"
    label[(max_ratio >= 5.0) | (n_exceeded >= 3)]  = "Contaminated"

    print("Label distribution (WHO-threshold):")
    print(label.value_counts())
    return pd.Categorical(label, categories=["Clean", "Moderate", "Suspect", "Contaminated"])


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("=== NAFAS Gabès — Preprocessing ===\n")

    stations = load_stations(DATA_DIR)
    station_ids, station_id_col = filter_med_stations(stations)

    print("\nLoading chemical parameters...")
    param_frames = {}
    for param_name, fname in POLLUTANT_FILES.items():
        df = load_param(DATA_DIR, param_name, fname, station_ids)
        if not df.empty:
            param_frames[param_name] = df

    if not param_frames:
        raise RuntimeError("No parameter data loaded. Check DATA_DIR path.")

    print("\nPivoting to wide format...")
    merged = None
    for param_name, df in param_frames.items():
        df["sample_date"] = pd.to_datetime(df["sample_date"], errors="coerce")
        df = df.dropna(subset=["sample_date"])
        df["sample_date"] = df["sample_date"].dt.normalize()
        df = df.groupby(["station_id", "sample_date"], as_index=False)[param_name].median()
        merged = df if merged is None else merged.merge(df, on=["station_id", "sample_date"], how="outer")

    print(f"Wide frame shape: {merged.shape}")

    merged["label"]  = build_label(merged)
    merged["month"]  = merged["sample_date"].dt.month
    merged["season"] = (merged["month"] % 12 // 3).map(
        {0: "winter", 1: "spring", 2: "summer", 3: "autumn"}
    )

    # Join station metadata (lat, lon, elevation, water type)
    lat_col   = next((c for c in stations.columns if "lat"        in c.lower()), None)
    lon_col   = next((c for c in stations.columns if "lon"        in c.lower()), None)
    elev_col  = next((c for c in stations.columns if "elev"       in c.lower()), None)
    wtype_col = next((c for c in stations.columns if "water_type" in c.lower()), None)

    keep_cols = [station_id_col]
    rmap      = {station_id_col: "station_id"}
    for col, nm in [(lat_col, "lat"), (lon_col, "lon"), (elev_col, "elevation"), (wtype_col, "water_type")]:
        if col:
            keep_cols.append(col)
            rmap[col] = nm

    station_meta = stations[keep_cols].rename(columns=rmap)
    station_meta["station_id"] = station_meta["station_id"].astype(str)
    merged["station_id"]       = merged["station_id"].astype(str)
    merged = merged.merge(station_meta, on="station_id", how="left")

    # Ensure all numeric feature columns are actually float
    num_cols = [c for c in merged.columns
                if c not in ("station_id", "sample_date", "label", "season", "water_type")]
    for c in num_cols:
        merged[c] = fix_decimal(merged[c])

    out_path = OUT_DIR / "nafas_features.parquet"
    merged.to_parquet(out_path, index=False)
    print(f"\nSaved {len(merged):,} rows → {out_path}")


if __name__ == "__main__":
    main()
