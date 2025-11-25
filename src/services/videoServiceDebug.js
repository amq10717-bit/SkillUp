const BACKEND_URL = 'http://localhost:8000';

export async function testBackendConnection() {
    try {
        console.log("🔍 Testing backend connection...");

        // Test if backend is reachable
        const healthResponse = await fetch(`${BACKEND_URL}/`);
        if (!healthResponse.ok) {
            throw new Error(`Backend not reachable: ${healthResponse.status}`);
        }

        const healthData = await healthResponse.json();
        console.log("✅ Backend is running:", healthData);

        // Test the generate-video endpoint
        console.log("🔍 Testing video generation endpoint...");
        const testResponse = await fetch(`${BACKEND_URL}/api/generate-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: "test-topic"
            })
        });

        console.log("📊 Response status:", testResponse.status);
        console.log("📊 Response headers:", testResponse.headers);

        const responseText = await testResponse.text();
        console.log("📊 Response body:", responseText);

        if (testResponse.ok) {
            const data = JSON.parse(responseText);
            return { success: true, data };
        } else {
            return {
                success: false,
                error: `HTTP ${testResponse.status}: ${responseText}`
            };
        }
    } catch (error) {
        console.error("❌ Backend test failed:", error);
        return { success: false, error: error.message };
    }
}

export async function checkBackendStatus() {
    try {
        const response = await fetch(`${BACKEND_URL}/`);
        return {
            isRunning: response.ok,
            status: response.status,
            statusText: response.statusText
        };
    } catch (error) {
        return {
            isRunning: false,
            error: error.message
        };
    }
}