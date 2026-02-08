const https = require('https');

const API_KEY = "AIzaSyDzz6NVKOnQP4ti4Q83YguWOjkpg1Oms3g";

const modelsToTest = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-pro'
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
                            console.log(`✅ SUCCESS with ${modelName}!`);
                            console.log(`Response: "${parsed.candidates[0].content.parts[0].text}"`);
                            resolve(true);
                            return;
                        }
                    } catch (e) { }
                }
                console.log(`❌ ${modelName}: Status ${res.statusCode}`);
                resolve(false);
            });
        });

        req.on('error', (e) => {
            console.log(`❌ ${modelName}: ${e.message}`);
            resolve(false);
        });
        req.write(data);
        req.end();
    });
}

async function runTest() {
    console.log("Testing API Key: AIzaSyDzz6NVKOnQP4ti4Q83YguWOjkpg1Oms3g");
    console.log("=".repeat(70));

    for (const model of modelsToTest) {
        const success = await testModel(model);
        if (success) {
            console.log("=".repeat(70));
            console.log("🎉 API KEY IS WORKING!");
            return;
        }
    }

    console.log("=".repeat(70));
    console.log("❌ API KEY NOT WORKING");
}

runTest();
