import subprocess
import os

def add_audio_to_video(video_file, audio_file, output_file):
    """
    Add audio to video using FFmpeg
    Removes original video audio and replaces with new audio
    Trims audio to match video duration if necessary
    """
    # Command to add audio to video
    # -an = remove original audio from video
    # -i video = input video
    # -i audio = input audio
    # -c:v copy = copy video codec without re-encoding
    # -c:a aac = encode audio as AAC
    # -map 0:v = map video from first input (video file)
    # -map 1:a = map audio from second input (audio file)
    # -shortest = trim to the shortest stream
    cmd = [
        "ffmpeg",
        "-i", video_file,      # Input video
        "-i", audio_file,      # Input audio
        "-c:v", "copy",        # Copy video without re-encoding
        "-c:a", "aac",         # Encode audio as AAC
        "-map", "0:v",         # Map video from first input
        "-map", "1:a",         # Map audio from second input (replaces original)
        "-shortest",           # Trim to shortest stream
        "-y",                  # Overwrite output
        output_file
    ]
    
    print(f"Adding audio to video (muting original audio)...")
    print(f"Video: {video_file}")
    print(f"Audio: {audio_file}")
    print(f"Output: {output_file}")
    
    subprocess.run(cmd, check=True)
    print(f"✓ Video with audio saved to {output_file}")

# Example usage:
# add_audio_to_video("final_output.mp4", "output.wav", "final_video_with_audio.mp4")
