const https = require('https');

const API_KEY = "AIzaSyDoe7BN9W-wPjIjlkWDqzh4KSbVZbCV8sw";

const testModels = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-1.5-flash-001',
    'gemini-2.0-flash-exp'
];

async function testModel(modelName) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            contents: [{
                parts: [{
                    text: "Hello, respond with OK if working"
                }]
            }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        console.log(`\n[Testing: ${modelName}]`);

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.candidates && parsed.candidates[0]) {
                            console.log(`✅ SUCCESS with ${modelName}!`);
                            console.log('Response:', parsed.candidates[0].content.parts[0].text);
                            resolve({ success: true, model: modelName, response: parsed });
                        } else {
                            console.log(`❌ Unexpected response format`);
                            resolve({ success: false, model: modelName });
                        }
                    } catch (e) {
                        console.log(`❌ Parse error:`, e.message);
                        resolve({ success: false, model: modelName });
                    }
                } else {
                    console.log(`❌ Status ${res.statusCode}: ${res.statusMessage}`);
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.error) {
                            console.log(`Error: ${parsed.error.message}`);
                        }
                    } catch (e) { }
                    resolve({ success: false, model: modelName });
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ Request failed:`, error.message);
            resolve({ success: false, model: modelName });
        });

        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log("=".repeat(60));
    console.log("Testing Gemini API Key with Multiple Model Names");
    console.log("=".repeat(60));

    for (const model of testModels) {
        const result = await testModel(model);
        if (result.success) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`🎉 WORKING MODEL FOUND: ${result.model}`);
            console.log(`${"=".repeat(60)}`);
            break;
        }
    }
}

runTests();
