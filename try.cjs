const https = require('https');

function getModuleNamesFromAPI(module_name, description, expertise_level) {
    return new Promise((resolve, reject) => {
        const apiKey = import.meta.env.VITE_AZURE_ML_KEY;
        const requestBody = JSON.stringify({
            module_name,
            description,
            expertise_level
        });

        const options = {
            hostname: 'modulegenerator.eastus2.inference.ml.azure.com',
            port: 443,
            path: '/score',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'azureml-model-deployment': 'modulegenerator-1',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(data);

                    // If you’re unsure what the structure looks like, log it:
                    console.log("📦 API Response:", JSON.stringify(jsonResponse, null, 2));

                    // If the API returns nested JSON in "joke" field:
                    if (jsonResponse.joke) {
                        const innerJson = JSON.parse(jsonResponse.joke);
                        if (innerJson.ALl_modules_names && Array.isArray(innerJson.ALl_modules_names)) {
                            const moduleNames = innerJson.ALl_modules_names.map(m => m.module_title);
                            resolve(moduleNames);
                            return;
                        }
                    }

                    // fallback: maybe API already returns modules directly
                    if (jsonResponse.ALl_modules_names) {
                        const moduleNames = jsonResponse.ALl_modules_names.map(m => m.module_title);
                        resolve(moduleNames);
                        return;
                    }

                    reject(new Error("Module names not found in response"));
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(requestBody);
        req.end();
    });
}

// Example usage
getModuleNamesFromAPI(
    "object oriented programming",
    "object oriented",
    "beginner"
)
    .then(names => {
        console.log("✅ Module names received:");
        console.log(names);
    })
    .catch(error => {
        console.error("❌ Error:", error);
    });
