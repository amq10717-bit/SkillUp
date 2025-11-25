from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import subprocess
import sys
from pathlib import Path
import time
from typing import Dict, List, Optional
import asyncio

app = FastAPI(title="Video Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = "uploads"
CONTENT_FOLDER = "content"

# Valid topics (only these can generate videos)
VALID_TOPICS = ['arrays', 'graphs', 'linked_list', 'queue', 'stack', 'trees']

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Store generation status
generation_status: Dict[str, dict] = {}


# ==================== REQUEST MODELS ====================

class GenerateVideoRequest(BaseModel):
    topic: str


# ==================== API ROUTES ====================

@app.get("/api/topics")
async def get_topics() -> List[str]:
    """Get list of available topics"""
    try:
        # Return only valid topics that actually have content
        valid_existing_topics = [
            topic for topic in VALID_TOPICS
            if os.path.isdir(os.path.join(CONTENT_FOLDER, topic))
        ]
        return sorted(valid_existing_topics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate")
async def generate_video(topic: str, background_tasks: BackgroundTasks):
    """Generate video for a given topic"""
    # Validate topic against whitelist
    if topic not in VALID_TOPICS:
        raise HTTPException(status_code=400, detail=f"Invalid topic. Valid topics: {', '.join(VALID_TOPICS)}")
    
    # Check if topic folder exists
    if not os.path.isdir(os.path.join(CONTENT_FOLDER, topic)):
        raise HTTPException(status_code=400, detail=f"Topic folder not found: {topic}")
    
    # Create unique job ID
    job_id = f"{topic}_{int(time.time())}"
    
    # Initialize status
    generation_status[job_id] = {
        'status': 'generating',
        'progress': 10,
        'topic': topic,
        'timestamp': time.time()
    }
    
    # Add background task
    background_tasks.add_task(run_generation, job_id, topic)
    
    return {
        'job_id': job_id,
        'topic': topic,
        'message': 'Video generation started'
    }


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    """Get generation status"""
    if job_id not in generation_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return generation_status[job_id]


@app.get("/download/{job_id}")
async def download_video(job_id: str):
    """Download generated video"""
    if job_id not in generation_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    status = generation_status[job_id]
    if status['status'] != 'complete':
        raise HTTPException(status_code=400, detail="Video not ready yet")
    
    video_path = os.path.join(UPLOAD_FOLDER, f"{job_id}.mp4")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=f"video_{job_id}.mp4"
    )


@app.get("/api/cleanup/{job_id}")
async def cleanup_job(job_id: str):
    """Clean up generated video"""
    video_path = os.path.join(UPLOAD_FOLDER, f"{job_id}.mp4")
    try:
        if os.path.exists(video_path):
            os.remove(video_path)
        if job_id in generation_status:
            del generation_status[job_id]
        return {'message': 'Cleanup successful'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status-all")
async def get_all_status():
    """Get all job statuses"""
    return generation_status


# ==================== BACKGROUND TASKS ====================

def run_generation(job_id: str, topic: str):
    """Background task to generate video"""
    try:
        # Run non-interactive video generation script
        # Use the same Python interpreter that's running the API to ensure
        # the background subprocess uses the same virtual environment.
        script_dir = Path(__file__).resolve().parent
        python_exe = sys.executable
        generate_script = script_dir / 'generate_video.py'
        result = subprocess.run(
            [python_exe, str(generate_script), topic],
            capture_output=True,
            text=True,
            cwd=str(script_dir),
            timeout=600
        )
        
        if result.returncode != 0:
            generation_status[job_id] = {
                'status': 'error',
                'progress': 0,
                'error': result.stderr,
                'timestamp': time.time()
            }
            return
        
        # Move generated video to uploads folder
        src_video = 'final_video_with_audio.mp4'
        dst_video = os.path.join(UPLOAD_FOLDER, f'{job_id}.mp4')
        
        if os.path.exists(src_video):
            os.rename(src_video, dst_video)
            generation_status[job_id] = {
                'status': 'complete',
                'progress': 100,
                'video': f'{job_id}.mp4',
                'timestamp': time.time()
            }
        else:
            generation_status[job_id] = {
                'status': 'error',
                'progress': 0,
                'error': 'Video file not created after generation',
                'timestamp': time.time()
            }
    
    except subprocess.TimeoutExpired:
        generation_status[job_id] = {
            'status': 'error',
            'progress': 0,
            'error': 'Video generation timed out',
            'timestamp': time.time()
        }
    except Exception as e:
        generation_status[job_id] = {
            'status': 'error',
            'progress': 0,
            'error': str(e),
            'timestamp': time.time()
        }


# ==================== SERVE STATIC FILES ====================

# Mount static files
os.makedirs("static", exist_ok=True)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """Serve index.html"""
    return FileResponse("templates/index.html", media_type="text/html")


# Health check
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {'status': 'ok'}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)



# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/")
# def read_root():
#     return {"message": "FastAPI is running!"}
