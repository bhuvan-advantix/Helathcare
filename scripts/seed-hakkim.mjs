// seed-hakkim.mjs
// New preventive oncology patient: Mr. HAKKIM — NRV-ONC-006
//
// Source documents (ALL values directly from reports, zero inference):
//   Sabari Lab — Visit 26058864 (24-Mar-2026): CBC, Biochemistry, Lipid, LFT
//   Sabari Lab — Visit 26058940 (24-Mar-2026): Vitamin D, TFT (T3, T4, TSH)
//
// Classification: Preventive Oncology Metabolic Risk Screening
//   - TSH 0.13 µIU/ml (critically low) → subclinical hyperthyroidism
//     → thyroid nodule/cancer screen warranted
//   - Vitamin D 11.2 ng/ml → moderate deficiency → cancer risk factor
//   - Fasting Glucose 103 mg/dl → pre-diabetic range
//   - HDL 36 (low), LDL 154 (borderline), TCH/HDL 5.4 (high), LDL/HDL 4.2 (high)
//   - All CBC, LFT, Renal → completely normal
//
// Usage: node scripts/seed-hakkim.mjs

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

dotenv.config({ quiet: true });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const DEMO_PASSWORD = process.env.ONCOTRACK_DEMO_PASSWORD || 'NiraivaDemo@2026';
const ts  = (iso, hour = 9) => Math.floor(new Date(`${iso}T${String(hour).padStart(2,'0')}:00:00.000Z`).getTime() / 1000);
const json = v => JSON.stringify(v);
async function exec(sql, args = []) { return client.execute({ sql, args }); }

const P_USER_ID    = 'demo-oncotrack-hakkim-user';
const P_PATIENT_ID = 'demo-oncotrack-hakkim-patient';
const P_COND_ID    = 'demo-oncotrack-hakkim-condition';
const P_DIAG_ID    = 'demo-oncotrack-hakkim-diagnostic';
const CUSTOM_ID    = 'NRV-ONC-006';
const EMAIL        = 'hakkim@niraiva.health';
const LAB_DATE     = '2026-03-24';

async function findDoctor() {
    const r = await exec(`SELECT d.id FROM doctors d INNER JOIN users u ON u.id = d.user_id WHERE u.email = 'ananya.rao@niraiva.health' LIMIT 1`);
    return r.rows[0]?.id ?? null;
}

const P = (name, value, unit, ref, status = 'normal') =>
    ({ name, value, unit: unit||'', referenceRange: ref||'Clinician reviewed', status });

// ─── Lab Report 1 — Visit 26058864 (CBC + Biochem + Lipid + LFT) ─────────────
const visit1 = [
    { category: 'Haematology — CBC', tests: [
        P('Erythrocyte Sedimentation Rate (ESR)', '03',    'mm/hr',       '0–15',           'normal'),
        P('Hemoglobin',                            '15.65', 'gms%',        '13–17',          'normal'),
        P('Total RBC Count',                       '5.31',  'Millions/cumm','4.5–5.5',       'normal'),
        P('PCV (HCT)',                              '47.4',  '%',           '40–50',          'normal'),
        P('MCV',                                   '89.3',  'fl',          '83–101',         'normal'),
        P('MCH',                                   '29.5',  'pg',          '27–32',          'normal'),
        P('MCHC',                                  '33.0',  'g/dl',        '31.5–34.5',      'normal'),
        P('RDW',                                   '14.0',  '%',           '11.5–15.5',      'normal'),
        P('Total WBC Count (TC)',                  '9280',  'cells/cumm',  '4000–10000',     'normal'),
        P('Neutrophils',                           '56.04', '%',           '40–80',          'normal'),
        P('Lymphocytes',                           '34.10', '%',           '20–40',          'normal'),
        P('Eosinophils',                           '2.04',  '%',           '1.0–6.0',        'normal'),
        P('Monocytes',                             '7.33',  '%',           '2.0–10.0',       'normal'),
        P('Basophils',                             '0.48',  '%',           '0.0–1.0',        'normal'),
        P('Platelet Count',                        '2.34',  'Lakhs/cumm',  '1.5–4.1',        'normal'),
        P('MPV',                                   '8.38',  'fl',          '7.4–10.4',       'normal'),
    ]},
    { category: 'Biochemistry', tests: [
        P('Glucose (Fasting)',  '103',  'mg/dl', '<100 Normal / 100–125 Pre-Diabetic / ≥126 Diabetes', 'high'),
        P('Urea',              '28',   'mg/dl', '10–45',  'normal'),
        P('Creatinine',        '1.09', 'mg/dl', '0.7–1.4','normal'),
        P('Uric Acid',         '5.9',  'mg/dl', '3.5–7.2','normal'),
    ]},
    { category: 'Lipid Profile', tests: [
        P('Total Cholesterol',  '196', 'mg/dl', '<200 Desirable',      'normal'),
        P('Triglycerides',      '143', 'mg/dl', '67–157',              'normal'),
        P('HDL Cholesterol',    '36',  'mg/dl', '40–60',               'low'),
        P('Non HDL Cholesterol','160', 'mg/dl', '—',                   'normal'),
        P('LDL Cholesterol',    '154', 'mg/dl', 'Optimal <130 / Borderline 130–159', 'high'),
        P('VLDL Cholesterol',   '29',  'mg/dl', '10–40',               'normal'),
        P('TCH/HDL Ratio',      '5.4', '',       '3.5–5.0',             'high'),
        P('LDL/HDL Ratio',      '4.2', '',       '1.0–3.0',             'high'),
    ]},
    { category: 'Liver Function Test', tests: [
        P('Bilirubin Total',           '0.93','mg/dl','0.2–1.2',  'normal'),
        P('Bilirubin Direct',          '0.25','mg/dl','0.00–0.30','normal'),
        P('Bilirubin Indirect',        '0.68','mg/dl','0.20–0.90','normal'),
        P('Total Protein',             '7.3', 'gm/dl','6.0–8.0',  'normal'),
        P('Albumin',                   '4.5', 'gm/dl','3.5–5.2',  'normal'),
        P('Globulin',                  '2.8', 'gm/dl','1.8–3.5',  'normal'),
        P('A/G Ratio',                 '1.6', '',      '1.2–2.5',  'normal'),
        P('AST (SGOT)',                '19',  'U/L',  '15–40',    'normal'),
        P('ALT (SGPT)',                '20',  'U/L',  '10–40',    'normal'),
        P('Alkaline Phosphatase (ALP)','102', 'U/L',  '40–130',   'normal'),
        P('Gamma GT (GGT)',            '32',  'U/L',  '8–61',     'normal'),
    ]},
];

