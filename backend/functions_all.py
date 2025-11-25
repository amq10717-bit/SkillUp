import subprocess
import os
import random

def random_random_file(trim_duration=None, clips="random_clips", excluded_files=None):
    """
    Pick a random PNG or MP4 file from content/random_clips.
    If it's a video and trim_duration is set, trim it to that duration.
    Excludes files that have already been used.
    """
    folder_path = f"content/{clips}"
    extensions = (".png", ".mp4", ".jpg", ".jpeg")
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(extensions)]

    # If clips is "other_clips", set trim_duration to 7 seconds
    if clips == "other_clips":
        trim_duration = 7
    
    if excluded_files is None:
        excluded_files = []
    
    # Filter out already used files
    available_files = [f for f in files if os.path.join(folder_path, f) not in excluded_files]
    
    # If no unique files available, allow reuse (fallback)
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

    # Trim video if needed - save to sample folder
    if full_path.lower().endswith(".mp4") and trim_duration is not None:
        trimmed_path = os.path.join("sample", "trimmed_" + random_file)
        
        # Check video duration and trim only if video is longer than trim_duration
        # Use ffprobe to get video duration
        import json
        result = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1:noprint_wrappers=1", full_path
        ], capture_output=True, text=True)
        
        try:
            video_duration = float(result.stdout.strip())
            actual_trim = min(trim_duration, video_duration)  # Use original size if video is shorter
        except:
            actual_trim = trim_duration
        
        subprocess.run([
            "ffmpeg",
            "-i", full_path,
            "-t", str(actual_trim),
            "-c:v", "copy",
            "-c:a", "copy",
            "-y",
            trimmed_path
        ])
        print(f"Trimmed video saved to: {trimmed_path} (duration: {actual_trim}s)")
        return trimmed_path

    return full_path


# ------------------------------------  choose random file from the random clips  ------------------------------------
# ----------------------------------------------------------------------------------

def choose_random_file(topic, excluded_files=None, which_type="photos",
                       resolution_width=960, resolution_height=540,
                       video_trim_duration=5):
    folder_path = f"content/{topic}/{which_type}"
    
    
    if excluded_files is None:
        excluded_files = []

    # Allowed extensions
    extensions = (".png", ".mp4", ".jpg", ".jpeg")
    all_files = [f for f in os.listdir(folder_path) if f.lower().endswith(extensions)]
    
    # Filter out already used files
    available_files = [f for f in all_files if os.path.join(folder_path, f) not in excluded_files]

    # If no unique files available, allow reuse (fallback)
    if not available_files:
        if all_files:
            print(f"No more unique files available! Reusing from available files.")
            available_files = all_files
        else:
            video_trim_duration=5
            print(f"No files found in {folder_path}")
            folder_path="content/other_clips"
            available_files = [f for f  in os.listdir(folder_path) if f.lower().endswith(extensions)]

    random_file = random.choice(available_files)
    full_path = os.path.join(folder_path, random_file)
    print("Random file:", full_path)

    # If it’s a video, scale & trim it
    if full_path.lower().endswith(".mp4"):
        output_video = os.path.join(folder_path, "trimmed_" + random_file)
        cmd = [
            "ffmpeg",
            "-i", full_path,
            "-vf", f"scale={resolution_width}:{resolution_height}",
            "-r", "30",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-t", str(video_trim_duration),  # trim duration
            "-y",
            output_video
        ]
        subprocess.run(cmd)
        print("Trimmed & scaled video saved to:", output_video)
        return output_video  # return the processed video path
    else:
        return full_path  # return image path as is

# ------------------------------------  image to video  ------------------------------------
# ----------------------------------------------------------------------------------

def img2video(image, img_video, image_video_time, resolution_width, resolution_height):
    subprocess.run([
        "ffmpeg",
        "-loop", "1",
        "-i", image,
        "-t", f"{image_video_time}",
        "-vf", f"scale={resolution_width}:{resolution_height}",
        "-r", "30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-y",
        img_video
    ])


# ------------------------------------  change dimentions  ------------------------------------
def scale_video(video, scaled_video, resolution_width, resolution_height):
    subprocess.run([
        "ffmpeg",
        "-i", video,
        "-vf", f"scale={resolution_width}:{resolution_height}",
        "-r", "30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-y",
        scaled_video
    ])

# ------------------------------------  concat videos  ------------------------------------
def concat_videos(concat_list, intro_video, img_video,img_video2, scaled_video,clip_video,clip_video2, output):
    # 3. CONCAT LIST
    with open(concat_list, "w") as f:
        f.write(f"file {intro_video}\n")
        f.write(f"file {scaled_video}\n")
        f.write(f"file {img_video}\n")
        f.write(f"file {clip_video}\n")
        f.write(f"file {img_video2}\n")
        f.write(f"file {clip_video2}\n")


    # 4. CONCAT VIDEOS
    subprocess.run([
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        "-y",
        output
    ])


# ------------------------------------  remove all files in sample folder  ------------------------------------
def remove_all_files():
    # Remove all files in sample folder
    folder = "sample"
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
    
    # Remove all trimmed videos from content folders
    content_folder = "content"
    for root, dirs, files in os.walk(content_folder):
        for filename in files:
            if filename.startswith("trimmed_") and filename.endswith(".mp4"):
                file_path = os.path.join(root, filename)
                try:
                    os.remove(file_path)
                    print(f"Removed trimmed video: {file_path}")
                except Exception as e:
                    print(f"Error removing {file_path}: {e}")


def which_topic():
    print("Click owning number to select topic:\n1. Arrays\n2. Graphs\n3. Linked list\n4. Queue\n5. Stacks\n6. Trees")
    topic_choice = input("Enter the number of your choice: ")
    topic_dict = {
        "1": "arrays",
        "2": "graphs",
        "3": "linked_list",
        "4": "queue",
        "5": "stack",
        "6": "trees"
    }
    selected_topic = topic_dict.get(topic_choice, "arrays")
    print(f"You have selected: {selected_topic}")
    return selected_topic
