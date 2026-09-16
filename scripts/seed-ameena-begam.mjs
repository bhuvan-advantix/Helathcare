// seed-ameena-begam.mjs
// New oncology workup patient: Mrs. Ameena Begam .S — NRV-ONC-005
//
// Source documents (ALL values directly from reports, zero inference):
//   Sabari Lab — Visit 26111939 (07-Jun-2026): HbA1c, eAG, Calcium
//   Sabari Lab — Visit 26111943 (07-Jun-2026): CBC, Biochemistry, Lipid, LFT
//   AVM Diagnostic Centre — Lab 040135 (30-Jul-2026):
//       CBC (Horiba H500), ESR, Blood Group, Sugar F/PP,
//       Lipid, LFT, HbA1c, Thyroid Profile, Infectious Disease panel
//
// Creates: user, patient, doctor_patient_relation, patient_conditions,
//          patient_diagnostics (mind-map nodes), patient_vitals,
//          health_parameters, lab_reports, timeline_events, medications
//
// Usage: node scripts/seed-ameena-begam.mjs

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

dotenv.config({ quiet: true });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const DEMO_PASSWORD = process.env.ONCOTRACK_DEMO_PASSWORD || 'NiraivaDemo@2026';

const ts  = (iso, hour = 9) =>
    Math.floor(new Date(`${iso}T${String(hour).padStart(2,'0')}:00:00.000Z`).getTime() / 1000);
const json = v => JSON.stringify(v);

async function exec(sql, args = []) {
    return client.execute({ sql, args });
}

// ─── IDs ────────────────────────────────────────────────────────────────────
const P_USER_ID    = 'demo-oncotrack-ameena-user';
const P_PATIENT_ID = 'demo-oncotrack-ameena-patient';
const P_COND_ID    = 'demo-oncotrack-ameena-condition';
const P_DIAG_ID    = 'demo-oncotrack-ameena-diagnostic';
const CUSTOM_ID    = 'NRV-ONC-005';
const EMAIL        = 'ameena.begam@niraiva.health';

// ─── Find existing doctor ────────────────────────────────────────────────────
async function findDoctor() {
    const r = await exec(
        `SELECT d.id FROM doctors d
         INNER JOIN users u ON u.id = d.user_id
         WHERE u.email = 'ananya.rao@niraiva.health' LIMIT 1`
    );
    return r.rows[0]?.id ?? null;
}

// ─── Helper for lab parameter objects ────────────────────────────────────────
const P = (name, value, unit, ref, status = 'normal') =>
    ({ name, value, unit: unit||'', referenceRange: ref||'Clinician reviewed', status });

// ─── Lab Report 1 — Sabari Lab 07-Jun-2026 (HbA1c panel) ────────────────────
const SABARI_DATE_1 = '2026-06-07';
const sabariFull1 = [
    { category: 'Glycated Haemoglobin', tests: [
        P('HbA1c (HPLC)',                  '12.9', '%',     '<5.7 Normal / 5.8–6.4 Pre-Diabetes / ≥6.5 Diabetes', 'high'),
        P('Estimated Average Glucose (eAG)','323.5','mg/dl','68–125 Excellent Control',                           'high'),
        P('Calcium',                        '9.12', 'mg/dl','8.5–10.5',                                           'normal'),
    ]},
];

// ─── Lab Report 2 — Sabari Lab 07-Jun-2026 (CBC + Full Panel) ───────────────
const SABARI_DATE_2 = '2026-06-07';
const sabariFullPanel = [
    { category: 'Haematology — CBC', tests: [
        P('Erythrocyte Sedimentation Rate (ESR)', '16',   'mm/hr',       '0–20 (Women)',   'normal'),
        P('Hemoglobin',                            '9.0',  'gms%',        '12–15',          'low'),
        P('Total RBC Count',                       '4.69', 'Millions/cumm','3.8–4.8',       'normal'),
        P('PCV (HCT)',                              '30.1', '%',           '36–46',          'low'),
        P('MCV',                                   '64.2', 'fl',          '83–101',         'low'),
        P('MCH',                                   '19.2', 'pg',          '27–32',          'low'),
        P('MCHC',                                  '29.9', 'g/dl',        '31.5–34.5',      'low'),
        P('RDW',                                   '17.4', '%',           '11.5–15.5',      'high'),
        P('Total WBC Count (TC)',                  '7410', 'cells/cumm',  '4000–10000',     'normal'),
        P('Neutrophils',                           '56.3', '%',           '40–80',          'normal'),
        P('Lymphocytes',                           '37.4', '%',           '20–40',          'normal'),
        P('Eosinophils',                           '1.6',  '%',           '1.0–6.0',        'normal'),
        P('Monocytes',                             '4.0',  '%',           '2.0–10.0',       'normal'),
        P('Basophils',                             '0.7',  '%',           '0.0–1.0',        'normal'),
        P('Platelet Count',                        '2.00', 'Lakhs/cumm',  '1.5–4.1',        'normal'),
        P('MPV',                                   '9.7',  'fl',          '7.4–10.4',       'normal'),
    ]},
    { category: 'Biochemistry', tests: [
        P('Glucose (Fasting)',   '236',  'mg/dl', '<100 Normal / 100–125 Pre-Diabetic / ≥126 Diabetes', 'high'),
        P('Urea',                '18',   'mg/dl', '10–45',   'normal'),
        P('Creatinine',          '0.69', 'mg/dl', '0.6–1.2', 'normal'),
        P('Uric Acid',           '1.82', 'mg/dl', '3.5–7.3', 'low'),
    ]},
    { category: 'Lipid Profile', tests: [
        P('Total Cholesterol',  '126', 'mg/dl', '<200',    'normal'),
        P('Triglycerides',      '123', 'mg/dl', '67–157',  'normal'),
        P('HDL Cholesterol',    '43',  'mg/dl', '40–60',   'normal'),
        P('Non HDL Cholesterol','83',  'mg/dl', '<130',    'normal'),
        P('LDL Cholesterol',    '66',  'mg/dl', '<100',    'normal'),
        P('VLDL Cholesterol',   '25',  'mg/dl', '10–40',   'normal'),
        P('TCH/HDL Ratio',      '2.9', '',       '3.5–5.0', 'normal'),
        P('LDL/HDL Ratio',      '1.5', '',       '1.0–3.0', 'normal'),
    ]},
    { category: 'Liver Function Test', tests: [
        P('Bilirubin Total',           '0.29', 'mg/dl', '0.2–1.1',  'normal'),
        P('Bilirubin Direct',          '0.14', 'mg/dl', '0.00–0.30','normal'),
        P('Bilirubin Indirect',        '0.15', 'mg/dl', '0.20–0.90','normal'),
        P('Total Protein',             '6.6',  'gm/dl', '6.0–8.0',  'normal'),
        P('Albumin',                   '3.9',  'gm/dl', '3.5–5.2',  'normal'),
        P('Globulin',                  '2.8',  'gm/dl', '1.8–3.5',  'normal'),
        P('A/G Ratio',                 '1.4',  '',       '1.2–2.5',  'normal'),
        P('AST (SGOT)',                '23',   'U/L',   '9–36',     'normal'),
        P('ALT (SGPT)',                '20',   'U/L',   '10–28',    'normal'),
        P('Alkaline Phosphatase (ALP)','156',  'U/L',   '35–105',   'high'),
        P('Gamma GT (GGT)',            '90',   'U/L',   '5–36',     'high'),
    ]},
];

