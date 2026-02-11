'use server';

import { db } from '@/db';
import { labReports, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LlamaParse } from "llama-parse";

interface TestResult {
    category: string;
    tests: {
        name: string;
        value: string;
        unit: string;
        referenceRange?: string;
        status?: 'normal' | 'high' | 'low';
    }[];
}

async function extractLabDataWithAI(buffer: Buffer): Promise<{
    reportDate: string | null;
    labName: string | null;
    patientName: string | null;
    doctorName: string | null;
    metadata: {
        sample?: any;
        location?: any;
        [key: string]: any;
    };
    testResults: TestResult[];
}> {
    const llamaKey = process.env.LLAMA_PARSE_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;

    if (!llamaKey || !mistralKey) {
        throw new Error("Missing API Keys for LlamaParse or Mistral AI");
    }

    console.log("Starting LlamaParse extraction...");

    try {
        // 1. LlamaParse Extraction
        const parser = new LlamaParse({ apiKey: llamaKey });

        // Convert Buffer to Blob for LlamaParse
        const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });

        const result = await parser.parseFile(blob);
        const rawMarkdown = result.markdown;

        console.log("LlamaParse complete. Length:", rawMarkdown.length);
        console.log("Sending to Mistral AI for structuring...");

        // 2. Mistral AI Structuring
        const prompt = `
            You are an expert medical data extractor. Your task is to extract structured lab report data from the provided text.
            
            Input Text:
            """
            ${rawMarkdown.substring(0, 30000)} 
            """
            
            Instructions:
            1. **Patient & Report Basics**: Identify Patient Name, Doctor Name, Lab Name, Reported Date.
            2. **Metadata extraction**: Extract ALL available "header" information such as:
               - Sample Information (Collection Date, Sample Type, SRF ID, etc.)
               - Location/Client Information (Center name, Ref By, specific address or codes)
               - Patient Information (Name, Age, Gender, IDs). IMPORTANT: Include "Name" inside this metadata group even if extracted elsewhere.
               - Any other relevant metadata boxes found in the report header/footer.
               Return these as dynamic key-value pairs in a "metadata" object. Do NOT hardcode keys.
            3. **Test Results**: Extract ALL diagnostic test results.
            4. **Dual Values (Percentages & Absolute)**: 
               - For tests like "Neutrophils", "Lymphocytes", etc., that often have BOTH a percentage (%) and an absolute count (e.g., /cmm or /uL), YOU MUST CAPTURE BOTH.
               - Format the value as: "Percentage% (Absolute Unit)". Example: "73% (7716 /cmm)".
               - If two separate columns exist effectively for the same test row, combine them or list them clearly.
            5. **Test Details**:
               - Test Name (e.g., "Hemoglobin")
               - Result Value (Keep exact formatting, handle symbols like < or >)
               - Unit (Extract if available)
               - Reference Range (Extract if available)
               - Status: Analyze result vs range -> 'high', 'low', 'normal'.
            6. **Categorization**: Group tests logically (e.g., "Complete Blood Count", "Lipid Profile").
            
            Return ONLY valid JSON with this structure:
            {
              "patientName": string | null,
              "doctorName": string | null,
              "labName": string | null,
              "reportDate": string | null,
              "metadata": {
                "sample": { "Collected On": "...", "Sample Type": "...", ... },
                "location": { "Center": "...", ... },
                ...any other groups
              },
              "testResults": [
                { 
                  "category": "Category Name", 
                  "tests": [ 
                    { "name": "Test Name", "value": "Value", "unit": "Unit", "referenceRange": "Range", "status": "normal" | "high" | "low" } 
                  ] 
                }
              ]
            }
        `;

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralKey}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Mistral API Error: ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        console.log("Mistral AI response received.");

        let parsedData;
        try {
            // Robust JSON extraction: Handle markdown code blocks or plain text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : content;
            parsedData = JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            // Fallback structure to prevent crash
            parsedData = {
                testResults: [],
                metadata: {},
                patientName: null,
                doctorName: null,
                labName: null,
                reportDate: null
            };
        }

        // Strong Verification of Structure
        if (!parsedData.testResults || !Array.isArray(parsedData.testResults)) {
            parsedData.testResults = [];
        }
        if (!parsedData.metadata || typeof parsedData.metadata !== 'object') {
            parsedData.metadata = {};
        }

        return parsedData;

    } catch (error) {
        console.error("AI Extraction Error:", error);
        throw error;
    }
}

