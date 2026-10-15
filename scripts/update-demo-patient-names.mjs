// Keep the demo patient identity changes in the data layer so every screen,
// report, timeline entry, and generated document uses the same display name.

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ quiet: true });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const DEMO_PATIENTS = [
    {
        userId: 'demo-oncotrack-hakkim-user',
        patientId: 'demo-oncotrack-hakkim-patient',
        displayName: 'Mr. Arvind Kumar',
        email: 'arvind.kumar@niraiva.health',
        replacements: [
            ['Mr. HAKKIM', 'Mr. Arvind Kumar'],
            ['HAKKIM', 'Arvind Kumar'],
            ['Hakkim', 'Arvind Kumar'],
        ],
    },
    {
        userId: 'demo-oncotrack-ameena-user',
        patientId: 'demo-oncotrack-ameena-patient',
        displayName: 'Mrs. Kavitha Sivakumar',
        email: 'kavitha.sivakumar@niraiva.health',
        replacements: [
            ['Mrs. Ameena Begam .S', 'Mrs. Kavitha Sivakumar'],
            ['Ameena Begam', 'Kavitha Sivakumar'],
        ],
    },
];

const CONTENT_COLUMNS = {
    patients: ['medical_history', 'address', 'city', 'emergency_contact_name', 'guardian_name', 'allergies', 'current_medications', 'past_surgeries', 'chronic_conditions', 'lifestyle'],
    lab_reports: ['file_name', 'patient_name', 'raw_text', 'analysis', 'extracted_data'],
    health_parameters: ['parameter_name', 'value', 'unit', 'reference_range', 'status'],
    timeline_events: ['title', 'description'],
    patient_diagnostics: ['condition_name', 'nodes', 'clinical_notes', 'treatment_plan'],
    patient_vitals: ['recorded_by', 'notes'],
    prescriptions: ['consultation_data'],
    doctor_private_notes: ['note_content'],
    patient_conditions: ['condition_name', 'added_by'],
    patient_allergies: ['allergen', 'reaction', 'added_by'],
    medications: ['name', 'purpose', 'added_by'],
    lab_orders: ['doctor_name', 'name', 'notes', 'paid_by'],
    pre_checkins: ['answers'],
    post_checkins: ['answers'],
    diabetes_records: ['insulin_dosage', 'glycemic_variability', 'retinopathy_status', 'nephropathy_status', 'neuropathy_status', 'notes'],
};

async function exec(sql, args = []) {
    return client.execute({ sql, args });
}

async function replacePatientContent(patient, table, keyColumn, keyValue) {
    for (const column of CONTENT_COLUMNS[table] || []) {
        for (const [oldValue, newValue] of patient.replacements) {
            await exec(
                `UPDATE ${table}
                 SET ${column} = REPLACE(${column}, ?, ?)
                 WHERE ${keyColumn} = ? AND ${column} IS NOT NULL`,
                [oldValue, newValue, keyValue]
            );
        }
    }
}

async function run() {
    for (const patient of DEMO_PATIENTS) {
        await exec(
            'UPDATE users SET name = ?, email = ? WHERE id = ?',
            [patient.displayName, patient.email, patient.userId]
        );

        await replacePatientContent(patient, 'patients', 'id', patient.patientId);
        await replacePatientContent(patient, 'lab_reports', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'health_parameters', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'timeline_events', 'user_id', patient.userId);
        await replacePatientContent(patient, 'patient_diagnostics', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'patient_vitals', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'prescriptions', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'doctor_private_notes', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'patient_conditions', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'patient_allergies', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'medications', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'lab_orders', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'pre_checkins', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'post_checkins', 'patient_id', patient.patientId);
        await replacePatientContent(patient, 'diabetes_records', 'patient_id', patient.patientId);
    }

    for (const patient of DEMO_PATIENTS) {
        const user = await exec('SELECT name, email FROM users WHERE id = ?', [patient.userId]);
        const reports = await exec(
            'SELECT file_name, patient_name FROM lab_reports WHERE patient_id = ? ORDER BY file_name',
            [patient.patientId]
        );
        console.log(`✔ ${patient.displayName} — ${user.rows[0]?.email || 'user not found'}`);
        console.log(`  Reports: ${reports.rows.map(row => row.file_name).join(' | ') || 'none'}`);
        if (user.rows[0]?.name !== patient.displayName || user.rows[0]?.email !== patient.email) {
            throw new Error(`Verification failed for ${patient.patientId}`);
        }
        if (reports.rows.some(row => row.patient_name !== patient.displayName)) {
            throw new Error(`Report verification failed for ${patient.patientId}`);
        }
    }

    console.log('\nDemo patient names and report metadata updated successfully.');
}

run()
    .catch(error => {
        console.error('Demo patient update failed:', error);
        process.exitCode = 1;
    })
    .finally(() => client.close());
