// src/components/CourseGenerationSteps/api.js
const API_KEY = import.meta.env.VITE_AZURE_ML_KEY;
export async function getModuleNamesFromAPI(module_name, description, expertise_level) {
    try {
        const requestBody = JSON.stringify({
            module_name,
            description,
            expertise_level
        });

        console.log("🔄 Sending request to Azure ML API...");

        const response = await fetch('https://modulegenerator.eastus2.inference.ml.azure.com/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'azureml-model-deployment': 'modulegenerator-1',
            },
            body: requestBody
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📦 Raw API Response:", data);

        // Parse the response based on the structure from your test file
        let moduleNames = [];

        // If the API returns nested JSON in "joke" field:
        if (data.joke) {
            try {
                const innerJson = JSON.parse(data.joke);
                if (innerJson.ALl_modules_names && Array.isArray(innerJson.ALl_modules_names)) {
                    moduleNames = innerJson.ALl_modules_names.map(m => m.module_title || m.name || m.title);
                }
            } catch (parseError) {
                console.error("Error parsing joke field:", parseError);
            }
        }

        // fallback: maybe API already returns modules directly
        if (data.ALl_modules_names && Array.isArray(data.ALl_modules_names)) {
            moduleNames = data.ALl_modules_names.map(m => m.module_title || m.name || m.title);
        }

        // If no modules found in expected structure, try to extract from response
        if (moduleNames.length === 0) {
            console.warn("No modules found in expected structure, trying to extract from response...");

            // Try to find any array in the response that might contain modules
            const findModulesInObject = (obj) => {
                for (let key in obj) {
                    if (Array.isArray(obj[key])) {
                        // Check if this array contains objects with module-like properties
                        const firstItem = obj[key][0];
                        if (firstItem && (firstItem.module_title || firstItem.name || firstItem.title)) {
                            return obj[key].map(item => item.module_title || item.name || item.title);
                        }
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        const result = findModulesInObject(obj[key]);
                        if (result.length > 0) return result;
                    }
                }
                return [];
            };

            moduleNames = findModulesInObject(data);
        }

        if (moduleNames.length === 0) {
            throw new Error("Module names not found in response. Response structure: " + JSON.stringify(data));
        }

        console.log("✅ Extracted module names:", moduleNames);
        return moduleNames;

    } catch (error) {
        console.error("❌ API Error:", error);

        // Fallback to dummy data if API fails
        console.log("🔄 Using fallback dummy data...");
        return [
            'Introduction to ' + module_name,
            'Core Concepts and Fundamentals',
            'Advanced Applications',
            'Project Development',
            'Assessment and Review'
        ];
    }
}