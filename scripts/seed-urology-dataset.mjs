import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

dotenv.config({ quiet: true });

const databaseUrl = process.env.TURSO_DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing TURSO_DATABASE_URL in .env');
}

const client = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const ts = (date, hour = 9) => Math.floor(new Date(`${date}T${String(hour).padStart(2, '0')}:00:00.000Z`).getTime() / 1000);
const json = (value) => JSON.stringify(value);
const now = Math.floor(Date.now() / 1000);

const ids = {
    doctorUser: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7001',
    doctor: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7002',
    patient1User: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7011',
    patient1: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7012',
    patient2User: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7021',
    patient2: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7022',
    patient3User: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7031',
    patient3: '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f7032',
};

const doctor = {
    name: 'Dr. Suresh Balaji',
    email: 'dr.suresh.balaji@nriraiva.in',
    password: 'SureshUro#2026!',
    customId: 'NRV-URO-DOC-001',
};

const patients = [
    {
        key: 'patient1',
        userId: ids.patient1User,
        patientId: ids.patient1,
        name: 'Arjun Mehta',
        email: 'arjun.mehta@nriraiva.in',
        password: 'ArjunCare#2026!',
        customId: 'NRV-URO-PT-001',
        dob: '1992-06-18',
        age: 34,
        gender: 'Male',
        phone: '+91 90000 00001',
        city: 'Bengaluru',
        maritalStatus: 'Married',
        emergencyName: 'Nisha Mehta',
        emergencyPhone: '+91 90000 00002',
        bloodGroup: 'O Positive',
        height: '178 cm',
        weight: '81 kg',
        allergies: 'No known drug allergies',
        currentMedications: 'None',
        pastSurgeries: 'None',
        chronicConditions: 'Recurrent calcium oxalate nephrolithiasis',
        lifestyle: 'Non-smoker. Occasional alcohol. Low water intake during workdays.',
        medicalHistory: 'Two previous spontaneously passed renal calculi, last episode in 2023.',
    },
    {
        key: 'patient2',
        userId: ids.patient2User,
        patientId: ids.patient2,
        name: 'Ravi Krishnan',
        email: 'ravi.krishnan@nriraiva.in',
        password: 'RaviCare#2026!',
        customId: 'NRV-URO-PT-002',
        dob: '1959-02-11',
        age: 67,
        gender: 'Male',
        phone: '+91 90000 00003',
        city: 'Chennai',
        maritalStatus: 'Married',
        emergencyName: 'Lakshmi Krishnan',
        emergencyPhone: '+91 90000 00004',
        bloodGroup: 'B Positive',
        height: '171 cm',
        weight: '78 kg',
        allergies: 'No known drug allergies',
        currentMedications: 'Amlodipine 5 mg once daily',
        pastSurgeries: 'Appendectomy in 1998',
        chronicConditions: 'Hypertension; benign prostatic enlargement with bladder-outlet obstruction',
        lifestyle: 'Non-smoker. Walks 20 minutes most days. Two cups of tea daily.',
        medicalHistory: 'Progressive lower urinary tract symptoms for approximately four years.',
    },
    {
        key: 'patient3',
        userId: ids.patient3User,
        patientId: ids.patient3,
        name: 'Neha Iyer',
        email: 'neha.iyer@nriraiva.in',
        password: 'NehaCare#2026!',
        customId: 'NRV-URO-PT-003',
        dob: '1974-03-22',
        age: 52,
        gender: 'Female',
        phone: '+91 90000 00007',
        city: 'Hyderabad',
        maritalStatus: 'Married',
        emergencyName: 'Asha Iyer',
        emergencyPhone: '+91 90000 00008',
        bloodGroup: 'O Positive',
        height: '160 cm',
        weight: '68 kg',
        allergies: 'No known drug allergies',
        currentMedications: 'Losartan 50 mg once daily',
        pastSurgeries: 'Caesarean section in 2004',
        chronicConditions: 'Hypertension; recurrent urinary tract infection; overactive bladder',
        lifestyle: 'Non-smoker. Walks 30 minutes five days a week. Limits caffeine after lunch.',
        medicalHistory: 'Two culture-proven urinary infections in the preceding year with urgency and nocturia; no previous renal stones.',
    },
];

const P = (name, value, unit, referenceRange, status = 'normal') => ({
    name,
    value: String(value),
    unit: unit || '',
    referenceRange: referenceRange || 'Clinician reviewed',
    status,
});

const group = (category, tests) => ({ category, tests });

async function exec(sql, args = []) {
    return client.execute({ sql, args });
}

async function ensureRequiredTables() {
    const result = await exec("SELECT name FROM sqlite_master WHERE type = 'table'");
    const tables = new Set(result.rows.map((row) => String(row.name)));
    const required = [
        'users', 'doctors', 'patients', 'doctor_patient_relations', 'patient_conditions',
        'patient_allergies', 'patient_diagnostics', 'patient_vitals', 'lab_reports',
        'health_parameters', 'medications', 'prescriptions', 'timeline_events',
        'doctor_private_notes',
    ];
    const missing = required.filter((table) => !tables.has(table));
    if (missing.length) throw new Error(`Missing database tables: ${missing.join(', ')}`);
}