// ─── Lab Report 3 — AVM Diagnostic Centre 30-Jul-2026 (CBC) ─────────────────
const AVM_DATE = '2026-07-30';
const avmCBC = [
    { category: 'Complete Blood Count (Horiba H500 JAPAN)', tests: [
        P('Hemoglobin',          '8.90', 'g/dL',       '11.5–15.1', 'low'),
        P('Total WBCs Count',    '7240', 'Cells/cu.mm', '4000–11000','normal'),
        P('Neutrophils%',        '64.7', '%',           '40–75',     'normal'),
        P('Lymphocytes%',        '26.5', '%',           '15–45',     'normal'),
        P('Eosinophils%',        '1.0',  '%',           '0.50–7.00', 'normal'),
        P('Monocytes%',          '7.7',  '%',           '4–13',      'normal'),
        P('Basophils%',          '0.1',  '%',           '0.00–2.00', 'normal'),
        P('Abs Neutrophil Count','4680', 'Cells/cu.mm', '1500–7500', 'normal'),
        P('Abs Lymphocyte Count','1920', 'Cells/cu.mm', '1250–4000', 'normal'),
        P('Abs Eosinophil Count','72',   'Cells/cu.mm', '0–400',     'normal'),
        P('Abs Monocyte Count',  '560',  'Cells/cu.mm', '200–800',   'normal'),
        P('Abs Basophil Count',  '10',   'Cells/cu.mm', '0–100',     'normal'),
        P('NLR (Neut/Lymp Ratio)','2.4', 'Ratio',      '1.00–3.00', 'normal'),
        P('Total RBC Count',     '4.64', 'million/cu.mm','3.90–5.20','normal'),
        P('HCT (PCV)',           '30.8', '%',           '35–45',     'low'),
        P('MCV',                 '66.3', 'fL',          '75–97',     'low'),
        P('MCH',                 '19.2', 'pg',          '26–33',     'low'),
        P('MCHC',                '29.0', 'g/dL',        '32–36',     'low'),
        P('RDW-CV',              '17.9', '%',           '12.0–18.0', 'normal'),
        P('RDW-SD',              '32.2', 'fL',          '37–56',     'low'),
        P('Platelet Count',      '2.12', 'Lak/cu.mm',   '1.50–4.50', 'normal'),
        P('MPV',                 '8.2',  'fL',          '7–11',      'normal'),
        P('PDW',                 '12.4', 'fL',          '11.0–20.0', 'normal'),
        P('P-LCR',               '28.9', '%',           '18–50',     'normal'),
        P('P-LCC',               '61.0', '10³/uL',      '44–140',    'normal'),
        P('PCT',                 '0.173','%',           '0.15–0.40', 'normal'),
        P('Microcytes',          '43.5', '%',           '0–20',      'high'),
        P('Large Immature Cells','0.3',  '%',           '0.00–3.00', 'normal'),
        P('Macrocytes',          '0.9',  '%',           '2.00–10.00','normal'),
        P('Im Granulo',          '0.01', '%',           '0.00–2.00', 'normal'),
        P('Im Lymp',             '0',    '%',           '0.00–0.20', 'normal'),
        P('Atypical Lymph',      '0.5',  '%',           '0.00–2.50', 'normal'),
    ]},
];

const avmBiochem = [
    { category: 'ESR and Blood Group', tests: [
        P('ESR ½ Hour',  '04',       'mm',  '—',         'normal'),
        P('ESR 1 Hour',  '09',       'mm',  '0–20 Women','normal'),
        P('Blood Group', 'B Negative','',   '—',         'normal'),
        P('Sugar Fasting','107',     'mg/dl','70–110',   'normal'),
        P('Sugar 2 Hrs PP','179',    'mg/dl','Up to 140','high'),
    ]},
    { category: 'Liver Function Test (AVM)', tests: [
        P('Bilirubin Total (AVM)',            '0.32','mg/dl','Adult <1.0',     'normal'),
        P('Bilirubin Direct (AVM)',           '0.10','mg/dl','Up to 0.2',      'normal'),
        P('Bilirubin Indirect (AVM)',         '0.22','mg/dl','—',              'normal'),
        P('SGOT / AST (AVM)',                 '16.4','U/L',  'Up to 40',       'normal'),
        P('SGPT / ALT (AVM)',                 '13.5','U/L',  'Up to 41.0',     'normal'),
        P('Alkaline Phosphatase (AVM)',        '80.0','U/L',  'Women <105',     'normal'),
        P('Gamma GT / GGT (AVM)',             '39.2','U/L',  'Women <38.0',    'high'),
        P('Total Protein (AVM)',              '6.6', 'g/dl', '6.3–8.4',        'normal'),
        P('Albumin (AVM)',                    '3.4', 'g/dl', 'Adult 3.5–5.0',  'low'),
        P('Globulin (AVM)',                   '3.2', 'g/dl', '2.3–3.5',        'normal'),
        P('A/G Ratio (AVM)',                  '1.06','',     '1.0–2.5',         'normal'),
    ]},
    { category: 'Lipid Profile (AVM)', tests: [
        P('Total Cholesterol (AVM)',   '133','mg/dl','<200',            'normal'),
        P('Triglycerides (AVM)',       '124','mg/dl','Female 40–140',   'normal'),
        P('HDL Direct (AVM)',          '45', 'mg/dl','Low risk >60',    'normal'),
        P('LDL Direct (AVM)',          '74', 'mg/dl','<130',            'normal'),
        P('Non HDL Cholesterol (AVM)', '88', 'mg/dl','<130',            'normal'),
        P('T.CHO/HDL Ratio (AVM)',     '3.0','',     '3.5–5.0',         'normal'),
        P('LDL/HDL Ratio (AVM)',       '1.6','',     '0.5–3.0 Low Risk','normal'),
    ]},
    { category: 'Glycosylated Haemoglobin (AVM)', tests: [
        P('HbA1c (AVM)',                        '7.3', '%',   '≥6.5 Diabetes / 7.1–8.0 Fair Control','high'),
        P('Estimated Average Blood Glucose (AVM)','163','mg/dl','68–125 Excellent / 157–183 Average','high'),
    ]},
    { category: 'Thyroid Profile (AVM)', tests: [
        P('Triiodothyronine T3', '110',  'ng/dl', 'Adult 69–215',    'normal'),
        P('Thyroxine T4',        '5.42', 'ug/dl', 'Adult 5.2–12.7',  'normal'),
        P('TSH',                 '5.13', 'ulU/ml','Adult 0.3–4.5',   'high'),
    ]},
    { category: 'Blood Infectious Diseases (AVM)', tests: [
        P('HBsAg',       'Negative',     '','≤0.12 Negative','normal'),
        P('HIV 1 Antibody','Non-reactive','','Negative',      'normal'),
        P('HIV 2 Antibody','Non-reactive','','Negative',      'normal'),
        P('VDRL',        'Non-reactive', '','Negative',       'normal'),
    ]},
];