export async function uploadLabReport(formData: FormData, userId: string) {
    console.log('Starting uploadLabReport for user:', userId);

    try {
        const file = formData.get('file') as File;

        if (!file) {
            console.error('No file provided in formData');
            return { success: false, error: 'No file provided' };
        }

        console.log('File received:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Validate file type
        if (file.type !== 'application/pdf') {
            return { success: false, error: 'Only PDF files are supported' };
        }

        // Get patient record
        const patient = await db.query.patients.findFirst({
            where: eq(patients.userId, userId),
        });

        if (!patient) {
            return { success: false, error: 'Patient profile not found' };
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // --- NEW AI EXTRACTION FLOW ---
        let extractionResult;
        try {
            extractionResult = await extractLabDataWithAI(buffer);
        } catch (aiError: any) {
            console.error('AI Processing Failed:', aiError);
            return { success: false, error: `AI Processing Failed: ${aiError.message}` };
        }

        const { reportDate, labName, patientName, doctorName, testResults, metadata } = extractionResult;

        // Save to database
        try {
            const base64File = buffer.toString('base64');

            const [report] = await db.insert(labReports).values({
                patientId: patient.id,
                fileName: file.name,
                reportDate: reportDate || new Date().toISOString(), // Fallback
                labName,
                patientName,
                doctorName,
                extractedData: { results: testResults, metadata } as any, // Store structured data with metadata
                rawText: "AI Extracted", // We don't need raw markdown in DB unless for debugging
                fileSize: file.size,
                pageCount: 1, // LlamaParse extraction handles pagination but returns unified text
                fileData: base64File, // Store original PDF content
            }).returning();

            return {
                success: true,
                reportId: report.id,
                message: 'Lab report uploaded and processed successfully with AI',
            };
        } catch (dbError) {
            console.error('Database insertion failed:', dbError);
            return { success: false, error: 'Failed to save report to database' };
        }
    } catch (error) {
        console.error('Unexpected error in uploadLabReport:', error);
        return { success: false, error: 'An unexpected error occurred during processing: ' + (error instanceof Error ? error.message : String(error)) };
    }
}

export async function getLabReports(userId: string) {
    try {
        const patient = await db.query.patients.findFirst({
            where: eq(patients.userId, userId),
        });

        if (!patient) {
            return { success: false, error: 'Patient profile not found' };
        }

        const reports = await db.query.labReports.findMany({
            where: eq(labReports.patientId, patient.id),
            orderBy: (labReports, { desc }) => [desc(labReports.uploadedAt)],
        });

        return { success: true, reports };
    } catch (error) {
        console.error('Fetch error:', error);
        return { success: false, error: 'Failed to fetch lab reports' };
    }
}

export async function deleteLabReport(reportId: string) {
    try {
        await db.delete(labReports).where(eq(labReports.id, reportId));
        return { success: true, message: 'Report deleted successfully' };
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: 'Failed to delete report' };
    }
}

export async function getLabReport(reportId: string) {
    try {
        if (!reportId) {
            return { success: false, error: 'Report ID is required' };
        }

        const [report] = await db.select().from(labReports).where(eq(labReports.id, reportId)).limit(1);

        if (!report) {
            return { success: false, error: 'Report not found' };
        }

        return { success: true, report };
    } catch (error) {
        console.error('Fetch error:', error);
        return { success: false, error: 'Failed to fetch lab report' };
    }
}

export async function getReportPdf(reportId: string) {
    try {
        if (!reportId) {
            return { success: false, error: 'Report ID is required' };
        }

        const [report] = await db.select({
            fileData: labReports.fileData,
            fileName: labReports.fileName
        }).from(labReports).where(eq(labReports.id, reportId));

        if (!report || !report.fileData) {
            return { success: false, error: 'Original file not found in database.' };
        }

        return { success: true, fileData: report.fileData, fileName: report.fileName };
    } catch (error) {
        console.error('Download error:', error);
        return { success: false, error: 'Failed to retrieve file' };
    }
}

export async function analyzeTestResult(
    testName: string,
    value: string,
    unit: string,
    referenceRange: string | undefined
) {
    try {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "AI service not configured (Missing API Key)"
            };
        }

        const prompt = `
        You are a medical knowledge assistant providing educational information.
        You are NOT a doctor and you are NOT providing a diagnosis.
        
        Analyze this lab test result for educational purposes:
        - Test: ${testName}
        - Result: ${value} ${unit}
        - Reference Range: ${referenceRange || "Not provided"}

        Provide a structured response in HTML format with three sections.
        
        <div class="space-y-4 text-sm text-slate-600">
            <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 class="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    Status Analysis
                </h4>
                <p>Is this normal, high, or low? What does this mean in simple terms? (Educational only). Bold the status (e.g., <b>Normal</b>, <b>High</b>).</p>
            </div>

            <div class="bg-green-50/50 p-4 rounded-xl border border-green-100">
                <h4 class="font-bold text-green-800 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15v2a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V2"/></svg>
                    Dietary Approaches
                </h4>
                <ul class="list-disc list-inside space-y-1 ml-1">
                    <li>General foods that may help manage this level.</li>
                </ul>
            </div>

            <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <h4 class="font-bold text-purple-800 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-pulse"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
                    Lifestyle Habits
                </h4>
                <ul class="list-disc list-inside space-y-1 ml-1">
                    <li>General lifestyle suggestions.</li>
                </ul>
            </div>
        </div>

        Rules:
        - Analyze ONLY this data. 
        - Educational tone only.
        - Return ONLY the HTML structure above with the content filled in. Do not wrap in markdown blocks.
        `;

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
            })
        });

        if (!response.ok) {
            console.error("Mistral API Error Status:", response.status);
            return { success: false, error: "AI service currently unavailable." };
        }

        const data = await response.json();
        let text = data.choices[0].message.content;

        // Cleanup markdown code blocks if Mistral sends them
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();

        return { success: true, analysis: text };

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return { success: false, error: "Failed to analyze result." };
    }
}
