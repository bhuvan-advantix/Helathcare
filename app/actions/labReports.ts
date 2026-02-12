'use server';

import { db } from '@/db';
import { labReports, patients, healthParameters } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LlamaParse } from "llama-parse";
import { revalidatePath } from 'next/cache';

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

// Helper function to extract and store key health parameters
async function extractAndStoreHealthParameters(
    patientId: string,
    labReportId: string,
    testResults: TestResult[],
    testDate: string
) {
    // Key parameters we want to track
    const keyParameters = [
        { names: ['Blood Glucose', 'Glucose', 'Fasting Blood Sugar', 'FBS', 'Random Blood Sugar', 'RBS'], standardName: 'Blood Glucose' },
        { names: ['Blood Pressure', 'BP', 'Systolic', 'Diastolic'], standardName: 'Blood Pressure' },
        { names: ['HbA1c', 'Hemoglobin A1c', 'Glycated Hemoglobin', 'A1C'], standardName: 'HbA1c' },
        { names: ['Total Cholesterol', 'Cholesterol', 'Serum Cholesterol'], standardName: 'Total Cholesterol' },
    ];

    try {
        for (const keyParam of keyParameters) {
            let parameterFound = false; // Flag to track if we've already stored this parameter

            // Search through all test results for this parameter
            for (const category of testResults) {
                if (parameterFound) break; // Skip remaining categories if already found

                for (const test of category.tests) {
                    // Check if test name matches any of the key parameter names
                    const isMatch = keyParam.names.some(name =>
                        test.name.toLowerCase().includes(name.toLowerCase())
                    );

                    if (isMatch) {
                        // Store this parameter
                        await db.insert(healthParameters).values({
                            patientId,
                            labReportId,
                            parameterName: keyParam.standardName,
                            value: test.value,
                            unit: test.unit || '',
                            referenceRange: test.referenceRange || '',
                            status: test.status || null,
                            testDate: testDate,
                        });

                        parameterFound = true; // Mark as found
                        break; // Break out of tests loop
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error storing health parameters:', error);
        // Don't throw - we don't want to fail the entire upload if parameter extraction fails
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

            // --- Extract and Store Key Health Parameters ---
            await extractAndStoreHealthParameters(patient.id, report.id, testResults, reportDate || new Date().toISOString());

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

export async function getLatestHealthParameters(userId: string) {
    try {
        const patient = await db.query.patients.findFirst({
            where: eq(patients.userId, userId),
        });

        if (!patient) {
            return { success: false, error: 'Patient profile not found' };
        }

        // Fetch all health parameters for this patient
        const allParameters = await db.select().from(healthParameters)
            .where(eq(healthParameters.patientId, patient.id))
            .orderBy(healthParameters.testDate);

        // Group by parameter name and get the latest for each
        const latestParams: Record<string, any> = {};

        for (const param of allParameters) {
            const existing = latestParams[param.parameterName];
            if (!existing || new Date(param.testDate || 0) > new Date(existing.testDate || 0)) {
                latestParams[param.parameterName] = param;
            }
        }

        return { success: true, parameters: latestParams };
    } catch (error) {
        console.error('Fetch error:', error);
        return { success: false, error: 'Failed to fetch health parameters' };
    }
}

export async function getHealthHistory(userId: string) {
    try {
        const patient = await db.query.patients.findFirst({
            where: eq(patients.userId, userId),
        });

        if (!patient) {
            return { success: false, error: 'Patient profile not found' };
        }

        // Fetch ALL health parameters for this patient, sorted by date
        const history = await db.select().from(healthParameters)
            .where(eq(healthParameters.patientId, patient.id))
            .orderBy(healthParameters.testDate);

        // Fetch analyses linked to lab reports
        const reports = await db.select({
            id: labReports.id,
            analysis: labReports.analysis
        }).from(labReports).where(eq(labReports.patientId, patient.id));

        const analyses: Record<string, string> = {};
        reports.forEach(r => {
            if (r.analysis) analyses[r.id] = r.analysis;
        });

        return { success: true, history, analyses };
    } catch (error) {
        console.error('Fetch history error:', error);
        return { success: false, error: 'Failed to fetch health history' };
    }
}

export async function generateLabAnalysis(labReportId: string) {
    try {
        console.log('[generateLabAnalysis] Starting analysis for report:', labReportId);

        // 1. Fetch Report
        // Using db.select to avoid relation crashes if schema is not updated
        const [report] = await db.select().from(labReports).where(eq(labReports.id, labReportId)).limit(1);

        if (!report) {
            console.error('[generateLabAnalysis] Report not found:', labReportId);
            return { success: false, error: "Report not found" };
        }

        console.log('[generateLabAnalysis] Report found, checking existing analysis');

        // Re-generate if old format (not HTML)
        if (report.analysis && report.analysis.trim().startsWith('<div')) {
            console.log('[generateLabAnalysis] Returning existing HTML analysis');
            return { success: true, analysis: report.analysis };
        }

        // 2. Fetch Parameters
        console.log('[generateLabAnalysis] Fetching health parameters for report');
        const currentParams = await db.select().from(healthParameters).where(eq(healthParameters.labReportId, labReportId));
        console.log('[generateLabAnalysis] Found', currentParams.length, 'parameters');

        // 3. Find Previous Report
        const allReports = await db.select().from(labReports)
            .where(eq(labReports.patientId, report.patientId))
            .orderBy(labReports.reportDate);

        const idx = allReports.findIndex(r => r.id === labReportId);
        const prevReport = idx > 0 ? allReports[idx - 1] : null;

        let prevParams: any[] = [];
        if (prevReport) {
            prevParams = await db.select().from(healthParameters).where(eq(healthParameters.labReportId, prevReport.id));
            console.log('[generateLabAnalysis] Found', prevParams.length, 'previous parameters');
        }

        let analysis = "";

        // 4. Try Mistral AI
        try {
            const mistralKey = process.env.MISTRAL_API_KEY;
            console.log('[generateLabAnalysis] Mistral API Key present:', !!mistralKey);

            if (mistralKey) {
                const prompt = `
                    You are a medical assistant. Analyze these lab results and provide a summary report.
                    Current Results (${report.reportDate}): ${JSON.stringify(currentParams.map(p => ({ name: p.parameterName, value: p.value, unit: p.unit, status: p.status })))}
                    Previous Results (${prevReport?.reportDate || 'None'}): ${JSON.stringify(prevParams.map(p => ({ name: p.parameterName, value: p.value })))}
                    
                    Instructions:
                    Provide a STRUCTURED response in HTML format (no markdown code blocks) with three distinct sections:
                    1. **Status Overview** (Blue Box): Summarize the overall health status. Mention key High/Low parameters and improvements.
                    2. **Dietary Plan** (Green Box): Specific food recommendations based on the results.
                    3. **Lifestyle Guide** (Purple Box): Exercise and habit recommendations.

                    Use this exact HTML structure:
                    <div class="space-y-4 text-sm text-slate-600">
                        <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <h4 class="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                Status Overview
                            </h4>
                            <p>...summary text...</p>
                        </div>
                        <div class="bg-green-50/50 p-4 rounded-xl border border-green-100">
                            <h4 class="font-bold text-green-800 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15v2a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V2"/></svg>
                                Dietary Plan
                            </h4>
                            <ul class="list-disc list-inside space-y-1 ml-1">
                                <li>...tip 1...</li>
                                <li>...tip 2...</li>
                            </ul>
                        </div>
                        <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                            <h4 class="font-bold text-purple-800 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-pulse"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
                                Lifestyle Guide
                            </h4>
                            <ul class="list-disc list-inside space-y-1 ml-1">
                                <li>...tip 1...</li>
                                <li>...tip 2...</li>
                            </ul>
                        </div>
                    </div>

                    Keep it concise, actionable, and encouraging. Return ONLY the HTML.
                `;

                console.log('[generateLabAnalysis] Calling Mistral API...');
                const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mistralKey}` },
                    body: JSON.stringify({
                        model: "mistral-small-latest",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.2
                    })
                });

                console.log('[generateLabAnalysis] Mistral API response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    let content = data.choices?.[0]?.message?.content || "";
                    content = content.replace(/```html/g, '').replace(/```/g, '').trim();
                    if (content.startsWith('<div')) {
                        analysis = content;
                        console.log('[generateLabAnalysis] Successfully generated AI analysis');
                    } else {
                        console.warn('[generateLabAnalysis] AI response did not start with <div, using fallback');
                    }
                } else {
                    const errorText = await response.text();
                    console.error('[generateLabAnalysis] Mistral API error:', response.status, errorText);
                }
            } else {
                console.error('[generateLabAnalysis] Mistral API key not found in environment');
            }
        } catch (aiError) {
            console.error('[generateLabAnalysis] AI Generation exception:', aiError);
        }

        // 5. Fallback if AI failed or returned empty
        if (!analysis) {
            console.log('[generateLabAnalysis] Using fallback analysis generation');
            const dietTips: string[] = [];
            const lifeTips: string[] = [];
            const statusSummary: string[] = [];

            currentParams.forEach(curr => {
                if (curr.status?.toLowerCase().includes('high')) {
                    statusSummary.push(`${curr.parameterName} is High.`);
                    if (curr.parameterName.includes('Glucose')) {
                        dietTips.push("Reduce refined sugars and carbohydrates.");
                        lifeTips.push("Walk for 15 mins after every meal.");
                    } else if (curr.parameterName.includes('Cholesterol')) {
                        dietTips.push("Increase soluble fiber (oats, fruits).");
                        lifeTips.push("Aim for 30 mins of cardio daily.");
                    }
                } else if (curr.status?.toLowerCase().includes('low')) {
                    statusSummary.push(`${curr.parameterName} is Low.`);
                    dietTips.push(`Ensure balanced intake to boost ${curr.parameterName}.`);
                }
            });

            if (statusSummary.length === 0) statusSummary.push("All tracked parameters are within normal range.");
            if (dietTips.length === 0) dietTips.push("Maintain a balanced diet rich in whole foods.");
            if (lifeTips.length === 0) lifeTips.push("Continue your regular exercise routine.");

            analysis = `
                <div class="space-y-4 text-sm text-slate-600">
                    <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <h4 class="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                            Status Overview
                        </h4>
                        <p>${statusSummary.join(' ')} Keep monitoring regularly.</p>
                    </div>
                    <div class="bg-green-50/50 p-4 rounded-xl border border-green-100">
                        <h4 class="font-bold text-green-800 mb-2 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15v2a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V2"/></svg>
                            Dietary Plan
                        </h4>
                        <ul class="list-disc list-inside space-y-1 ml-1">
                            ${Array.from(new Set(dietTips)).map(t => `<li>${t}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                        <h4 class="font-bold text-purple-800 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-pulse"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
                            Lifestyle Guide
                        </h4>
                        <ul class="list-disc list-inside space-y-1 ml-1">
                             ${Array.from(new Set(lifeTips)).map(t => `<li>${t}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // 6. Save Analysis
        console.log('[generateLabAnalysis] Saving analysis to database');
        await db.update(labReports).set({ analysis }).where(eq(labReports.id, labReportId));
        revalidatePath('/dashboard/health');

        console.log('[generateLabAnalysis] Analysis generation complete');
        return { success: true, analysis };

    } catch (e) {
        console.error("[generateLabAnalysis] Critical Error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        return {
            success: false,
            error: `Analysis generation failed: ${errorMessage}`,
            analysis: `<div class="p-4 bg-red-50 text-red-600 rounded-xl">Unable to generate analysis. Error: ${errorMessage}</div>`
        };
    }
}
