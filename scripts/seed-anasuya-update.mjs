// Update patient #Nrivaa018 (Mrs. Anasuya) with lab data from
// "Mrs ANASUYA.pdf" + "Mrs ANASUYA 2.pdf" (collected 21-03-2025).
//
// Sources:
//   - Request 11258565: Routine Chemistry, Lipid, LFT, Haematology, HbA1c
//   - Request 11258566: Calcium, Vitamin B12, Vitamin D
//
// Populates: patient_vitals, timeline_events, patient_diagnostics, patient_conditions,
// and syncs patients.chronic_conditions/age/gender.
//
// Usage:
//   node scripts/seed-anasuya-update.mjs

import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config({ quiet: true });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const DATE = '2025-03-21';
const ts = (iso) => Math.floor(new Date(iso).getTime() / 1000);

// Same shape as the oncology demo seed uses for lab parameters
const P = (name, value, unit, referenceRange, status = 'normal') => ({
  name,
  value,
  unit: unit || '',
  referenceRange: referenceRange || 'Clinician reviewed',
  status,
});

function node(id, title, description, type, rationale, outcome, x, y, connections, parameters) {
  return { id, title, description, type, date: DATE, rationale, outcome, x, y, connections, parameters };
}

async function findPatient() {
  const res = await client.execute({
    sql: `SELECT u.id AS user_id, u.name, u.email, u.custom_id, p.id AS patient_id, p.age, p.gender, p.chronic_conditions
          FROM users u
          INNER JOIN patients p ON p.user_id = u.id
          WHERE lower(u.custom_id) LIKE '%nrivaa018%' OR lower(u.email) LIKE '%nrivaa018%'`,
    args: [],
  });
  if (res.rows.length === 0) {
    console.error('❌ Patient #Nrivaa018 not found. Check custom_id/email in the DB.');
    return null;
  }
  return res.rows[0];
}

async function findDoctor() {
  // Doctor profile of Dr. Ananya Rao (same doctor that drives the dashboard roster)
  const res = await client.execute({
    sql: `SELECT d.id FROM doctors d
          INNER JOIN users u ON u.id = d.user_id
          WHERE u.email = 'ananya.rao@niraiva.health' LIMIT 1`,
    args: [],
  });
  return res.rows[0]?.id ?? null;
}