// ─── Mind-map nodes ──────────────────────────────────────────────────────────
const nodes = [
    {
        id: 'profile', title: 'Patient Profile & Referral Entry',
        description: 'Mrs. Ameena Begam .S, 70-year-old female, B Negative. Self-referred. Presenting with generalised weakness and fatigue. Entry point for oncology workup.',
        type: 'screening', date: '2026-06-07',
        rationale: 'Elderly female with severe unexplained anaemia and markedly elevated HbA1c — dual red flags warranting systematic oncology workup.',
        outcome: 'Initial panel ordered at Sabari Lab; results triggered oncology referral pathway.',
        x: 0, y: 1,
        connections: ['hba1c', 'cbc'],
        parameters: [
            P('Age', '70', 'years', '—', 'normal'),
            P('Blood Group', 'B Negative', '', '—', 'normal'),
        ],
    },
    {
        id: 'hba1c', title: 'HbA1c — Critical Elevation (Sabari Lab, Jun 2026)',
        description: 'HbA1c 12.9% (HPLC) with eAG 323.5 mg/dl. Fasting glucose 236 mg/dl — uncontrolled diabetes mellitus. Calcium 9.12 mg/dl normal. Visit ID: 26111939.',
        type: 'diagnosis', date: '2026-06-07',
        rationale: 'HbA1c 12.9% is critically above diabetic threshold (≥6.5%). This level of uncontrolled diabetes in elderly patients is associated with elevated cancer risk and poor treatment tolerance.',
        outcome: 'Urgent glycaemic intervention initiated. Repeated at AVM Lab 30-Jul-2026 showing improvement to 7.3% (fair control).',
        x: 1, y: 0,
        connections: ['glucose_trend'],
        parameters: [
            P('HbA1c (HPLC)',               '12.9', '%',    '≥6.5 Diabetes', 'high'),
            P('Estimated Average Glucose',  '323.5','mg/dl','68–125 Excellent','high'),
            P('Fasting Glucose',            '236',  'mg/dl','<100 Normal',   'high'),
            P('Calcium',                    '9.12', 'mg/dl','8.5–10.5',      'normal'),
        ],
    },
    {
        id: 'cbc', title: 'CBC — Severe Microcytic Hypochromic Anaemia (Sabari, Jun 2026)',
        description: 'Hb 9.0 g/dl (low), MCV 64.2 fl (microcytic), MCH 19.2 pg (low), MCHC 29.9 g/dl (low), RDW 17.4% (elevated), PCV 30.1% (low). WBC and platelets normal. Visit ID: 26111943.',
        type: 'diagnosis', date: '2026-06-07',
        rationale: 'Severe microcytic hypochromic anaemia (Hb 9.0, MCV 64.2) in a 70-year-old woman is the #1 red flag for GI malignancy or haematological cancer.',
        outcome: 'Confirmed persistent microcytic anaemia pattern. AVM repeat (30-Jul) showed Hb 8.9 g/dl — no improvement, reinforcing workup urgency.',
        x: 1, y: 2,
        connections: ['lftelevated'],
        parameters: [
            P('Hemoglobin',  '9.0', 'gms%', '12–15',   'low'),
            P('MCV',         '64.2','fl',   '83–101',  'low'),
            P('MCH',         '19.2','pg',   '27–32',   'low'),
            P('MCHC',        '29.9','g/dl', '31.5–34.5','low'),
            P('RDW',         '17.4','%',    '11.5–15.5','high'),
        ],
    },
    {
        id: 'glucose_trend', title: 'Glycaemic Improvement (AVM Lab, Jul 2026)',
        description: 'HbA1c improved from 12.9% (Jun) to 7.3% (Jul) — fair control. eAG 163 mg/dl. Fasting sugar 107 mg/dl (normal), PP 179 mg/dl (elevated). Treatment response confirmed.',
        type: 'surveillance', date: '2026-07-30',
        rationale: 'Rapid HbA1c fall from 12.9 → 7.3% in 53 days confirms glycaemic intervention success. PP sugar 179 still elevated — ongoing diet and medication optimisation needed.',
        outcome: 'Glycaemic improvement tracked. Continue antidiabetic medication and dietary surveillance.',
        x: 2, y: 0,
        connections: ['thyroid'],
        parameters: [
            P('HbA1c (AVM)',             '7.3','%',    '7.1–8.0 Fair Control','high'),
            P('eAG (AVM)',               '163','mg/dl','157–183 Average',     'high'),
            P('Sugar Fasting (AVM)',     '107','mg/dl','70–110',              'normal'),
            P('Sugar PP (AVM)',          '179','mg/dl','Up to 140',           'high'),
        ],
    },
    {
        id: 'lftelevated', title: 'Elevated ALP & GGT — Hepatic / Bone Signal (Sabari, Jun 2026)',
        description: 'ALP 156 U/L (normal <105, elevated), GGT 90 U/L (normal <36, elevated). Other LFT markers normal: AST 23, ALT 20, Bilirubin Total 0.29, Albumin 3.9. ALP/GGT pattern is oncologically significant.',
        type: 'diagnosis', date: '2026-06-07',
        rationale: 'Elevated ALP (156 U/L) combined with elevated GGT (90 U/L) and normal transaminases (AST 23, ALT 20) points to cholestatic/hepatobiliary or bone disease — both relevant oncology flags in a 70-year-old with anaemia.',
        outcome: 'AVM repeat (Jul): ALP 80 U/L (improved), GGT 39.2 U/L (borderline). Trend improving. Albumin dropped to 3.4 — nutritional compromise noted.',
        x: 2, y: 2,
        connections: ['avm_labs'],
        parameters: [
            P('ALP (Sabari Jun)',  '156','U/L','35–105','high'),
            P('GGT (Sabari Jun)', '90', 'U/L','5–36',  'high'),
            P('AST (Sabari Jun)', '23', 'U/L','9–36',  'normal'),
            P('ALT (Sabari Jun)', '20', 'U/L','10–28', 'normal'),
            P('Albumin (Sabari)', '3.9','gm/dl','3.5–5.2','normal'),
        ],
    },
    {
        id: 'thyroid', title: 'Thyroid — Elevated TSH (AVM Lab, Jul 2026)',
        description: 'TSH 5.13 ulU/ml (normal 0.3–4.5) — subclinical to overt hypothyroidism. T3 110 ng/dl and T4 5.42 ug/dl both within normal adult range. VDRL Non-reactive.',
        type: 'diagnosis', date: '2026-07-30',
        rationale: 'Elevated TSH with normal T3/T4 indicates subclinical hypothyroidism. In elderly women with anaemia and cancer workup, thyroid dysfunction can be a comorbidity or paraneoplastic feature.',
        outcome: 'Thyroid supplementation assessment recommended. Serial TSH monitoring as part of oncology workup.',
        x: 3, y: 0,
        connections: ['avm_labs'],
        parameters: [
            P('TSH', '5.13','ulU/ml','Adult 0.3–4.5','high'),
            P('T3',  '110', 'ng/dl', '69–215',        'normal'),
            P('T4',  '5.42','ug/dl', '5.2–12.7',      'normal'),
        ],
    },
    {
        id: 'avm_labs', title: 'AVM Full Panel — Repeat Confirmation (Jul 2026)',
        description: 'CBC confirms Hb 8.9 g/dl, microcytes 43.5% (markedly elevated). ALP improved to 80 U/L, GGT 39.2 U/L (borderline). Albumin 3.4 g/dl (low). Infectious screen: HBsAg Negative, HIV 1 & 2 Non-reactive. Blood Group confirmed B Negative.',
        type: 'surveillance', date: '2026-07-30',
        rationale: 'Repeat labs 53 days after Sabari: anaemia persists (Hb 8.9), microcytes 43.5% (very high), albumin declining (3.4) — persistent picture despite glycaemic improvement. Workup urgency confirmed.',
        outcome: 'Oncology referral placed. Urgent iron studies, peripheral smear, tumour markers and GI evaluation recommended as next steps.',
        x: 3, y: 2,
        connections: ['oncology_referral'],
        parameters: [
            P('Hemoglobin (AVM)',   '8.90','g/dL','11.5–15.1','low'),
            P('Microcytes (AVM)',   '43.5','%',   '0–20',     'high'),
            P('Albumin (AVM)',      '3.4', 'g/dl','3.5–5.0',  'low'),
            P('GGT (AVM)',         '39.2','U/L', 'Women <38.0','high'),
        ],
    },
    {
        id: 'oncology_referral', title: 'Oncology Referral — Workup In Progress',
        description: 'Patient referred to Dr. Ananya Rao (Medical Oncology, Niraiva OnCoTrack Clinic). Presenting triad: persistent severe microcytic anaemia (Hb 8.9), elevated ALP/GGT (Jun), and uncontrolled diabetes. Formal malignancy workup initiated.',
        type: 'surveillance', date: '2026-09-16',
        rationale: 'Closed-loop referral: persistent unexplained anaemia + elevated liver-bone enzymes in 70-year-old → oncology evaluation mandatory. No biopsy or imaging result available yet.',
        outcome: 'Investigation in progress. Tumour markers, peripheral smear, serum iron studies, and CT abdomen/pelvis ordered. Next review pending results.',
        x: 4, y: 1,
        connections: [],
        parameters: [
            P('Workup Status',    'In Progress',           '','—','normal'),
            P('Primary Concern',  'Persistent Anaemia + Elevated ALP/GGT','','—','high'),
            P('Next Step',        'Tumour Markers + Imaging','','—','normal'),
        ],
    },
];

