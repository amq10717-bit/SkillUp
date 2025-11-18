const API_KEY = import.meta.env.VITE_AZURE_ML_KEY;

const getFallbackModules = (module_name, expertise_level) => {
    const baseModules = [
        "Introduction to " + module_name,
        "Fundamentals of " + module_name,
        "Advanced Concepts in " + module_name,
        "Practical Applications",
        "Best Practices and Tips"
    ];

    if (expertise_level === "Beginners") {
        return [
            "Getting Started with " + module_name,
            "Basic Concepts and Terminology",
            "Step-by-Step Tutorial",
            "Common Mistakes to Avoid",
            "Next Steps and Resources"
        ];
    } else if (expertise_level === "Intermediate") {
        return [
            "Review of Core Concepts",
            "Intermediate Techniques",
            "Real-World Applications",
            "Problem-Solving Strategies",
            "Advanced Topics Preview"
        ];
    } else {
        return [
            "Advanced Theory and Concepts",
            "Complex Implementation",
            "Performance Optimization",
            "Industry Best Practices",
            "Future Trends and Innovations"
        ];
    }
};

// Retry function with exponential backoff
const fetchWithRetry = async (url, options, retries = 2) => {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`API attempt ${attempt + 1}/${retries}`);
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.log(`Attempt ${attempt + 1} failed:`, error.message);

            if (attempt === retries - 1) {
                throw error; // Last attempt failed
            }

            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

export async function getModuleNamesFromAPI(module_name, description, expertise_level) {
    const requestBody = JSON.stringify({
        module_name,
        description,
        expertise_level
    });

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'azureml-model-deployment': 'modulegenerator-1',
        },
        body: requestBody,
        signal: AbortSignal.timeout(15000) // 15 second timeout
    };

    // Try direct API call first
    try {
        console.log("🌐 Attempting direct API call...");

        const response = await fetchWithRetry('https://modulegenerator.eastus2.inference.ml.azure.com/score', requestOptions);

        const jsonResponse = await response.json();
        console.log("✅ Direct API Response received successfully:", jsonResponse);

        // Extract module names
        const innerJson = JSON.parse(jsonResponse.joke);
        const moduleNames = innerJson.ALl_modules_names.map(m => m.module_title);

        return moduleNames;
    } catch (directError) {
        console.log("❌ Direct API call failed:", directError.message);

        // Try proxy API call as fallback
        try {
            console.log("🔄 Attempting proxy API call...");

            const proxyResponse = await fetchWithRetry('/api/score', requestOptions);

            const jsonResponse = await proxyResponse.json();
            console.log("✅ Proxy API Response received successfully:", jsonResponse);

            // Extract module names
            const innerJson = JSON.parse(jsonResponse.joke);
            const moduleNames = innerJson.ALl_modules_names.map(m => m.module_title);

            return moduleNames;
        } catch (proxyError) {
            console.log("❌ Proxy API call also failed:", proxyError.message);
            console.log("🔄 Using intelligent fallback modules");
            return getFallbackModules(module_name, expertise_level);
        }
    }
}