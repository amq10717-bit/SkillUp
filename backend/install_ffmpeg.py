import subprocess
import os
import random
import shutil

# Try to find FFmpeg in various locations
def find_ffmpeg():
    # Check if ffmpeg is in PATH
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    
    # Check common installation paths
    common_paths = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe", 
        r"C:\tools\ffmpeg\bin\ffmpeg.exe",
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    # Try using the Python package
    try:
        import ffmpeg
        # ffmpeg-python is a wrapper, but we need the binary
        # Let's try to find it via the package
        return "ffmpeg"  # Fallback to hoping it's in PATH
    except ImportError:
        pass
    
    return None

FFMPEG_PATH = find_ffmpeg()

if FFMPEG_PATH:
    print(f"✅ Found FFmpeg at: {FFMPEG_PATH}")
else:
    print("❌ FFmpeg not found. Please install it using: pip install ffmpeg-python")

def random_random_file(trim_duration=None, clips="random_clips", excluded_files=None):
    """
    Pick a random PNG or MP4 file from content/random_clips.
    If it's a video and trim_duration is set, trim it to that duration.
    Excludes files that have already been used.
    """
    if not FFMPEG_PATH:
        raise Exception("FFmpeg not available. Please install ffmpeg-python")
    
    folder_path = f"content/{clips}"
    extensions = (".png", ".mp4", ".jpg", ".jpeg")
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(extensions)]

    if clips == "other_clips":
        trim_duration = 7
    
    if excluded_files is None:
        excluded_files = []
    
    available_files = [f for f in files if os.path.join(folder_path, f) not in excluded_files]
    
    if not available_files:
        if files:
            print(f"No more unique files available! Reusing from available files.")
            available_files = files
        else:
            print(f"No PNG or MP4 files found in {folder_path}!")
            return None

    random_file = random.choice(available_files)
    full_path = os.path.join(folder_path, random_file)
    print("Random file:", full_path)

    # Trim video if needed
    if full_path.lower().endswith(".mp4") and trim_duration is not None:
        trimmed_path = os.path.join("sample", "trimmed_" + random_file)
        
        try:
            result = subprocess.run([
                FFMPEG_PATH, "-i", full_path
            ], capture_output=True, text=True)
            
            # Simple trim without duration check for now
            actual_trim = trim_duration
        except:
            actual_trim = trim_duration
        
        subprocess.run([
            FFMPEG_PATH,
            "-i", full_path,
            "-t", str(actual_trim),
            "-c:v", "copy",
            "-c:a", "copy",
            "-y",
            trimmed_path
        ], check=True)
        print(f"Trimmed video saved to: {trimmed_path}")
        return trimmed_path

    return full_path

def choose_random_file(topic, excluded_files=None, which_type="photos",
                       resolution_width=960, resolution_height=540,
                       video_trim_duration=5):
    if not FFMPEG_PATH:
        raise Exception("FFmpeg not available. Please install ffmpeg-python")
    
    folder_path = f"content/{topic}/{which_type}"
    
    if excluded_files is None:
        excluded_files = []

    extensions = (".png", ".mp4", ".jpg", ".jpeg")
    all_files = [f for f in os.listdir(folder_path) if f.lower().endswith(extensions)]
    
    available_files = [f for f in all_files if os.path.join(folder_path, f) not in excluded_files]

    if not available_files:
        if all_files:
            print(f"No more unique files available! Reusing from available files.")
            available_files = all_files
        else:
            print(f"No files found in {folder_path}")
            folder_path="content/other_clips"
            available_files = [f for f in os.listdir(folder_path) if f.lower().endswith(extensions)]

    random_file = random.choice(available_files)
    full_path = os.path.join(folder_path, random_file)
    print("Random file:", full_path)

    # If it's a video, scale & trim it
    if full_path.lower().endswith(".mp4"):
        output_video = os.path.join("sample", "processed_" + random_file)
        cmd = [
            FFMPEG_PATH,
            "-i", full_path,
            "-vf", f"scale={resolution_width}:{resolution_height}",
            "-r", "30",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-t", str(video_trim_duration),
            "-y",
            output_video
        ]
        subprocess.run(cmd, check=True)
        print("Processed video saved to:", output_video)
        return output_video
    else:
        return full_path

def img2video(image, img_video, image_video_time, resolution_width, resolution_height):
    if not FFMPEG_PATH:
        raise Exception("FFmpeg not available. Please install ffmpeg-python")
    
    image = os.path.normpath(image)
    
    subprocess.run([
        FFMPEG_PATH,
        "-loop", "1",
        "-i", image,
        "-t", f"{image_video_time}",
        "-vf", f"scale={resolution_width}:{resolution_height}",
        "-r", "30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-y",
        img_video
    ], check=True)

def scale_video(video, scaled_video, resolution_width, resolution_height):
    if not FFMPEG_PATH:
        raise Exception("FFmpeg not available. Please install ffmpeg-python")
    
    subprocess.run([
        FFMPEG_PATH,
        "-i", video,
        "-vf", f"scale={resolution_width}:{resolution_height}",
        "-r", "30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-y",
        scaled_video
    ], check=True)

def concat_videos(concat_list, intro_video, img_video, img_video2, scaled_video, clip_video, clip_video2, output):
    if not FFMPEG_PATH:
        raise Exception("FFmpeg not available. Please install ffmpeg-python")
    
    with open(concat_list, "w") as f:
        f.write(f"file {intro_video}\n")
        f.write(f"file {scaled_video}\n")
        f.write(f"file {img_video}\n")
        f.write(f"file {clip_video}\n")
        f.write(f"file {img_video2}\n")
        f.write(f"file {clip_video2}\n")

    subprocess.run([
        FFMPEG_PATH,
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        "-y",
        output
    ], check=True)

def remove_all_files():
    folder = "sample"
    if os.path.exists(folder):
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
    
    # Remove processed videos
    content_folder = "content"
    for root, dirs, files in os.walk(content_folder):
        for filename in files:
            if filename.startswith(("trimmed_", "processed_")) and filename.endswith(".mp4"):
                file_path = os.path.join(root, filename)
                try:
                    os.remove(file_path)
                    print(f"Removed processed video: {file_path}")
                except Exception as e:
                    print(f"Error removing {file_path}: {e}")