import requests
import time

API_BASE = "https://66fb4c0e5fd0.ngrok-free.app/"

def safe_json(res):
    try:
        return res.json()
    except:
        print("\n---- RAW RESPONSE ----")
        print("Status:", res.status_code)
        print(res.text)
        print("----------------------\n")
        raise

def get_topics():
    res = requests.get(f"{API_BASE}/api/topics")
    return safe_json(res)

def generate_video(payload):
    res = requests.post(f"{API_BASE}/api/generate", json=payload)
    return safe_json(res)

def check_status(job_id):
    res = requests.get(f"{API_BASE}/api/status/{job_id}")
    return safe_json(res)

def download_video(job_id):
    res = requests.get(f"{API_BASE}/download/{job_id}")
    return res.content

def cleanup(job_id):
    res = requests.get(f"{API_BASE}/api/cleanup/{job_id}")
    return safe_json(res)


if __name__ == "__main__":
    topics = get_topics()
    print("Available topics:", topics)

    topic = topics[0]

    response = generate_video({"topic": topic})
    job_id = response["job_id"]
    print("Job ID:", job_id)

    while True:
        status = check_status(job_id)
        print("Status:", status)

        if status.get("status") in ["complete", "error"]:
            break

        time.sleep(3)

    if status.get("status") == "complete":
        video_bytes = download_video(job_id)
        with open(f"{job_id}.mp4", "wb") as f:
            f.write(video_bytes)
        print("Downloaded video:", job_id)

    print("Cleanup:", cleanup(job_id))