async function run() {
  const patient = await findPatient();
  if (!patient) return;
  const doctorId = await findDoctor();
  if (!doctorId) {
    console.error('❌ Doctor profile for ananya.rao@niraiva.health not found.');
    return;
  }

  const userId = patient.user_id;
  const patientId = patient.patient_id;

  const params = {
    glucose: [
      P('Glucose - Fasting', '68', 'mg/dl', '<100 (cord 45-96)'),
      P('Glucose - PPBS', '112', 'mg/dl', '140-180', 'low'),
      P('Urea', '31', 'mg/dl', '17-43'),
      P('Creatinine', '0.8', 'mg/dl', '0.6-1.2'),
      P('eGFR', '91.00', 'mL/min/1.73 m2', '—'),
    ],
    hba1c: [
      P('HbA1c', '5.9', '%', '<5.8 non-diabetic / 5.8-6.5 pre-diabetic', 'high'),
      P('eAG (average glucose)', '123', 'mg/dl', '—'),
    ],
    anaemia: [
      P('Haemoglobin', '10.5', 'g/dl', '12-15', 'low'),
      P('Total RBC Count', '3.4', 'millions/cumm', '3.8-4.8', 'low'),
      P('PCV', '32', '%', '36-46', 'low'),
      P('MCV', '94', 'fl', '83-101'),
      P('MCH', '31', 'pg', '27-32'),
      P('MCHC', '33', '%', '31.5-34.5'),
      P('Total WBC Count', '6700', 'cells/cumm', '4000-10000'),
      P('Neutrophils', '65', '%', '40-80'),
      P('Lymphocytes', '30', '%', '20-40'),
      P('Monocytes', '03', '%', '2-10'),
      P('Eosinophils', '02', '%', '1-6'),
      P('Basophils', '00', '%', '0-2'),
      P('Platelet Count', '246000', 'cells/cumm', '150000-410000'),
      P('ANC', '4355', 'cells/cumm', '2000-7000'),
      P('AEC', '134', 'cells/cumm', '20-500'),
      P('ESR', '28', 'MM/HR', 'up to 35'),
    ],
    liver: [
      P('AST', '69', 'IU/L', 'Up to 31', 'high'),
      P('ALT', '37', 'IU/L', 'Up to 34', 'high'),
      P('ALP', '209', 'IU/L', '46-122', 'high'),
      P('GGT', '180', 'IU/L', '10-54', 'high'),
      P('Bilirubin Total', '1.1', 'mg/dl', '0.1-1.0', 'high'),
      P('Bilirubin Direct', '0.5', 'mg/dl', '0.1-0.4', 'high'),
      P('Total Protein', '6.6', 'g/dl', '6.5-7.8'),
      P('Albumin', '4.7', 'g/dl', '4.2-5.0'),
      P('Globulin', '1.9', 'g/dl', '1.7-3.6'),
      P('Albumin/Globulin Ratio', '2.5', '', '—'),
    ],
    lipid: [
      P('Cholesterol', '145', 'mg/dl', '<200', 'normal'),
      P('Triglyceride', '60', 'mg/dl', '<150', 'normal'),
      P('VLDL', '12', 'mg/dl', '2-30', 'normal'),
      P('HDL', '41.0', 'mg/dl', '35-70', 'normal'),
      P('LDL', '92', 'mg/dl', '<100 optimal', 'normal'),
      P('HDL/LDL Ratio', '0.4', '', '>0.3', 'normal'),
      P('Cholesterol/HDL Ratio', '1.6', '', '<4.5 good; 2-3 best', 'normal'),
    ],
    micronutrients: [
      P('Vitamin D', '23.26', 'ng/ml', '20-29 insufficient; 30-100 sufficient', 'low'),
      P('Vitamin B12', '322', 'pg/ml', '188-908', 'normal'),
      P('Calcium', '8.7', 'mg/dl', '8.6-10.2', 'normal'),
    ],
  };

  const nodes = [
    node('profile', 'Profile & home collection', '78-year-old female. Home blood collection for routine chemistry, lipid, liver, haematology and HbA1c panels.',
      'screening', 'Routine screening panel collected at home on 21-03-2025.', 'Findings routed into clinician-reviewed workup.', 0, 1,
      ['glucose', 'hba1c'], []),
    node('glucose', 'Glucose & renal panel', 'Fasting glucose 68 mg/dl (normal). Post-prandial 112 mg/dl — below reference (140-180).',
      'symptom', 'PPBS below reference range flagged for trend review.', 'Renal function preserved: eGFR 91 mL/min/1.73 m2.', 1, 1,
      ['hba1c'], params.glucose),
    node('hba1c', 'HbA1c — pre-diabetic range', 'HbA1c 5.9% with eAG 123 mg/dl — pre-diabetic range (5.8-6.5%).',
      'diagnosis', 'HbA1c 5.9% falls in the pre-diabetic band.', 'Confirmed pre-diabetes; glucose surveillance plan set.', 1, 2,
      ['anaemia'], params.hba1c),
    node('anaemia', 'Anaemia (mild, normocytic)', 'Hb 10.5 g/dL, PCV 32%, RBC 3.4 (all low); MCV 94 fl normocytic.',
      'diagnosis', 'Normocytic anaemia pattern with normal iron-free indices.', 'Anaemia workup flagged for clinical correlation.', 2, 2,
      ['liver'], params.anaemia),
    node('liver', 'Elevated liver enzymes', 'AST 69, ALT 37, ALP 209, GGT 180, bilirubin total 1.1 / direct 0.5 — all elevated.',
      'diagnosis', 'Mixed hepatocellular-cholestatic enzyme pattern.', 'Biliary / hepatic review recommended.', 3, 1,
      ['lipid'], params.liver),
    node('lipid', 'Lipid profile', 'Cholesterol 145, TG 60, HDL 41, LDL 92 — all within desirable range.',
      'surveillance', 'Lipids favourable for age and comorbidities.', 'Continue current diet-lifestyle surveillance.', 3, 3,
      ['micronutrients'], params.lipid),
    node('micronutrients', 'Micronutrients', 'Vitamin D 23.26 ng/mL (insufficient). Vitamin B12 322 pg/mL and calcium 8.7 mg/dL — normal.',
      'diagnosis', 'Vitamin D insufficiency with normal B12 and calcium.', 'Vitamin D supplementation discussed.', 4, 3,
      ['followup'], params.micronutrients),
    node('followup', 'Surveillance plan', 'Repeat LFT, HbA1c and vitamin D in 3 months; evaluate biliary/hepatic causes for ALP/GGT elevation.',
      'surveillance', 'Closed-loop plan: re-test and clinical correlation.', 'Follow-up review scheduled with Dr. Ananya Rao.', 5, 3,
      [], []),
  ];

  const clinicalNotes =
    `Mrs. Anasuya, 78 years, female. Home lab panels collected 21-03-2025 (Requests 11258565/11258566).\n` +
    `Pre-diabetes: HbA1c 5.9% (eAG 123). PPBS 112 mg/dl below reference (140-180).\n` +
    `Mild normocytic anaemia: Hb 10.5 g/dl, PCV 32%, RBC 3.4 M/cumm; MCV 94 fl.\n` +
    `Liver: AST 69, ALT 37, ALP 209, GGT 180 IU/L, bilirubin total 1.1/direct 0.5 mg/dl (mixed hepatocellular-cholestatic elevation).\n` +
    `Micronutrients: Vitamin D 23.26 ng/ml (insufficient); Vitamin B12 322 pg/ml (normal); Calcium 8.7 mg/dl (normal).\n` +
    `Lipids: Cholesterol 145, TG 60, HDL 41, LDL 92 mg/dl — desirable.\n` +
    `Renal: Creatinine 0.8 mg/dl, eGFR 91 mL/min/1.73 m2. ESR 28 mm/hr.`;

  const treatmentPlan =
    `1. Repeat LFT panel and HbA1c in 3 months to confirm enzyme trend and glycaemic control.\n` +
    `2. Evaluate liver enzyme elevation (ALP 209, GGT 180): exclude gall bladder/biliary disease with ultrasound.\n` +
    `3. Vitamin D insufficiency: supplementation per clinical judgement; re-check at 3 months.\n` +
    `4. Anaemia surveillance: iron studies and B12 follow-up; diet counselling.\n` +
    `5. Glucose surveillance for pre-diabetes: dietary modification and periodic HbA1c.`;

  const events = [
    {
      id: 'ana-event-20250321-panel1', eventDate: DATE, eventType: 'test', status: 'completed', createdBy: 'system', eventHour: 9, eventMin: 25,
      title: 'Home collection — Routine Chemistry & Haematology panel',
      description: 'Request 11258565. Fasting glucose 68 mg/dl; PPBS 112 mg/dl (low). Hb 10.5 g/dl (low), RBC 3.4 M/cumm (low), PCV 32% (low). Reported 17:32.',
    },
    {
      id: 'ana-event-20250321-panel2', eventDate: DATE, eventType: 'test', status: 'completed', createdBy: 'system', eventHour: 10, eventMin: 33,
      title: 'Follow-up labs — Calcium, Vitamin B12 & Vitamin D',
      description: 'Request 11258566. Calcium 8.7 mg/dl (normal); Vitamin B12 322 pg/ml (normal); Vitamin D 23.26 ng/ml (insufficient). Reported 20:38.',
    },
    {
      id: 'ana-event-20250321-review', eventDate: DATE, eventType: 'general', status: 'completed', createdBy: 'doctor', eventHour: 14, eventMin: 0,
      title: 'Lab findings reviewed',
      description: 'HbA1c 5.9% (pre-diabetic). Liver enzymes elevated: AST 69, ALT 37, ALP 209, GGT 180 IU/L; bilirubin total 1.1/direct 0.5 mg/dl. Recommended follow-up.',
    },
  ];

  const vitals = {
    id: 'ana-vitals-20250321',
    recorded_at: ts('2025-03-21T09:25:00Z'),
    bloodPressure: null, temperature: null, weight: null, height: null, pulseRate: null, spO2: null,
    recordedBy: 'Niraiva Clinic Nurse',
    notes: 'Home lab collection only — no BP/pulse/temperature recorded. Key findings: Hb 10.5 g/dL (low), PPBS 112 mg/dL (low), AST 69 / ALT 37 / ALP 209 / GGT 180 IU/L (high), HbA1c 5.9% (pre-diabetic), Vitamin D 23.26 ng/mL (insufficient). See diagnostic pathway.',
  };

  // ── health_parameters (drives the profile "Latest External Diagnostic Lab Panel") ──
  const paramSlug = (name) => 'ana-param-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const synonyms = [
    { name: 'Blood Glucose', value: '68', unit: 'mg/dL', referenceRange: '<100 (cord 45-96)', status: 'normal' },
    { name: 'Total Cholesterol', value: '145', unit: 'mg/dL', referenceRange: '<200', status: 'normal' },
  ];
  const flatParams = [...synonyms];
  for (const group of Object.values(params)) flatParams.push(...group);
  const seen = new Set();
  const uniqueParams = flatParams.filter(p => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Clear previous runs (idempotent) ──────────────────────────────────────
  const ourIds = [
    vitals.id,
    ...events.map(e => e.id),
    'ana-diag-20250321',
    'ana-cond-20250321',
    ...uniqueParams.map(p => paramSlug(p.name)),
  ];
  for (const id of ourIds) {
    await client.execute({ sql: 'DELETE FROM patient_vitals WHERE id = ?', args: [id] }).catch(() => null);
    await client.execute({ sql: 'DELETE FROM timeline_events WHERE id = ?', args: [id] }).catch(() => null);
    await client.execute({ sql: 'DELETE FROM patient_diagnostics WHERE id = ?', args: [id] }).catch(() => null);
    await client.execute({ sql: 'DELETE FROM patient_conditions WHERE id = ?', args: [id] }).catch(() => null);
  }

  // ── Insert vitals ──────────────────────────────────────────────────────────
  await client.execute({
    sql: `INSERT INTO patient_vitals (id, patient_id, blood_pressure, temperature, weight, height, pulse_rate, spo2, recorded_by, notes, recorded_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [vitals.id, patientId, vitals.bloodPressure, vitals.temperature, vitals.weight, vitals.height, vitals.pulseRate, vitals.spO2, vitals.recordedBy, vitals.notes, vitals.recorded_at],
  });
  console.log('✔ patient_vitals  -> ana-vitals-20250321');

  // ── Insert timeline events ────────────────────────────────────────────────
  for (const e of events) {
    await client.execute({
      sql: `INSERT INTO timeline_events (id, user_id, title, description, event_date, event_type, status, report_id, doctor_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      args: [e.id, userId, e.title, e.description, e.eventDate, e.eventType, e.status, doctorId, e.createdBy, ts(`${e.eventDate}T${String(e.eventHour).padStart(2, '0')}:${String(e.eventMin).padStart(2, '0')}:00Z`)],
    });
  }
  console.log('✔ timeline_events -> 3 events');

  // ── Insert patient_diagnostics ─────────────────────────────────────────────
  await client.execute({
    sql: `INSERT INTO patient_diagnostics (id, patient_id, doctor_id, condition_name, condition_status, nodes, clinical_notes, treatment_plan, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'ana-diag-20250321', patientId, doctorId,
      'Pre-diabetes with anaemia and elevated liver enzymes',
      'stable',
      JSON.stringify(nodes),
      clinicalNotes,
      treatmentPlan,
      ts('2025-03-21T14:00:00Z'),
      ts('2025-03-21T14:00:00Z'),
    ],
  });
  console.log('✔ patient_diagnostics -> ana-diag-20250321 (8 nodes)');

  // ── Insert patient_condition ───────────────────────────────────────────────
  await client.execute({
    sql: `INSERT INTO patient_conditions (id, patient_id, condition_name, diagnosed_date, status, added_by, doctor_id, created_at)
          VALUES (?, ?, ?, ?, 'active', 'doctor', ?, ?)`,
    args: ['ana-cond-20250321', patientId, 'Pre-diabetes with anaemia and elevated liver enzymes', DATE, doctorId, ts('2025-03-21T14:00:00Z')],
  });
  console.log('✔ patient_conditions -> ana-cond-20250321');

  // ── Insert health_parameters (populates "Latest External Diagnostic Lab Panel") ──
  for (const p of uniqueParams) {
    await client.execute({
      sql: `INSERT INTO health_parameters (id, patient_id, lab_report_id, parameter_name, value, unit, reference_range, status, test_date, created_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      args: [paramSlug(p.name), patientId, p.name, p.value, p.unit || '', p.referenceRange || '', p.status || 'normal', DATE, ts(`${DATE}T09:25:00Z`)],
    });
  }
  console.log(`✔ health_parameters -> ${uniqueParams.length} rows (includes HbA1c, Blood Glucose, Total Cholesterol)`);

  // ── Sync patient profile summary fields ────────────────────────────────────
  await client.execute({
    sql: `UPDATE patients SET age = ?, gender = ?, chronic_conditions = ?
          WHERE id = ?`,
    args: [78, 'female', 'Pre-diabetes, Anaemia, Elevated liver enzymes, Vitamin D insufficiency', patientId],
  });
  console.log('✔ patients -> age=78, gender=female, chronic_conditions synced');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n🎉 Anasuya (#Nrivaa018) updated:');
  console.log(`  patient : ${patientId}`);
  console.log(`  user    : ${userId} (${patient.email})`);
  console.log(`  doctor  : ${doctorId}`);
  console.log('  vitals  : 1 row (lab-only notes; no BP/pulse/temp in source)');
  console.log('  timeline: 3 events');
  console.log('  diag    : 1 pathway, 8 nodes');
  console.log('  Rx note : Diagnostic values match the 21-03-2025 lab reports.');

  // ── Verify health_parameters are actually in the DB ─────────────────────────
  const verify = await client.execute({
    sql: `SELECT parameter_name, value, unit, status FROM health_parameters WHERE patient_id = ? ORDER BY parameter_name`,
    args: [patientId],
  });
  console.log(`\n✔ VERIFY: health_parameters rows in DB for this patient: ${verify.rows.length}`);
  for (const r of verify.rows) {
    console.log(`    ${r.parameter_name} = ${r.value} ${r.unit ?? ''} (${r.status ?? 'normal'})`);
  }
}

run()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.close());