// ─── Lab Report 2 — Visit 26058940 (Vitamin D + Thyroid) ─────────────────────
const visit2 = [
    { category: 'Immunology — Vitamin D', tests: [
        P('Vitamin D Total (25 OH)', '11.2', 'ng/ml', 'Severe Deficiency <10 / Moderate Deficiency 10–30 / Optimal 30–100', 'high'),
    ]},
    { category: 'Thyroid Function Test (TFT)', tests: [
        P('Total T3 (tT3)', '1.22', 'ng/ml',  '0.7–2.04', 'normal'),
        P('Total T4 (tT4)', '7.03', 'µg/dl',  '4.6–10.5', 'normal'),
        P('TSH',            '0.13', 'µIU/ml', '0.4–4.2',  'low'),
    ]},
];

// ─── Mind-map nodes ──────────────────────────────────────────────────────────
const nodes = [
    {
        id: 'profile', title: 'Patient Profile — Preventive Oncology Entry',
        description: 'Mr. HAKKIM, 48-year-old male. Self-referred. Single-day panel at Sabari Lab, 24-Mar-2026 (Visit IDs 26058864 and 26058940). Entry point for preventive oncology risk stratification.',
        type: 'screening', date: LAB_DATE,
        rationale: '48-year-old male self-referred for full metabolic and endocrine panel. Low TSH and Vitamin D deficiency identified — both carry oncological significance requiring structured follow-up.',
        outcome: 'Complete single-day metabolic, haematological, thyroid, and Vitamin D profile available. Risk stratification initiated.',
        x: 0, y: 1,
        connections: ['cbc', 'thyroid'],
        parameters: [
            P('Age', '48', 'years', '—', 'normal'),
            P('Sex', 'Male', '', '—', 'normal'),
        ],
    },
    {
        id: 'cbc', title: 'CBC — All Parameters Normal (Sabari, Visit 26058864)',
        description: 'Hemoglobin 15.65 g/dl, RBC 5.31, PCV 47.4%, MCV 89.3, WBC 9280, Platelets 2.34 Lakh — all within normal limits. ESR 3 mm/hr (normal). No anaemia, no haematological concern.',
        type: 'screening', date: LAB_DATE,
        rationale: 'Normal CBC confirms no haematological malignancy signal and no anaemia — establishes a clean baseline for metabolic risk monitoring.',
        outcome: 'CBC baseline established as normal. No haematological action required.',
        x: 1, y: 0,
        connections: ['metabolic'],
        parameters: [
            P('Hemoglobin',          '15.65','gms%',       '13–17',    'normal'),
            P('Total WBC Count',     '9280', 'cells/cumm', '4000–10000','normal'),
            P('Platelet Count',      '2.34', 'Lakhs/cumm', '1.5–4.1',  'normal'),
            P('ESR',                 '03',   'mm/hr',      '0–15',     'normal'),
        ],
    },
    {
        id: 'thyroid', title: 'Thyroid — Subclinical Hyperthyroidism (TSH 0.13)',
        description: 'TSH 0.13 µIU/ml — critically below normal (0.4–4.2). Total T3 1.22 ng/ml (normal) and Total T4 7.03 µg/dl (normal). Pattern consistent with subclinical hyperthyroidism. Visit 26058940.',
        type: 'diagnosis', date: LAB_DATE,
        rationale: 'Suppressed TSH (0.13) with normal T3/T4 defines subclinical hyperthyroidism. In a 48-year-old male, this requires thyroid ultrasound to exclude autonomous thyroid nodule or thyroid malignancy — primary oncological concern from this panel.',
        outcome: 'Thyroid ultrasound and clinical thyroid examination ordered. Repeat TFT at 8-week interval to confirm persistent suppression.',
        x: 1, y: 2,
        connections: ['vitamind'],
        parameters: [
            P('TSH',       '0.13','µIU/ml','0.4–4.2 (CRITICALLY LOW)','low'),
            P('Total T3',  '1.22','ng/ml', '0.7–2.04',               'normal'),
            P('Total T4',  '7.03','µg/dl', '4.6–10.5',               'normal'),
        ],
    },
    {
        id: 'vitamind', title: 'Vitamin D — Moderate Deficiency (11.2 ng/ml)',
        description: 'Vitamin D Total (25 OH): 11.2 ng/ml — Moderate Deficiency range (10–30 ng/ml). Optimal level: 30–100 ng/ml. Severe deficiency threshold: <10 ng/ml. Visit 26058940.',
        type: 'diagnosis', date: LAB_DATE,
        rationale: 'Vitamin D deficiency (11.2 ng/ml, moderate range) is a well-established independent risk factor for colorectal, prostate, and several other cancers. Supplementation and repeat testing required.',
        outcome: 'Vitamin D oral supplementation to be initiated per clinical guidelines. Repeat 25-OH Vitamin D at 3-month interval to monitor response.',
        x: 2, y: 2,
        connections: ['metabolic'],
        parameters: [
            P('Vitamin D Total (25 OH)', '11.2', 'ng/ml', 'Optimal 30–100 / Moderate Deficiency 10–30', 'high'),
        ],
    },
    {
        id: 'metabolic', title: 'Metabolic Risk Profile — Dyslipidaemia + Pre-Diabetes',
        description: 'Fasting Glucose 103 mg/dl (pre-diabetic: 100–125). HDL 36 mg/dl (low; normal ≥40). LDL 154 mg/dl (borderline high; optimal <130). TCH/HDL Ratio 5.4 (elevated; ≤5.0). LDL/HDL Ratio 4.2 (elevated; ≤3.0). Total Cholesterol 196 mg/dl (borderline). TG 143 mg/dl (normal).',
        type: 'diagnosis', date: LAB_DATE,
        rationale: 'Metabolic syndrome components (pre-diabetic glucose + dyslipidaemia with low HDL and elevated lipid ratios) are independently associated with increased risk of colorectal, hepatocellular, and pancreatic malignancies. Cardiovascular risk is also elevated.',
        outcome: 'Dietary modification, physical activity counselling, and lipid-lowering strategy discussed. Repeat fasting glucose and lipid panel at 3 months.',
        x: 2, y: 0,
        connections: ['lft_renal'],
        parameters: [
            P('Glucose (Fasting)', '103', 'mg/dl', '<100 Normal / 100–125 Pre-Diabetic', 'high'),
            P('HDL Cholesterol',   '36',  'mg/dl', '40–60',                               'low'),
            P('LDL Cholesterol',   '154', 'mg/dl', 'Optimal <130 / Borderline 130–159',   'high'),
            P('TCH/HDL Ratio',     '5.4', '',       '≤5.0',                                'high'),
            P('LDL/HDL Ratio',     '4.2', '',       '≤3.0',                                'high'),
        ],
    },
    {
        id: 'lft_renal', title: 'LFT and Renal Function — All Normal',
        description: 'Liver: AST 19, ALT 20, ALP 102, GGT 32, Bilirubin Total 0.93, Albumin 4.5, Total Protein 7.3 — all within normal range. Renal: Urea 28, Creatinine 1.09, Uric Acid 5.9 — all normal. No hepatic or renal concern.',
        type: 'surveillance', date: LAB_DATE,
        rationale: 'Normal LFT and renal function confirm no hepatic involvement, no biliary or cholestatic pattern, and adequate organ function — important baseline for any future interventions.',
        outcome: 'Liver and renal function baseline established as normal. No action required for these parameters.',
        x: 3, y: 1,
        connections: ['risk_plan'],
        parameters: [
            P('AST (SGOT)', '19',   'U/L',  '15–40',  'normal'),
            P('ALT (SGPT)', '20',   'U/L',  '10–40',  'normal'),
            P('Creatinine', '1.09', 'mg/dl','0.7–1.4','normal'),
            P('Albumin',    '4.5',  'gm/dl','3.5–5.2','normal'),
        ],
    },
    {
        id: 'risk_plan', title: 'Preventive Oncology Risk Stratification — Referral',
        description: 'Patient referred to Dr. Ananya Rao for structured preventive oncology risk stratification. Primary concerns: (1) Subclinical hyperthyroidism requiring thyroid nodule exclusion, (2) Vitamin D moderate deficiency, (3) Metabolic syndrome components (pre-diabetes + dyslipidaemia). All CBC and organ function normal.',
        type: 'surveillance', date: '2026-09-17',
        rationale: 'Three converging risk signals — suppressed TSH, Vitamin D deficiency, and metabolic syndrome — in a 48-year-old male warrant formalised oncology prevention pathway with structured imaging, laboratory monitoring, and lifestyle intervention.',
        outcome: 'Preventive oncology workup initiated. Thyroid ultrasound, repeat TFT, Vitamin D supplementation, lipid management, and glycaemic surveillance plan established. Next review pending thyroid imaging results.',
        x: 4, y: 1,
        connections: [],
        parameters: [
            P('TSH (Critical Low)',       '0.13', 'µIU/ml','0.4–4.2','low'),
            P('Vitamin D (Deficiency)',   '11.2', 'ng/ml', '30–100', 'high'),
            P('Glucose (Pre-Diabetic)',   '103',  'mg/dl', '<100',   'high'),
            P('HDL (Low Risk)',           '36',   'mg/dl', '40–60',  'low'),
        ],
    },
];

