// sample.mjs

import fetch from "node-fetch";

// Function to fetch module content from the Azure AI endpoint
async function getModuleContentFromAPI(moduleName, courseDescription, expertiseLevel) {
    const url = "https://contentgeneration.eastus2.inference.ml.azure.com/score";
    const apiKey = import.meta.env.VITE_AZURE_CONTENT_KEY;


    // FIX 1: Create a single, detailed prompt for the 'thi' parameter.
    const prompt = `Generate detailed course content for a module titled "${moduleName}". This module is part of a course described as: "${courseDescription}". The target audience is at the ${expertiseLevel} level. Provide the output in a structured JSON format with keys for "description", "duration", "objectives", "lessons", and "assessment".`;

    const requestBody = JSON.stringify({
        thi: prompt
    });

    const headers = {
        "Content-Type": "application/json",
        // FIX 2: Use backticks (`) for the template literal to correctly format the Authorization header.
        "Authorization": `Bearer ${apiKey}`,
        "azureml-model-deployment": "contentgeneration-1"
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: requestBody
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("Raw API response:", data);

        let moduleContent = {};

        // FIX 3: Robustly parse the nested JSON string.
        if (data && typeof data === 'object') {
            const contentKey = Object.keys(data)[0]; // Assumes the content is in the first property
            if (contentKey && typeof data[contentKey] === 'string') {
                try {
                    console.log("Parsing nested JSON string from property:", contentKey);
                    moduleContent = JSON.parse(data[contentKey]);
                } catch (err) {
                    console.error("Error parsing inner JSON:", err.message);
                    throw new Error("API returned a malformed JSON string.");
                }
            } else {
                moduleContent = data;
            }
        } else {
            throw new Error("Unexpected API response format.");
        }

        console.log("📘 Parsed Module Content:", JSON.stringify(moduleContent, null, 2));
        return moduleContent;

    } catch (error) {
        console.error("❌ Error fetching module content:", error.message);
        return null;
    }
}

// Example usage
(async () => {
    const content = await getModuleContentFromAPI(
        "Introduction to Python",
        "A comprehensive Python course covering basics to advanced topics for data science.",
        "beginner"
    );

    if (content) {
        console.log("\n✅ --- SCRIPT FINISHED --- ✅");
        console.log("Returned module description:", content.description);
    } else {
        console.log("\n❌ --- SCRIPT FAILED --- ❌");
    }
})();