async function ensureUser({ id, name, email, password, customId, role }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await exec('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    const userId = existing.rows[0]?.id || id;

    if (existing.rows.length) {
        await exec(
            `UPDATE users
             SET name = ?, password = ?, role = ?, is_onboarded = 1, custom_id = ?, is_banned = 0
             WHERE id = ?`,
            [name, passwordHash, role, customId, userId],
        );
    } else {
        await exec(
            `INSERT INTO users
             (id, name, email, password, role, is_onboarded, custom_id, is_banned)
             VALUES (?, ?, ?, ?, ?, 1, ?, 0)`,
            [userId, name, email, passwordHash, role, customId],
        );
    }
    return userId;
}

async function ensureDoctor(userId) {
    const existing = await exec('SELECT id FROM doctors WHERE user_id = ? LIMIT 1', [userId]);
    const doctorId = existing.rows[0]?.id || ids.doctor;
    const values = [
        '1979-08-12', 47, 'Male', '+91 90000 00005', 'Niraiva Medical Campus', 'Bengaluru',
        'Married', 'Niraiva Medical Campus', '+91 90000 00006', 'Urology & Kidney Care',
        'Niraiva Urology and Kidney Care Centre', 'TNMC-URO-2026-001', 18,
        'MBBS, MS (Urology), Fellowship in Endourology', '09:00-17:00', 'Monday-Saturday',
        'Consultant urologist specialising in urinary stone disease, endourology, prostate health and kidney-care follow-up.',
    ];
    if (existing.rows.length) {
        await exec(
            `UPDATE doctors SET dob = ?, age = ?, gender = ?, phone_number = ?, address = ?, city = ?,
             marital_status = ?, emergency_contact_name = ?, emergency_contact_phone = ?,
             specialization = ?, clinic_name = ?, license_number = ?, experience_years = ?, degree = ?,
             hospital_timing = ?, working_days = ?, bio = ?, approval_status = 'approved'
             WHERE id = ?`,
            [...values, doctorId],
        );
    } else {
        await exec(
            `INSERT INTO doctors
             (id, user_id, dob, age, gender, phone_number, address, city, marital_status,
              emergency_contact_name, emergency_contact_phone, specialization, clinic_name,
              license_number, experience_years, degree, hospital_timing, working_days, bio,
              approval_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
            [doctorId, userId, ...values, now],
        );
    }
    return doctorId;
}

async function ensurePatient(patient, userId) {
    const existing = await exec('SELECT id FROM patients WHERE user_id = ? LIMIT 1', [userId]);
    const patientId = existing.rows[0]?.id || patient.patientId;
    const values = [
        patient.dob, patient.age, patient.gender, patient.phone, 'Niraiva Medical Campus', patient.city,
        patient.maritalStatus, patient.emergencyName, patient.emergencyPhone, null, null,
        patient.bloodGroup, patient.height, patient.weight, patient.allergies, patient.currentMedications,
        patient.pastSurgeries, patient.chronicConditions, patient.lifestyle, patient.medicalHistory,
    ];
    if (existing.rows.length) {
        await exec(
            `UPDATE patients SET dob = ?, age = ?, gender = ?, phone_number = ?, address = ?, city = ?,
             marital_status = ?, emergency_contact_name = ?, emergency_contact_phone = ?, guardian_name = ?,
             guardian_relation = ?, blood_group = ?, height = ?, weight = ?, allergies = ?,
             current_medications = ?, past_surgeries = ?, chronic_conditions = ?, lifestyle = ?, medical_history = ?
             WHERE id = ?`,
            [...values, patientId],
        );
    } else {
        await exec(
            `INSERT INTO patients
             (id, user_id, dob, age, gender, phone_number, address, city, marital_status,
              emergency_contact_name, emergency_contact_phone, guardian_name, guardian_relation,
              blood_group, height, weight, allergies, current_medications, past_surgeries,
              chronic_conditions, lifestyle, medical_history, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [patientId, userId, ...values, now],
        );
    }
    return patientId;
}

async function upsert(sql, args) {
    await exec(sql, args);
}

async function insertSharedProfileData({ patient, patientId, doctorId }) {
    const relationId = `9f4f1bb0-8c39-4f10-95b4-8b5a3f8f-rel-${patient.key}`;
    await exec(
        `INSERT OR IGNORE INTO doctor_patient_relations (id, doctor_id, patient_id, added_at)
         VALUES (?, ?, ?, ?)`,
        [relationId, doctorId, patientId, ts('2025-10-05')],
    );

    const allergyId = `9f4f1bb0-8c39-4f10-95b4-8b5a3f8f-all-${patient.key}`;
    await upsert(
        `INSERT INTO patient_allergies (id, patient_id, allergen, severity, reaction, status, added_by, doctor_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, allergen = excluded.allergen,
         severity = excluded.severity, reaction = excluded.reaction, status = excluded.status,
         added_by = excluded.added_by, doctor_id = excluded.doctor_id`,
        [allergyId, patientId, 'No known drug allergies', 'None', 'No known reaction', `doctor:${doctorId}`, doctorId, ts('2025-10-05')],
    );
}

async function insertCondition({ id, patientId, doctorId, name, date }) {
    await upsert(
        `INSERT INTO patient_conditions
         (id, patient_id, condition_name, diagnosed_date, status, added_by, doctor_id, created_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, condition_name = excluded.condition_name,
         diagnosed_date = excluded.diagnosed_date, status = excluded.status, added_by = excluded.added_by,
         doctor_id = excluded.doctor_id`,
        [id, patientId, name, date, `doctor:${doctorId}`, doctorId, ts(date)],
    );
}

async function insertVital({ id, patientId, date, bloodPressure, temperature, weight, height, pulseRate, spO2, notes }) {
    await upsert(
        `INSERT INTO patient_vitals
         (id, patient_id, blood_pressure, temperature, weight, height, pulse_rate, spo2, recorded_by, notes, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, blood_pressure = excluded.blood_pressure,
         temperature = excluded.temperature, weight = excluded.weight, height = excluded.height,
         pulse_rate = excluded.pulse_rate, spo2 = excluded.spo2, recorded_by = excluded.recorded_by,
         notes = excluded.notes, recorded_at = excluded.recorded_at`,
        [id, patientId, bloodPressure, temperature, weight, height, pulseRate, spO2, 'Dr. Suresh Balaji', notes, ts(date, 9)],
    );
}

async function insertReport({ id, patientId, date, fileName, labName, patientName, extractedData, analysis }) {
    await upsert(
        `INSERT INTO lab_reports
         (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data,
          raw_text, analysis, file_size, page_count, file_data, cloudinary_url, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, file_name = excluded.file_name,
         report_date = excluded.report_date, lab_name = excluded.lab_name, patient_name = excluded.patient_name,
         doctor_name = excluded.doctor_name, extracted_data = excluded.extracted_data, raw_text = excluded.raw_text,
         analysis = excluded.analysis, uploaded_at = excluded.uploaded_at`,
        [id, patientId, fileName, date, labName, patientName, 'Dr. Suresh Balaji', json(extractedData),
            `${patientName} | ${fileName} | Report date ${date}`, analysis, 0, 1, null, null, ts(date, 12)],
    );
}

async function insertParameter({ id, patientId, reportId, date, name, value, unit, referenceRange, status }) {
    await upsert(
        `INSERT INTO health_parameters
         (id, patient_id, lab_report_id, parameter_name, value, unit, reference_range, status, test_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, lab_report_id = excluded.lab_report_id,
         parameter_name = excluded.parameter_name, value = excluded.value, unit = excluded.unit,
         reference_range = excluded.reference_range, status = excluded.status, test_date = excluded.test_date`,
        [id, patientId, reportId, name, String(value), unit, referenceRange, status, date, ts(date, 12)],
    );
}

async function insertMedication({ id, patientId, name, dosage, purpose, startDate, frequency, durationDays, status }) {
    await upsert(
        `INSERT INTO medications
         (id, patient_id, name, dosage, purpose, start_date, frequency, duration_days, status, added_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, name = excluded.name, dosage = excluded.dosage,
         purpose = excluded.purpose, start_date = excluded.start_date, frequency = excluded.frequency,
         duration_days = excluded.duration_days, status = excluded.status, added_by = excluded.added_by`,
        [id, patientId, name, dosage, purpose, startDate, frequency, durationDays, status, 'Dr. Suresh Balaji', ts(startDate, 9)],
    );
}

async function insertTimeline({ id, userId, doctorId, date, title, description, eventType, reportId = null }) {
    await upsert(
        `INSERT INTO timeline_events
         (id, user_id, title, description, event_date, event_type, status, report_id, doctor_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, 'doctor', ?)
         ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, title = excluded.title,
         description = excluded.description, event_date = excluded.event_date, event_type = excluded.event_type,
         status = excluded.status, report_id = excluded.report_id, doctor_id = excluded.doctor_id,
         created_by = excluded.created_by`,
        [id, userId, title, description, date, eventType, reportId, doctorId, ts(date, 10)],
    );
}

async function insertDiagnostic({ id, patientId, doctorId, conditionName, conditionStatus, nodes, clinicalNotes, treatmentPlan }) {
    await upsert(
        `INSERT INTO patient_diagnostics
         (id, patient_id, doctor_id, condition_name, condition_status, nodes, clinical_notes, treatment_plan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, doctor_id = excluded.doctor_id,
         condition_name = excluded.condition_name, condition_status = excluded.condition_status, nodes = excluded.nodes,
         clinical_notes = excluded.clinical_notes, treatment_plan = excluded.treatment_plan, updated_at = excluded.updated_at`,
        [id, patientId, doctorId, conditionName, conditionStatus, json(nodes), clinicalNotes, treatmentPlan, ts('2025-10-05'), now],
    );
}

async function insertPrescription({ id, patientId, doctorId, date, data }) {
    await upsert(
        `INSERT INTO prescriptions (id, patient_id, doctor_id, consultation_data, cloudinary_url, prescribed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET patient_id = excluded.patient_id, doctor_id = excluded.doctor_id,
         consultation_data = excluded.consultation_data, cloudinary_url = excluded.cloudinary_url,
         prescribed_at = excluded.prescribed_at`,
        [id, patientId, doctorId, json(data), `demo-prescription://${id}`, ts(date, 9)],
    );
}

async function insertPrivateNote({ id, patientId, doctorId, date, note }) {
    await upsert(
        `INSERT INTO doctor_private_notes (id, doctor_id, patient_id, note_content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET doctor_id = excluded.doctor_id, patient_id = excluded.patient_id,
         note_content = excluded.note_content, updated_at = excluded.updated_at`,
        [id, doctorId, patientId, `[${date}] ${note}`, ts(date, 9), ts(date, 9)],
    );
}

const prescriptionBase = (patientName, date, number, diagnosis, treatmentPlan, advice, followUp, medications, vitals) => ({
    prescriptionNo: number,
    date,
    patientName,
    doctorName: 'Suresh Balaji',
    specialization: 'Urology & Kidney Care',
    clinicName: 'Niraiva Urology and Kidney Care Centre',
    diagnosis,
    treatmentPlan,
    advice,
    followUp,
    medications,
    vitals,
});

async function seedPatientOne({ userId, patientId, doctorId }) {
    const prefix = '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f-p1-';
    await insertCondition({ id: `${prefix}cond-01`, patientId, doctorId, name: 'Recurrent calcium oxalate nephrolithiasis', date: '2023-08-12' });
    await insertCondition({ id: `${prefix}cond-02`, patientId, doctorId, name: 'Left proximal ureteric calculus with mild hydroureteronephrosis', date: '2025-10-08' });

    await insertVital({ id: `${prefix}vital-01`, patientId, date: '2025-10-05', bloodPressure: '128/82 mmHg', temperature: '98.4 °F', weight: '81 kg', height: '178 cm', pulseRate: '76 bpm', spO2: '99%', notes: 'Afebrile; left costovertebral angle tenderness.' });
    await insertVital({ id: `${prefix}vital-02`, patientId, date: '2025-10-21', bloodPressure: '124/80 mmHg', temperature: '98.1 °F', weight: '80.5 kg', height: '178 cm', pulseRate: '72 bpm', spO2: '99%', notes: 'Pain resolved after procedure; stent removed.' });
    await insertVital({ id: `${prefix}vital-03`, patientId, date: '2026-04-05', bloodPressure: '122/78 mmHg', temperature: '98.2 °F', weight: '80 kg', height: '178 cm', pulseRate: '70 bpm', spO2: '99%', notes: 'No flank pain or urinary symptoms.' });
    await insertVital({ id: `${prefix}vital-04`, patientId, date: '2026-10-05', bloodPressure: '120/78 mmHg', temperature: '98.3 °F', weight: '79.5 kg', height: '178 cm', pulseRate: '68 bpm', spO2: '99%', notes: 'Annual review; asymptomatic.' });

    const r1 = `${prefix}report-01`;
    await insertReport({
        id: r1, patientId, date: '2025-10-08', fileName: 'CT-KUB-2025-10-08.pdf', labName: 'Niraiva Imaging Centre', patientName: 'Arjun Mehta',
        extractedData: [group('CT KUB Findings', [P('Left proximal ureteric calculus', '9', 'mm', 'No calculus', 'high'), P('Hydroureteronephrosis', 'Mild on left', '', 'Absent', 'high'), P('Right kidney', 'No calculus or hydronephrosis', '', 'Normal', 'normal'), P('Urinary bladder', 'Unremarkable', '', 'Normal', 'normal')])],
        analysis: 'Obstructing 9 mm left proximal ureteric calculus with mild upstream dilatation. No right-sided calculus.',
    });
    const r2 = `${prefix}report-02`;
    await insertReport({
        id: r2, patientId, date: '2025-10-09', fileName: 'Renal-Function-and-Urine-2025-10-09.pdf', labName: 'Niraiva Central Laboratory', patientName: 'Arjun Mehta',
        extractedData: [group('Renal Function', [P('Serum Creatinine', '0.94', 'mg/dL', '0.70–1.20', 'normal'), P('eGFR', '103', 'mL/min/1.73m²', '>90', 'normal'), P('Urea', '27', 'mg/dL', '15–45', 'normal')]), group('Urinalysis', [P('RBCs', '18', '/hpf', '0–2', 'high'), P('WBCs', '2', '/hpf', '0–5', 'normal'), P('Nitrite', 'Negative', '', 'Negative', 'normal'), P('Urine culture', 'No growth', '', 'No growth', 'normal')])],
        analysis: 'Microscopic haematuria is consistent with the documented ureteric calculus. Renal function is preserved and there is no evidence of urinary infection.',
    });
    const r3 = `${prefix}report-03`;
    await insertReport({
        id: r3, patientId, date: '2026-04-05', fileName: 'Renal-Ultrasound-2026-04-05.pdf', labName: 'Niraiva Imaging Centre', patientName: 'Arjun Mehta',
        extractedData: [group('Renal Ultrasound', [P('Left kidney', 'No residual calculus; no hydronephrosis', '', 'Normal', 'normal'), P('Right kidney', 'No calculus or hydronephrosis', '', 'Normal', 'normal'), P('Bladder post-void residual', '18', 'mL', '<50', 'normal')])],
        analysis: 'Interval resolution of left hydronephrosis with no sonographic evidence of residual calculus.',
    });
    const r4 = `${prefix}report-04`;
    await insertReport({
        id: r4, patientId, date: '2026-10-05', fileName: 'Annual-Renal-Review-2026-10-05.pdf', labName: 'Niraiva Central Laboratory', patientName: 'Arjun Mehta',
        extractedData: [group('Annual Renal Review', [P('Serum Creatinine', '0.91', 'mg/dL', '0.70–1.20', 'normal'), P('eGFR', '107', 'mL/min/1.73m²', '>90', 'normal'), P('Urine RBCs', '0–1', '/hpf', '0–2', 'normal'), P('Urine culture', 'No growth', '', 'No growth', 'normal')])],
        analysis: 'One-year review demonstrates preserved renal function and no recurrent haematuria or urinary infection.',
    });
    await insertParameter({ id: `${prefix}param-01`, patientId, reportId: r2, date: '2025-10-09', name: 'Serum Creatinine', value: '0.94', unit: 'mg/dL', referenceRange: '0.70–1.20', status: 'normal' });
    await insertParameter({ id: `${prefix}param-02`, patientId, reportId: r2, date: '2025-10-09', name: 'eGFR', value: '103', unit: 'mL/min/1.73m²', referenceRange: '>90', status: 'normal' });
    await insertParameter({ id: `${prefix}param-03`, patientId, reportId: r4, date: '2026-10-05', name: 'Serum Creatinine', value: '0.91', unit: 'mg/dL', referenceRange: '0.70–1.20', status: 'normal' });
    await insertParameter({ id: `${prefix}param-04`, patientId, reportId: r4, date: '2026-10-05', name: 'eGFR', value: '107', unit: 'mL/min/1.73m²', referenceRange: '>90', status: 'normal' });
    await insertParameter({ id: `${prefix}param-05`, patientId, reportId: r4, date: '2026-10-05', name: 'Urine RBCs', value: '0–1', unit: '/hpf', referenceRange: '0–2', status: 'normal' });

    await insertMedication({ id: `${prefix}med-01`, patientId, name: 'Tamsulosin', dosage: '0.4 mg', purpose: 'Facilitate ureteric stone passage and relieve colic-related urinary symptoms', startDate: '2025-10-10', frequency: 'Once nightly after food', durationDays: 14, status: 'Discontinued' });
    await insertMedication({ id: `${prefix}med-02`, patientId, name: 'Paracetamol', dosage: '650 mg', purpose: 'Breakthrough renal colic pain', startDate: '2025-10-10', frequency: 'Every 6–8 hours as needed', durationDays: 3, status: 'Discontinued' });
    await insertMedication({ id: `${prefix}med-03`, patientId, name: 'Potassium citrate', dosage: '10 mEq', purpose: 'Urinary citrate support for calcium oxalate stone prevention', startDate: '2026-01-05', frequency: 'Twice daily with meals', durationDays: 90, status: 'Discontinued' });

    const common = { patientName: 'Arjun Mehta', vitals: { bloodPressure: '128/82 mmHg', pulseRate: '76 bpm', spO2: '99%', weight: '81 kg' } };
    await insertPrescription({ id: `${prefix}rx-01`, patientId, doctorId, date: '2025-10-10', data: prescriptionBase(common.patientName, '2025-10-10', 'RX-URO-001-01', '9 mm left proximal ureteric calculus with mild hydroureteronephrosis', 'Medical expulsive therapy while arranging definitive ureteroscopic management.', 'Increase oral fluids if tolerated. Return urgently for fever, uncontrolled pain, vomiting or reduced urine output.', 'Review after CT KUB and urine culture; procedure planning in 4 days.', [{ name: 'Tamsulosin', dosage: '0.4 mg', frequency: 'Once nightly after food for 14 days', purpose: 'Ureteric relaxation' }, { name: 'Paracetamol', dosage: '650 mg', frequency: 'Every 6–8 hours as needed for 3 days', purpose: 'Pain relief' }], common.vitals) });
    await insertPrescription({ id: `${prefix}rx-02`, patientId, doctorId, date: '2025-10-14', data: prescriptionBase(common.patientName, '2025-10-14', 'RX-URO-001-02', 'Post-ureteroscopy care after laser lithotripsy and JJ stent placement', 'Short postoperative symptom control with scheduled stent removal.', 'Maintain hydration. Seek care for fever or persistent severe pain. Avoid strenuous activity until stent removal.', 'Stent removal on 2025-10-21.', [{ name: 'Paracetamol', dosage: '650 mg', frequency: 'Every 8 hours as needed for 3 days', purpose: 'Postoperative pain' }, { name: 'Tamsulosin', dosage: '0.4 mg', frequency: 'Once nightly until stent removal', purpose: 'Stent-related urinary symptoms' }], { ...common.vitals, bloodPressure: '126/80 mmHg' }) });
    await insertPrescription({ id: `${prefix}rx-03`, patientId, doctorId, date: '2026-01-05', data: prescriptionBase(common.patientName, '2026-01-05', 'RX-URO-001-03', 'Calcium oxalate nephrolithiasis prevention', 'Dietary and fluid-based recurrence prevention after metabolic evaluation.', 'Target urine output above 2.5 L/day, reduce dietary sodium, maintain normal dietary calcium, and moderate high-oxalate foods.', 'Repeat renal ultrasound and renal panel at 6 months.', [{ name: 'Potassium citrate', dosage: '10 mEq', frequency: 'Twice daily with meals for 90 days', purpose: 'Urinary citrate support' }], { ...common.vitals, bloodPressure: '124/80 mmHg', weight: '80.5 kg' }) });

    const nodes = [
        { id: 'p1-entry', title: 'Symptomatic ureteric calculus', description: 'Left flank pain with microscopic haematuria.', type: 'screening', date: '2025-10-05', outcome: 'Imaging and renal function testing initiated.', x: 0, y: 1, connections: ['p1-ct'] },
        { id: 'p1-ct', title: 'CT KUB confirmation', description: '9 mm left proximal ureteric calculus with mild hydroureteronephrosis.', type: 'diagnostic', date: '2025-10-08', outcome: 'Definitive endourologic treatment planned.', x: 1, y: 1, connections: ['p1-procedure'] },
        { id: 'p1-procedure', title: 'Ureteroscopy and laser lithotripsy', description: 'Stone fragmentation and JJ stent placement.', type: 'treatment', date: '2025-10-14', outcome: 'Stone cleared; stent removed one week later.', x: 2, y: 1, connections: ['p1-prevention'] },
        { id: 'p1-prevention', title: 'Stone recurrence prevention', description: 'Calcium oxalate analysis followed by metabolic evaluation.', type: 'prevention', date: '2026-01-05', outcome: 'Fluid, sodium and dietary calcium plan established.', x: 3, y: 1, connections: ['p1-year'] },
        { id: 'p1-year', title: 'One-year renal review', description: 'No recurrent stone, haematuria or urinary infection; eGFR 107.', type: 'surveillance', date: '2026-10-05', outcome: 'Stable renal health at one year.', x: 4, y: 1, connections: [] },
    ];
    await insertDiagnostic({ id: `${prefix}diag-01`, patientId, doctorId, conditionName: 'Left ureteric calculus and recurrence prevention', conditionStatus: 'improving', nodes, clinicalNotes: 'Clinical course is consistent with an obstructing ureteric stone successfully treated with ureteroscopy and laser lithotripsy. Renal function remained preserved.', treatmentPlan: 'Hydration and dietary recurrence prevention. Annual renal review unless symptoms recur.' });

    await insertTimeline({ id: `${prefix}event-01`, userId, doctorId, date: '2025-10-05', title: 'Initial urology consultation', description: 'Left flank pain and microscopic haematuria. CT KUB and renal function tests ordered.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-02`, userId, doctorId, date: '2025-10-08', title: 'CT KUB completed', description: '9 mm left proximal ureteric calculus with mild hydroureteronephrosis.', eventType: 'test', reportId: r1 });
    await insertTimeline({ id: `${prefix}event-03`, userId, doctorId, date: '2025-10-10', title: 'Stone management prescription', description: 'Medical expulsive therapy and analgesia prescribed while planning ureteroscopy.', eventType: 'medication' });
    await insertTimeline({ id: `${prefix}event-04`, userId, doctorId, date: '2025-10-14', title: 'Ureteroscopy with laser lithotripsy', description: 'Left ureteroscopic stone fragmentation with JJ stent placement.', eventType: 'surgery' });
    await insertTimeline({ id: `${prefix}event-05`, userId, doctorId, date: '2025-10-21', title: 'JJ stent removal follow-up', description: 'Stent removed. Pain resolved and urine culture remained negative.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-06`, userId, doctorId, date: '2026-01-05', title: 'Stone analysis and metabolic prevention review', description: 'Calcium oxalate composition reviewed; hydration and dietary prevention plan documented.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-07`, userId, doctorId, date: '2026-04-05', title: 'Six-month ultrasound review', description: 'No residual stone or hydronephrosis.', eventType: 'test', reportId: r3 });
    await insertTimeline({ id: `${prefix}event-08`, userId, doctorId, date: '2026-10-05', title: 'One-year urology follow-up', description: 'No recurrence; renal function preserved with creatinine 0.91 mg/dL and eGFR 107.', eventType: 'appointment', reportId: r4 });
    await insertPrivateNote({ id: `${prefix}note-01`, patientId, doctorId, date: '2026-10-05', note: 'Patient remains asymptomatic one year after ureteroscopic stone clearance. Continue prevention plan and return if colic, fever or haematuria develops.' });
}

async function seedPatientTwo({ userId, patientId, doctorId }) {
    const prefix = '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f-p2-';
    await insertCondition({ id: `${prefix}cond-01`, patientId, doctorId, name: 'Benign prostatic enlargement with lower urinary tract symptoms', date: '2022-06-01' });
    await insertCondition({ id: `${prefix}cond-02`, patientId, doctorId, name: 'Bladder-outlet obstruction with transient obstructive renal dysfunction', date: '2025-10-08' });
    await insertCondition({ id: `${prefix}cond-03`, patientId, doctorId, name: 'Essential hypertension', date: '2018-04-12' });

    await insertVital({ id: `${prefix}vital-01`, patientId, date: '2025-10-05', bloodPressure: '148/88 mmHg', temperature: '98.5 °F', weight: '78 kg', height: '171 cm', pulseRate: '78 bpm', spO2: '98%', notes: 'No fever. Lower urinary tract symptoms with palpable residual.' });
    await insertVital({ id: `${prefix}vital-02`, patientId, date: '2025-11-07', bloodPressure: '138/82 mmHg', temperature: '98.2 °F', weight: '77.5 kg', height: '171 cm', pulseRate: '74 bpm', spO2: '98%', notes: 'Stream modestly improved on medical therapy.' });
    await insertVital({ id: `${prefix}vital-03`, patientId, date: '2026-02-05', bloodPressure: '132/80 mmHg', temperature: '98.1 °F', weight: '76.8 kg', height: '171 cm', pulseRate: '72 bpm', spO2: '98%', notes: 'Postoperative voiding trial successful.' });
    await insertVital({ id: `${prefix}vital-04`, patientId, date: '2026-10-05', bloodPressure: '128/78 mmHg', temperature: '98.3 °F', weight: '76.5 kg', height: '171 cm', pulseRate: '70 bpm', spO2: '98%', notes: 'Annual review; good stream and no retention.' });

    const r1 = `${prefix}report-01`;
    await insertReport({
        id: r1, patientId, date: '2025-10-07', fileName: 'Renal-Bladder-Prostate-Ultrasound-2025-10-07.pdf', labName: 'Niraiva Imaging Centre', patientName: 'Ravi Krishnan',
        extractedData: [group('Ultrasound Findings', [P('Prostate volume', '68', 'cc', '<30', 'high'), P('Post-void residual', '286', 'mL', '<50', 'high'), P('Bladder wall', 'Mild trabeculation', '', 'Normal', 'high'), P('Right renal pelvis', 'Mild fullness', '', 'No dilatation', 'high'), P('Left renal pelvis', 'Mild fullness', '', 'No dilatation', 'high')])],
        analysis: 'Marked prostatomegaly with high post-void residual and mild bilateral upper-tract fullness, compatible with bladder-outlet obstruction.',
    });
    const r2 = `${prefix}report-02`;
    await insertReport({
        id: r2, patientId, date: '2025-10-08', fileName: 'Renal-Function-PSA-Urinalysis-2025-10-08.pdf', labName: 'Niraiva Central Laboratory', patientName: 'Ravi Krishnan',
        extractedData: [group('Renal Function', [P('Serum Creatinine', '1.46', 'mg/dL', '0.70–1.30', 'high'), P('eGFR', '51', 'mL/min/1.73m²', '>60', 'low'), P('Urea', '44', 'mg/dL', '15–45', 'normal')]), group('Urology Panel', [P('PSA', '2.8', 'ng/mL', '<4.0', 'normal'), P('Urinalysis', 'No protein; no blood; no nitrite', '', 'Unremarkable', 'normal')])],
        analysis: 'Mild renal impairment in the context of high residual volume and bilateral upper-tract fullness. PSA is within the reported reference range and urinalysis is unremarkable.',
    });
    const r3 = `${prefix}report-03`;
    await insertReport({
        id: r3, patientId, date: '2026-02-05', fileName: 'Postoperative-Renal-Review-2026-02-05.pdf', labName: 'Niraiva Central Laboratory', patientName: 'Ravi Krishnan',
        extractedData: [group('Postoperative Review', [P('Serum Creatinine', '1.20', 'mg/dL', '0.70–1.30', 'normal'), P('eGFR', '63', 'mL/min/1.73m²', '>60', 'normal'), P('Post-void residual', '42', 'mL', '<50', 'normal'), P('Urine culture', 'No growth', '', 'No growth', 'normal')])],
        analysis: 'Renal function and bladder emptying improved after outlet procedure. No postoperative urinary infection identified.',
    });
    const r4 = `${prefix}report-04`;
    await insertReport({
        id: r4, patientId, date: '2026-10-05', fileName: 'Annual-Prostate-and-Renal-Review-2026-10-05.pdf', labName: 'Niraiva Imaging Centre', patientName: 'Ravi Krishnan',
        extractedData: [group('Annual Review', [P('Prostate bed', 'Post-HoLEP changes; no focal lesion', '', 'Clinician reviewed', 'normal'), P('Post-void residual', '28', 'mL', '<50', 'normal'), P('Bilateral hydronephrosis', 'Absent', '', 'Absent', 'normal'), P('Serum Creatinine', '1.18', 'mg/dL', '0.70–1.30', 'normal'), P('eGFR', '65', 'mL/min/1.73m²', '>60', 'normal')])],
        analysis: 'At one year, bladder emptying remains satisfactory, hydronephrosis has resolved, and renal function is stable after relief of obstruction.',
    });
    await insertParameter({ id: `${prefix}param-01`, patientId, reportId: r2, date: '2025-10-08', name: 'Serum Creatinine', value: '1.46', unit: 'mg/dL', referenceRange: '0.70–1.30', status: 'high' });
    await insertParameter({ id: `${prefix}param-02`, patientId, reportId: r2, date: '2025-10-08', name: 'eGFR', value: '51', unit: 'mL/min/1.73m²', referenceRange: '>60', status: 'low' });
    await insertParameter({ id: `${prefix}param-03`, patientId, reportId: r2, date: '2025-10-08', name: 'PSA', value: '2.8', unit: 'ng/mL', referenceRange: '<4.0', status: 'normal' });
    await insertParameter({ id: `${prefix}param-04`, patientId, reportId: r3, date: '2026-02-05', name: 'Serum Creatinine', value: '1.20', unit: 'mg/dL', referenceRange: '0.70–1.30', status: 'normal' });
    await insertParameter({ id: `${prefix}param-05`, patientId, reportId: r3, date: '2026-02-05', name: 'Post-void residual', value: '42', unit: 'mL', referenceRange: '<50', status: 'normal' });
    await insertParameter({ id: `${prefix}param-06`, patientId, reportId: r4, date: '2026-10-05', name: 'Serum Creatinine', value: '1.18', unit: 'mg/dL', referenceRange: '0.70–1.30', status: 'normal' });
    await insertParameter({ id: `${prefix}param-07`, patientId, reportId: r4, date: '2026-10-05', name: 'eGFR', value: '65', unit: 'mL/min/1.73m²', referenceRange: '>60', status: 'normal' });
    await insertParameter({ id: `${prefix}param-08`, patientId, reportId: r4, date: '2026-10-05', name: 'Post-void residual', value: '28', unit: 'mL', referenceRange: '<50', status: 'normal' });

    await insertMedication({ id: `${prefix}med-01`, patientId, name: 'Tamsulosin', dosage: '0.4 mg', purpose: 'Relief of lower urinary tract symptoms due to prostatic obstruction', startDate: '2025-10-10', frequency: 'Once nightly after food', durationDays: 90, status: 'Discontinued' });
    await insertMedication({ id: `${prefix}med-02`, patientId, name: 'Finasteride', dosage: '5 mg', purpose: 'Reduction of prostatic volume and progression risk', startDate: '2025-10-10', frequency: 'Once daily', durationDays: 90, status: 'Discontinued' });
    await insertMedication({ id: `${prefix}med-03`, patientId, name: 'Amlodipine', dosage: '5 mg', purpose: 'Blood pressure control', startDate: '2018-04-12', frequency: 'Once daily', durationDays: null, status: 'Active' });
    await insertMedication({ id: `${prefix}med-04`, patientId, name: 'Paracetamol', dosage: '650 mg', purpose: 'Short-term postoperative discomfort', startDate: '2026-01-23', frequency: 'Every 8 hours as needed', durationDays: 3, status: 'Discontinued' });

    const common = { patientName: 'Ravi Krishnan', vitals: { bloodPressure: '148/88 mmHg', pulseRate: '78 bpm', spO2: '98%', weight: '78 kg' } };
    await insertPrescription({ id: `${prefix}rx-01`, patientId, doctorId, date: '2025-10-10', data: prescriptionBase(common.patientName, '2025-10-10', 'RX-URO-002-01', 'Benign prostatic enlargement with high post-void residual and mild bilateral upper-tract fullness', 'Trial of medical therapy with close monitoring of residual volume and renal function.', 'Timed voiding and evening fluid moderation. Return urgently for inability to pass urine, fever or flank pain.', 'Review in four weeks with uroflowmetry, post-void residual and renal panel.', [{ name: 'Tamsulosin', dosage: '0.4 mg', frequency: 'Once nightly after food', purpose: 'Improve urinary flow' }, { name: 'Finasteride', dosage: '5 mg', frequency: 'Once daily', purpose: 'Reduce prostatic volume' }], common.vitals) });
    await insertPrescription({ id: `${prefix}rx-02`, patientId, doctorId, date: '2026-01-23', data: prescriptionBase(common.patientName, '2026-01-23', 'RX-URO-002-02', 'Post-HoLEP care for bladder-outlet obstruction', 'Short postoperative care after holmium laser enucleation of the prostate.', 'Maintain hydration, avoid heavy lifting, and report fever, clots or inability to void. Continue antihypertensive therapy.', 'Voiding review and renal panel on 2026-02-05.', [{ name: 'Paracetamol', dosage: '650 mg', frequency: 'Every 8 hours as needed for 3 days', purpose: 'Postoperative discomfort' }], { ...common.vitals, bloodPressure: '134/80 mmHg', weight: '77 kg' }) });
    await insertPrescription({ id: `${prefix}rx-03`, patientId, doctorId, date: '2026-10-05', data: prescriptionBase(common.patientName, '2026-10-05', 'RX-URO-002-03', 'One-year review after relief of bladder-outlet obstruction', 'Continue blood-pressure management and annual urology surveillance.', 'Continue regular walking and adequate daytime hydration. Return for recurrent weak stream, retention, haematuria or infection symptoms.', 'Annual urology review with renal function and post-void residual.', [], { ...common.vitals, bloodPressure: '128/78 mmHg', weight: '76.5 kg' }) });

    const nodes = [
        { id: 'p2-entry', title: 'Progressive lower urinary tract symptoms', description: 'Weak stream, nocturia and incomplete emptying with IPSS 24.', type: 'screening', date: '2025-10-05', outcome: 'Ultrasound, PSA, urinalysis and renal function testing ordered.', x: 0, y: 1, connections: ['p2-obstruction'] },
        { id: 'p2-obstruction', title: 'Bladder-outlet obstruction', description: '68 cc prostate, 286 mL residual and mild bilateral upper-tract fullness.', type: 'diagnostic', date: '2025-10-07', outcome: 'Medical therapy initiated; renal function monitored.', x: 1, y: 1, connections: ['p2-procedure'] },
        { id: 'p2-procedure', title: 'HoLEP procedure', description: 'Persistent residual led to holmium laser enucleation of the prostate.', type: 'treatment', date: '2026-01-22', outcome: 'Successful voiding trial and benign pathology.', x: 2, y: 1, connections: ['p2-recovery'] },
        { id: 'p2-recovery', title: 'Improved emptying and renal function', description: 'Residual 42 mL with creatinine 1.20 mg/dL at early follow-up.', type: 'surveillance', date: '2026-02-05', outcome: 'Hydronephrosis resolved on subsequent imaging.', x: 3, y: 1, connections: ['p2-year'] },
        { id: 'p2-year', title: 'One-year urology review', description: 'Residual 28 mL, no hydronephrosis and eGFR 65.', type: 'surveillance', date: '2026-10-05', outcome: 'Stable result after outlet surgery.', x: 4, y: 1, connections: [] },
    ];
    await insertDiagnostic({ id: `${prefix}diag-01`, patientId, doctorId, conditionName: 'Benign prostatic enlargement with obstructive uropathy', conditionStatus: 'stable', nodes, clinicalNotes: 'High residual and mild bilateral upper-tract fullness improved after outlet surgery. Renal function is stable at one year.', treatmentPlan: 'Continue hypertension management, annual renal function and residual-volume surveillance, and return earlier if lower urinary tract symptoms recur.' });

    await insertTimeline({ id: `${prefix}event-01`, userId, doctorId, date: '2025-10-05', title: 'Initial urology consultation', description: 'Weak stream, nocturia and incomplete emptying. IPSS 24; renal and prostate evaluation arranged.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-02`, userId, doctorId, date: '2025-10-07', title: 'Ultrasound confirms bladder-outlet obstruction', description: 'Prostate 68 cc, post-void residual 286 mL and mild bilateral upper-tract fullness.', eventType: 'test', reportId: r1 });
    await insertTimeline({ id: `${prefix}event-03`, userId, doctorId, date: '2025-10-10', title: 'Medical therapy started', description: 'Tamsulosin and finasteride prescribed with four-week residual and renal-function review.', eventType: 'medication' });
    await insertTimeline({ id: `${prefix}event-04`, userId, doctorId, date: '2025-11-07', title: 'Medical therapy review', description: 'Residual improved to 168 mL, but obstructive symptoms persisted; procedural options discussed.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-05`, userId, doctorId, date: '2026-01-22', title: 'HoLEP procedure', description: 'Holmium laser enucleation of the prostate performed for persistent bladder-outlet obstruction.', eventType: 'surgery' });
    await insertTimeline({ id: `${prefix}event-06`, userId, doctorId, date: '2026-02-05', title: 'Postoperative voiding and renal review', description: 'Voiding trial successful; residual 42 mL, creatinine 1.20 mg/dL and urine culture negative.', eventType: 'appointment', reportId: r3 });
    await insertTimeline({ id: `${prefix}event-07`, userId, doctorId, date: '2026-04-05', title: 'Six-month recovery review', description: 'Good stream, no retention and no sonographic hydronephrosis.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-08`, userId, doctorId, date: '2026-10-05', title: 'One-year urology follow-up', description: 'Post-void residual 28 mL, stable renal function and no recurrent obstructive symptoms.', eventType: 'appointment', reportId: r4 });
    await insertPrivateNote({ id: `${prefix}note-01`, patientId, doctorId, date: '2026-10-05', note: 'Excellent one-year response after HoLEP. Continue annual monitoring of renal function and post-void residual.' });
}

async function seedPatientThree({ userId, patientId, doctorId }) {
    const prefix = '9f4f1bb0-8c39-4f10-95b4-8b5a3f8f-p3-';
    await insertCondition({ id: `${prefix}cond-01`, patientId, doctorId, name: 'Essential hypertension', date: '2019-03-11' });
    await insertCondition({ id: `${prefix}cond-02`, patientId, doctorId, name: 'Recurrent urinary tract infection', date: '2024-05-10' });
    await insertCondition({ id: `${prefix}cond-03`, patientId, doctorId, name: 'Overactive bladder with urinary urgency and nocturia', date: '2025-10-05' });

    await insertVital({ id: `${prefix}vital-01`, patientId, date: '2025-10-05', bloodPressure: '146/86 mmHg', temperature: '98.6 °F', weight: '68 kg', height: '160 cm', pulseRate: '82 bpm', spO2: '98%', notes: 'Afebrile; urgency, frequency and nocturia reported without flank pain.' });
    await insertVital({ id: `${prefix}vital-02`, patientId, date: '2025-10-15', bloodPressure: '138/82 mmHg', temperature: '98.2 °F', weight: '67.8 kg', height: '160 cm', pulseRate: '76 bpm', spO2: '98%', notes: 'Dysuria resolved after antibiotic course; urgency persists.' });
    await insertVital({ id: `${prefix}vital-03`, patientId, date: '2026-04-05', bloodPressure: '132/80 mmHg', temperature: '98.1 °F', weight: '67.2 kg', height: '160 cm', pulseRate: '74 bpm', spO2: '99%', notes: 'No interval urinary infection; nocturia reduced with bladder training.' });
    await insertVital({ id: `${prefix}vital-04`, patientId, date: '2026-10-05', bloodPressure: '128/78 mmHg', temperature: '98.3 °F', weight: '66.8 kg', height: '160 cm', pulseRate: '72 bpm', spO2: '99%', notes: 'Annual review; stable blood pressure and improved urinary control.' });

    const r1 = `${prefix}report-01`;
    await insertReport({
        id: r1, patientId, date: '2025-10-08', fileName: 'Urinalysis-and-Renal-Panel-2025-10-08.pdf', labName: 'Niraiva Central Laboratory', patientName: 'Neha Iyer',
        extractedData: [group('Renal Function', [P('Serum Creatinine', '0.98', 'mg/dL', '0.60–1.10', 'normal'), P('eGFR', '72', 'mL/min/1.73m²', '>60', 'normal'), P('Urea', '31', 'mg/dL', '15–45', 'normal')]), group('Urinalysis and Culture', [P('WBCs', '12', '/hpf', '0–5', 'high'), P('Nitrite', 'Positive', '', 'Negative', 'high'), P('Urine culture', 'E. coli >100,000 CFU/mL', '', 'No significant growth', 'high')])],
        analysis: 'Culture-proven lower urinary tract infection with preserved renal function. Antibiotic sensitivity supported nitrofurantoin therapy; no evidence of upper-tract involvement.',
    });
    const r2 = `${prefix}report-02`;
    await insertReport({
        id: r2, patientId, date: '2025-10-15', fileName: 'Renal-Bladder-Ultrasound-2025-10-15.pdf', labName: 'Niraiva Imaging Centre', patientName: 'Neha Iyer',
        extractedData: [group('Ultrasound Findings', [P('Right kidney', 'Normal size and echogenicity; no calculus', '', 'Normal', 'normal'), P('Left kidney', 'Normal size and echogenicity; no calculus', '', 'Normal', 'normal'), P('Bladder wall', 'Mild trabeculation', '', 'Normal', 'high'), P('Post-void residual', '42', 'mL', '<50', 'normal')])],
        analysis: 'No renal calculus or hydronephrosis. Mild bladder wall trabeculation with a clinically acceptable residual volume supports functional bladder symptoms rather than obstruction.',
    });
    const r3 = `${prefix}report-03`;
    await insertReport({
        id: r3, patientId, date: '2026-04-05', fileName: 'Urine-Culture-and-Renal-Follow-up-2026-04-05.pdf', labName: 'Niraiva Central Laboratory', patientName: 'Neha Iyer',
        extractedData: [group('Follow-up Testing', [P('WBCs', '1–2', '/hpf', '0–5', 'normal'), P('Nitrite', 'Negative', '', 'Negative', 'normal'), P('Urine culture', 'No growth', '', 'No growth', 'normal'), P('Serum Creatinine', '0.94', 'mg/dL', '0.60–1.10', 'normal'), P('eGFR', '76', 'mL/min/1.73m²', '>60', 'normal')])],
        analysis: 'Urinary infection has cleared and renal function remains stable. Symptoms are now predominantly urgency-related without recurrent dysuria.',
    });
    const r4 = `${prefix}report-04`;
    await insertReport({
        id: r4, patientId, date: '2026-10-05', fileName: 'Annual-Urinary-Health-Review-2026-10-05.pdf', labName: 'Niraiva Imaging Centre', patientName: 'Neha Iyer',
        extractedData: [group('Annual Review', [P('Serum Creatinine', '0.92', 'mg/dL', '0.60–1.10', 'normal'), P('eGFR', '79', 'mL/min/1.73m²', '>60', 'normal'), P('Post-void residual', '24', 'mL', '<50', 'normal'), P('Urine culture', 'No growth', '', 'No growth', 'normal'), P('Renal ultrasound', 'No calculus or hydronephrosis', '', 'Normal', 'normal')])],
        analysis: 'Stable renal function and satisfactory bladder emptying at one year. No recurrent culture-positive infection or structural upper-tract abnormality is identified.',
    });

    await insertParameter({ id: `${prefix}param-01`, patientId, reportId: r1, date: '2025-10-08', name: 'Serum Creatinine', value: '0.98', unit: 'mg/dL', referenceRange: '0.60–1.10', status: 'normal' });
    await insertParameter({ id: `${prefix}param-02`, patientId, reportId: r1, date: '2025-10-08', name: 'eGFR', value: '72', unit: 'mL/min/1.73m²', referenceRange: '>60', status: 'normal' });
    await insertParameter({ id: `${prefix}param-03`, patientId, reportId: r1, date: '2025-10-08', name: 'Urine WBCs', value: '12', unit: '/hpf', referenceRange: '0–5', status: 'high' });
    await insertParameter({ id: `${prefix}param-04`, patientId, reportId: r2, date: '2025-10-15', name: 'Post-void residual', value: '42', unit: 'mL', referenceRange: '<50', status: 'normal' });
    await insertParameter({ id: `${prefix}param-05`, patientId, reportId: r3, date: '2026-04-05', name: 'Serum Creatinine', value: '0.94', unit: 'mg/dL', referenceRange: '0.60–1.10', status: 'normal' });
    await insertParameter({ id: `${prefix}param-06`, patientId, reportId: r3, date: '2026-04-05', name: 'Urine culture', value: 'No growth', unit: '', referenceRange: 'No growth', status: 'normal' });
    await insertParameter({ id: `${prefix}param-07`, patientId, reportId: r4, date: '2026-10-05', name: 'Serum Creatinine', value: '0.92', unit: 'mg/dL', referenceRange: '0.60–1.10', status: 'normal' });
    await insertParameter({ id: `${prefix}param-08`, patientId, reportId: r4, date: '2026-10-05', name: 'Post-void residual', value: '24', unit: 'mL', referenceRange: '<50', status: 'normal' });

    await insertMedication({ id: `${prefix}med-01`, patientId, name: 'Nitrofurantoin', dosage: '100 mg', purpose: 'Treatment of culture-proven lower urinary tract infection', startDate: '2025-10-10', frequency: 'Twice daily with food', durationDays: 5, status: 'Discontinued' });
    await insertMedication({ id: `${prefix}med-02`, patientId, name: 'Mirabegron', dosage: '25 mg', purpose: 'Control of urinary urgency and frequency', startDate: '2025-10-16', frequency: 'Once daily', durationDays: null, status: 'Active' });
    await insertMedication({ id: `${prefix}med-03`, patientId, name: 'Losartan', dosage: '50 mg', purpose: 'Blood pressure control', startDate: '2019-03-11', frequency: 'Once daily', durationDays: null, status: 'Active' });

    const common = { patientName: 'Neha Iyer', vitals: { bloodPressure: '146/86 mmHg', pulseRate: '82 bpm', spO2: '98%', weight: '68 kg' } };
    await insertPrescription({ id: `${prefix}rx-01`, patientId, doctorId, date: '2025-10-10', data: prescriptionBase(common.patientName, '2025-10-10', 'RX-URO-003-01', 'Culture-proven lower urinary tract infection with urinary urgency', 'Complete a five-day culture-directed antibiotic course and increase daytime fluid intake.', 'Take each dose with food. Seek urgent review for fever, flank pain, vomiting or reduced urine output.', 'Review urine symptoms and culture result after treatment completion in one week.', [{ name: 'Nitrofurantoin', dosage: '100 mg', frequency: 'Twice daily with food for 5 days', purpose: 'Treatment of urinary infection' }], common.vitals) });
    await insertPrescription({ id: `${prefix}rx-02`, patientId, doctorId, date: '2025-10-16', data: prescriptionBase(common.patientName, '2025-10-16', 'RX-URO-003-02', 'Overactive bladder symptoms after resolution of urinary infection', 'Begin bladder training and a trial of low-dose mirabegron with blood-pressure monitoring.', 'Reduce evening caffeine, use timed voiding and maintain a symptom diary. Report palpitations or sustained blood-pressure elevation.', 'Review urgency, nocturia and blood pressure in six weeks.', [{ name: 'Mirabegron', dosage: '25 mg', frequency: 'Once daily', purpose: 'Urinary urgency and frequency' }], { ...common.vitals, bloodPressure: '138/82 mmHg' }) });
    await insertPrescription({ id: `${prefix}rx-03`, patientId, doctorId, date: '2026-10-05', data: prescriptionBase(common.patientName, '2026-10-05', 'RX-URO-003-03', 'Stable overactive bladder with no recurrent urinary infection', 'Continue bladder training, hydration planning and current blood-pressure treatment.', 'Continue timed voiding and avoid bladder irritants. Return for dysuria, visible blood in urine, fever or worsening nocturia.', 'Annual urology review with urinalysis, renal function and post-void residual.', [], { ...common.vitals, bloodPressure: '128/78 mmHg', weight: '66.8 kg' }) });

    const nodes = [
        { id: 'p3-entry', title: 'Urgency and recurrent urinary infection', description: 'Frequency, nocturia and dysuria with two prior culture-proven infections.', type: 'screening', date: '2025-10-05', outcome: 'Urinalysis, culture, renal function and ultrasound arranged.', x: 0, y: 1, connections: ['p3-infection'] },
        { id: 'p3-infection', title: 'Culture-proven lower UTI', description: 'E. coli greater than 100,000 CFU/mL with preserved renal function.', type: 'diagnostic', date: '2025-10-08', outcome: 'Five-day culture-directed antibiotic course completed.', x: 1, y: 1, connections: ['p3-bladder'] },
        { id: 'p3-bladder', title: 'Overactive bladder management', description: 'No stone or hydronephrosis; residual 42 mL with persistent urgency.', type: 'treatment', date: '2025-10-16', outcome: 'Bladder training and low-dose mirabegron started.', x: 2, y: 1, connections: ['p3-followup'] },
        { id: 'p3-followup', title: 'Infection-free follow-up', description: 'No growth on culture, stable renal function and improved nocturia.', type: 'surveillance', date: '2026-04-05', outcome: 'Continue conservative bladder-care plan.', x: 3, y: 1, connections: ['p3-year'] },
        { id: 'p3-year', title: 'One-year urology review', description: 'No recurrent infection, eGFR 79 and residual 24 mL.', type: 'surveillance', date: '2026-10-05', outcome: 'Stable moderate-risk urinary care pathway.', x: 4, y: 1, connections: [] },
    ];
    await insertDiagnostic({ id: `${prefix}diag-01`, patientId, doctorId, conditionName: 'Recurrent urinary tract infection and overactive bladder', conditionStatus: 'stable', nodes, clinicalNotes: 'The infection resolved with culture-directed treatment. Ongoing urgency is consistent with overactive bladder; imaging shows no stone, hydronephrosis or clinically significant retention.', treatmentPlan: 'Continue mirabegron and bladder training with blood-pressure monitoring. Maintain annual renal-function, urinalysis and residual-volume surveillance.' });

    await insertTimeline({ id: `${prefix}event-01`, userId, doctorId, date: '2025-10-05', title: 'Initial urology consultation', description: 'Urgency, frequency, nocturia and recent recurrent urinary infection. Renal and bladder evaluation arranged.', eventType: 'appointment' });
    await insertTimeline({ id: `${prefix}event-02`, userId, doctorId, date: '2025-10-08', title: 'Urine culture confirms lower UTI', description: 'E. coli greater than 100,000 CFU/mL; renal function preserved and no upper-tract symptoms.', eventType: 'test', reportId: r1 });
    await insertTimeline({ id: `${prefix}event-03`, userId, doctorId, date: '2025-10-10', title: 'Culture-directed antibiotic prescribed', description: 'Nitrofurantoin started for five days with infection precautions explained.', eventType: 'medication' });
    await insertTimeline({ id: `${prefix}event-04`, userId, doctorId, date: '2025-10-15', title: 'Renal and bladder ultrasound reviewed', description: 'No renal calculus or hydronephrosis; post-void residual 42 mL and mild bladder wall trabeculation.', eventType: 'test', reportId: r2 });
    await insertTimeline({ id: `${prefix}event-05`, userId, doctorId, date: '2025-10-16', title: 'Overactive bladder treatment started', description: 'Urine infection symptoms resolved; bladder training and mirabegron 25 mg once daily initiated.', eventType: 'medication' });
    await insertTimeline({ id: `${prefix}event-06`, userId, doctorId, date: '2026-04-05', title: 'Six-month infection-free review', description: 'Urine culture shows no growth, renal function is stable and nocturia has improved.', eventType: 'appointment', reportId: r3 });
    await insertTimeline({ id: `${prefix}event-07`, userId, doctorId, date: '2026-10-05', title: 'One-year urology follow-up', description: 'No recurrent infection; creatinine 0.92 mg/dL, eGFR 79 and post-void residual 24 mL.', eventType: 'appointment', reportId: r4 });
    await insertPrivateNote({ id: `${prefix}note-01`, patientId, doctorId, date: '2026-10-05', note: 'Stable one-year course with no recurrent culture-positive infection. Urgency and nocturia improved on bladder training and mirabegron; continue annual surveillance.' });
}

async function main() {
    await ensureRequiredTables();
    const doctorUserId = await ensureUser({ id: ids.doctorUser, ...doctor, role: 'doctor' });
    const doctorId = await ensureDoctor(doctorUserId);

    const resolvedPatients = {};
    for (const patient of patients) {
        const userId = await ensureUser({ id: patient.userId, name: patient.name, email: patient.email, password: patient.password, customId: patient.customId, role: 'patient' });
        const patientId = await ensurePatient(patient, userId);
        resolvedPatients[patient.key] = { userId, patientId };
        await insertSharedProfileData({ patient, patientId, doctorId });
    }

    // Repair any legacy auto-linked roster rows for this doctor. The doctor
    // should retain only the three explicitly seeded urology patients.
    const keepPatientIds = patients.map((patient) => resolvedPatients[patient.key].patientId);
    const placeholders = keepPatientIds.map(() => '?').join(', ');
    await exec(
        `DELETE FROM doctor_patient_relations
         WHERE doctor_id = ? AND patient_id NOT IN (${placeholders})`,
        [doctorId, ...keepPatientIds],
    );

    await seedPatientOne({ ...resolvedPatients.patient1, doctorId });
    await seedPatientTwo({ ...resolvedPatients.patient2, doctorId });
    await seedPatientThree({ ...resolvedPatients.patient3, doctorId });

    const counts = {};
    for (const table of ['users', 'doctors', 'patients', 'doctor_patient_relations', 'lab_reports', 'health_parameters', 'medications', 'prescriptions', 'patient_diagnostics', 'timeline_events', 'patient_vitals']) {
        const result = await exec(`SELECT COUNT(*) AS count FROM ${table}`);
        counts[table] = Number(result.rows[0].count);
    }
    console.log(JSON.stringify({
        success: true,
        accounts: [doctor.email, ...patients.map((patient) => patient.email)],
        doctorId,
        patientIds: patients.map((patient) => resolvedPatients[patient.key].patientId),
        counts,
    }, null, 2));
}

main().catch((error) => {
    console.error('Urology dataset seed failed:', error);
    process.exitCode = 1;
});