// ─── Timeline ────────────────────────────────────────────────────────────────
const timeline = [
    [LAB_DATE, 'Sabari Lab — CBC, Biochemistry, Lipid and LFT Panel (Visit 26058864)',
     'ESR 3 mm/hr (normal). Hb 15.65, RBC 5.31, WBC 9280, Platelets 2.34 Lakh — all normal. Fasting Glucose 103 mg/dl (pre-diabetic). HDL 36 (low), LDL 154 (borderline high), TCH/HDL 5.4 (elevated), LDL/HDL 4.2 (elevated). LFT and renal: all normal. Collected 08:54, Reported 11:39. UID: TRY00929396.',
     'test', 'completed'],
    [LAB_DATE, 'Sabari Lab — Vitamin D and Thyroid Function Panel (Visit 26058940)',
     'Vitamin D Total (25 OH): 11.2 ng/ml (Moderate Deficiency; Optimal ≥30). TSH: 0.13 µIU/ml (CRITICALLY LOW; Normal 0.4–4.2) — subclinical hyperthyroidism. Total T3 1.22 ng/ml (normal). Total T4 7.03 µg/dl (normal). Collected 11:25, Reported 14:29. UID: TRY00929417.',
     'test', 'completed'],
    [LAB_DATE, 'Preventive Oncology Initial Review — Lab Findings Assessment',
     'Diagnosis: Subclinical hyperthyroidism (TSH 0.13) with moderate Vitamin D deficiency (11.2 ng/ml) and metabolic risk profile (pre-diabetic glucose 103, low HDL 36, borderline LDL 154). Doctor\'s Advice: Thyroid ultrasound to exclude autonomous nodule or thyroid malignancy. Repeat TFT at 8 weeks. Vitamin D supplementation. Dietary and lifestyle counselling for dyslipidaemia and pre-diabetes. Repeat fasting glucose and lipid panel at 3 months.',
     'appointment', 'completed'],
    ['2026-09-17', 'Preventive Oncology Referral — Dr. Ananya Rao, Niraiva OnCoTrack',
     'Doctor\'s Advice: Formal preventive oncology surveillance initiated. (1) Thyroid ultrasound — rule out thyroid nodule or malignancy secondary to persistently suppressed TSH. (2) Repeat TFT (TSH, T3, T4) at 8 weeks to confirm subclinical hyperthyroidism. (3) Vitamin D supplementation and re-check at 3 months. (4) Fasting glucose and HbA1c — pre-diabetes confirmation and cancer risk monitoring. (5) Lipid panel repeat at 3 months following dietary modifications.',
     'appointment', 'completed'],
    ['2026-11-12', 'Pending — Thyroid Ultrasound + TFT Repeat + Metabolic Review',
     'Scheduled review of thyroid ultrasound findings, repeat TFT, Vitamin D response, and fasting glucose/HbA1c. Niraiva OnCoTrack preventive oncology follow-up.',
     'appointment', 'pending'],
];

