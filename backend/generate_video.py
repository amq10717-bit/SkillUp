#!/usr/bin/env python3
"""
Non-interactive video generation script for web API
Accepts topic as command-line argument instead of stdin prompt
Generates 30-second videos with structure from final.py
Total: 30 sec = 6 clips × 5 sec each
Structure: intro (5s) + photo (5s) + random_clip (5s) + photo (5s) + topic_clip (5s) + topic_clip (5s)
"""
import sys
import os
import random

from functions_all import (img2video, scale_video, concat_videos, 
                          choose_random_file, random_random_file, 
                          remove_all_files)
from llm import setup_genai
from tts import generate_tts
from audio_video import add_audio_to_video

if len(sys.argv) != 2:
    print("Usage: python generate_video.py <topic>")
    sys.exit(1)

topic = sys.argv[1]

# Validate topic - only accept actual topics (not utility folders)
valid_topics = ['arrays', 'graphs', 'linked_list', 'queue', 'stack', 'trees']
if topic not in valid_topics:
    print(f"Error: Topic '{topic}' not found. Valid topics: {', '.join(valid_topics)}")
    sys.exit(1)

print(f"🎬 Generating 30-second video for topic: {topic}")

# Setup API
try:
    setup_genai(topic)
except Exception as e:
    print(f"Error setting up API: {e}")
    sys.exit(1)

# Initialize tracking lists
intro_selected_photo = []
selected_photos = []
selected_clips = []
selected_random_clips = []

# Video parameters: 30 seconds total, 5 seconds per segment × 6 segments
video_duration = 30
image_clip_time = 5  # 5 seconds per segment

try:
    # Ensure sample folder exists
    os.makedirs("sample", exist_ok=True)

    # ==================== PART 1: INTRO VIDEO ====================
    print("📸 Part 1: Creating intro video (5 sec)...")
    intro_img = choose_random_file(topic=topic, which_type="intro")
    intro_selected_photo.append(intro_img)
    img2video(
        image=intro_img,
        img_video="sample/temp_intro_video.mp4",
        image_video_time=image_clip_time,
        resolution_width=960,
        resolution_height=540
    )

    # ==================== PART 2: FIRST PHOTO ====================
    print("📸 Part 2: Creating first photo video (5 sec)...")
    random_img = choose_random_file(topic=topic, which_type="photos", 
                                   excluded_files=selected_photos)
    selected_photos.append(random_img)
    img2video(
        image=random_img,
        img_video="sample/temp_image1_video.mp4",
        image_video_time=image_clip_time,
        resolution_width=960,
        resolution_height=540
    )

    # ==================== PART 3: RANDOM CLIP ====================
    print("🎬 Part 3: Creating random clip video (5 sec)...")
    random_clip = random_random_file(trim_duration=image_clip_time, 
                                    clips="random_clips", 
                                    excluded_files=selected_random_clips)
    selected_random_clips.append(random_clip)
    scale_video(
        video=random_clip,
        scaled_video="sample/temp_random_clip.mp4",
        resolution_width=960,
        resolution_height=540
    )

    # ==================== PART 4: SECOND PHOTO ====================
    print("📸 Part 4: Creating second photo video (5 sec)...")
    random_img_2 = choose_random_file(topic=topic, which_type="photos",
                                     excluded_files=intro_selected_photo + selected_photos)
    selected_photos.append(random_img_2)
    img2video(
        image=random_img_2,
        img_video="sample/temp_image2_video.mp4",
        image_video_time=image_clip_time,
        resolution_width=960,
        resolution_height=540
    )

    # ==================== PART 5: FIRST TOPIC CLIP ====================
    print("🎬 Part 5: Creating first topic clip video (5 sec)...")
    clips_img = choose_random_file(topic=topic, which_type="clips",
                                  excluded_files=selected_clips,
                                  video_trim_duration=image_clip_time)
    selected_clips.append(clips_img)
    scale_video(
        video=clips_img,
        scaled_video="sample/temp_topic_clip.mp4",
        resolution_width=960,
        resolution_height=540
    )

    # ==================== PART 6: SECOND TOPIC CLIP ====================
    print("🎬 Part 6: Creating second topic clip video (5 sec)...")
    try:
        # Try to get a unique clip from topic folder
        clips_img_second = choose_random_file(topic=topic, which_type="clips",
                                             excluded_files=selected_clips,
                                             video_trim_duration=image_clip_time)
        # Check if it's the same as the first clip
        if clips_img_second == clips_img:
            # If same, get from other_clips instead
            print("   → Only one clip available, using other_clips for second clip...")
            clips_img_second = random_random_file(trim_duration=image_clip_time,
                                                 clips="other_clips",
                                                 excluded_files=selected_clips)
    except:
        # If error (no clips), get from other_clips
        print("   → No topic clips available, using other_clips...")
        clips_img_second = random_random_file(trim_duration=image_clip_time,
                                             clips="other_clips",
                                             excluded_files=selected_clips)

    selected_clips.append(clips_img_second)
    scale_video(
        video=clips_img_second,
        scaled_video="sample/temp_topic2_clip.mp4",
        resolution_width=960,
        resolution_height=540
    )

    # ==================== CONCATENATE ALL VIDEOS ====================
    print("🔗 Concatenating all 6 video segments...")
    concat_videos(
        concat_list="sample/final_concat_list.txt",
        intro_video="temp_intro_video.mp4",
        img_video="temp_image1_video.mp4",
        img_video2="temp_image2_video.mp4",
        scaled_video="temp_random_clip.mp4",
        clip_video="temp_topic_clip.mp4",
        clip_video2="temp_topic2_clip.mp4",
        output="final_output.mp4"
    )

    # ==================== GENERATE AUDIO AND MERGE ====================
    print("🔊 Generating audio and adding to video...")
    generate_tts(topic)
    add_audio_to_video("final_output.mp4", "output.wav", "final_video_with_audio.mp4")

    # ==================== CLEANUP ====================
    print("🧹 Cleaning up temporary files...")
    remove_all_files()

    print("✅ Video generation complete!")
    print(f"📁 Output: final_video_with_audio.mp4")
    print(f"⏱️ Duration: 30 seconds (6 segments × 5 sec)")
    print(f"📊 Quality: 960x540 @ 30fps")

except Exception as e:
    print(f"❌ Error during video generation: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
