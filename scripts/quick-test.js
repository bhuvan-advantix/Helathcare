const https = require('https');

const API_KEY = "AIzaSyDoe7BH9W-wPjIjlkWDqzh4KSbVZbCV8sw"; // Corrected key with H

const modelsToTest = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash',
    'gemini-pro-vision',
    'gemini-pro',
    'gemini-1.5-flash-001'
];

async function testModel(modelName) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            contents: [{
                parts: [{
                    text: "Say OK"
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

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                            resolve({
                                success: true,
                                model: modelName,
                                response: parsed.candidates[0].content.parts[0].text
                            });
                            return;
                        }
                    } catch (e) { }
                }
                resolve({ success: false, model: modelName, status: res.statusCode });
            });
        });

        req.on('error', () => resolve({ success: false, model: modelName }));
        req.write(data);
        req.end();
    });
}

async function runTest() {
    console.log("=".repeat(70));
    console.log("TESTING CORRECTED API KEY: AIzaSyDoe7BH9W... (with H)");
    console.log("=".repeat(70));

    for (const model of modelsToTest) {
        process.stdout.write(`\nTesting ${model}... `);
        const result = await testModel(model);

        if (result.success) {
            console.log(`✅ SUCCESS!`);
            console.log(`Response: "${result.response}"`);
            console.log("\n" + "=".repeat(70));
            console.log(`🎉 WORKING MODEL FOUND: ${result.model}`);
            console.log("=".repeat(70));
            return;
        } else {
            console.log(`❌ Failed (Status: ${result.status || 'error'})`);
        }
    }

    console.log("\n" + "=".repeat(70));
    console.log("❌ NO WORKING MODEL FOUND");
    console.log("=".repeat(70));
}

runTest();