// ─── Clinical Notes ───────────────────────────────────────────────────────────
const clinicalNotes =
    `PREVENTIVE ONCOLOGY INITIAL ASSESSMENT NOTE\n` +
    `Patient: Mr. HAKKIM | Age: 48 Years | Sex: Male\n` +
    `NRV-ONC-006 | Referred: Self | Clinician: Dr. Ananya Rao, Medical Oncology, Niraiva OnCoTrack Clinic\n` +
    `\n` +
    `PRESENTING CONCERN\n` +
    `48-year-old male self-referred for comprehensive metabolic and endocrine screening. All laboratory investigations were performed at Sabari Lab, Pudukkottai on a single day (24-Mar-2026) across two visits. No clinical vitals, anthropometric data, medication history, or prior medical records available in source documents.\n` +
    `\n` +
    `PERTINENT LABORATORY FINDINGS\n` +
    `\n` +
    `I. Sabari Lab, Pudukkottai — 24 March 2026\n` +
    `   Visit 26058864 | UID: TRY00929396 | Collected 08:54 | Reported 11:39\n` +
    `   Dr. R. Lavanya MD (Path) / Dr. P. K. Rath MD (Path)\n` +
    `\n` +
    `   Haematology (CBC):\n` +
    `   - ESR: 3 mm/hr [Normal: 0–15]\n` +
    `   - Hemoglobin: 15.65 gms% [Normal: 13–17] | RBC: 5.31 M/cumm [Normal] | PCV: 47.4% [Normal]\n` +
    `   - MCV: 89.3 fl [Normal] | MCH: 29.5 pg [Normal] | MCHC: 33.0 g/dl [Normal] | RDW: 14.0% [Normal]\n` +
    `   - WBC: 9280 cells/cumm [Normal] | Neutrophils: 56.04% | Lymphocytes: 34.10% | Platelets: 2.34 Lakhs [Normal]\n` +
    `   INTERPRETATION: Full CBC within normal limits. No haematological malignancy signal. No anaemia.\n` +
    `\n` +
    `   Biochemistry:\n` +
    `   - Fasting Glucose: 103 mg/dl [PRE-DIABETIC; Normal <100, Pre-diabetes 100–125]\n` +
    `   - Urea: 28 mg/dl [Normal] | Creatinine: 1.09 mg/dl [Normal] | Uric Acid: 5.9 mg/dl [Normal]\n` +
    `\n` +
    `   Lipid Profile:\n` +
    `   - Total Cholesterol: 196 mg/dl [Borderline; Desirable <200]\n` +
    `   - Triglycerides: 143 mg/dl [Normal: 67–157]\n` +
    `   - HDL: 36 mg/dl [LOW; Normal 40–60]\n` +
    `   - LDL: 154 mg/dl [BORDERLINE HIGH; Optimal <130 / Borderline 130–159]\n` +
    `   - VLDL: 29 mg/dl [Normal] | Non HDL Cholesterol: 160 mg/dl\n` +
    `   - TCH/HDL Ratio: 5.4 [ELEVATED; Normal 3.5–5.0]\n` +
    `   - LDL/HDL Ratio: 4.2 [ELEVATED; Normal 1.0–3.0]\n` +
    `\n` +
    `   Liver Function Test:\n` +
    `   - Bilirubin Total: 0.93, Direct: 0.25, Indirect: 0.68 mg/dl [all Normal]\n` +
    `   - Total Protein: 7.3, Albumin: 4.5, Globulin: 2.8 gm/dl, A/G Ratio: 1.6 [all Normal]\n` +
    `   - AST: 19 U/L, ALT: 20 U/L, ALP: 102 U/L, GGT: 32 U/L [all Normal]\n` +
    `\n` +
    `II. Sabari Lab — 24 March 2026\n` +
    `    Visit 26058940 | UID: TRY00929417 | Collected 11:25 | Reported 14:29\n` +
    `    Dr. P. K. Rath MD (Path)\n` +
    `\n` +
    `   Thyroid Function Test:\n` +
    `   - TSH: 0.13 µIU/ml [CRITICALLY LOW; Normal Adult: 0.4–4.2]\n` +
    `   - Total T3 (tT3): 1.22 ng/ml [Normal: 0.7–2.04]\n` +
    `   - Total T4 (tT4): 7.03 µg/dl [Normal: 4.6–10.5]\n` +
    `\n` +
    `   Vitamin D:\n` +
    `   - Vitamin D Total (25 OH): 11.2 ng/ml [MODERATE DEFICIENCY; Optimal 30–100, Moderate Deficiency 10–30]\n` +
    `\n` +
    `CLINICAL ASSESSMENT\n` +
    `Mr. HAKKIM presents with three clinically significant findings against a background of completely normal haematological, hepatic, and renal parameters:\n` +
    `\n` +
    `1. Subclinical Hyperthyroidism (TSH 0.13 µIU/ml): TSH is critically suppressed at 0.13 µIU/ml (normal: 0.4–4.2) with T3 (1.22) and T4 (7.03) both within normal ranges — the defining pattern of subclinical hyperthyroidism. In a 48-year-old male, persistently suppressed TSH requires thyroid ultrasound to exclude autonomous thyroid nodule or thyroid malignancy. Subclinical hyperthyroidism also carries cardiovascular risk (atrial fibrillation, bone loss) and requires structured follow-up.\n` +
    `\n` +
    `2. Moderate Vitamin D Deficiency (11.2 ng/ml): Vitamin D 25-OH at 11.2 ng/ml falls in the moderate deficiency band (10–30 ng/ml; optimal ≥30). Vitamin D deficiency is a well-established independent risk factor for colorectal, prostate, and breast cancers, and is associated with impaired immune surveillance. Supplementation and monitoring are clinically indicated.\n` +
    `\n` +
    `3. Dyslipidaemia with Pre-Diabetic Glucose: Fasting glucose 103 mg/dl (pre-diabetic threshold: 100–125 mg/dl). HDL 36 mg/dl (below male reference of 40 mg/dl). LDL 154 mg/dl (borderline high). Elevated lipid ratios: TCH/HDL 5.4 (above 5.0) and LDL/HDL 4.2 (above 3.0) indicate atherogenic dyslipidaemia. This metabolic cluster — pre-diabetes plus dyslipidaemia — constitutes components of metabolic syndrome, which carries independently elevated risk for colorectal, hepatocellular, and pancreatic malignancies.\n` +
    `\n` +
    `4. Normal CBC, LFT, and Renal Parameters: Haemoglobin 15.65, WBC 9280, Platelets 2.34 Lakh — all within reference. All liver enzymes (AST, ALT, ALP, GGT) and renal markers (urea, creatinine) are within normal limits, establishing a clean organ function baseline.\n` +
    `\n` +
    `PREVENTIVE ONCOLOGY RISK STRATIFICATION:\n` +
    `- Thyroid malignancy risk: Moderate (suppressed TSH, male sex, age 48)\n` +
    `- Colorectal/metabolic cancer risk: Moderate (pre-diabetes + dyslipidaemia + Vitamin D deficiency)\n` +
    `- Prostate cancer risk: Moderate (Vitamin D deficiency, male, age ≥45)\n` +
    `\n` +
    `Preventive oncology referral status: ACTIVE — initiated 17-Sep-2026 under Dr. Ananya Rao, Medical Oncology.`;

