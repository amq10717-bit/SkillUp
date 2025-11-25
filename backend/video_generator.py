import os
from functions_all import img2video, scale_video, concat_videos, choose_random_file, random_random_file, remove_all_files
from tts import generate_tts
from audio_video import add_audio_to_video
import subprocess

# Test FFmpeg availability at module load
try:
    from functions_all import FFMPEG_PATH
    subprocess.run([FFMPEG_PATH, "-version"], check=True, capture_output=True)
    FFMPEG_AVAILABLE = True
    print("✅ FFmpeg is available")
except:
    FFMPEG_AVAILABLE = False
    print("❌ FFmpeg is not available - video generation will use fallback")

def generate_video_pipeline(topic_name):
    """
    Orchestrates the video generation process for the API.
    """
    print(f"🎬 Starting video generation for: {topic_name}")
    
    if not FFMPEG_AVAILABLE:
        return {
            "error": "FFmpeg is not installed or not in PATH. Please install FFmpeg and add it to system PATH.",
            "fallback": True
        }
    
    # 1. Clean up previous run
    try:
        remove_all_files()
    except Exception as e:
        print(f"Warning during cleanup: {e}")

    # 2. Ensure directories exist
    os.makedirs("sample", exist_ok=True)
    os.makedirs("content", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)

    # Settings
    image_clip_time = 5 # seconds per clip
    target_resolution_w = 960
    target_resolution_h = 540
    
    # Check if topic content exists
    topic_path = os.path.join("content", topic_name)
    if not os.path.exists(topic_path) or not os.listdir(topic_path):
        return {"error": f"No content found for topic '{topic_name}'. Please create folder 'backend/content/{topic_name}' and add images."}

    try:
        selected_photos = []

        # Step A: Create Intro Video
        print("Step 1: Creating Intro...")
        intro_img = choose_random_file(topic=topic_name, which_type="intro")
        if not intro_img:
            # Fallback if no specific intro image
            intro_img = choose_random_file(topic=topic_name, which_type="photos")
            
        img2video(
            image=intro_img,
            img_video="sample/temp_intro_video.mp4",
            image_video_time=image_clip_time,
            resolution_width=target_resolution_w,
            resolution_height=target_resolution_h
        )

        # Step B: Create Content Video
        print("Step 2: Creating Body Content...")
        random_img = choose_random_file(topic=topic_name, which_type="photos", excluded_files=selected_photos)
        if random_img:
            selected_photos.append(random_img)
            img2video(
                image=random_img,
                img_video="sample/temp_image1_video.mp4",
                image_video_time=image_clip_time,
                resolution_width=target_resolution_w,
                resolution_height=target_resolution_h
            )
        else:
            # Duplicate intro if no other images
            img2video(
                image=intro_img,
                img_video="sample/temp_image1_video.mp4",
                image_video_time=image_clip_time,
                resolution_width=target_resolution_w,
                resolution_height=target_resolution_h
            )

        # Step C: Stitch Videos
        print("Step 3: Stitching Videos...")
        # Create a simplified concat list for this demo
        concat_list_path = "sample/final_concat_list.txt"
        with open(concat_list_path, 'w') as f:
            f.write("file 'temp_intro_video.mp4'\n")
            f.write("file 'temp_image1_video.mp4'\n")
        
        # We call ffmpeg directly here for simplicity
        from functions_all import FFMPEG_PATH
        subprocess.run([
            FFMPEG_PATH,
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_path,
            "-c", "copy",
            "-y",
            "sample/final_output.mp4"
        ], check=True)

        # Step D: Generate Audio (Script + TTS)
        print("Step 4: Generating Script & Audio...")
        generate_tts(topic_name) 

        # Step E: Merge Audio and Video
        print("Step 5: Merging Audio & Video...")
        final_filename = f"final_{topic_name}_video.mp4"
        output_path = os.path.join("uploads", final_filename)
        
        add_audio_to_video(
            video_file="sample/final_output.mp4", 
            audio_file="output.wav", 
            output_file=output_path
        )

        return {"status": "success", "file_path": output_path, "filename": final_filename}

    except Exception as e:
        print(f"❌ Error generating video: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}