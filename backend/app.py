import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import numpy as np
from typing import List, Optional

# --- Config ---
MODEL_PATH = os.getenv("MODEL_PATH", "book_recommender.pkl")
DATASET_PATH = os.getenv("DATASET_PATH", "merged_books_dataset.csv")
TOP_K_DEFAULT = 5

app = FastAPI(title="Book Recommender API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # update with your React origin(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Input model for request ---
class UserProfile(BaseModel):
    user_id: Optional[str] = None
    preferences: Optional[dict] = {}   # e.g. {"genres": ["programming","data-science"], "skill_level":"Intermediate"}
    recent_activity: Optional[dict] = {}  # optional extra info
    top_k: Optional[int] = TOP_K_DEFAULT

# --- Load model + dataset ---
try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    # model may not be joblib-saved; try pickle load fallback
    import pickle
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    except Exception as e2:
        model = None
        print("Warning: Could not load model:", e, e2)

try:
    books_df = pd.read_csv(DATASET_PATH)
except Exception as e:
    books_df = None
    print("Warning: Could not load dataset:", e)

# --- Helper: map book rows to API DTO ---
def book_row_to_dict(row):
    return {
        "id": int(row.get("id") if "id" in row else row.get("book_id", None) or -1),
        "title": row.get("title", ""),
        "author": row.get("author", ""),
        "description": row.get("description", "")[:800],
        "genre": row.get("genre", ""),
        "rating": float(row.get("rating")) if "rating" in row and not pd.isna(row.get("rating")) else None,
        "pages": int(row.get("pages")) if "pages" in row and not pd.isna(row.get("pages")) else None,
        "coverImage": row.get("cover_url") if "cover_url" in row else row.get("coverImage", "/api/placeholder/200/300"),
        "difficulty": row.get("difficulty", "Intermediate"),
    }

# --- Recommendation engine wrapper ---
def recommend_with_model(profile: dict, top_k: int = TOP_K_DEFAULT):
    """
    Best-effort wrapper that supports:
      A) model with .recommend(profile, k)
      B) model with .predict or .transform + nearest neighbors logic
      C) fallback: filter by genres then return top rated
    Adapt as required for the exact model shape inside your pickle.
    """
    # 1) If model has a recommend method (ideal)
    if model is not None:
        # Option A: model exposes recommend(profile, k)
        if hasattr(model, "recommend"):
            try:
                recs = model.recommend(profile, top_k)
                # Expecting list of book ids or dicts. Normalize below.
                return recs
            except Exception:
                pass

        # Option B: if model has a transform or predict_proba to generate scores
        # We'll attempt a nearest-neighbor style fallback if a feature matrix exists in the pickle
        # Example: pickled object might be a tuple (knn_model, feature_matrix)
        if isinstance(model, tuple) and len(model) >= 2:
            knn = model[0]
            item_features = model[1]
            # create a user vector from profile -> you must adapt this mapping
            user_vector = profile_to_vector(profile, item_features.shape[1])
            try:
                # if knn has kneighbors
                dists, idxs = knn.kneighbors([user_vector], n_neighbors=top_k)
                return idxs[0].tolist()
            except Exception:
                pass

    # 2) If dataset exists, do a genre+rating fallback
    if books_df is not None:
        df = books_df.copy()
        prefs = profile.get("preferences", {}) if isinstance(profile, dict) else {}
        genres = prefs.get("genres", [])
        if genres:
            df = df[df['genre'].isin(genres)]
        # sort by rating if available
        if "rating" in df.columns:
            df = df.sort_values(by="rating", ascending=False)
        top = df.head(top_k).to_dict(orient="records")
        return [book_row_to_dict(pd.Series(r)) for r in top]

    # Final fallback: empty
    return []

# Simple profile -> vector function for option B (placeholder)
def profile_to_vector(profile: dict, dim:int):
    # Very naive: random or zero vector — replace with real transformation you used in training
    v = np.zeros(dim)
    # Example mapping: if profile preferences contain "skill_level"
    level = profile.get("preferences", {}).get("skill_level", "").lower()
    if level == "beginner":
        v[0] = 0.2
    elif level == "intermediate":
        v[0] = 0.5
    elif level == "advanced":
        v[0] = 0.9
    # NOTE: you must adapt this to how your model was trained
    return v

# --- API endpoints ---
@app.get("/")
def root():
    return {"status":"ok", "model_loaded": model is not None, "dataset_loaded": books_df is not None}

@app.post("/recommend")
def recommend(profile: UserProfile):
    if model is None and books_df is None:
        raise HTTPException(status_code=503, detail="Model and dataset not available on server.")
    try:
        results = recommend_with_model(profile.dict(), top_k=profile.top_k or TOP_K_DEFAULT)
        # Normalize results: if results are ids -> join with dataset to return full book objects
        if isinstance(results, list) and len(results) > 0:
            # detect if list of dicts already
            if isinstance(results[0], dict):
                return {"results": results}
            # if list of ints -> lookup in books_df
            if books_df is not None:
                out = []
                for r in results:
                    # r might be index or book id
                    if isinstance(r, int):
                        # try index lookup
                        if r >=0 and r < len(books_df):
                            out.append(book_row_to_dict(books_df.iloc[r]))
                        else:
                            # if book_id column exists:
                            row = books_df[books_df['id'] == r] if 'id' in books_df.columns else books_df[books_df['book_id']==r]
                            if not row.empty:
                                out.append(book_row_to_dict(row.iloc[0]))
                    else:
                        # unknown type -> skip
                        pass
                return {"results": out}
        # If results empty or unknown, try the fallback inside recommend_with_model
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
