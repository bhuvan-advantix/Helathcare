const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// API Key provided by user
const API_KEY = "AIzaSyDoe7BN9W-wPjIjlkWDqzh4KSbVZbCV8sw";

async function testGemini() {
    console.log("--------------------------------------------------");
    console.log("Testing Gemini API Key with multiple models...");

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        // List models to see what's available
        console.log("\n[1] Check Available Models...");
        // Note: listModels is not directly available on the instance in all versions, checking if it exists.
        // If not, we skip.
    } catch (e) {
        console.log("Skipping model listing (not supported in this SDK version or failed).");
    }

    const testModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash-exp"];

    for (const modelName of testModels) {
        console.log(`\n[Trying Model: ${modelName}]`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            const response = await result.response; // Ensure we await response getter if needed
            const text = response.text();
            console.log(`>>> SUCCESS! Model '${modelName}' is working.`);
            console.log(`>>> Response: "${text}"`);

            // If successful, try PDF with this model
            await testPDF(genAI, modelName);
            return; // Exit after first success
        } catch (error) {
            console.error(`>>> FAILED (${modelName}):`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Data: ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(error.message);
            }
        }
    }
}

async function testPDF(genAI, modelName) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing PDF extraction with ${modelName}...`);

    // Locate the sample PDF
    // Note: Adjust path based on where we run the script from (project root)
    const pdfPath = path.join(process.cwd(), 'Sample Pdf', 'Sample1.pdf');

    if (!fs.existsSync(pdfPath)) {
        console.error(`PDF Start Failed: File not found at ${pdfPath}`);
        return;
    }

    console.log(`Found PDF at: ${pdfPath}`);

    try {
        const data = fs.readFileSync(pdfPath);
        const base64Data = data.toString('base64');

        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
            "Extract all text from this document.",
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf",
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();
        console.log(">>> PDF EXTRACTION SUCCESS!");
        console.log("Preview (first 200 chars):");
        console.log(text.substring(0, 200) + "...");
    } catch (error) {
        console.error(">>> PDF EXTRACTION FAILED:");
        console.error(error.message);
    }
}

testGemini();
