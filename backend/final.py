import subprocess

from functions_all import img2video, scale_video, concat_videos,choose_random_file,random_random_file,remove_all_files,which_topic
from tts import generate_tts
from audio_video import add_audio_to_video
# total=30 sec  -> each clip 5 sec *6
# intro 
# clips
# photo
# random clip
# photo
# clip

# -------------------------
# one time choosen
intro_selected_photo=[]
selected_photos=[]
selected_clips=[]
selected_random_clips=[]
# -------------------------

topic_name=which_topic()
video=30
if video==30:
    image_clip_time=5
else:
    image_clip_time=7

# Part1: image to video()

img2video(
    image=choose_random_file(topic=topic_name, which_type="intro"),
    img_video="sample/temp_intro_video.mp4",
    image_video_time=image_clip_time,
    resolution_width=960,
    resolution_height=540
)
# Part2: image to video()
random_img=choose_random_file(topic=topic_name, which_type="photos", excluded_files=selected_photos)
selected_photos.append(random_img)

img2video(
    image=random_img,
    img_video="sample/temp_image1_video.mp4",
    image_video_time=image_clip_time,
    resolution_width=960,
    resolution_height=540
)


# Part3
# : add another photo that is already not selected
random_img=choose_random_file(topic=topic_name, which_type="photos", excluded_files=selected_photos)
selected_photos.append(random_img)
img2video(
    image=random_img,
    img_video="sample/temp_image2_video.mp4",
    image_video_time=image_clip_time,
    resolution_width=960,
    resolution_height=540
)

# Part4
# : scale video (clip 2)
random_clip=random_random_file(trim_duration=5)
selected_random_clips.append(random_clip)

scale_video(
    video=random_clip,
    scaled_video="sample/temp_random_clip.mp4",
    resolution_width=960,
    resolution_height=540
)



# Part4: add the clips from topic folder
clips_img=choose_random_file(video_trim_duration=7, topic=topic_name, which_type="clips", excluded_files=selected_clips)
selected_clips.append(clips_img)
scale_video(
    video=clips_img,
    scaled_video="sample/temp_topic_clip.mp4",
    resolution_width=960,
    resolution_height=540
)

# Part5: try to get second unique clip from topic folder
try:
    # Try to get a unique clip from topic folder
    clips_img_second = choose_random_file(video_trim_duration=7, topic=topic_name, which_type="clips", excluded_files=selected_clips)
    # Check if it's the same as the first clip
    if clips_img_second == clips_img:
        # If same, get from other_clips instead
        print("Only one clip in topic folder, using other_clips for second clip...")
        clips_img_second = random_random_file(trim_duration=7, clips="other_clips", excluded_files=selected_clips)
except:
    # If error (no clips), get from other_clips
    print("No clips in topic folder, using other_clips...")
    clips_img_second = random_random_file(trim_duration=7, clips="other_clips", excluded_files=selected_clips)

selected_clips.append(clips_img_second)
scale_video(
    video=clips_img_second,
    scaled_video="sample/temp_topic2_clip.mp4",
    resolution_width=960,
    resolution_height=540
)
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

print("Done: final_output.mp4")

# LAST PART: REMOVE ALL THE FILES FROM THE samples folder
remove_all_files()

# GENERATE TTS AUDIO
generate_tts(topic=topic_name)
# ADD AUDIO TO VIDEO
add_audio_to_video("final_output.mp4", "output.wav", "final_video_with_audio.mp4")