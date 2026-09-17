// rename-ameena-patient.mjs
// Renames the display name of patient ameena.begam@niraiva.health
// from 'Mrs. Ameena Begam .S' → 'Mrs. Kavitha Sivakumar' in all relevant DB columns.
// Email, password, IDs, all lab values remain unchanged.
//
// Usage: node scripts/rename-ameena-patient.mjs

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ quiet: true });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const OLD_NAME   = 'Mrs. Ameena Begam .S';
const NEW_NAME   = 'Mrs. Kavitha Sivakumar';
const PATIENT_ID = 'demo-oncotrack-ameena-patient';
const USER_ID    = 'demo-oncotrack-ameena-user';

async function exec(sql, args = []) {
    return client.execute({ sql, args });
}

async function run() {
    // 1. users table
    await exec(`UPDATE users SET name = ? WHERE id = ?`, [NEW_NAME, USER_ID]);
    console.log(`✔ users.name updated → ${NEW_NAME}`);

    // 2. lab_reports.patient_name (all 3 reports for this patient)
    const lr = await exec(
        `UPDATE lab_reports SET patient_name = ? WHERE patient_id = ? AND patient_name = ?`,
        [NEW_NAME, PATIENT_ID, OLD_NAME]
    );
    console.log(`✔ lab_reports.patient_name updated → ${lr.rowsAffected} row(s)`);

    // 3. patient_diagnostics — replace name in clinical_notes and treatment_plan
    await exec(
        `UPDATE patient_diagnostics
         SET clinical_notes = REPLACE(clinical_notes, ?, ?),
             treatment_plan = REPLACE(treatment_plan, ?, ?)
         WHERE patient_id = ?`,
        [OLD_NAME, NEW_NAME, OLD_NAME, NEW_NAME, PATIENT_ID]
    );
    console.log(`✔ patient_diagnostics clinical_notes + treatment_plan updated`);

    // 4. patient_vitals notes (in case name appears)
    await exec(
        `UPDATE patient_vitals SET notes = REPLACE(notes, ?, ?) WHERE patient_id = ?`,
        [OLD_NAME, NEW_NAME, PATIENT_ID]
    );
    console.log(`✔ patient_vitals.notes updated`);

    // 5. prescriptions consultation_data (in case any exist)
    await exec(
        `UPDATE prescriptions
         SET consultation_data = REPLACE(consultation_data, ?, ?)
         WHERE patient_id = ?`,
        [OLD_NAME, NEW_NAME, PATIENT_ID]
    );
    console.log(`✔ prescriptions.consultation_data updated`);

    // 6. doctor_private_notes
    await exec(
        `UPDATE doctor_private_notes
         SET note_content = REPLACE(note_content, ?, ?)
         WHERE patient_id = ?`,
        [OLD_NAME, NEW_NAME, PATIENT_ID]
    );
    console.log(`✔ doctor_private_notes updated`);

    // Verify
    const verify = await exec(`SELECT name FROM users WHERE id = ?`, [USER_ID]);
    const verifyLr = await exec(`SELECT patient_name FROM lab_reports WHERE patient_id = ? LIMIT 1`, [PATIENT_ID]);
    console.log(`\n✅ Verified name in DB:`);
    console.log(`   users.name        : ${verify.rows[0]?.name}`);
    console.log(`   lab_reports first : ${verifyLr.rows[0]?.patient_name}`);

    console.log(`\n🎉 Rename complete.`);
    console.log(`   Old name : ${OLD_NAME}`);
    console.log(`   New name : ${NEW_NAME}`);
    console.log(`   Email    : ameena.begam@niraiva.health  (unchanged)`);
    console.log(`   Password : NiraivaDemo@2026             (unchanged)`);
    console.log(`   All lab values, IDs, clinical data: unchanged`);
}

run()
    .catch(err => { console.error('Rename failed:', err); process.exitCode = 1; })
    .finally(() => client.close());
