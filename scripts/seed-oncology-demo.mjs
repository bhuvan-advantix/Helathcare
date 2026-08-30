import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

dotenv.config({ quiet: true });

const DATABASE_URL = process.env.TURSO_DATABASE_URL;
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const DEMO_PASSWORD = process.env.ONCOTRACK_DEMO_PASSWORD || 'NiraivaDemo@2026';

if (!DATABASE_URL) {
    console.error('Missing TURSO_DATABASE_URL in .env');
    process.exit(1);
}

const client = createClient({
    url: DATABASE_URL,
    authToken: AUTH_TOKEN,
});

const ids = {
    doctorUser: 'oncotrack-doctor-user',
    doctor: 'oncotrack-doctor',
};

const ts = (date, hour = 9) => Math.floor(new Date(`${date}T${String(hour).padStart(2, '0')}:00:00.000Z`).getTime() / 1000);
const json = (value) => JSON.stringify(value);

async function execute(sql, args = []) {
    return client.execute({ sql, args });
}

async function columnNames(table) {
    const result = await execute(`PRAGMA table_info('${table}')`);
    return new Set(result.rows.map(row => String(row.name)));
}

async function ensureColumn(table, name, type) {
    const columns = await columnNames(table);
    if (!columns.has(name)) {
        await execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
}

async function ensureSchema() {
    await execute(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT,
            email TEXT NOT NULL UNIQUE,
            emailVerified INTEGER,
            image TEXT,
            password TEXT,
            role TEXT NOT NULL DEFAULT 'pending',
            is_onboarded INTEGER DEFAULT 0,
            custom_id TEXT UNIQUE,
            is_banned INTEGER DEFAULT 0
        )
    `);
    for (const [name, type] of [
        ['password', 'TEXT'],
        ['role', "TEXT NOT NULL DEFAULT 'pending'"],
        ['is_onboarded', 'INTEGER DEFAULT 0'],
        ['custom_id', 'TEXT'],
        ['is_banned', 'INTEGER DEFAULT 0'],
    ]) await ensureColumn('users', name, type);

    await execute(`
        CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            dob TEXT,
            age INTEGER,
            gender TEXT,
            phone_number TEXT,
            address TEXT,
            city TEXT,
            marital_status TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            guardian_name TEXT,
            guardian_relation TEXT,
            blood_group TEXT,
            height TEXT,
            weight TEXT,
            allergies TEXT,
            current_medications TEXT,
            past_surgeries TEXT,
            chronic_conditions TEXT,
            lifestyle TEXT,
            medical_history TEXT,
            created_at INTEGER
        )
    `);
    for (const [name, type] of [
        ['age', 'INTEGER'], ['city', 'TEXT'], ['marital_status', 'TEXT'],
        ['emergency_contact_name', 'TEXT'], ['emergency_contact_phone', 'TEXT'],
        ['guardian_name', 'TEXT'], ['guardian_relation', 'TEXT'], ['height', 'TEXT'],
        ['weight', 'TEXT'], ['allergies', 'TEXT'], ['current_medications', 'TEXT'],
        ['past_surgeries', 'TEXT'], ['chronic_conditions', 'TEXT'], ['lifestyle', 'TEXT'],
    ]) await ensureColumn('patients', name, type);

    await execute(`
        CREATE TABLE IF NOT EXISTS doctors (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            dob TEXT,
            age INTEGER,
            gender TEXT,
            phone_number TEXT,
            address TEXT,
            city TEXT,
            marital_status TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            guardian_name TEXT,
            guardian_relation TEXT,
            specialization TEXT NOT NULL,
            clinic_name TEXT,
            license_number TEXT NOT NULL,
            experience_years INTEGER,
            degree TEXT,
            hospital_timing TEXT,
            working_days TEXT,
            bio TEXT,
            approval_status TEXT DEFAULT 'approved',
            created_at INTEGER
        )
    `);
    for (const [name, type] of [
        ['dob', 'TEXT'], ['age', 'INTEGER'], ['gender', 'TEXT'], ['address', 'TEXT'],
        ['city', 'TEXT'], ['marital_status', 'TEXT'], ['emergency_contact_name', 'TEXT'],
        ['emergency_contact_phone', 'TEXT'], ['guardian_name', 'TEXT'], ['guardian_relation', 'TEXT'],
        ['clinic_name', 'TEXT'], ['degree', 'TEXT'], ['hospital_timing', 'TEXT'],
        ['working_days', 'TEXT'], ['approval_status', "TEXT DEFAULT 'approved'"],
    ]) await ensureColumn('doctors', name, type);

    await execute(`
        CREATE TABLE IF NOT EXISTS doctor_patient_relations (
            id TEXT PRIMARY KEY NOT NULL,
            doctor_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            added_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS timeline_events (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            event_date TEXT NOT NULL,
            event_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            report_id TEXT,
            doctor_id TEXT,
            created_by TEXT DEFAULT 'patient',
            created_at INTEGER
        )
    `);
    for (const [name, type] of [
        ['report_id', 'TEXT'], ['doctor_id', 'TEXT'], ['created_by', "TEXT DEFAULT 'patient'"],
    ]) await ensureColumn('timeline_events', name, type);

    await execute(`
        CREATE TABLE IF NOT EXISTS lab_reports (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            report_date TEXT,
            lab_name TEXT,
            patient_name TEXT,
            doctor_name TEXT,
            extracted_data TEXT NOT NULL,
            raw_text TEXT,
            analysis TEXT,
            file_size INTEGER,
            page_count INTEGER,
            file_data TEXT,
            cloudinary_url TEXT,
            uploaded_at INTEGER
        )
    `);
    for (const [name, type] of [
        ['analysis', 'TEXT'], ['cloudinary_url', 'TEXT'],
    ]) await ensureColumn('lab_reports', name, type);

    await execute(`
        CREATE TABLE IF NOT EXISTS health_parameters (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            lab_report_id TEXT,
            parameter_name TEXT NOT NULL,
            value TEXT NOT NULL,
            unit TEXT,
            reference_range TEXT,
            status TEXT,
            test_date TEXT,
            created_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS patient_vitals (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            blood_pressure TEXT,
            temperature TEXT,
            weight TEXT,
            height TEXT,
            pulse_rate TEXT,
            spo2 TEXT,
            recorded_by TEXT,
            notes TEXT,
            recorded_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS prescriptions (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            doctor_id TEXT,
            consultation_data TEXT NOT NULL,
            cloudinary_url TEXT NOT NULL,
            prescribed_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS patient_conditions (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            condition_name TEXT NOT NULL,
            diagnosed_date TEXT,
            status TEXT DEFAULT 'active',
            added_by TEXT DEFAULT 'patient',
            doctor_id TEXT,
            created_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS patient_diagnostics (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            doctor_id TEXT,
            condition_name TEXT NOT NULL,
            condition_status TEXT DEFAULT 'stable',
            nodes TEXT NOT NULL DEFAULT '[]',
            clinical_notes TEXT,
            treatment_plan TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS doctor_private_notes (
            id TEXT PRIMARY KEY NOT NULL,
            doctor_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            note_content TEXT NOT NULL,
            created_at INTEGER
        )
    `);

    await execute(`
        CREATE TABLE IF NOT EXISTS medications (
            id TEXT PRIMARY KEY NOT NULL,
            patient_id TEXT NOT NULL,
            name TEXT NOT NULL,
            dosage TEXT,
            purpose TEXT,
            start_date TEXT,
            frequency TEXT,
            duration_days INTEGER,
            status TEXT DEFAULT 'Active',
            added_by TEXT DEFAULT 'Self',
            created_at INTEGER
        )
    `);
    await ensureColumn('medications', 'duration_days', 'INTEGER');
}

function test(name, value, unit, referenceRange = '', status = 'normal') {
    return { name, value, unit, referenceRange: referenceRange || 'Clinician reviewed', status };
}

function report(caseData, id, date, title, categories, oncology) {
    return {
        id,
        patientId: caseData.patientId,
        fileName: title,
        reportDate: date,
        labName: oncology.labName || 'Niraiva Oncology Diagnostics',
        patientName: caseData.name,
        doctorName: 'Dr. Ananya Rao',
        extractedData: {
            metadata: {
                sample: { 'Collected On': date, 'Report Status': 'Final verified' },
                oncology: {
                    ...caseData.oncology,
                    ...oncology,
                    dataWindow: caseData.oncology.dataWindow,
                    owner: 'Dr. Ananya Rao, Medical Oncology',
                },
            },
            results: categories,
        },
        rawText: `${title}. Final report reviewed by oncology service. Findings are recorded for longitudinal follow-up and clinician-supervised care navigation.`,
        fileSize: 184000 + title.length * 911,
    };
}

const cases = [
    {
        stageKey: 'stage1',
        userId: 'demo-oncotrack-stage1-user',
        patientId: 'demo-oncotrack-stage1-patient',
        conditionId: 'demo-oncotrack-stage1-condition',
        diagnosticId: 'demo-oncotrack-stage1-diagnostic',
        customId: 'NRV-ONC-001',
        name: 'Maya Srinivasan',
        email: 'maya.srinivasan@niraiva.health',
        phone: '+91 90000 41001',
        dob: '1979-02-14',
        age: 47,
        gender: 'female',
        bloodGroup: 'O+',
        height: '162 cm',
        weight: '64 kg',
        lifestyle: 'moderate activity, rare alcohol, never smoker',
        medicalHistory: 'Screening-detected breast lesion with source-linked imaging, pathology, receptor status, and surveillance follow-up.',
        chronicConditions: 'Stage I invasive ductal carcinoma of left breast',
        oncology: {
            diagnosis: 'Left breast invasive ductal carcinoma',
            stage: 'Stage I',
            tnm: 'cT1cN0M0',
            diagnosisDate: '2025-08-12',
            carePhase: 'Surveillance',
            treatmentIntent: 'Curative',
            currentPlan: 'Post-lumpectomy surveillance with endocrine therapy and annual mammography.',
            nextMilestone: 'Surveillance mammogram due 18 Sep 2026',
            patientSummary: 'Your breast cancer care plan is being followed after surgery and radiation. Your team is tracking medication tolerance and scheduled surveillance.',
            clinicianSummary: 'Screening-detected Stage I ER-positive breast cancer. Lumpectomy achieved clear margins, adjuvant radiation completed, endocrine therapy active, and one-year surveillance imaging remains stable.',
            screeningStatus: 'Preventive screening gap closed after abnormal mammogram workup',
            trendStatus: 'CA 15-3 remained within reference range during surveillance',
            closedLoopStatus: 'Pathology, oncology consult, surgery, radiation, and surveillance disposition documented',
            keyFinding: 'Screening mammogram showed a 1.4 cm irregular left upper outer quadrant lesion',
            pathology: 'Invasive ductal carcinoma, grade 2, ER 95%, PR 80%, HER2 negative',
            imaging: 'Breast MRI without nodal or distant disease',
            dataWindow: '08 Aug 2024 - 18 Sep 2026',
        },
        wellnessVitals: {
            date: '2026-08-20',
            hba1c: '5.5',
            glucose: '92',
            bloodPressure: '118/76',
            cholesterol: '182',
            temperature: '98.2 F',
            pulseRate: '74 bpm',
            spo2: '99%',
            notes: 'Stable post-treatment review; endocrine therapy tolerance acceptable.',
        },
        nodes: [
            ['profile', 'Profile and screening eligibility', 'Age 46, female; annual breast screening pathway confirmed.', '2024-08-08', 0, 1, ['screen']],
            ['screen', 'Screening mammogram abnormal', 'BI-RADS 0 callback for left breast asymmetry.', '2025-06-18', 1, 1, ['imaging']],
            ['imaging', 'Diagnostic mammogram and ultrasound', 'Irregular 1.4 cm lesion; biopsy recommended.', '2025-07-02', 2, 1, ['exam', 'biopsy']],
            ['exam', 'Breast clinical exam', 'Palpable firmness; no axillary nodes on exam.', '2025-07-02', 2, 2, ['biopsy']],
            ['biopsy', 'Core biopsy and receptors', 'IDC grade 2; ER 95%, PR 80%, HER2 negative.', '2025-08-12', 3, 1, ['tnm']],
            ['tnm', 'TNM and stage assignment', 'cT1cN0M0 recorded as Stage I.', '2025-08-12', 4, 1, ['surgery']],
            ['surgery', 'Lumpectomy and sentinel node biopsy', 'Clear margins; 0/2 sentinel nodes.', '2025-09-10', 5, 1, ['radiation']],
            ['radiation', 'Adjuvant radiation completed', 'Whole-breast radiation completed without interruption.', '2025-11-18', 6, 0, ['endocrine']],
            ['endocrine', 'Endocrine therapy active', 'Anastrozole started with bone-health support.', '2025-12-02', 6, 2, ['surveillance']],
            ['surveillance', 'One-year surveillance stable', 'Imaging stable; CA 15-3 and CEA within range.', '2026-08-20', 7, 1, ['followup']],
            ['followup', 'Next mammogram scheduled', 'Closed-loop surveillance mammogram and oncology review scheduled.', '2026-09-18', 8, 1, []],
        ],
        reports: [],
        timeline: [
            ['2024-08-08', 'Annual wellness visit', 'Breast screening history reviewed; no symptoms reported.', 'appointment'],
            ['2024-11-18', 'Baseline CBC and CMP', 'Routine labs available for future comparison.', 'test'],
            ['2025-03-05', 'Breast self-awareness note', 'Patient reported no nipple change, discharge, or persistent breast pain.', 'general'],
            ['2025-06-18', 'Screening mammogram abnormality', 'BI-RADS 0 callback for left breast asymmetry; follow-up assigned to primary care team.', 'test'],
            ['2025-07-02', 'Diagnostic mammogram and ultrasound', 'Irregular 1.4 cm lesion at 2 o clock position; biopsy recommended by radiology.', 'test'],
            ['2025-08-12', 'Diagnosis documented', "Diagnosis: Left breast invasive ductal carcinoma, Stage I. Doctor's Advice: Oncology referral completed, surgery consult arranged, receptor profile reviewed.", 'appointment'],
            ['2025-09-10', 'Lumpectomy completed', 'Breast-conserving surgery and sentinel node biopsy completed; margins clear.', 'surgery'],
            ['2025-10-06', 'Post-operative oncology review', 'Radiation planning completed; endocrine therapy discussed after radiation.', 'appointment'],
            ['2025-11-18', 'Radiation completed', 'Adjuvant whole-breast radiation completed without interruption.', 'general'],
            ['2025-12-02', 'Endocrine therapy started', 'Anastrozole 1 mg daily started; bone health and side effects reviewed.', 'medication'],
            ['2026-02-14', 'Three-month oncology follow-up', 'No new breast symptoms; medication tolerance acceptable.', 'appointment'],
            ['2026-05-16', 'Surveillance labs', 'CBC/CMP stable; CA 15-3 within reference range.', 'test'],
            ['2026-08-20', 'One-year surveillance review', 'Clinical exam and imaging stable; continue surveillance plan.', 'appointment'],
            ['2026-08-20', 'Oncology context panel reviewed', 'CA 15-3, CA 27.29, CEA, liver enzymes, and calcium reviewed with surveillance imaging.', 'test'],
            ['2026-09-18', 'Next surveillance mammogram', 'Scheduled annual mammogram and oncology review.', 'appointment', 'pending'],
        ],
        meds: [
            ['Anastrozole', '1 mg', 'Once a day', 'Adjuvant endocrine therapy', '2025-12-02', null, 'Active'],
            ['Calcium with Vitamin D', '500 mg / 1000 IU', 'Once a day', 'Bone health during endocrine therapy', '2025-12-02', null, 'Active'],
        ],
    },
    {
        stageKey: 'stage2',
        userId: 'demo-oncotrack-stage2-user',
        patientId: 'demo-oncotrack-stage2-patient',
        conditionId: 'demo-oncotrack-stage2-condition',
        diagnosticId: 'demo-oncotrack-stage2-diagnostic',
        customId: 'NRV-ONC-002',
        name: 'Raman Iyer',
        email: 'raman.iyer@niraiva.health',
        phone: '+91 90000 41002',
        dob: '1963-04-09',
        age: 63,
        gender: 'male',
        bloodGroup: 'B+',
        height: '171 cm',
        weight: '78 kg',
        lifestyle: 'former smoker, walks 30 minutes, moderate alcohol',
        medicalHistory: 'Rising PSA followed to urology workup, prostate MRI, biopsy, definitive radiation, and PSA response monitoring.',
        chronicConditions: 'Stage II prostate adenocarcinoma',
        oncology: {
            diagnosis: 'Prostate adenocarcinoma',
            stage: 'Stage II',
            tnm: 'cT2bN0M0',
            diagnosisDate: '2025-08-25',
            carePhase: 'Post-treatment monitoring',
            treatmentIntent: 'Curative',
            currentPlan: 'PSA surveillance after definitive radiation and short-course androgen deprivation therapy.',
            nextMilestone: 'PSA and urology-oncology review due 05 Sep 2026',
            patientSummary: 'Your prostate cancer treatment has been completed. Your care team is tracking PSA over time and your next review is already scheduled.',
            clinicianSummary: 'Stage II localized prostate adenocarcinoma identified after rising PSA velocity. MRI showed organ-confined lesion; biopsy Gleason 3+4. Radiation completed with PSA response under monitoring.',
            screeningStatus: 'PSA screening concern routed to urology and closed with biopsy disposition',
            trendStatus: 'PSA velocity triggered clinician review before biopsy confirmation',
            closedLoopStatus: 'Urology referral, MRI, biopsy, radiation, ADT, and PSA follow-up documented',
            keyFinding: 'PSA increased from 3.8 to 8.9 ng/mL across 12 months',
            pathology: 'Prostate biopsy adenocarcinoma Gleason 3+4, grade group 2',
            imaging: 'mpMRI PI-RADS 4 lesion without nodal or bone metastasis',
            dataWindow: '20 Aug 2024 - 05 Sep 2026',
        },
        wellnessVitals: {
            date: '2026-08-26',
            hba1c: '5.8',
            glucose: '98',
            bloodPressure: '126/78',
            cholesterol: '188',
            temperature: '98.4 F',
            pulseRate: '72 bpm',
            spo2: '98%',
            notes: 'Vitals stable; urinary symptoms controlled on current plan.',
        },
        nodes: [
            ['profile', 'Profile and family history', 'Age 63 male; PSA screening followed because of family history.', '2024-08-20', 0, 1, ['baseline']],
            ['baseline', 'Baseline PSA recorded', 'PSA 3.8 ng/mL near upper reference limit.', '2024-08-20', 1, 1, ['repeat']],
            ['repeat', 'Repeat PSA rising', 'PSA 4.6 ng/mL; urinary infection symptoms absent.', '2024-11-21', 2, 0, ['symptom']],
            ['symptom', 'Nocturia and PSA repeat', 'Mild nocturia documented; repeat marker ordered.', '2025-02-20', 2, 2, ['trend']],
            ['trend', 'PSA velocity review', 'PSA 6.7 ng/mL with low free PSA; urology referral placed.', '2025-05-19', 3, 1, ['mri']],
            ['mri', 'Prostate MRI', 'PI-RADS 4 lesion; no nodal or bone metastasis reported.', '2025-07-07', 4, 1, ['biopsy']],
            ['biopsy', 'Biopsy confirmed diagnosis', 'Gleason 3+4 prostate adenocarcinoma.', '2025-08-25', 5, 1, ['tnm']],
            ['tnm', 'TNM and Stage II', 'cT2bN0M0 recorded; localized disease pathway selected.', '2025-08-25', 6, 1, ['decision']],
            ['decision', 'Shared treatment decision', 'Definitive radiation selected after oncology-urology review.', '2025-09-12', 7, 0, ['radiation']],
            ['adt', 'Short-course ADT', 'Leuprolide depot initiated before radiation.', '2025-10-01', 7, 2, ['radiation']],
            ['radiation', 'Definitive radiation completed', 'External beam radiation completed; PSA response monitored.', '2025-12-16', 8, 1, ['monitoring']],
            ['monitoring', 'PSA response monitoring', 'PSA declined to 0.7 ng/mL at one-year review.', '2026-08-26', 9, 1, []],
        ],
        timeline: [
            ['2024-08-20', 'Annual preventive visit', 'PSA 3.8 ng/mL recorded; repeat planned because of family history.', 'appointment'],
            ['2024-11-21', 'Repeat PSA', 'PSA 4.6 ng/mL; no urinary infection symptoms documented.', 'test'],
            ['2025-02-20', 'Primary care follow-up', 'Mild nocturia reported; PSA repeat ordered.', 'appointment'],
            ['2025-05-19', 'PSA velocity flagged for review', 'PSA 6.7 ng/mL with rising trend; urology referral placed.', 'test'],
            ['2025-07-07', 'Prostate MRI completed', 'PI-RADS 4 right peripheral-zone lesion; no metastatic features reported.', 'test'],
            ['2025-08-25', 'Diagnosis documented', "Diagnosis: Prostate adenocarcinoma, Stage II. Doctor's Advice: Review treatment options, complete staging confirmation, start radiation planning.", 'appointment'],
            ['2025-09-12', 'Treatment decision visit', 'Radiation therapy selected after shared decision-making.', 'appointment'],
            ['2025-10-01', 'ADT initiated', 'Short-course leuprolide initiated before radiation.', 'medication'],
            ['2025-12-16', 'Radiation course completed', 'Definitive external beam radiation completed.', 'general'],
            ['2026-02-24', 'Post-treatment PSA', 'PSA decreased to 2.4 ng/mL; treatment response discussed.', 'test'],
            ['2026-05-25', 'PSA surveillance', 'PSA 1.1 ng/mL; urinary symptoms controlled.', 'test'],
            ['2026-08-26', 'One-year oncology review', 'PSA 0.7 ng/mL; continue surveillance.', 'appointment'],
            ['2026-08-26', 'Prostate surveillance context panel', 'PSA, alkaline phosphatase, calcium, hemoglobin, and renal function reviewed together.', 'test'],
            ['2026-09-05', 'Next PSA review', 'Scheduled PSA and symptom review.', 'appointment', 'pending'],
        ],
        meds: [
            ['Tamsulosin', '0.4 mg', 'Once at night', 'Urinary symptoms during treatment', '2025-09-12', null, 'Active'],
            ['Leuprolide depot', '22.5 mg', 'Every 3 months', 'Short-course androgen deprivation therapy', '2025-10-01', 180, 'Stopped'],
        ],
    },
    {
        stageKey: 'stage3',
        userId: 'demo-oncotrack-stage3-user',
        patientId: 'demo-oncotrack-stage3-patient',
        conditionId: 'demo-oncotrack-stage3-condition',
        diagnosticId: 'demo-oncotrack-stage3-diagnostic',
        customId: 'NRV-ONC-003',
        name: 'Farah Khan',
        email: 'farah.khan@niraiva.health',
        phone: '+91 90000 41003',
        dob: '1968-11-30',
        age: 57,
        gender: 'female',
        bloodGroup: 'A+',
        height: '158 cm',
        weight: '59 kg',
        lifestyle: 'former smoker, 32 pack-years, quit 2021, low activity during treatment',
        medicalHistory: 'Smoking-history screening eligibility, persistent cough, LDCT, nodal disease, biopsy, concurrent chemoradiation, and immunotherapy handoff.',
        chronicConditions: 'Stage III non-small cell lung cancer',
        oncology: {
            diagnosis: 'Right upper lobe lung adenocarcinoma',
            stage: 'Stage III',
            tnm: 'cT2aN2M0',
            diagnosisDate: '2025-09-03',
            carePhase: 'Consolidation therapy',
            treatmentIntent: 'Curative-intent multimodality',
            currentPlan: 'Consolidation durvalumab with CT chest surveillance after concurrent chemoradiation.',
            nextMilestone: 'CT chest and toxicity review due 12 Sep 2026',
            patientSummary: 'Your lung cancer treatment is in the follow-up and consolidation phase. Your team is tracking scans, breathing symptoms, and treatment tolerance.',
            clinicianSummary: 'Stage III right upper lobe lung adenocarcinoma after LDCT workup and mediastinal nodal confirmation. Chemoradiation completed; consolidation immunotherapy active with stable interval imaging.',
            screeningStatus: 'Lung screening eligibility identified from smoking history and routed to LDCT',
            trendStatus: 'Persistent cough, weight loss, elevated CRP, and imaging findings reviewed together',
            closedLoopStatus: 'Pulmonology, biopsy, staging PET-CT, chemoradiation, and immunotherapy follow-up documented',
            keyFinding: 'LDCT detected right upper lobe mass with mediastinal lymph-node involvement',
            pathology: 'Lung adenocarcinoma, TTF-1 positive, PD-L1 35%',
            imaging: 'PET-CT showed ipsilateral mediastinal nodes without distant metastasis',
            dataWindow: '02 Sep 2024 - 12 Sep 2026',
        },
        wellnessVitals: {
            date: '2026-08-28',
            hba1c: '5.6',
            glucose: '94',
            bloodPressure: '122/76',
            cholesterol: '176',
            temperature: '98.6 F',
            pulseRate: '86 bpm',
            spo2: '97%',
            notes: 'Clinically stable on consolidation immunotherapy; breathing symptoms monitored.',
        },
        nodes: [
            ['risk', 'Smoking history eligibility', 'Former smoker, 32 pack-years; LDCT screening eligibility documented.', '2024-09-02', 0, 1, ['resp']],
            ['resp', 'Baseline respiratory assessment', 'No hemoptysis; oxygen saturation normal.', '2024-12-04', 1, 0, ['cough']],
            ['cough', 'Persistent cough reported', 'Cough persisted beyond six weeks; imaging discussed.', '2025-03-14', 1, 2, ['inflammation']],
            ['inflammation', 'Weight loss and markers', 'Unintentional 4 kg loss with CRP and ESR elevation.', '2025-05-08', 2, 1, ['ldct']],
            ['ldct', 'LDCT abnormality', 'Right upper lobe lesion and mediastinal node enlargement.', '2025-07-17', 3, 1, ['petct']],
            ['petct', 'PET-CT staging', 'Ipsilateral mediastinal nodes; no distant metastatic disease.', '2025-08-06', 4, 0, ['tnm']],
            ['pathology', 'Pathology confirmed NSCLC', 'Adenocarcinoma, TTF-1 positive, PD-L1 35%.', '2025-09-03', 4, 2, ['tnm']],
            ['tnm', 'TNM and Stage III', 'cT2aN2M0 recorded; curative-intent multimodality plan.', '2025-09-03', 5, 1, ['chemoradiation']],
            ['chemoradiation', 'Concurrent chemoradiation', 'Weekly carboplatin/paclitaxel with thoracic radiation completed.', '2025-12-22', 6, 1, ['response']],
            ['response', 'Post-treatment CT response', 'Partial response with no distant progression.', '2026-02-03', 7, 0, ['durvalumab']],
            ['durvalumab', 'Consolidation immunotherapy', 'Durvalumab active after oncology clearance.', '2026-03-01', 7, 2, ['surveillance']],
            ['surveillance', 'Marker and CT surveillance', 'Stable CT; lung markers and treatment-safety labs reviewed.', '2026-08-28', 8, 1, ['followup']],
            ['followup', 'Next CT and toxicity review', 'CT chest, labs, and immunotherapy toxicity review scheduled.', '2026-09-12', 9, 1, []],
        ],
        timeline: [
            ['2024-09-02', 'Smoking-history review', 'Former smoker, 32 pack-years; LDCT eligibility documented.', 'appointment'],
            ['2024-12-04', 'Baseline respiratory assessment', 'No hemoptysis; oxygen saturation normal.', 'general'],
            ['2025-03-14', 'Persistent cough reported', 'Cough lasting more than six weeks; chest imaging discussed.', 'appointment'],
            ['2025-05-08', 'Weight loss and inflammatory markers', 'Unintentional 4 kg loss and elevated CRP recorded.', 'test'],
            ['2025-07-17', 'Low-dose CT abnormal', 'Right upper lobe lesion with mediastinal lymph-node enlargement.', 'test'],
            ['2025-08-06', 'PET-CT staging', 'Mediastinal nodes positive; no distant metastatic disease reported.', 'test'],
            ['2025-09-03', 'Diagnosis documented', "Diagnosis: Right upper lobe lung adenocarcinoma, Stage III. Doctor's Advice: Complete multidisciplinary review and start concurrent chemoradiation planning.", 'appointment'],
            ['2025-10-13', 'Chemoradiation started', 'Concurrent weekly chemotherapy and thoracic radiation started.', 'medication'],
            ['2025-12-22', 'Chemoradiation completed', 'Treatment completed; esophagitis managed conservatively.', 'general'],
            ['2026-02-03', 'Post-treatment CT', 'Partial response with no distant disease.', 'test'],
            ['2026-03-01', 'Durvalumab started', 'Consolidation immunotherapy initiated after oncology clearance.', 'medication'],
            ['2026-06-18', 'CT surveillance', 'Stable post-treatment change; no progression reported.', 'test'],
            ['2026-08-28', 'One-year review', 'Clinically stable on consolidation therapy; continue monitoring.', 'appointment'],
            ['2026-08-28', 'Lung oncology marker context panel', 'CYFRA 21-1, NSE, ProGRP, CEA, CRP, ESR, and TSH reviewed during consolidation therapy.', 'test'],
            ['2026-09-12', 'Next CT and toxicity review', 'Scheduled CT chest, labs, and immunotherapy toxicity review.', 'appointment', 'pending'],
        ],
        meds: [
            ['Durvalumab', '10 mg/kg', 'Every 2 weeks', 'Consolidation immunotherapy', '2026-03-01', null, 'Active'],
            ['Ondansetron', '4 mg', 'As needed', 'Nausea during systemic therapy', '2025-10-13', null, 'Active'],
        ],
    },
    {
        stageKey: 'stage4',
        userId: 'demo-oncotrack-stage4-user',
        patientId: 'demo-oncotrack-stage4-patient',
        conditionId: 'demo-oncotrack-stage4-condition',
        diagnosticId: 'demo-oncotrack-stage4-diagnostic',
        customId: 'NRV-ONC-004',
        name: 'Daniel Mathew',
        email: 'daniel.mathew@niraiva.health',
        phone: '+91 90000 41004',
        dob: '1971-07-22',
        age: 55,
        gender: 'male',
        bloodGroup: 'AB+',
        height: '176 cm',
        weight: '72 kg',
        lifestyle: 'sedentary work, high red-meat intake historically, no tobacco',
        medicalHistory: 'Iron-deficiency anemia, bowel symptoms, colonoscopy, CEA trend, liver metastasis confirmation, systemic therapy, and response monitoring.',
        chronicConditions: 'Stage IV colorectal adenocarcinoma with liver metastases',
        oncology: {
            diagnosis: 'Metastatic sigmoid colon adenocarcinoma',
            stage: 'Stage IV',
            tnm: 'cT3N1M1a',
            diagnosisDate: '2025-08-18',
            carePhase: 'Systemic therapy monitoring',
            treatmentIntent: 'Disease control',
            currentPlan: 'Modified FOLFOX plus bevacizumab with CEA trend and liver imaging surveillance.',
            nextMilestone: 'Restaging CT and CEA review due 10 Sep 2026',
            patientSummary: 'Your colorectal cancer care is focused on treatment response, symptom control, and scan follow-up. Your team is tracking CEA, blood counts, and liver imaging.',
            clinicianSummary: 'Stage IV sigmoid colon adenocarcinoma identified after anemia and bowel-change workup. Liver-only metastatic disease documented. Systemic therapy active with CEA decline and partial radiographic response.',
            screeningStatus: 'Colorectal screening gap resolved after positive FIT and diagnostic colonoscopy',
            trendStatus: 'CEA elevated at diagnosis and now falling with treatment response',
            closedLoopStatus: 'FIT, colonoscopy, pathology, CT staging, liver biopsy, systemic therapy, and restaging plan documented',
            keyFinding: 'Iron-deficiency anemia and positive FIT preceded colonoscopy-confirmed sigmoid lesion',
            pathology: 'Moderately differentiated adenocarcinoma, MMR proficient, RAS wild-type',
            imaging: 'CT abdomen showed liver lesions; biopsy confirmed metastatic colorectal adenocarcinoma',
            dataWindow: '15 Aug 2024 - 24 Aug 2026',
        },
        wellnessVitals: {
            date: '2026-08-24',
            hba1c: '5.7',
            glucose: '96',
            bloodPressure: '124/80',
            cholesterol: '190',
            temperature: '98.3 F',
            pulseRate: '78 bpm',
            spo2: '98%',
            notes: 'Performance status stable; neuropathy and anemia reviewed before next cycle.',
        },
        nodes: [
            ['baseline', 'Microcytic anemia signal', 'Hemoglobin 11.2 g/dL with low MCV and ferritin.', '2024-08-15', 0, 1, ['iron']],
            ['iron', 'Iron-deficiency review', 'Dietary history and GI review planned.', '2024-11-10', 1, 0, ['bowel']],
            ['bowel', 'Bowel habit change', 'Intermittent constipation and bloating documented.', '2025-02-18', 1, 2, ['fit']],
            ['fit', 'Positive FIT and CEA', 'FIT positive with CEA 42 ng/mL; colonoscopy urgent.', '2025-05-12', 2, 1, ['colonoscopy']],
            ['colonoscopy', 'Colonoscopy abnormality', 'Partially obstructing sigmoid lesion biopsied.', '2025-07-02', 3, 1, ['pathology']],
            ['pathology', 'Colon pathology', 'Moderately differentiated adenocarcinoma; MMR proficient.', '2025-08-18', 4, 1, ['ct']],
            ['ct', 'CT abdomen staging', 'Liver lesions identified during staging workup.', '2025-09-09', 5, 0, ['tnm']],
            ['liver', 'Liver biopsy confirmation', 'Metastatic colorectal adenocarcinoma confirmed.', '2025-09-09', 5, 2, ['tnm']],
            ['tnm', 'TNM and Stage IV', 'cT3N1M1a recorded; disease-control pathway selected.', '2025-09-09', 6, 1, ['systemic']],
            ['systemic', 'Systemic therapy started', 'Modified FOLFOX plus bevacizumab initiated.', '2025-09-30', 7, 1, ['response']],
            ['response', 'Restaging partial response', 'CEA falling and liver lesions smaller on CT.', '2026-02-22', 8, 0, ['toxicity']],
            ['toxicity', 'Toxicity review', 'Grade 1 neuropathy; oxaliplatin dose adjusted.', '2026-05-21', 8, 2, ['monitoring']],
            ['monitoring', 'Ongoing response monitoring', 'CEA 8.6 ng/mL; stable symptoms before next cycle.', '2026-08-24', 9, 1, ['followup']],
            ['followup', 'Restaging CT scheduled', 'CT chest abdomen pelvis and CEA review scheduled.', '2026-09-10', 10, 1, []],
        ],
        timeline: [
            ['2024-08-15', 'Routine labs show anemia', 'Hemoglobin 11.2 g/dL with low MCV; repeat CBC and iron studies advised.', 'test'],
            ['2024-11-10', 'Iron-deficiency review', 'Ferritin low; dietary history and GI review planned.', 'appointment'],
            ['2025-02-18', 'Bowel habit change reported', 'Intermittent constipation and bloating documented.', 'appointment'],
            ['2025-05-12', 'Positive FIT result', 'Fecal immunochemical test positive; colonoscopy referral marked urgent.', 'test'],
            ['2025-07-02', 'Colonoscopy abnormality', 'Partially obstructing sigmoid lesion biopsied.', 'test'],
            ['2025-08-18', 'Diagnosis documented', "Diagnosis: Sigmoid colon adenocarcinoma, Stage IV after staging workup. Doctor's Advice: Oncology treatment planning, liver lesion confirmation, and symptom support arranged.", 'appointment'],
            ['2025-09-09', 'Liver biopsy confirms metastasis', 'Metastatic colorectal adenocarcinoma confirmed in liver lesion.', 'test'],
            ['2025-09-30', 'Systemic therapy started', 'Modified FOLFOX plus bevacizumab initiated.', 'medication'],
            ['2025-12-20', 'CEA response review', 'CEA decreased from 42 to 21 ng/mL; continue regimen.', 'test'],
            ['2026-02-22', 'Restaging CT', 'Partial response in liver lesions; no new metastatic sites.', 'test'],
            ['2026-05-21', 'Treatment toxicity review', 'Neuropathy grade 1; oxaliplatin dose adjusted.', 'appointment'],
            ['2026-08-24', 'One-year oncology review', 'CEA 8.6 ng/mL and stable symptoms; continue systemic therapy with restaging.', 'appointment'],
            ['2026-08-24', 'Colorectal oncology context panel', 'CEA, CA 19-9, LDH, blood counts, ANC, and albumin reviewed before continuing treatment.', 'test'],
            ['2026-09-10', 'Next restaging CT', 'Scheduled CT chest abdomen pelvis and CEA review.', 'appointment', 'pending'],
        ],
        meds: [
            ['Modified FOLFOX', 'Protocol dose', 'Every 2 weeks', 'Systemic therapy for metastatic colorectal cancer', '2025-09-30', null, 'Active'],
            ['Bevacizumab', '5 mg/kg', 'Every 2 weeks', 'Targeted therapy with systemic regimen', '2025-09-30', null, 'Active'],
            ['Ferrous sulfate', '325 mg', 'Once a day', 'Iron-deficiency anemia support', '2024-11-10', 180, 'Stopped'],
        ],
    },
];

cases[0].reports = [
    report(cases[0], 'demo-stage1-report-1', '2024-11-18', 'Maya Srinivasan - Baseline CBC CMP.pdf', [
        { category: 'Complete Blood Count', tests: [test('Hemoglobin', '12.8', 'g/dL', '12.0-15.5'), test('WBC Count', '6.2', '10^3/uL', '4.0-11.0'), test('Platelet Count', '248', '10^3/uL', '150-450')] },
        { category: 'Metabolic Panel', tests: [test('Alkaline Phosphatase', '71', 'U/L', '44-147'), test('Albumin', '4.2', 'g/dL', '3.5-5.0')] },
    ], { labName: 'Niraiva Core Lab', keyFinding: 'Baseline CBC and CMP stable before cancer workup' }),
    report(cases[0], 'demo-stage1-report-2', '2025-07-02', 'Maya Srinivasan - Diagnostic Breast Imaging.pdf', [
        { category: 'Breast Imaging', tests: [test('Lesion Size', '1.4', 'cm', '', 'high'), test('Axillary Nodes', 'Not enlarged', '', '', 'normal')] },
    ], { imaging: 'Diagnostic mammogram and ultrasound showed 1.4 cm irregular lesion, no abnormal axillary nodes' }),
    report(cases[0], 'demo-stage1-report-3', '2025-08-12', 'Maya Srinivasan - Breast Pathology and Receptors.pdf', [
        { category: 'Pathology', tests: [test('Histology', 'Invasive ductal carcinoma', '', ''), test('ER', '95', '%', '', 'high'), test('PR', '80', '%', '', 'high'), test('HER2 IHC', '1+', '', '0-1+', 'normal')] },
    ], { pathology: 'Invasive ductal carcinoma, grade 2, ER/PR positive, HER2 negative' }),
    report(cases[0], 'demo-stage1-report-6', '2025-09-10', 'Maya Srinivasan - Surgical Pathology Summary.pdf', [
        { category: 'Surgical Pathology', tests: [test('Invasive Tumor Size', '1.4', 'cm', '<2.0 cm for T1 pattern'), test('Margins', 'Negative', '', 'No ink on tumor'), test('Sentinel Nodes', '0/2', '', 'No nodal metastasis'), test('Lymphovascular Invasion', 'Not identified', '', 'Absent')] },
    ], { pathology: 'Lumpectomy pathology confirmed 1.4 cm invasive carcinoma, negative margins, and 0/2 sentinel nodes' }),
    report(cases[0], 'demo-stage1-report-4', '2026-05-16', 'Maya Srinivasan - Surveillance Markers.pdf', [
        { category: 'Tumor Marker Surveillance', tests: [test('CA 15-3', '18', 'U/mL', '<30'), test('CEA', '1.9', 'ng/mL', '<3.0')] },
        { category: 'Complete Blood Count', tests: [test('Hemoglobin', '12.6', 'g/dL', '12.0-15.5')] },
    ], { keyFinding: 'Surveillance tumor markers remained inside reference limits' }),
    report(cases[0], 'demo-stage1-report-5', '2026-08-20', 'Maya Srinivasan - One Year Surveillance Review.pdf', [
        { category: 'Imaging Follow-up', tests: [test('Mammography Assessment', 'Post-treatment change only', '', '', 'normal'), test('Regional Nodes', 'No suspicious adenopathy', '', '', 'normal')] },
    ], { imaging: 'One-year mammogram stable with post-treatment change only' }),
    report(cases[0], 'demo-stage1-report-7', '2026-08-20', 'Maya Srinivasan - Oncology Context Panel.pdf', [
        { category: 'Breast Marker Context', tests: [test('CA 15-3', '17', 'U/mL', '<30'), test('CA 27.29', '22', 'U/mL', '<38'), test('CEA', '1.8', 'ng/mL', '<3.0')] },
        { category: 'Safety and Metabolic Context', tests: [test('AST', '22', 'U/L', '10-40'), test('ALT', '19', 'U/L', '7-56'), test('Calcium', '9.4', 'mg/dL', '8.6-10.2')] },
    ], { keyFinding: 'Breast surveillance markers and treatment-safety labs remained stable' }),
];

cases[1].reports = [
    report(cases[1], 'demo-stage2-report-1', '2024-08-20', 'Raman Iyer - Preventive PSA Baseline.pdf', [
        { category: 'Prostate Marker', tests: [test('PSA', '3.8', 'ng/mL', '<4.0')] },
    ], { keyFinding: 'PSA near upper reference limit; repeat planned due family history' }),
    report(cases[1], 'demo-stage2-report-2', '2025-05-19', 'Raman Iyer - PSA Velocity Review.pdf', [
        { category: 'Prostate Marker', tests: [test('PSA', '6.7', 'ng/mL', '<4.0', 'high'), test('Free PSA', '11', '%', '>25', 'low')] },
    ], { keyFinding: 'PSA velocity became review-worthy and urology referral was completed' }),
    report(cases[1], 'demo-stage2-report-3', '2025-07-07', 'Raman Iyer - Prostate MRI.pdf', [
        { category: 'Prostate MRI', tests: [test('PI-RADS', '4', '', '1-2', 'high'), test('Nodal Disease', 'Not identified', '', '', 'normal')] },
    ], { imaging: 'mpMRI PI-RADS 4 lesion without nodal or bone metastasis' }),
    report(cases[1], 'demo-stage2-report-4', '2025-08-25', 'Raman Iyer - Prostate Biopsy.pdf', [
        { category: 'Pathology', tests: [test('Gleason Score', '3+4', '', '', 'high'), test('Grade Group', '2', '', '', 'high')] },
    ], { pathology: 'Adenocarcinoma Gleason 3+4, grade group 2' }),
    report(cases[1], 'demo-stage2-report-6', '2025-12-16', 'Raman Iyer - End of Radiation Review.pdf', [
        { category: 'Treatment Monitoring', tests: [test('PSA', '2.9', 'ng/mL', '<4.0 after treatment trend'), test('Testosterone', '38', 'ng/dL', '<50 during ADT'), test('Hemoglobin', '13.4', 'g/dL', '13.5-17.5', 'low')] },
    ], { keyFinding: 'End-of-radiation review showed PSA decline with castrate-range testosterone during ADT' }),
    report(cases[1], 'demo-stage2-report-5', '2026-08-26', 'Raman Iyer - PSA Treatment Response.pdf', [
        { category: 'Prostate Marker', tests: [test('PSA', '0.7', 'ng/mL', '<4.0')] },
    ], { keyFinding: 'PSA decreased after definitive radiation and short-course ADT' }),
    report(cases[1], 'demo-stage2-report-7', '2026-08-26', 'Raman Iyer - Prostate Surveillance Context Panel.pdf', [
        { category: 'Prostate Surveillance', tests: [test('PSA', '0.7', 'ng/mL', 'Falling from diagnostic peak'), test('Alkaline Phosphatase', '82', 'U/L', '44-147'), test('Calcium', '9.2', 'mg/dL', '8.6-10.2')] },
        { category: 'Treatment Safety', tests: [test('Hemoglobin', '13.6', 'g/dL', '13.5-17.5'), test('Creatinine', '0.9', 'mg/dL', '0.7-1.3')] },
    ], { keyFinding: 'PSA remained suppressed with no biochemical or bone-turnover concern' }),
];

cases[2].reports = [
    report(cases[2], 'demo-stage3-report-1', '2024-09-02', 'Farah Khan - Lung Screening Eligibility.pdf', [
        { category: 'Risk Review', tests: [test('Smoking Exposure', '32', 'pack-years', '>=20', 'high'), test('Quit Year', '2021', '', '')] },
    ], { keyFinding: 'LDCT eligibility identified from smoking history' }),
    report(cases[2], 'demo-stage3-report-2', '2025-05-08', 'Farah Khan - Symptom and Inflammation Review.pdf', [
        { category: 'Inflammation', tests: [test('CRP', '18', 'mg/L', '<5', 'high'), test('ESR', '39', 'mm/hr', '<30', 'high')] },
        { category: 'Complete Blood Count', tests: [test('Hemoglobin', '11.7', 'g/dL', '12.0-15.5', 'low')] },
    ], { keyFinding: 'Persistent cough, weight loss, and inflammatory markers prompted imaging review' }),
    report(cases[2], 'demo-stage3-report-3', '2025-08-06', 'Farah Khan - PET CT Staging.pdf', [
        { category: 'Imaging', tests: [test('Primary Lung Lesion', '3.2', 'cm', '', 'high'), test('Mediastinal Nodes', 'FDG avid', '', '', 'high'), test('Distant Metastasis', 'Not identified', '', '', 'normal')] },
    ], { imaging: 'PET-CT showed right upper lobe lesion and ipsilateral mediastinal nodes without distant metastasis' }),
    report(cases[2], 'demo-stage3-report-4', '2025-09-03', 'Farah Khan - Lung Pathology.pdf', [
        { category: 'Pathology', tests: [test('Histology', 'Adenocarcinoma', '', ''), test('PD-L1 TPS', '35', '%', '', 'high'), test('TTF-1', 'Positive', '', '')] },
    ], { pathology: 'Lung adenocarcinoma, TTF-1 positive, PD-L1 35%' }),
    report(cases[2], 'demo-stage3-report-6', '2026-02-03', 'Farah Khan - Post Treatment CT Response.pdf', [
        { category: 'CT Response Assessment', tests: [test('Primary Lung Lesion', '1.8', 'cm', 'Decreased from 3.2 cm'), test('Mediastinal Nodes', 'Decreased uptake', '', 'Improved from baseline'), test('Distant Disease', 'Not identified', '', 'Absent')] },
        { category: 'Treatment Safety', tests: [test('ALT', '24', 'U/L', '7-56'), test('Creatinine', '0.8', 'mg/dL', '0.6-1.1')] },
    ], { imaging: 'Post-treatment CT showed partial response without distant progression' }),
    report(cases[2], 'demo-stage3-report-5', '2026-08-28', 'Farah Khan - Consolidation Therapy Surveillance.pdf', [
        { category: 'Chemistry', tests: [test('LDH', '196', 'U/L', '140-280'), test('Alkaline Phosphatase', '88', 'U/L', '44-147')] },
        { category: 'Imaging Follow-up', tests: [test('CT Chest Assessment', 'Stable post-treatment change', '', '', 'normal')] },
    ], { keyFinding: 'Interval CT remained stable during consolidation immunotherapy' }),
    report(cases[2], 'demo-stage3-report-7', '2026-08-28', 'Farah Khan - Lung Oncology Marker Context Panel.pdf', [
        { category: 'Lung Marker Context', tests: [test('CYFRA 21-1', '2.1', 'ng/mL', '<3.3'), test('NSE', '10.8', 'ng/mL', '<16.3'), test('ProGRP', '42', 'pg/mL', '<75'), test('CEA', '2.4', 'ng/mL', '<3.0')] },
        { category: 'Inflammation and Safety', tests: [test('CRP', '4.8', 'mg/L', '<5'), test('ESR', '18', 'mm/hr', '<30'), test('TSH', '2.1', 'mIU/L', '0.4-4.0')] },
    ], { keyFinding: 'Lung marker context and immunotherapy-safety labs remained within expected monitoring range' }),
];

cases[3].reports = [
    report(cases[3], 'demo-stage4-report-1', '2024-08-15', 'Daniel Mathew - Anemia Baseline.pdf', [
        { category: 'Complete Blood Count', tests: [test('Hemoglobin', '11.2', 'g/dL', '13.5-17.5', 'low'), test('MCV', '74', 'fL', '80-96', 'low'), test('Ferritin', '14', 'ng/mL', '30-400', 'low')] },
    ], { keyFinding: 'Microcytic anemia recorded one year before diagnosis' }),
    report(cases[3], 'demo-stage4-report-2', '2025-05-12', 'Daniel Mathew - Positive FIT and CEA.pdf', [
        { category: 'Colorectal Workup', tests: [test('FIT', 'Positive', '', 'Negative', 'high'), test('CEA', '42', 'ng/mL', '<3.0', 'high')] },
    ], { keyFinding: 'Positive FIT and elevated CEA routed to diagnostic colonoscopy' }),
    report(cases[3], 'demo-stage4-report-3', '2025-08-18', 'Daniel Mathew - Colon Pathology.pdf', [
        { category: 'Pathology', tests: [test('Histology', 'Moderately differentiated adenocarcinoma', '', ''), test('MMR', 'Proficient', '', ''), test('RAS', 'Wild-type', '', '')] },
    ], { pathology: 'Moderately differentiated sigmoid colon adenocarcinoma, MMR proficient, RAS wild-type' }),
    report(cases[3], 'demo-stage4-report-4', '2025-09-09', 'Daniel Mathew - CT and Liver Biopsy.pdf', [
        { category: 'Staging', tests: [test('Liver Lesions', 'Present', '', 'Absent', 'high'), test('Distant Metastasis', 'M1a', '', 'M0', 'high')] },
    ], { imaging: 'CT showed liver lesions; liver biopsy confirmed metastatic colorectal adenocarcinoma' }),
    report(cases[3], 'demo-stage4-report-6', '2026-02-22', 'Daniel Mathew - Interim Restaging Response.pdf', [
        { category: 'Tumor Marker', tests: [test('CEA', '14.2', 'ng/mL', '<3.0', 'high')] },
        { category: 'Imaging Response', tests: [test('Largest Liver Lesion', '2.1', 'cm', 'Decreased from 3.4 cm'), test('New Lesions', 'Not identified', '', 'Absent'), test('RECIST Impression', 'Partial response', '', 'Response assessment')] },
    ], { keyFinding: 'Interim restaging showed falling CEA and partial response in liver lesions' }),
    report(cases[3], 'demo-stage4-report-5', '2026-08-24', 'Daniel Mathew - CEA and Restaging Review.pdf', [
        { category: 'Tumor Marker', tests: [test('CEA', '8.6', 'ng/mL', '<3.0', 'high')] },
        { category: 'Treatment Monitoring', tests: [test('CT Response', 'Partial response', '', '', 'normal'), test('Hemoglobin', '12.4', 'g/dL', '13.5-17.5', 'low')] },
    ], { keyFinding: 'CEA decreased from 42 to 8.6 ng/mL with partial CT response' }),
    report(cases[3], 'demo-stage4-report-7', '2026-08-24', 'Daniel Mathew - Colorectal Oncology Context Panel.pdf', [
        { category: 'Colorectal Marker Context', tests: [test('CEA', '8.6', 'ng/mL', 'Falling from 42 ng/mL', 'high'), test('CA 19-9', '28', 'U/mL', '<37'), test('LDH', '224', 'U/L', '140-280')] },
        { category: 'Treatment Safety', tests: [test('Platelet Count', '178', '10^3/uL', '150-450'), test('ANC', '2.8', '10^3/uL', '1.5-8.0'), test('Albumin', '3.8', 'g/dL', '3.5-5.0')] },
    ], { keyFinding: 'Colorectal marker and chemotherapy-safety panel supported continued systemic therapy' }),
];

function nodeType(id, title) {
    const text = `${id} ${title}`.toLowerCase();
    if (/(symptom|cough|weight|bowel|anemia|trend|velocity|profile|family|exposure|smoking|iron)/.test(text)) return 'symptom';
    if (/(biopsy|pathology|histology|receptor|gleason|colonoscopy|fit)/.test(text)) return 'pathology';
    if (/(surgery|lumpectomy|resection|sentinel)/.test(text)) return 'surgery';
    if (/(treatment|therapy|radiation|chemoradiation|durvalumab|folfox|adt|immunotherapy|systemic|endocrine)/.test(text)) return 'therapy';
    if (/(surveillance|monitoring|response|review|followup|follow-up|toxicity|closure)/.test(text)) return 'surveillance';
    if (/(screen|mammogram|ldct|psa|mri|imaging|eligibility|ct|pet)/.test(text)) return 'screening';
    return 'diagnosis';
}

function reportsForDate(caseData, date) {
    return (caseData.reports || []).filter(reportData => reportData.reportDate === date);
}

function testsForDate(caseData, date) {
    return reportsForDate(caseData, date)
        .flatMap(reportData => reportData.extractedData.results || [])
        .flatMap(category => category.tests || [])
        .filter(item => item.name && item.value)
        .slice(0, 4);
}

function nodeRationale(caseData, type, index) {
    if (index === 0) return caseData.oncology.screeningStatus || caseData.oncology.keyFinding;
    if (type === 'symptom') return caseData.oncology.trendStatus;
    if (type === 'pathology') return caseData.oncology.pathology;
    if (type === 'therapy') return caseData.oncology.treatmentIntent;
    if (type === 'surveillance') return caseData.oncology.closedLoopStatus;
    return caseData.oncology.keyFinding;
}

function nodeOutcome(caseData, type, index) {
    if (index === caseData.nodes.length - 1) return `${caseData.oncology.currentPlan} Next: ${caseData.oncology.nextMilestone}.`;
    if (type === 'pathology') return `${caseData.oncology.stage} confirmed; ${caseData.oncology.tnm} recorded for care planning.`;
    if (type === 'therapy') return 'Treatment step completed or active with follow-up ownership documented.';
    if (type === 'screening') return 'Signal moved forward into clinician-reviewed workup.';
    return 'Milestone reviewed in sequence with source data attached.';
}

function makeNodes(caseData) {
    return caseData.nodes.map(([id, title, description, date, x, y, explicitConnections], index) => {
        const type = nodeType(id, title);
        const reportTests = testsForDate(caseData, date).map(item => ({
            name: item.name,
            value: item.value,
            unit: item.unit || '',
            status: item.status || 'normal',
        }));

        return {
            id,
            title,
            description,
            type,
            date,
            rationale: nodeRationale(caseData, type, index),
            outcome: nodeOutcome(caseData, type, index),
            x,
            y,
            connections: explicitConnections || (index < caseData.nodes.length - 1 ? [caseData.nodes[index + 1][0]] : []),
            parameters: [
                { name: 'Stage', value: caseData.oncology.stage, unit: '', status: 'normal' },
                { name: 'TNM', value: caseData.oncology.tnm, unit: '', status: 'normal' },
                ...reportTests,
            ],
        };
    });
}

function wellnessParameters(caseData) {
    const vitals = caseData.wellnessVitals || {};
    return [
        test('HbA1c', vitals.hba1c || '5.6', '%', '<5.7', 'normal'),
        test('Blood Glucose', vitals.glucose || '94', 'mg/dL', '70-99', 'normal'),
        test('Blood Pressure', vitals.bloodPressure || '120/78', 'mm Hg', '<130/80', 'normal'),
        test('Total Cholesterol', vitals.cholesterol || '185', 'mg/dL', '<200', 'normal'),
    ];
}

function parseVisitText(description = '') {
    const diagMatch = description.match(/Diagnosis:\s*(.+?)(?:\.|$|\n)/i);
    const adviceMatch = description.match(/Doctor's Advice:\s*([\s\S]+?)(?:$)/i);
    return {
        diagnosis: diagMatch?.[1]?.trim(),
        advice: adviceMatch?.[1]?.trim() || description,
    };
}

function medicinesActiveOn(caseData, visitDate) {
    const activeMeds = caseData.meds
        .filter(([, , , , startDate, durationDays]) => {
            if (startDate > visitDate) return false;
            if (!durationDays) return true;
            const end = new Date(`${startDate}T00:00:00.000Z`);
            end.setDate(end.getDate() + Number(durationDays));
            return visitDate <= end.toISOString().slice(0, 10);
        })
        .map(([name, dosage, frequency, purpose, startDate]) => ({
            name,
            dosage,
            frequency,
            purpose,
            startDate,
        }));
    return activeMeds;
}

function visitOrders(caseData, visitDate, title) {
    const lower = `${title} ${caseData.oncology.stage}`.toLowerCase();
    if (lower.includes('diagnosis')) return 'Confirm TNM stage, review source reports, complete multidisciplinary treatment planning, and schedule first treatment review.';
    if (lower.includes('post-operative')) return 'Review surgical pathology, start adjuvant plan, and monitor wound recovery and endocrine therapy readiness.';
    if (lower.includes('toxicity') || lower.includes('review') || lower.includes('follow-up')) return `Continue current care plan. Next milestone: ${caseData.oncology.nextMilestone}.`;
    if (lower.includes('preventive') || lower.includes('annual')) return 'Review screening eligibility, lifestyle history, and repeat testing plan based on clinical context.';
    return caseData.oncology.currentPlan;
}

function prescriptionSnapshot(caseData, visit, index) {
    const [visitDate, title, description] = visit;
    const parsed = parseVisitText(description);
    const meds = medicinesActiveOn(caseData, visitDate);

    return {
        prescriptionNo: `NRX-${caseData.customId.replace('NRV-', '')}-${String(index + 1).padStart(2, '0')}`,
        date: visitDate,
        patientName: caseData.name,
        doctorName: 'Ananya Rao',
        clinicName: 'Niraiva OnCoTrack Clinic',
        doctorSpecialization: 'Medical Oncology',
        diagnosis: parsed.diagnosis || `${caseData.oncology.diagnosis}, ${caseData.oncology.stage} (${caseData.oncology.tnm})`,
        treatmentPlan: visitOrders(caseData, visitDate, title),
        advice: parsed.advice || caseData.oncology.patientSummary,
        followUp: caseData.oncology.nextMilestone,
        medications: meds,
        vitals: {
            bloodPressure: caseData.wellnessVitals.bloodPressure,
            pulseRate: caseData.wellnessVitals.pulseRate,
            spO2: caseData.wellnessVitals.spo2,
            weight: caseData.weight,
        },
    };
}

async function clearDemoData() {
    const patientIds = cases.map(c => c.patientId);
    const userIds = cases.map(c => c.userId);
    const legacyUserIds = ['demo-oncotrack-doctor-user'];
    const legacyDoctorIds = ['demo-oncotrack-doctor'];
    for (const userId of userIds) {
        await execute('DELETE FROM timeline_events WHERE user_id = ?', [userId]).catch(() => null);
    }
    await execute('DELETE FROM timeline_events WHERE user_id = ?', [ids.doctorUser]).catch(() => null);
    for (const table of ['prescriptions', 'doctor_private_notes', 'medications', 'patient_diagnostics', 'patient_conditions', 'patient_vitals', 'health_parameters', 'lab_reports', 'doctor_patient_relations']) {
        for (const patientId of patientIds) {
            await execute(`DELETE FROM ${table} WHERE patient_id = ?`, [patientId]).catch(() => null);
        }
    }
    for (const userId of userIds) await execute('DELETE FROM users WHERE id = ?', [userId]).catch(() => null);
    for (const userId of legacyUserIds) await execute('DELETE FROM users WHERE id = ?', [userId]).catch(() => null);
    for (const doctorId of legacyDoctorIds) await execute('DELETE FROM doctors WHERE id = ?', [doctorId]).catch(() => null);
    await execute('DELETE FROM doctors WHERE id = ?', [ids.doctor]).catch(() => null);
    await execute('DELETE FROM users WHERE id = ?', [ids.doctorUser]).catch(() => null);
}

async function seed() {
    await ensureSchema();
    await clearDemoData();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    await execute(
        `INSERT INTO users (id, name, email, password, role, is_onboarded, custom_id, is_banned)
         VALUES (?, ?, ?, ?, 'doctor', 1, ?, 0)`,
        [ids.doctorUser, 'Ananya Rao', 'ananya.rao@niraiva.health', passwordHash, 'DR-ONC-RAO']
    );
    await execute(
        `INSERT INTO doctors (id, user_id, dob, age, gender, phone_number, address, city, marital_status, specialization, clinic_name, license_number, experience_years, degree, hospital_timing, working_days, bio, approval_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
        [ids.doctor, ids.doctorUser, '1981-03-12', 45, 'female', '+91 90000 42000', 'Niraiva Cancer Care Center', 'Bengaluru', 'married', 'Medical Oncology', 'Niraiva OnCoTrack Clinic', 'KMC-ONC-20419', 16, 'MD, DM Medical Oncology', '09:00 AM - 05:00 PM', 'Mon-Sat', 'Medical oncologist focused on longitudinal cancer care, treatment navigation, and source-linked follow-up.', ts('2024-01-01')]
    );

    for (const caseData of cases) {
        await execute(
            `INSERT INTO users (id, name, email, password, role, is_onboarded, custom_id, is_banned)
             VALUES (?, ?, ?, ?, 'patient', 1, ?, 0)`,
            [caseData.userId, caseData.name, caseData.email, passwordHash, caseData.customId]
        );
        await execute(
            `INSERT INTO patients (id, user_id, dob, age, gender, phone_number, address, city, marital_status, emergency_contact_name, emergency_contact_phone, blood_group, height, weight, allergies, current_medications, past_surgeries, chronic_conditions, lifestyle, medical_history, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [caseData.patientId, caseData.userId, caseData.dob, caseData.age, caseData.gender, caseData.phone, 'Niraiva Oncology Care Network', 'Bengaluru', 'married', 'Care Partner', '+91 90000 49999', caseData.bloodGroup, caseData.height, caseData.weight, 'No known drug allergy', caseData.meds.map(m => m[0]).join(', '), 'None', caseData.chronicConditions, caseData.lifestyle, caseData.medicalHistory, ts('2024-08-01')]
        );
        await execute(
            `INSERT INTO doctor_patient_relations (id, doctor_id, patient_id, added_at) VALUES (?, ?, ?, ?)`,
            [`demo-relation-${caseData.stageKey}`, ids.doctor, caseData.patientId, ts('2024-08-01')]
        );
        await execute(
            `INSERT INTO patient_conditions (id, patient_id, condition_name, diagnosed_date, status, added_by, doctor_id, created_at)
             VALUES (?, ?, ?, ?, 'active', 'doctor', ?, ?)`,
            [caseData.conditionId, caseData.patientId, caseData.chronicConditions, caseData.oncology.diagnosisDate, ids.doctor, ts(caseData.oncology.diagnosisDate)]
        );
        await execute(
            `INSERT INTO patient_diagnostics (id, patient_id, doctor_id, condition_name, condition_status, nodes, clinical_notes, treatment_plan, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [caseData.diagnosticId, caseData.patientId, ids.doctor, caseData.chronicConditions, caseData.oncology.carePhase.toLowerCase().includes('surveillance') || caseData.oncology.carePhase.toLowerCase().includes('monitoring') ? 'stable' : 'improving', json(makeNodes(caseData)), caseData.oncology.clinicianSummary, caseData.oncology.currentPlan, ts(caseData.oncology.diagnosisDate), ts('2026-08-28')]
        );
        await execute(
            `INSERT INTO doctor_private_notes (id, doctor_id, patient_id, note_content, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [`demo-note-${caseData.stageKey}`, ids.doctor, caseData.patientId, `${caseData.oncology.clinicianSummary}\n\nStage/TNM: ${caseData.oncology.stage}, ${caseData.oncology.tnm}.\nClosed-loop status: ${caseData.oncology.closedLoopStatus}.\nNext milestone: ${caseData.oncology.nextMilestone}.`, ts('2026-08-28', 14)]
        );

        for (const [name, dosage, frequency, purpose, startDate, durationDays, status] of caseData.meds) {
            await execute(
                `INSERT INTO medications (id, patient_id, name, dosage, purpose, start_date, frequency, duration_days, status, added_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [`demo-med-${caseData.stageKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, caseData.patientId, name, dosage, purpose, startDate, frequency, durationDays, status, 'Dr. Ananya Rao', ts(startDate)]
            );
        }

        const prescriptionVisits = caseData.timeline
            .map((visit, index) => ({ visit, index }))
            .filter(({ visit }) => visit[3] === 'appointment' && (visit[4] || 'completed') === 'completed');

        for (const { visit, index } of prescriptionVisits) {
            const visitDate = visit[0];
            await execute(
                `INSERT INTO prescriptions (id, patient_id, doctor_id, consultation_data, cloudinary_url, prescribed_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    `demo-prescription-${caseData.stageKey}-${String(index + 1).padStart(2, '0')}`,
                    caseData.patientId,
                    ids.doctor,
                    json(prescriptionSnapshot(caseData, visit, index)),
                    `demo-prescription://${caseData.stageKey}-${String(index + 1).padStart(2, '0')}`,
                    ts(visitDate, 15),
                ]
            );
        }

        for (const item of wellnessParameters(caseData)) {
            await execute(
                `INSERT INTO health_parameters (id, patient_id, lab_report_id, parameter_name, value, unit, reference_range, status, test_date, created_at)
                 VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
                [`demo-wellness-${caseData.stageKey}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, caseData.patientId, item.name, item.value, item.unit || '', item.referenceRange || '', item.status || 'normal', caseData.wellnessVitals.date, ts(caseData.wellnessVitals.date)]
            );
        }

        await execute(
            `INSERT INTO patient_vitals (id, patient_id, blood_pressure, temperature, weight, height, pulse_rate, spo2, recorded_by, notes, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                `demo-staff-vitals-${caseData.stageKey}`,
                caseData.patientId,
                caseData.wellnessVitals.bloodPressure,
                caseData.wellnessVitals.temperature,
                caseData.weight,
                caseData.height,
                caseData.wellnessVitals.pulseRate,
                caseData.wellnessVitals.spo2,
                'Niraiva oncology nurse',
                caseData.wellnessVitals.notes,
                ts(caseData.wellnessVitals.date, 8),
            ]
        );

        for (const reportData of caseData.reports) {
            await execute(
                `INSERT INTO lab_reports (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?)`,
                [reportData.id, reportData.patientId, reportData.fileName, reportData.reportDate, reportData.labName, reportData.patientName, reportData.doctorName, json(reportData.extractedData), reportData.rawText, null, reportData.fileSize, ts(reportData.reportDate)]
            );

            for (const category of reportData.extractedData.results) {
                for (const item of category.tests) {
                    if (!item.name || !item.value) continue;
                    await execute(
                        `INSERT INTO health_parameters (id, patient_id, lab_report_id, parameter_name, value, unit, reference_range, status, test_date, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [`demo-param-${reportData.id}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, caseData.patientId, reportData.id, item.name, item.value, item.unit || '', item.referenceRange || '', item.status || 'normal', reportData.reportDate, ts(reportData.reportDate)]
                    );
                }
            }
        }

        for (let i = 0; i < caseData.timeline.length; i++) {
            const [date, title, description, eventType, status = 'completed'] = caseData.timeline[i];
            await execute(
                `INSERT INTO timeline_events (id, user_id, title, description, event_date, event_type, status, report_id, doctor_id, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
                [`demo-event-${caseData.stageKey}-${String(i + 1).padStart(2, '0')}`, caseData.userId, title, description, date, eventType, status, ids.doctor, eventType === 'appointment' ? 'doctor' : 'system', ts(date)]
            );
        }
    }

    console.log('Seeded Niraiva OnCoTrack oncology demo data.');
    console.log('Doctor login: ananya.rao@niraiva.health');
    console.log(`Patient logins: ${cases.map(c => c.email).join(', ')}`);
    console.log(`Demo password: ${DEMO_PASSWORD}`);
}

seed()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        client.close();
    });
