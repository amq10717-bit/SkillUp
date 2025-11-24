from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import uuid
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# --- IMPORT CUSTOM MODULES ---
from text_extractor import extract_content
from pre_processing import giving_avg_score, split_into_500_word_chunks

# CORRECT IMPORT: import the function 'get_recommendations'
from recommender import get_recommendations 

app = FastAPI()

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- DATA MODELS ---

class AnalysisRequest(BaseModel):
    file_url: str
    assignment_id: str
    student_id: str
    total_marks: int = 100
    teacher_solution_text: Optional[str] = "" 
    other_student_texts: Optional[List[str]] = [] 
    file_name: str

class RecommendationRequest(BaseModel):
    user_id: str
    interests: List[str]
    recent_assignments: List[str]
    desired_difficulty: str
    skill_level: int
    num_results: int = 5

# --- HELPER FUNCTIONS ---

def calculate_similarity(text1, text2):
    if not text1 or not text2:
        return 0.0
    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        return cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    except Exception as e:
        print(f"Similarity calculation error: {e}")
        return 0.0

def compare_with_classmates(current_text, other_texts):
    if not other_texts:
        return 0.0
    
    max_sim = 0.0
    for other_text in other_texts:
        sim = calculate_similarity(current_text, other_text)
        if sim > max_sim:
            max_sim = sim
    return max_sim

def compute_final_grade(teacher_sim, ai_prob, student_sim, total_marks, has_teacher_sol):
    ai_penalty = ai_prob * 0.5
    plagiarism_penalty = student_sim * 1.0
    base_score = 1.0

    if has_teacher_sol:
        score = (teacher_sim * 0.6) + ((1.0 - ai_penalty) * 0.2) + ((1.0 - plagiarism_penalty) * 0.2)
    else:
        score = base_score - ai_penalty - plagiarism_penalty

    final_percent = max(0.0, min(1.0, score))
    return round(final_percent * total_marks), final_percent

def download_file(url, save_path):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"Error downloading: {e}")
        return False

# --- API ENDPOINTS ---

@app.get("/")
def root():
    return {"message": "SkillUp AI Backend is Running"}

@app.post("/api/recommend")
def recommend_endpoint(payload: RecommendationRequest):
    # Call the correct function name here
    books = get_recommendations(
        interests=payload.interests,
        recent_assignments=payload.recent_assignments,
        difficulty=payload.desired_difficulty,
        # Note: get_recommendations definition in recommender.py needs to accept num_results
        # If your recommender.py didn't have num_results, remove that argument below.
        num_results=payload.num_results 
    )
    return { "books": books }

@app.post("/api/analyze")
async def analyze(request: AnalysisRequest):
    print(f"Processing File: {request.file_name}")
    
    file_ext = os.path.splitext(request.file_name)[1]
    if not file_ext:
        file_ext = ".pdf"
        
    local_filename = f"{uuid.uuid4().hex}{file_ext}"
    saved_path = os.path.join(UPLOAD_DIR, local_filename)
    
    if not download_file(request.file_url, saved_path):
        raise HTTPException(status_code=400, detail="Download failed")

    try:
        extracted_text = extract_content(saved_path)
        
        if not extracted_text or len(extracted_text.strip()) == 0:
             if os.path.exists(saved_path):
                os.remove(saved_path)
             return {"grade": 0, "message": "Empty file or unreadable content"}

        chunks = split_into_500_word_chunks(extracted_text)
        ai_prob = giving_avg_score(chunks)

        has_teacher_sol = bool(request.teacher_solution_text and request.teacher_solution_text.strip())
        teacher_sim = 0.0
        if has_teacher_sol:
            teacher_sim = calculate_similarity(extracted_text, request.teacher_solution_text)

        max_student_sim = compare_with_classmates(extracted_text, request.other_student_texts)

        grade, score_percent = compute_final_grade(
            teacher_sim, ai_prob, max_student_sim, request.total_marks, has_teacher_sol
        )

        if os.path.exists(saved_path):
            os.remove(saved_path)

        return {
            "grade": grade,
            "total_marks": request.total_marks,
            "score_percent": float(score_percent),
            "ai_probability": float(ai_prob),
            "teacher_similarity": float(teacher_sim),
            "max_student_similarity": float(max_student_sim),
            "message": "Analysis complete"
        }

    except Exception as e:
        print(f"Error during analysis: {e}")
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)