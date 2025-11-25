const BACKEND_URL = 'http://localhost:8000';

// Function to extract main topic from course title
function extractMainTopic(courseTitle) {
    console.log("🔍 Extracting topic from course:", courseTitle);

    const availableTopics = [
        'arrays', 'graphs', 'linked_list', 'queue',
        'stack', 'trees', 'random_clips', 'other_clips'
    ];

    const lowerTitle = courseTitle.toLowerCase();

    for (const topic of availableTopics) {
        if (lowerTitle.includes(topic)) {
            console.log("✅ Found matching topic:", topic);
            return topic;
        }
    }

    const topicMappings = {
        'array': 'arrays',
        'graph': 'graphs',
        'linked list': 'linked_list',
        'linked-list': 'linked_list',
        'queues': 'queue',
        'stacks': 'stack',
        'tree': 'trees',
        'programming': 'arrays',
        'data structure': 'arrays',
        'algorithm': 'arrays'
    };

    for (const [keyword, topic] of Object.entries(topicMappings)) {
        if (lowerTitle.includes(keyword)) {
            console.log("✅ Mapped keyword to topic:", keyword, "->", topic);
            return topic;
        }
    }

    console.log("⚠️ No specific topic found, using 'arrays' as default");
    return 'arrays';
}

export function getVideoUrl(filename) {
    if (!filename) return '';

    // Robustly remove any folder path (Windows \ or Unix /)
    const cleanName = filename.replace(/^.*[\\\/]/, '');

    // Construct the URL pointing to the static uploads folder
    // Ensure no double slashes if BACKEND_URL ends with /
    const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    const url = `${baseUrl}/uploads/${cleanName}`;

    console.log("🔗 Constructed video URL:", url);
    return url;
}

export async function generateCourseVideo(courseTitle, courseDescription) {
    try {
        console.log("🎬 Starting course video generation for:", courseTitle);
        const mainTopic = extractMainTopic(courseTitle);

        const response = await fetch(`${BACKEND_URL}/api/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: mainTopic,
                course_title: courseTitle,
                course_description: courseDescription
            }),
            timeout: 120000 // 120 second timeout for video generation
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Video generation failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📹 Backend response data:", data);

        // --- URL CONSTRUCTION LOGIC ---
        // 1. Get the raw path from backend
        let rawPath = data.file_path || data.video_url || data.url || data.filename;

        if (!rawPath) {
            throw new Error("Backend did not return a valid video path");
        }

        // 2. Normalize backslashes to forward slashes just in case
        let cleanPath = rawPath.replace(/\\/g, '/');

        // 3. Extract just the filename (e.g. "video.mp4")
        const filename = cleanPath.split('/').pop();

        // 4. Generate the full HTTP URL
        const videoUrl = getVideoUrl(filename);

        console.log("✅ Final Video URL:", videoUrl);

        return {
            status: "success",
            file_path: videoUrl,
            filename: filename,
            isFallback: false,
            usedTopic: mainTopic
        };

    } catch (error) {
        console.error("❌ Course video generation error:", error);

        // Fallback Logic
        const fallbackTopic = extractMainTopic(courseTitle);
        const fallbackUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

        return {
            status: "fallback",
            file_path: fallbackUrl,
            filename: `fallback-video-${fallbackTopic}.mp4`,
            isFallback: true,
            usedTopic: fallbackTopic,
            error: error.message
        };
    }
}

export async function testVideoUrl(videoUrl) {
    if (!videoUrl) return false;

    try {
        const response = await fetch(videoUrl, { method: 'HEAD', mode: 'cors' });
        return response.ok;
    } catch (error) {
        console.error("❌ Video URL test failed:", error);
        return false;
    }
}