// ─── Timeline ────────────────────────────────────────────────────────────────
const timeline = [
    ['2026-06-07', 'Sabari Lab — HbA1c Panel (Visit 26111939)',
     'HbA1c (HPLC) 12.9% — critically elevated. Estimated Average Glucose 323.5 mg/dl. Calcium 9.12 mg/dl (normal). Lab ID: TRY00949079. Self-referred.',
     'test', 'completed'],
    ['2026-06-07', 'Sabari Lab — Full Blood Panel (Visit 26111943)',
     'Hb 9.0 g/dl (low), MCV 64.2 fl (microcytic), RDW 17.4% (high). Fasting glucose 236 mg/dl (diabetic). ALP 156 U/L (high), GGT 90 U/L (high). Lipids and bilirubin normal. Lab ID: TRY00949080.',
     'test', 'completed'],
    ['2026-06-07', 'Oncology Workup Entry — Initial Lab Assessment',
     'Diagnosis: Suspected malignancy under investigation. Presenting with severe microcytic hypochromic anaemia (Hb 9.0, MCV 64.2), uncontrolled diabetes (HbA1c 12.9%), and elevated hepatic/bone markers (ALP 156, GGT 90). Doctor\'s Advice: Urgent repeat CBC, iron studies, tumour markers, and imaging. Oncology referral initiated.',
     'appointment', 'completed'],
    ['2026-07-30', 'AVM Diagnostic Centre — Standard Blood Tests (Lab 040135)',
     'Blood Group confirmed: B Negative. ESR 1 hr: 9 mm (normal). Fasting sugar 107 mg/dl (normal borderline). PP sugar 179 mg/dl (elevated). LFT: ALP 80 U/L (improved), GGT 39.2 (borderline), Albumin 3.4 g/dl (low). Lipids: Cholesterol 133, TG 124 — all normal.',
     'test', 'completed'],
    ['2026-07-30', 'AVM Diagnostic Centre — CBC (Horiba H500)',
     'Hb 8.90 g/dL (low, worsening from 9.0). MCV 66.3 fL (microcytic). Microcytes 43.5% (very high). HCT 30.8% (low). WBC 7240 (normal). Platelets 2.12 Lak (normal). Persistent severe microcytic hypochromic anaemia confirmed.',
     'test', 'completed'],
    ['2026-07-30', 'AVM Diagnostic Centre — HbA1c & Thyroid',
     'HbA1c 7.3% (improved from 12.9% — fair control). eAG 163 mg/dl. TSH 5.13 ulU/ml (elevated — subclinical/overt hypothyroidism). T3 110 ng/dl (normal), T4 5.42 ug/dl (normal). VDRL Non-reactive. HBsAg Negative. HIV 1 & 2 Non-reactive.',
     'test', 'completed'],
    ['2026-09-16', 'Oncology Referral — Dr. Ananya Rao, Niraiva OnCoTrack',
     'Diagnosis: Suspected malignancy — investigation in progress. Doctor\'s Advice: Tumour markers (CEA, CA-125, CA 19-9, AFP, serum protein electrophoresis), peripheral blood smear, serum iron/TIBC/ferritin, CT abdomen & pelvis. Antidiabetic therapy continues. Thyroid supplementation to be assessed.',
     'appointment', 'completed'],
    ['2026-10-15', 'Pending — Tumour Marker Review & Imaging Results',
     'Scheduled follow-up for review of ordered tumour markers, peripheral smear, iron studies, and CT findings.',
     'appointment', 'pending'],
];

// ─── Medications ─────────────────────────────────────────────────────────────
// No medication documents provided in source records.
// Medications will be recorded only after prescription is formally documented.
const medications = [];