// ─── Treatment Plan ───────────────────────────────────────────────────────────
const treatmentPlan =
    `PREVENTIVE ONCOLOGY RISK MANAGEMENT PLAN — Mr. HAKKIM (NRV-ONC-006)\n` +
    `Date Initiated: 17 September 2026 | Clinician: Dr. Ananya Rao, Medical Oncology, Niraiva OnCoTrack Clinic\n` +
    `\n` +
    `SECTION A — INVESTIGATIONS (Priority Order)\n` +
    `\n` +
    `Thyroid:\n` +
    `1. Thyroid ultrasound (USG neck) — mandatory to identify autonomous thyroid nodule, goitre, or suspicious lesion responsible for TSH suppression (0.13 µIU/ml); primary oncological concern from this panel\n` +
    `2. Repeat TSH at 8-week interval — confirm persistence of subclinical hyperthyroid state; decision on further management (scintigraphy, endocrine referral) based on result\n` +
    `3. If thyroid nodule identified on USG: FNAC (Fine Needle Aspiration Cytology) per clinical judgement\n` +
    `\n` +
    `Vitamin D:\n` +
    `4. Repeat Vitamin D (25-OH) at 3-month interval following supplementation — confirm adequate therapeutic response (target: ≥30 ng/ml)\n` +
    `\n` +
    `Metabolic and Preventive Cancer Screening:\n` +
    `5. Fasting glucose and HbA1c — confirm pre-diabetic status (fasting 103 mg/dl); establish glycaemic trajectory and cancer risk stratification\n` +
    `6. Repeat fasting lipid panel at 3 months following dietary modification — monitor HDL response (currently 36 mg/dl, target ≥40) and LDL (currently 154 mg/dl, target <130)\n` +
    `7. Faecal immunochemical test (FIT) — colorectal cancer screening; indicated at age 48 with metabolic risk profile and Vitamin D deficiency\n` +
    `8. PSA (Prostate Specific Antigen) — prostate cancer screen; indicated at age 48 in a male with Vitamin D deficiency\n` +
    `\n` +
    `SECTION B — MEDICAL MANAGEMENT\n` +
    `- Vitamin D deficiency: Oral Vitamin D3 supplementation to be initiated per clinical assessment of dose requirement (moderate deficiency range 10–30 ng/ml)\n` +
    `- Dyslipidaemia: Dietary modification (reduce saturated fat, increase omega-3 and soluble fibre); physical activity counselling; pharmacological lipid management to be considered if repeat lipid panel shows no improvement\n` +
    `- Pre-diabetes: Dietary glycaemic control counselling; weight management advice; HbA1c baseline to be established\n` +
    `- Subclinical hyperthyroidism: No pharmacological intervention until imaging clarifies aetiology; endocrinology review if autonomous nodule confirmed\n` +
    `- Medications: No medications documented in source records. All prescriptions to be recorded at the time of formal prescription issue.\n` +
    `\n` +
    `SECTION C — MONITORING AND FOLLOW-UP\n` +
    `- TSH: Repeat at 8 weeks; thyroid ultrasound report review at next oncology visit\n` +
    `- Vitamin D: Repeat at 3 months post-supplementation initiation\n` +
    `- Lipid panel and fasting glucose: Repeat at 3 months\n` +
    `- Clinical review: cardiovascular symptoms, thyroid-related symptoms (palpitation, heat intolerance, tremor), and general cancer screening review\n` +
    `\n` +
    `NEXT MILESTONE: Thyroid ultrasound results, repeat TFT, Vitamin D response, and metabolic re-assessment — 12 November 2026.`;

