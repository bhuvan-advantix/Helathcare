const https = require('https');
const fs = require('fs');
const path = require('path');

const OPTIIC_API_KEY = "FbxAAt5mBUugDCiMeNECsiVJFWBAwqq1uQDoXwZkCS5w";
const PDF_PATH = path.join(__dirname, '..', 'Sample Pdf', 'Sample5.pdf');

async function testOptiicWithPDF() {
    console.log("=".repeat(70));
    console.log("Testing Optiic OCR API with PDF Extraction");
    console.log("=".repeat(70));

    // Check if PDF exists
    if (!fs.existsSync(PDF_PATH)) {
        console.error(`❌ PDF not found at: ${PDF_PATH}`);
        return;
    }

    console.log(`✅ Found PDF: ${PDF_PATH}`);
    const fileSize = (fs.statSync(PDF_PATH).size / 1024).toFixed(2);
    console.log(`File size: ${fileSize} KB`);

    // Read and convert PDF to base64
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const base64PDF = pdfBuffer.toString('base64');

    console.log("\n🔄 Sending to Optiic API...");

    const requestBody = JSON.stringify({
        image: base64PDF,
        language: "en"
    });

    const options = {
        hostname: 'api.optiic.dev',
        path: '/process',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPTIIC_API_KEY}`,
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

                        console.log("\n" + "=".repeat(70));
                        console.log("✅ SUCCESS! Optiic API is working!");
                        console.log("=".repeat(70));
                        console.log("\n📄 Extracted Text:");
                        console.log("-".repeat(70));
                        console.log(parsed.text || JSON.stringify(parsed, null, 2));
                        console.log("-".repeat(70));

                        // Evaluation
                        const extractedText = parsed.text || JSON.stringify(parsed);
                        console.log("\n📊 EVALUATION:");

                        if (extractedText.length > 200) {
                            console.log("✅ EXCELLENT: Substantial data extracted (" + extractedText.length + " chars)");
                        } else if (extractedText.length > 50) {
                            console.log("⚠️  MODERATE: Some data extracted (" + extractedText.length + " chars)");
                        } else {
                            console.log("❌ POOR: Very little data extracted (" + extractedText.length + " chars)");
                        }

                        // Check for medical terms
                        const medicalTerms = ['hemoglobin', 'glucose', 'cholesterol', 'test', 'result', 'value', 'range'];
                        const foundTerms = medicalTerms.filter(term =>
                            extractedText.toLowerCase().includes(term)
                        );

                        if (foundTerms.length > 0) {
                            console.log(`✅ GOOD: Found medical terms: ${foundTerms.join(', ')}`);
                        } else {
                            console.log("⚠️  WARNING: No common medical terms detected");
                        }

                        console.log("\n🎯 VERDICT: " + (extractedText.length > 200 ? "PERFECT for medical reports" : "NEEDS IMPROVEMENT"));

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

testOptiicWithPDF();
