// src/services/contentService.js
const CONTENT_API_KEY = import.meta.env.VITE_AZURE_CONTENT_KEY;

export const getModuleContentFromAPI = async (moduleData) => {
    if (!CONTENT_API_KEY) {
        throw new Error('Azure Content API key not configured. Please set VITE_AZURE_CONTENT_KEY in your environment variables.');
    }

    try {
        // Your API call implementation here
        const response = await fetch('your-api-endpoint-here', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONTENT_API_KEY}`
            },
            body: JSON.stringify(moduleData)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching module content:', error);
        throw error;
    }
};

// Add other content service functions as needed
export const generateModuleContent = async (moduleData) => {
    // Implementation for generating module content
    return getModuleContentFromAPI(moduleData);
};