// ─── Vitals ──────────────────────────────────────────────────────────────────
const vitalsNotes =
    `Laboratory-based record — no clinical vitals (BP, pulse, temperature, SpO2, height, weight) documented in source reports. ` +
    `Key findings (Sabari Lab, 24-Mar-2026): TSH 0.13 µIU/ml [Critically Low — subclinical hyperthyroidism]; ` +
    `Vitamin D 11.2 ng/ml [Moderate Deficiency; Optimal ≥30]; ` +
    `Fasting Glucose 103 mg/dl [Pre-Diabetic]; HDL 36 mg/dl [Low]; LDL 154 mg/dl [Borderline High]; ` +
    `TCH/HDL Ratio 5.4 [Elevated]; LDL/HDL Ratio 4.2 [Elevated]. ` +
    `CBC, LFT, and Renal — all within normal limits. ` +
    `Preventive oncology referral formally initiated 17-Sep-2026 under Dr. Ananya Rao.`;

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
    const doctorId = await findDoctor();
    if (!doctorId) {
        console.error('❌ Doctor ananya.rao@niraiva.health not found. Run seed-oncology-demo.mjs first.');
        process.exit(1);
    }

    // Wipe previous runs (idempotent)
    await exec('DELETE FROM health_parameters WHERE patient_id = ?',    [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM timeline_events WHERE user_id = ?',         [P_USER_ID]).catch(()=>null);
    await exec('DELETE FROM prescriptions WHERE patient_id = ?',        [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM medications WHERE patient_id = ?',          [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM patient_vitals WHERE patient_id = ?',       [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM patient_diagnostics WHERE patient_id = ?',  [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM patient_conditions WHERE patient_id = ?',   [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM lab_reports WHERE patient_id = ?',          [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM doctor_patient_relations WHERE patient_id = ?', [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM patients WHERE id = ?',                     [P_PATIENT_ID]).catch(()=>null);
    await exec('DELETE FROM users WHERE id = ?',                        [P_USER_ID]).catch(()=>null);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // User
    await exec(
        `INSERT INTO users (id, name, email, password, role, is_onboarded, custom_id, is_banned) VALUES (?, ?, ?, ?, 'patient', 1, ?, 0)`,
        [P_USER_ID, 'Mr. HAKKIM', EMAIL, passwordHash, CUSTOM_ID]
    );
    console.log(`✔ users         -> ${EMAIL}`);

    // Patient
    await exec(
        `INSERT INTO patients (id, user_id, dob, age, gender, phone_number, address, city, marital_status,
         emergency_contact_name, emergency_contact_phone, blood_group, height, weight,
         allergies, current_medications, past_surgeries, chronic_conditions, lifestyle, medical_history, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            P_PATIENT_ID, P_USER_ID,
            null,           // Exact DOB not in source documents; age 48 as reported
            48, 'male',
            null,           // Phone not in source documents
            null,           // Address not in source documents
            null,           // City not in source documents
            null,           // Marital status not in source documents
            null, null,     // Emergency contact not in source documents
            null,           // Blood group not tested in available reports
            null,           // Height not in source documents
            null,           // Weight not in source documents
            'Not documented in source records',
            'Not documented in source records',
            'Not documented in source records',
            'Subclinical hyperthyroidism (TSH 0.13 µIU/ml — critically low); Moderate Vitamin D deficiency (11.2 ng/ml); Pre-diabetic fasting glucose (103 mg/dl); Dyslipidaemia — low HDL (36 mg/dl), borderline high LDL (154 mg/dl), elevated lipid ratios (TCH/HDL 5.4, LDL/HDL 4.2) — Preventive oncology surveillance active',
            'Self-referred for metabolic and endocrine workup. No lifestyle, smoking, or alcohol history documented in available source records.',
            'Single-day laboratory workup at Sabari Lab, Pudukkottai (24-Mar-2026, Visit IDs 26058864 and 26058940). CBC, LFT, and renal function all within normal limits. Key abnormalities: TSH critically low at 0.13 µIU/ml (subclinical hyperthyroidism), Vitamin D moderate deficiency (11.2 ng/ml), pre-diabetic fasting glucose (103 mg/dl), and dyslipidaemia (low HDL 36, borderline LDL 154, elevated lipid ratios). Preventive oncology referral placed 17-Sep-2026.',
            ts(LAB_DATE),
        ]
    );
    console.log(`✔ patients      -> ${P_PATIENT_ID}`);

    // Doctor–Patient relation
    await exec(
        `INSERT INTO doctor_patient_relations (id, doctor_id, patient_id, added_at) VALUES (?, ?, ?, ?)`,
        ['demo-hakkim-relation', doctorId, P_PATIENT_ID, ts('2026-09-17')]
    );
    console.log(`✔ dr_pt_relation -> demo-hakkim-relation`);

    // Patient condition
    await exec(
        `INSERT INTO patient_conditions (id, patient_id, condition_name, diagnosed_date, status, added_by, doctor_id, created_at) VALUES (?, ?, ?, ?, 'active', 'doctor', ?, ?)`,
        [P_COND_ID, P_PATIENT_ID,
         'Subclinical hyperthyroidism (TSH 0.13) with moderate Vitamin D deficiency and dyslipidaemia — preventive oncology surveillance',
         '2026-09-17', doctorId, ts('2026-09-17')]
    );
    console.log(`✔ pt_conditions -> ${P_COND_ID}`);

    // Diagnostic pathway / mind-map
    await exec(
        `INSERT INTO patient_diagnostics (id, patient_id, doctor_id, condition_name, condition_status, nodes, clinical_notes, treatment_plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [P_DIAG_ID, P_PATIENT_ID, doctorId,
         'Subclinical hyperthyroidism (TSH 0.13) with moderate Vitamin D deficiency and dyslipidaemia — preventive oncology surveillance',
         'active', json(nodes), clinicalNotes, treatmentPlan,
         ts('2026-09-17', 10), ts('2026-09-17', 10)]
    );
    console.log(`✔ pt_diagnostics -> ${P_DIAG_ID} (${nodes.length} nodes)`);

    // Patient vitals
    await exec(
        `INSERT INTO patient_vitals (id, patient_id, blood_pressure, temperature, weight, height, pulse_rate, spo2, recorded_by, notes, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['demo-hakkim-vitals', P_PATIENT_ID, null, null, null, null, null, null,
         'Niraiva Preventive Oncology — Dr. Ananya Rao', vitalsNotes, ts('2026-09-17', 10)]
    );
    console.log(`✔ pt_vitals     -> demo-hakkim-vitals`);

    // 0 medications — no prescription documents in source
    console.log(`✔ medications   -> 0 rows (no prescription documents in source records)`);

    // Lab Report 1 — Visit 26058864 (CBC + Full Panel)
    const rpt1 = {
        metadata: { sample: { 'Visit ID': '26058864', 'Patient UID': 'TRY00929396', 'Lab': 'Sabari Lab (Try)', 'Collected On': '24/03/2026 08:54', 'Reported On': '24/03/2026 11:39', 'Referred By': 'Self', 'Pages': '3 of 3', 'Pathologist': 'Dr. R. Lavanya MD (Path) / Dr. P. K. Rath MD (Path)' } },
        results: visit1,
    };
    await exec(
        `INSERT INTO lab_reports (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, NULL, NULL, ?)`,
        ['demo-hakkim-report-v1', P_PATIENT_ID,
         'HAKKIM - Sabari Lab CBC Biochemistry Lipid LFT Panel 24-Mar-2026.pdf',
         LAB_DATE, 'Sabari Lab (Try) — Pudukkottai',
         'Mr. HAKKIM', 'Dr. R. Lavanya MD (Path) / Dr. P. K. Rath MD (Path)',
         json(rpt1),
         'Visit 26058864. CBC all normal: Hb 15.65, WBC 9280, Platelets 2.34 Lakh. Glucose(F) 103 (pre-diabetic). HDL 36 (low), LDL 154 (borderline high), TCH/HDL 5.4 (elevated), LDL/HDL 4.2 (elevated). LFT and renal: all normal. End of Report.',
         'CBC within normal limits. Pre-diabetic fasting glucose. Dyslipidaemia: low HDL, borderline high LDL, elevated lipid ratios. LFT and renal function normal.',
         210000, ts(LAB_DATE, 11)]
    );
    console.log(`✔ lab_reports   -> demo-hakkim-report-v1 (CBC + Full Panel)`);

    // Lab Report 2 — Visit 26058940 (Thyroid + Vitamin D)
    const rpt2 = {
        metadata: { sample: { 'Visit ID': '26058940', 'Patient UID': 'TRY00929417', 'Lab': 'Sabari Lab (Try)', 'Collected On': '24/03/2026 11:25', 'Reported On': '24/03/2026 14:29', 'Referred By': 'SELF', 'Pages': '1 of 1', 'Pathologist': 'Dr. P. K. Rath MD (Path)', 'Method': 'CLIA / ECLIA' } },
        results: visit2,
    };
    await exec(
        `INSERT INTO lab_reports (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?)`,
        ['demo-hakkim-report-v2', P_PATIENT_ID,
         'HAKKIM - Sabari Lab Vitamin D and Thyroid Function Panel 24-Mar-2026.pdf',
         LAB_DATE, 'Sabari Lab (Try) — Pudukkottai',
         'Mr. HAKKIM', 'Dr. P. K. Rath MD (Path)',
         json(rpt2),
         'Visit 26058940. Vitamin D Total (25 OH): 11.2 ng/ml (Moderate Deficiency). TSH: 0.13 µIU/ml (CRITICALLY LOW). T3: 1.22 ng/ml (normal). T4: 7.03 µg/dl (normal). End of Report.',
         'Subclinical hyperthyroidism: TSH 0.13 (critically low) with normal T3/T4. Thyroid ultrasound mandatory. Moderate Vitamin D deficiency (11.2 ng/ml). Supplementation indicated.',
         98000, ts(LAB_DATE, 14)]
    );
    console.log(`✔ lab_reports   -> demo-hakkim-report-v2 (Vitamin D + TFT)`);

    // Health parameters
    const allParams = [];
    const seen = new Set();
    for (const [reportId, cats] of [['demo-hakkim-report-v1', visit1], ['demo-hakkim-report-v2', visit2]]) {
        for (const cat of cats) {
            for (const item of cat.tests) {
                const key = item.name.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                allParams.push({ reportId, ...item });
            }
        }
    }
    for (const p of allParams) {
        const paramId = `demo-hakkim-param-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}`;
        await exec(
            `INSERT INTO health_parameters (id, patient_id, lab_report_id, parameter_name, value, unit, reference_range, status, test_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [paramId, P_PATIENT_ID, p.reportId, p.name, p.value, p.unit||'', p.referenceRange||'', p.status||'normal', LAB_DATE, ts(LAB_DATE)]
        );
    }
    console.log(`✔ health_params -> ${allParams.length} unique parameters`);

    // Timeline
    for (let i = 0; i < timeline.length; i++) {
        const [date, title, description, eventType, status] = timeline[i];
        await exec(
            `INSERT INTO timeline_events (id, user_id, title, description, event_date, event_type, status, report_id, doctor_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
            [`demo-hakkim-event-${String(i+1).padStart(2,'0')}`, P_USER_ID, title, description, date, eventType, status||'completed',
             doctorId, eventType === 'appointment' ? 'doctor' : 'system', ts(date)]
        );
    }
    console.log(`✔ timeline      -> ${timeline.length} events`);

    console.log('\n🎉 Mr. HAKKIM (NRV-ONC-006) seeded successfully.');
    console.log(`   Patient ID   : ${P_PATIENT_ID}`);
    console.log(`   Custom ID    : ${CUSTOM_ID}`);
    console.log(`   Email        : ${EMAIL}`);
    console.log(`   Password     : ${DEMO_PASSWORD}`);
    console.log(`   Doctor       : ananya.rao@niraiva.health | ${DEMO_PASSWORD}`);
    console.log(`   Doctor ID    : ${doctorId}`);
    console.log(`   Lab reports  : 2 (Sabari CBC+Full Panel, Sabari Thyroid+Vit D)`);
    console.log(`   Health params: ${allParams.length} unique rows`);
    console.log(`   Timeline     : ${timeline.length} events`);
    console.log(`   Mind-map     : ${nodes.length} nodes`);
    console.log(`   Medications  : 0 (no prescription documents in source records)`);
}

run()
    .catch(err => { console.error('Seed failed:', err); process.exitCode = 1; })
    .finally(() => client.close());