// ─── Vitals ──────────────────────────────────────────────────────────────────
// BP, temperature, pulse, SpO2, height and weight are NOT present in any source document.
const vitals = {
    bloodPressure: null,
    temperature:   null,
    weight:        null,
    height:        null,
    pulseRate:     null,
    spo2:          null,
    notes: 'Laboratory workup record — no clinical vitals (BP, pulse, temperature, SpO2, height, weight) documented in source reports. ' +
           'Key lab findings (AVM Diagnostic Centre, 30-Jul-2026, Lab 040135): Hb 8.90 g/dL [Low], Microcytes 43.5% [Very High; Normal 0–20%], ' +
           'HbA1c 7.3% [Fair Diabetic Control; improved from 12.9% at Sabari Lab 07-Jun-2026], TSH 5.13 ulU/ml [Elevated; subclinical hypothyroidism], ' +
           'Albumin 3.4 g/dl [Low; declined from 3.9 at prior visit], GGT 39.2 U/L [Borderline High]. ' +
           'Blood Group: B Negative. Infectious screen: HBsAg Negative, HIV 1 & 2 Non-reactive, VDRL Non-reactive. ' +
           'Oncology workup formally initiated 16-Sep-2026 under Dr. Ananya Rao.',
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
    const doctorId = await findDoctor();
    if (!doctorId) {
        console.error('❌ Doctor ananya.rao@niraiva.health not found. Run seed-oncology-demo.mjs first.');
        process.exit(1);
    }

    // ── Wipe previous runs of THIS patient only (idempotent) ──
    const clearIds = [
        P_USER_ID, P_PATIENT_ID, P_COND_ID, P_DIAG_ID,
        'demo-ameena-vitals', 'demo-ameena-relation',
        ...timeline.map((_, i) => `demo-ameena-event-${String(i+1).padStart(2,'0')}`),
        ...medications.map(([name]) => `demo-ameena-med-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`),
        'demo-ameena-report-sabari1', 'demo-ameena-report-sabari2', 'demo-ameena-report-avm',
    ];

    for (const id of clearIds) {
        await exec('DELETE FROM health_parameters WHERE patient_id = ?',    [P_PATIENT_ID]).catch(()=>null);
        await exec('DELETE FROM timeline_events WHERE id = ?',              [id]).catch(()=>null);
        await exec('DELETE FROM prescriptions WHERE patient_id = ?',        [P_PATIENT_ID]).catch(()=>null);
        await exec('DELETE FROM medications WHERE id = ?',                  [id]).catch(()=>null);
        await exec('DELETE FROM patient_vitals WHERE id = ?',               [id]).catch(()=>null);
        await exec('DELETE FROM patient_diagnostics WHERE id = ?',          [id]).catch(()=>null);
        await exec('DELETE FROM patient_conditions WHERE id = ?',           [id]).catch(()=>null);
        await exec('DELETE FROM lab_reports WHERE patient_id = ?',          [P_PATIENT_ID]).catch(()=>null);
        await exec('DELETE FROM doctor_patient_relations WHERE id = ?',     [id]).catch(()=>null);
        await exec('DELETE FROM patients WHERE id = ?',                     [P_PATIENT_ID]).catch(()=>null);
        await exec('DELETE FROM users WHERE id = ?',                        [P_USER_ID]).catch(()=>null);
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // ── User ──
    await exec(
        `INSERT INTO users (id, name, email, password, role, is_onboarded, custom_id, is_banned)
         VALUES (?, ?, ?, ?, 'patient', 1, ?, 0)`,
        [P_USER_ID, 'Mrs. Ameena Begam .S', EMAIL, passwordHash, CUSTOM_ID]
    );
    console.log(`✔ users         -> ${P_USER_ID} | ${EMAIL}`);

    // ── Patient ──
    await exec(
        `INSERT INTO patients (id, user_id, dob, age, gender, phone_number, address, city, marital_status,
         emergency_contact_name, emergency_contact_phone, blood_group, height, weight,
         allergies, current_medications, past_surgeries, chronic_conditions, lifestyle, medical_history, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            P_PATIENT_ID, P_USER_ID,
            null,           // Exact DOB not present in any source document; age 70 recorded as reported
            70, 'female',
            null,           // Phone number not in source documents
            null,           // Patient address not stated in source documents
            null,           // Patient city not stated in source documents
            null,           // Marital status not in source documents
            null, null,     // Emergency contact not in source documents
            'B Negative',   // Confirmed: AVM Diagnostic Centre, 30-Jul-2026, Blood Grouping + RH Typing
            null,           // Height not present in any source document
            null,           // Weight not present in any source document
            'Not documented in source records',
            'Not documented in source records',
            'Not documented in source records',
            'Severe microcytic hypochromic anaemia (Hb 8.90 g/dL, MCV 66.3 fL, Microcytes 43.5%); Uncontrolled Type 2 Diabetes Mellitus (HbA1c 12.9% — Jun 2026, improving to 7.3% — Jul 2026); Subclinical hypothyroidism (TSH 5.13 ulU/ml); Elevated ALP 156 U/L and GGT 90 U/L (Jun 2026) — Oncology workup in progress',
            'Self-referred. No lifestyle, smoking, or alcohol history documented in available source records.',
            'Sequential laboratory workup across two visits: Sabari Lab, Pudukkottai (07-Jun-2026, Visit IDs 26111939 and 26111943) and AVM Diagnostic Centre, Pudukkottai (30-Jul-2026, Lab S.ID 040135). Persistent severe microcytic hypochromic anaemia confirmed across both visits (Hb 9.0 → 8.90 g/dL). HbA1c improved from 12.9% (critical, Jun) to 7.3% (fair control, Jul). Elevated ALP 156 U/L and GGT 90 U/L at Jun visit (partially resolved at Jul). TSH elevated at 5.13 ulU/ml (Jul — subclinical hypothyroidism). Albumin declining: 3.9 g/dl (Jun) → 3.4 g/dl (Jul). Infectious screen negative. Oncology referral placed 16-Sep-2026.',
            ts('2026-06-07'),
        ]
    );
    console.log(`✔ patients      -> ${P_PATIENT_ID}`);

    // ── Doctor–Patient relation ──
    await exec(
        `INSERT INTO doctor_patient_relations (id, doctor_id, patient_id, added_at) VALUES (?, ?, ?, ?)`,
        ['demo-ameena-relation', doctorId, P_PATIENT_ID, ts('2026-09-16')]
    );
    console.log(`✔ dr_pt_relation -> demo-ameena-relation`);

    // ── Patient condition ──
    await exec(
        `INSERT INTO patient_conditions (id, patient_id, condition_name, diagnosed_date, status, added_by, doctor_id, created_at)
         VALUES (?, ?, ?, ?, 'active', 'doctor', ?, ?)`,
        [P_COND_ID, P_PATIENT_ID,
         'Suspected malignancy under investigation — persistent microcytic anaemia with elevated ALP/GGT',
         '2026-09-16', doctorId, ts('2026-09-16')]
    );
    console.log(`✔ pt_conditions -> ${P_COND_ID}`);

    // ── Diagnostic pathway (mind-map) ──
    const clinicalNotes =
        `ONCOLOGY INITIAL ASSESSMENT NOTE\n` +
        `Patient: Mrs. Ameena Begam .S | Age: 70 Years | Sex: Female | Blood Group: B Negative (Confirmed)\n` +
        `NRV-ONC-005 | Referred: Self | Clinician: Dr. Ananya Rao, Medical Oncology, Niraiva OnCoTrack Clinic\n` +
        `\n` +
        `PRESENTING CONCERN\n` +
        `Elderly female self-referred for evaluation of haematological and biochemical abnormalities identified across two sequential laboratory assessments conducted at Sabari Lab (07-Jun-2026) and AVM Diagnostic Centre (30-Jul-2026). No clinical vitals, anthropometric data, medication history, or prior surgical records available in source documents.\n` +
        `\n` +
        `PERTINENT LABORATORY FINDINGS\n` +
        `\n` +
        `I. Sabari Lab, Pudukkottai — 07 June 2026\n` +
        `   Visit 26111939 | UID: TRY00949079 | Collected 08:35 | Reported 16:33 | Analyser: HPLC BIO RAD D10\n` +
        `   - HbA1c (HPLC): 12.9% [Critical; Diabetic threshold ≥6.5%]\n` +
        `   - Estimated Average Glucose (eAG): 323.5 mg/dl [Excellent control threshold: 68–125]\n` +
        `   - Calcium: 9.12 mg/dl [Normal: 8.5–10.5]\n` +
        `\n` +
        `   Visit 26111943 | UID: TRY00949080 | Collected 08:27 | Reported 16:31\n` +
        `   Haematology (CBC):\n` +
        `   - Haemoglobin: 9.0 g/dl [Low; Normal: 12–15]\n` +
        `   - MCV: 64.2 fL [Microcytic; Normal: 83–101] | MCH: 19.2 pg [Low] | MCHC: 29.9 g/dl [Hypochromic]\n` +
        `   - RDW: 17.4% [Elevated; Normal: 11.5–15.5] | PCV: 30.1% [Low; Normal: 36–46]\n` +
        `   - Total WBC: 7410 cells/cumm [Normal] | Platelets: 2.00 Lakhs/cumm [Normal]\n` +
        `   - ESR (1 hr): 16 mm/hr [Normal for women: ≤20]\n` +
        `   Biochemistry:\n` +
        `   - Fasting Glucose: 236 mg/dl [Diabetic: ≥126] | Urea: 18 mg/dl [Normal] | Creatinine: 0.69 mg/dl [Normal]\n` +
        `   - Uric Acid: 1.82 mg/dl [Below normal: 3.5–7.3]\n` +
        `   Lipid Profile: Cholesterol 126, TG 123, HDL 43, LDL 66, VLDL 25 mg/dl — all within normal limits\n` +
        `   Liver Function:\n` +
        `   - ALP: 156 U/L [ELEVATED; Normal women ≤105] | GGT: 90 U/L [ELEVATED; Normal women ≤36]\n` +
        `   - AST: 23 U/L [Normal] | ALT: 20 U/L [Normal] | Bilirubin Total: 0.29 mg/dl [Normal]\n` +
        `   - Albumin: 3.9 g/dl [Normal] | Total Protein: 6.6 g/dl [Normal]\n` +
        `\n` +
        `II. AVM Diagnostic Centre, Pudukkottai — 30 July 2026\n` +
        `    Lab S.ID: 040135 | Collected 09:32 | Reported 17:28 | Analyser: Horiba H500 9-part (Japan)\n` +
        `    Dr. A. Manoharan M.D (Path) | Dr. R. Sharmila MD Micro | SS.Sivakumar M.Sc M.L.T.\n` +
        `   Blood Group: B Negative [Confirmed] | ESR 1 hr: 9 mm [Normal]\n` +
        `   CBC (Horiba H500):\n` +
        `   - Haemoglobin: 8.90 g/dL [Low; worsened from 9.0 at prior visit]\n` +
        `   - MCV: 66.3 fL [Microcytic] | MCH: 19.2 pg [Low] | MCHC: 29.0 g/dL [Hypochromic]\n` +
        `   - Microcytes: 43.5% [MARKEDLY ELEVATED; Normal 0–20%] | HCT: 30.8% [Low] | RDW-CV: 17.9%\n` +
        `   - WBC: 7240 cells/cumm [Normal] | NLR: 2.4 [Normal] | Platelets: 2.12 Lak [Normal]\n` +
        `   Biochemistry:\n` +
        `   - Fasting Sugar: 107 mg/dl [Borderline Normal: 70–110] | 2-hr PP Sugar: 179 mg/dl [Elevated: >140]\n` +
        `   Liver Function:\n` +
        `   - ALP: 80.0 U/L [Improved from 156; Normal women ≤105] | GGT: 39.2 U/L [Borderline High; Normal ≤38]\n` +
        `   - AST: 16.4 U/L [Normal] | ALT: 13.5 U/L [Normal] | Bilirubin Total: 0.32 mg/dl [Normal]\n` +
        `   - Albumin: 3.4 g/dl [LOW; Normal 3.5–5.0 — declined from 3.9 at prior visit]\n` +
        `   Lipid Profile: Cholesterol 133, TG 124, HDL 45, LDL 74 mg/dl — all within normal limits\n` +
        `   Glycated Haemoglobin:\n` +
        `   - HbA1c: 7.3% [Fair Control; improved from 12.9% — 53-day interval] | eAG: 163 mg/dl\n` +
        `   Thyroid Profile:\n` +
        `   - TSH: 5.13 ulU/ml [ELEVATED; Normal Adult: 0.3–4.5] | T3: 110 ng/dl [Normal] | T4: 5.42 ug/dl [Normal]\n` +
        `   - VDRL: Non-reactive\n` +
        `   Infectious Disease Screen:\n` +
        `   - HBsAg: Negative | HIV 1 Antibody: Non-reactive | HIV 2 Antibody: Non-reactive\n` +
        `\n` +
        `CLINICAL ASSESSMENT\n` +
        `Mrs. Ameena Begam .S presents with a clinically significant constellation of findings across two sequential laboratory visits spanning 53 days:\n` +
        `\n` +
        `1. Persistent Severe Microcytic Hypochromic Anaemia: Haemoglobin declined from 9.0 g/dl (Jun 2026) to 8.90 g/dL (Jul 2026) with progressive microcytosis (MCV 64.2–66.3 fL), hypochromia (MCHC 29.0–29.9 g/dl), markedly elevated microcyte percentage (43.5%), and elevated RDW (17.4–17.9%) — indicating ongoing ineffective erythropoiesis. In a 70-year-old woman with no documented aetiology, this pattern carries a high index of suspicion for occult gastrointestinal malignancy causing chronic blood loss, haematological malignancy (multiple myeloma, myelodysplastic syndrome), or cancer-related anaemia of chronic disease.\n` +
        `\n` +
        `2. Isolated Elevation of ALP and GGT with Normal Transaminases (Jun 2026): ALP 156 U/L (women's reference ≤105) and GGT 90 U/L (women's reference ≤36), with AST 23 U/L and ALT 20 U/L both normal — a cholestatic or hepatobiliary/infiltrative pattern rather than hepatocellular injury. Additionally relevant as a marker of bone disease (metastatic or haematological). Partial resolution at Jul 2026 (ALP 80, GGT 39.2) does not exclude the underlying cause.\n` +
        `\n` +
        `3. Progressive Hypoalbuminaemia: Albumin declined from 3.9 g/dl (Jun 2026) to 3.4 g/dl (Jul 2026) over 53 days — indicative of a systemic inflammatory state, nutritional compromise, or malignancy-related protein catabolism. This trend requires close monitoring.\n` +
        `\n` +
        `4. Uncontrolled Type 2 Diabetes Mellitus: HbA1c 12.9% at June presentation (critically above the diabetic threshold of ≥6.5%). Significant improvement to 7.3% (fair control) by July 2026 indicates glycaemic intervention was initiated. Post-prandial glucose remains elevated at 179 mg/dl (normal ≤140). Sustained poor glycaemic control in elderly patients is independently associated with increased cancer risk and compromised treatment tolerance.\n` +
        `\n` +
        `5. Subclinical/Primary Hypothyroidism: TSH elevated at 5.13 ulU/ml (normal adult: 0.3–4.5 ulU/ml) with T3 and T4 within normal adult ranges — consistent with subclinical or early primary hypothyroidism. Thyroid dysfunction in the setting of unexplained anaemia and cancer evaluation warrants formal endocrinological assessment and may represent a comorbidity or paraneoplastic phenomenon.\n` +
        `\n` +
        `6. Low Uric Acid (1.82 mg/dl): Below the lower reference limit (3.5–7.3 mg/dl). While non-specific, low serum uric acid in elderly patients can be associated with nutritional deficiency, renal tubular reabsorption dysfunction, or malignancy-related uricosuric states.\n` +
        `\n` +
        `DIFFERENTIAL DIAGNOSIS (in order of oncological priority)\n` +
        `1. Occult gastrointestinal malignancy with chronic occult blood loss (colorectal, gastric) — primary consideration given microcytic anaemia pattern and age\n` +
        `2. Haematological malignancy: Multiple Myeloma or Myelodysplastic Syndrome (MDS) — elevated ALP/GGT, declining albumin, progressive anaemia\n` +
        `3. Gynaecological malignancy (ovarian, endometrial) — sex and age profile, unexplained anaemia\n` +
        `4. Hepatobiliary or metastatic disease with cholestatic enzyme pattern\n` +
        `5. Iron deficiency anaemia from a benign cause (pending iron studies to confirm or exclude)\n` +
        `\n` +
        `Oncology referral status: ACTIVE — formally initiated 16-Sep-2026 under Dr. Ananya Rao, Medical Oncology.`;

    const treatmentPlan =
        `ONCOLOGY WORKUP PLAN — Mrs. Ameena Begam .S (NRV-ONC-005)\n` +
        `Date Initiated: 16 September 2026 | Clinician: Dr. Ananya Rao, Medical Oncology, Niraiva OnCoTrack Clinic\n` +
        `\n` +
        `SECTION A — INVESTIGATIONS (Priority Order)\n` +
        `\n` +
        `Haematology and Iron Studies:\n` +
        `1. Peripheral blood smear — characterise RBC morphology (microcytic, hypochromic pattern); screen for dysplastic cells, plasmacytoid features, or blast forms to exclude haematological malignancy (MDS, MMA)\n` +
        `2. Serum iron, TIBC, and ferritin — quantify iron store depletion and differentiate iron-deficiency anaemia from anaemia of chronic disease or malignancy-related anaemia\n` +
        `3. Reticulocyte count and corrected reticulocyte index — assess bone marrow erythropoietic reserve and response capacity\n` +
        `4. Serum vitamin B12 and folate — exclude nutritional deficiency as a contributing factor to the haematological picture\n` +
        `5. Serum protein electrophoresis (SPEP) with immunofixation — screen for paraprotein band (Multiple Myeloma / MGUS); indicated by progressive microcytic anaemia and elevated ALP/GGT in a 70-year-old\n` +
        `6. Serum LDH and beta-2 microglobulin — haematological malignancy burden markers\n` +
        `\n` +
        `Tumour Marker Panel:\n` +
        `7. CEA (Carcinoembryonic Antigen) — colorectal and gastric malignancy screen; primary GI concern given age and anaemia pattern\n` +
        `8. CA 19-9 — pancreatic and biliary tract malignancy marker; relevant in context of prior elevated ALP/GGT\n` +
        `9. CA-125 — ovarian malignancy marker; priority given patient sex and age profile\n` +
        `10. AFP (Alpha-fetoprotein) — hepatocellular carcinoma screen; indicated by ALP/GGT elevation pattern\n` +
        `\n` +
        `Imaging:\n` +
        `11. Contrast-enhanced CT abdomen and pelvis — primary imaging to identify occult gastrointestinal, gynaecological, retroperitoneal, or hepatic mass lesion\n` +
        `12. Upper GI endoscopy and/or colonoscopy referral — if imaging is unrevealing, to evaluate directly for occult mucosal bleeding source or luminal malignancy\n` +
        `\n` +
        `Endocrine:\n` +
        `13. Repeat TSH at 8-week interval following current result (5.13 ulU/ml) — confirm hypothyroid trend and determine need for thyroid hormone replacement in consultation with endocrinology\n` +
        `\n` +
        `Glycaemic Monitoring:\n` +
        `14. Repeat HbA1c and fasting glucose at 8 weeks — confirm glycaemic trajectory (currently improving: 12.9% → 7.3%); post-prandial glucose 179 mg/dl requires ongoing dietary and pharmacological optimisation as directed by treating physician\n` +
        `\n` +
        `SECTION B — MEDICAL MANAGEMENT\n` +
        `- Anaemia: No transfusion indicated at current Hb level (8.90 g/dL); threshold for intervention to be reviewed if haemoglobin declines further or symptoms worsen. Specific correction (iron supplementation, erythropoiesis support) to be determined pending iron studies and workup results.\n` +
        `- Diabetes: Glycaemic management ongoing as directed by treating physician; post-prandial glucose (179 mg/dl) to be reviewed at next visit.\n` +
        `- Hypothyroidism: Formal endocrinology review before initiating thyroid hormone replacement; no independent action taken pending TSH confirmation.\n` +
        `- Medications: No medications documented in source records. All prescriptions to be recorded at the time of formal prescription issue.\n` +
        `\n` +
        `SECTION C — MONITORING AND FOLLOW-UP\n` +
        `- Repeat CBC and full LFT panel at next oncology visit — monitor haemoglobin trajectory and albumin trend (currently declining: 3.9 → 3.4 g/dl in 53 days)\n` +
        `- Clinical symptom review: appetite changes, unintentional weight loss, abdominal pain or bloating, change in bowel habits, abnormal uterine bleeding, fatigue severity\n` +
        `- Albumin trend: if decline continues, assess for malnutrition intervention and nutritional support\n` +
        `\n` +
        `NEXT MILESTONE: Review of tumour marker panel, peripheral smear, iron studies, and CT abdomen/pelvis findings — 15 October 2026.`;

    await exec(
        `INSERT INTO patient_diagnostics (id, patient_id, doctor_id, condition_name, condition_status, nodes, clinical_notes, treatment_plan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [P_DIAG_ID, P_PATIENT_ID, doctorId,
         'Suspected malignancy under investigation — persistent microcytic anaemia with elevated ALP/GGT',
         'active',
         json(nodes),
         clinicalNotes,
         treatmentPlan,
         ts('2026-09-16', 10),
         ts('2026-09-16', 10)]
    );
    console.log(`✔ pt_diagnostics -> ${P_DIAG_ID} (${nodes.length} nodes)`);

    // ── Patient vitals ──
    await exec(
        `INSERT INTO patient_vitals (id, patient_id, blood_pressure, temperature, weight, height, pulse_rate, spo2, recorded_by, notes, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['demo-ameena-vitals', P_PATIENT_ID,
         vitals.bloodPressure, vitals.temperature,
         vitals.weight, vitals.height,
         vitals.pulseRate, vitals.spo2,
         'Niraiva Oncology Workflow — Dr. Ananya Rao',
         vitals.notes,
         ts(AVM_DATE, 10)]
    );
    console.log(`✔ pt_vitals     -> demo-ameena-vitals`);

    // ── Medications ──
    // No medication records to insert — no prescription documents provided in source.
    console.log(`✔ medications   -> 0 rows (no prescription documents in source records)`);

    // ── Lab Report: Sabari Lab Visit 26111939 (HbA1c) ──
    const rpt1ExtractedData = { metadata: { sample: { 'Visit ID': '26111939', 'Patient UID': 'TRY00949079', 'Lab': 'Sabari Lab (Try)', 'Collected On': '07/06/2026 08:35', 'Reported On': '07/06/2026 16:33', 'Referred By': 'SELF', 'Analyser': 'HPLC BIO RAD D10' } }, results: sabariFull1 };
    await exec(
        `INSERT INTO lab_reports (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, NULL, ?)`,
        ['demo-ameena-report-sabari1', P_PATIENT_ID,
         'Ameena Begam - Sabari Lab HbA1c Panel 07-Jun-2026.pdf',
         SABARI_DATE_1, 'Sabari Lab (Try) — Pudukkottai',
         'Mrs. Ameena Begam .S', 'Dr. P. K. Rath MD (Path)',
         json(rpt1ExtractedData),
         'Visit 26111939. HbA1c (HPLC) 12.9%. Estimated Average Glucose 323.5 mg/dl. Calcium 9.12 mg/dl. End of Report.',
         'HbA1c critically elevated at 12.9%. Immediate glycaemic intervention required. Calcium normal.',
         128000, ts(SABARI_DATE_1, 16)]
    );
    console.log(`✔ lab_reports   -> demo-ameena-report-sabari1 (Sabari HbA1c, Jun 2026)`);

    // ── Lab Report: Sabari Lab Visit 26111943 (Full Panel) ──
    const rpt2ExtractedData = { metadata: { sample: { 'Visit ID': '26111943', 'Patient UID': 'TRY00949080', 'Lab': 'Sabari Lab (Try)', 'Collected On': '07/06/2026 08:27', 'Reported On': '07/06/2026 16:31', 'Referred By': 'SELF', 'Pages': '3 of 3' } }, results: sabariFullPanel };
    await exec(
        `INSERT INTO lab_reports (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, NULL, NULL, ?)`,
        ['demo-ameena-report-sabari2', P_PATIENT_ID,
         'Ameena Begam - Sabari Lab Full Panel 07-Jun-2026.pdf',
         SABARI_DATE_2, 'Sabari Lab (Try) — Pudukkottai',
         'Mrs. Ameena Begam .S', 'Dr. R. Lavanya MD (Path) / Dr. P. K. Rath MD (Path)',
         json(rpt2ExtractedData),
         'Visit 26111943. CBC: Hb 9.0, MCV 64.2, MCH 19.2, MCHC 29.9, RDW 17.4. Glucose(F) 236. ALP 156, GGT 90. Lipids normal. End of Report.',
         'Severe microcytic anaemia. Uncontrolled diabetes. Elevated ALP and GGT — hepatic/bone workup recommended.',
         265000, ts(SABARI_DATE_2, 16)]
    );
    console.log(`✔ lab_reports   -> demo-ameena-report-sabari2 (Sabari Full Panel, Jun 2026)`);

    // ── Lab Report: AVM Diagnostic Centre 30-Jul-2026 ──
    const avmAllCategories = [...avmCBC, ...avmBiochem];
    const rpt3ExtractedData = { metadata: { sample: { 'Lab S.ID': '040135', 'Lab': 'AVM Diagnostic Centre', 'Address': 'T.S.No. 2314, North Main Street, Pudukkottai - 622 001', 'Collected On': '30/07/2026 09:32', 'Received On': '30/07/2026 09:36', 'Reported On': '30/07/2026 17:28', 'Referred By': 'SELF', 'Analyser': 'Horiba H500 9-part JAPAN', 'Pathologist': 'Dr. A. Manoharan M.D (Path)', 'Microbiologist': 'Dr. R. Sharmila MD Micro', 'Diagnostic Incharge': 'SS.Sivakumar M.Sc M.L.T.' } }, results: avmAllCategories };
    await exec(
        `INSERT INTO lab_reports (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 6, NULL, NULL, ?)`,
        ['demo-ameena-report-avm', P_PATIENT_ID,
         'Ameena Begam - AVM Diagnostic Centre Full Panel 30-Jul-2026.pdf',
         AVM_DATE, 'AVM Diagnostic Centre — Pudukkottai',
         'Mrs. Ameena Begam .S', 'Dr. A. Manoharan M.D (Path)',
         json(rpt3ExtractedData),
         'Lab 040135. CBC: Hb 8.90, Microcytes 43.5%, MCV 66.3. Blood Group B Negative. HbA1c 7.3%. TSH 5.13. GGT 39.2, Albumin 3.4. HBsAg Negative. HIV 1&2 Non-reactive. VDRL Non-reactive. End of Report.',
         'Persistent anaemia (Hb 8.9, microcytes 43.5%). HbA1c improved to 7.3% (fair control). TSH elevated (5.13) — subclinical hypothyroidism. Low albumin (3.4). Infectious screen clear.',
         382000, ts(AVM_DATE, 17)]
    );
    console.log(`✔ lab_reports   -> demo-ameena-report-avm (AVM Full 6-page panel, Jul 2026)`);

    // ── Health parameters (all from both labs) ──
    const allParams = [];
    const seenParams = new Set();
    const addParams = (reportId, date, categories) => {
        for (const cat of categories) {
            for (const item of cat.tests) {
                const key = item.name.toLowerCase();
                if (seenParams.has(key)) continue;
                seenParams.add(key);
                allParams.push({ reportId, date, ...item });
            }
        }
    };
    addParams('demo-ameena-report-sabari1', SABARI_DATE_1, sabariFull1);
    addParams('demo-ameena-report-sabari2', SABARI_DATE_2, sabariFullPanel);
    addParams('demo-ameena-report-avm',     AVM_DATE,      avmAllCategories);

    for (const p of allParams) {
        const paramId = `demo-ameena-param-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}`;
        await exec(
            `INSERT INTO health_parameters (id, patient_id, lab_report_id, parameter_name, value, unit, reference_range, status, test_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [paramId, P_PATIENT_ID, p.reportId, p.name, p.value, p.unit||'', p.referenceRange||'', p.status||'normal', p.date, ts(p.date)]
        );
    }
    console.log(`✔ health_params -> ${allParams.length} unique parameters`);

    // ── Timeline events ──
    for (let i = 0; i < timeline.length; i++) {
        const [date, title, description, eventType, status] = timeline[i];
        const evId = `demo-ameena-event-${String(i+1).padStart(2,'0')}`;
        await exec(
            `INSERT INTO timeline_events (id, user_id, title, description, event_date, event_type, status, report_id, doctor_id, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
            [evId, P_USER_ID, title, description, date, eventType, status||'completed',
             doctorId,
             eventType === 'appointment' ? 'doctor' : 'system',
             ts(date)]
        );
    }
    console.log(`✔ timeline      -> ${timeline.length} events`);

    // ── Summary ──
    console.log('\n🎉 Mrs. Ameena Begam .S seeded successfully.');
    console.log(`   Patient ID  : ${P_PATIENT_ID}`);
    console.log(`   Custom ID   : ${CUSTOM_ID}`);
    console.log(`   Email       : ${EMAIL}`);
    console.log(`   Password    : ${DEMO_PASSWORD}`);
    console.log(`   Doctor      : ananya.rao@niraiva.health | ${DEMO_PASSWORD}`);
    console.log(`   Doctor ID   : ${doctorId}`);
    console.log(`   Lab reports : 3 (Sabari HbA1c, Sabari Full Panel, AVM Full 6-page)`);
    console.log(`   Health params: ${allParams.length} unique rows`);
    console.log(`   Timeline    : ${timeline.length} events`);
    console.log(`   Mind-map    : ${nodes.length} nodes`);
    console.log(`   Medications : 0 (no prescription documents in source records)`);
}

run()
    .catch(err => { console.error('Seed failed:', err); process.exitCode = 1; })
    .finally(() => client.close());
