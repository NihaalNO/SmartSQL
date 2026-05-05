"""
scikit-learn based ML insight utilities.
These run on query result data to surface simple analytical patterns.
"""
from typing import Any, Dict, List, Optional
import numpy as np


def detect_anomalies(rows: List[Dict], numeric_col: str) -> Dict[str, Any]:
    """Flag rows where a numeric column is an outlier (Z-score > 2.5)."""
    try:
        from sklearn.preprocessing import StandardScaler

        values = np.array([float(r[numeric_col]) for r in rows if r.get(numeric_col) is not None])
        if len(values) < 4:
            return {"anomalies": [], "note": "Not enough data for anomaly detection"}

        scaler = StandardScaler()
        z_scores = scaler.fit_transform(values.reshape(-1, 1)).flatten()
        anomaly_indices = [int(i) for i, z in enumerate(z_scores) if abs(z) > 2.5]
        return {"anomalies": anomaly_indices, "z_scores": z_scores.tolist()}
    except Exception as exc:
        return {"anomalies": [], "error": str(exc)}


def cluster_rows(rows: List[Dict], numeric_cols: List[str], n_clusters: int = 3) -> Dict[str, Any]:
    """K-Means cluster rows on numeric columns and return cluster labels."""
    try:
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler

        matrix = []
        for row in rows:
            try:
                matrix.append([float(row.get(c, 0) or 0) for c in numeric_cols])
            except (TypeError, ValueError):
                continue

        if len(matrix) < n_clusters:
            return {"labels": [], "note": "Not enough rows to cluster"}

        X = StandardScaler().fit_transform(matrix)
        km = KMeans(n_clusters=min(n_clusters, len(matrix)), random_state=42, n_init="auto")
        labels = km.fit_predict(X).tolist()
        return {"labels": labels, "n_clusters": n_clusters}
    except Exception as exc:
        return {"labels": [], "error": str(exc)}


def summarize_numeric(rows: List[Dict], col: str) -> Dict[str, Any]:
    """Return basic descriptive stats for a numeric column."""
    try:
        values = [float(r[col]) for r in rows if r.get(col) is not None]
        if not values:
            return {}
        arr = np.array(values)
        return {
            "min": float(arr.min()),
            "max": float(arr.max()),
            "mean": float(arr.mean()),
            "median": float(np.median(arr)),
            "std": float(arr.std()),
            "count": len(values),
        }
    except Exception:
        return {}
