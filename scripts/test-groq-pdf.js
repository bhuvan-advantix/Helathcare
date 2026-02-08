const https = require('https');
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = "FbxAAt5mBUugDCiMeNECsiVJFWBAwqq1uQDoXwZkCS5w";
const PDF_PATH = path.join(__dirname, '..', 'Sample Pdf', 'Sample5.pdf');

async function testGroqWithPDF() {
    console.log("=".repeat(70));
    console.log("Testing Groq API with Llama Vision for PDF Extraction");
    console.log("=".repeat(70));

    // Check if PDF exists
    if (!fs.existsSync(PDF_PATH)) {
        console.error(`❌ PDF not found at: ${PDF_PATH}`);
        return;
    }

    console.log(`✅ Found PDF: ${PDF_PATH}`);
    console.log(`File size: ${(fs.statSync(PDF_PATH).size / 1024).toFixed(2)} KB`);

    // Read and convert PDF to base64
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const base64PDF = pdfBuffer.toString('base64');

    console.log("\n🔄 Sending to Groq API (Llama 3.2 Vision)...");

    const requestBody = JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Extract all medical test results from this lab report. Return the data in JSON format with test names, values, units, and reference ranges."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:application/pdf;base64,${base64PDF}`
                        }
                    }
                ]
            }
        ],
        temperature: 0.1,
        max_tokens: 2000
    });

    const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`\nResponse Status: ${res.statusCode}`);

                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(responseData);
                        const extractedText = parsed.choices[0].message.content;

                        console.log("\n" + "=".repeat(70));
                        console.log("✅ SUCCESS! Groq API is working!");
                        console.log("=".repeat(70));
                        console.log("\n📄 Extracted Content:");
                        console.log("-".repeat(70));
                        console.log(extractedText);
                        console.log("-".repeat(70));

                        // Evaluation
                        console.log("\n📊 EVALUATION:");
                        if (extractedText.length > 100) {
                            console.log("✅ GOOD: Substantial data extracted");
                        } else {
                            console.log("⚠️  LIMITED: Short extraction");
                        }

                        if (extractedText.toLowerCase().includes('json') || extractedText.includes('{')) {
                            console.log("✅ PERFECT: Structured JSON format detected");
                        } else {
                            console.log("⚠️  BASIC: Plain text format");
                        }

                        resolve(true);
                    } catch (e) {
                        console.error("❌ Parse error:", e.message);
                        console.log("Raw response:", responseData.substring(0, 500));
                        resolve(false);
                    }
                } else {
                    console.error("❌ API Error");
                    console.log("Response:", responseData);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error("❌ Request failed:", error.message);
            resolve(false);
        });

        req.write(requestBody);
        req.end();
    });
}

testGroqWithPDF();
