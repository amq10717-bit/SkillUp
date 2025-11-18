from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os, uuid, shutil

# Import functions from your model files
from text_extractor import extract_content
from pre_processing import giving_avg_score, tfidf_similarity_approach, compare_with_others, split_into_500_word_chunks

app = FastAPI()

# Allow requests from your React frontend (default React runs on http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def compute_final_score(teacher_sim, ai_prob, max_student_sim, weights=(0.7, 0.2, 0.1)):
    """Combine scores into a final percentage between 0 and 1"""
    w_teacher, w_ai, w_other = weights
    final = (teacher_sim * w_teacher) + ((1.0 - ai_prob) * w_ai) + ((1.0 - max_student_sim) * w_other)
    return max(0.0, min(1.0, final))

@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    assignment_id: str = Form(...),
    student_id: str = Form(...),
    total_marks: int = Form(100),
    teacher_solution_text: str = Form("")  # optional
):
    # 1) Save uploaded file
    file_id = f"{uuid.uuid4().hex}_{file.filename}"
    saved_path = os.path.join(UPLOAD_DIR, file_id)
    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2) Extract text
    extracted_text = extract_content(saved_path)

    # 3) AI probability score
    chunks = split_into_500_word_chunks(extracted_text)
    ai_prob = giving_avg_score(chunks)

    # 4) Teacher similarity (if provided)
    teacher_sim = 0.0
    if teacher_solution_text.strip():
        teacher_sim = tfidf_similarity_approach(extracted_text, teacher_solution_text)

    # 5) Compare with other student submissions
    _, max_student_sim = compare_with_others(extracted_text)

    # 6) Compute final score
    score_percent = compute_final_score(teacher_sim, ai_prob, max_student_sim)
    grade = round(score_percent * float(total_marks))

    return {
        "grade": grade,
        "total_marks": total_marks,
        "score_percent": score_percent,
        "ai_probability": ai_prob,
        "teacher_similarity": teacher_sim,
        "max_student_similarity": max_student_sim,
        "message": "Analysis complete"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
