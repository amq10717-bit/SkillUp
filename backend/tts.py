from kokoro import KPipeline
import soundfile as sf
import torch
import warnings
from llm import setup_genai
import numpy as np
import re
from llm import setup_genai
warnings.filterwarnings('ignore')
def generate_tts(topic):
    # Initialize the Kokoro TTS pipeline
    tts = KPipeline(lang_code="a")  # "a" for English
    # Generate speech from text
    text = setup_genai(topic    )
    print(f"\nGenerating audio for {len(text)} characters...")

    # Target duration in seconds
    target_duration = 30
    sample_rate = 24000
    max_samples = target_duration * sample_rate

    # Collect audio chunks and track which sentences/results they correspond to
    all_audio = []
    cumulative_duration = 0
    trimmed_at_sentence = False

    for result in tts(text, voice="am_adam", speed=1.0):
        audio_tensor = result.output.audio
        audio_numpy = audio_tensor.cpu().numpy()
        
        # Calculate current audio duration
        current_duration = len(audio_numpy) / sample_rate
        
        # Check if adding this chunk would exceed 30 seconds
        if cumulative_duration + current_duration > target_duration:
            # Calculate how many samples we can keep from this chunk
            remaining_samples = max_samples - sum(len(a) for a in all_audio)
            
            if remaining_samples > 0:
                # Trim this chunk to fit exactly 30 seconds
                audio_numpy = audio_numpy[:remaining_samples]
                all_audio.append(audio_numpy)
            
            trimmed_at_sentence = True
            print(f"Stopped at 30 seconds (completed sentence)")
            break
        else:
            all_audio.append(audio_numpy)
            cumulative_duration += current_duration

    # Concatenate all audio chunks
    full_audio = np.concatenate(all_audio) if all_audio else np.array([])

    # Save the audio
    sf.write("output.wav", full_audio, sample_rate)
    actual_duration = len(full_audio) / sample_rate
    print(f"Audio saved to output.wav ({len(full_audio)} samples, {actual_duration:.1f} seconds)")

