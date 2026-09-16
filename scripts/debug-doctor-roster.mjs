// Diagnostic for the doctor dashboard patient roster (Action Queue / search).
//
// Replicates exactly what getDoctorDashboardStats() does so we can see
// whether the doctor account is linked to any patient rows.
//
// Usage:
//   node scripts/debug-doctor-roster.mjs                # doctor = ananya.rao@niraiva.health
//   node scripts/debug-doctor-roster.mjs <email>        # diagnose a different doctor

import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config({ quiet: true });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const EMAIL = process.argv[2] ?? 'ananya.rao@niraiva.health';

async function run() {
  console.log('─'.repeat(64));
  console.log(`Doctor email: ${EMAIL}`);
  console.log('─'.repeat(64));

  const users = await client.execute({
    sql: `SELECT id, name, email, role, custom_id FROM users WHERE email = ?`,
    args: [EMAIL],
  });

  if (users.rows.length === 0) {
    console.log('❌ No user row for this email.');
    return;
  }
  for (const u of users.rows) {
    console.log(`\nUser:  id=${u.id} | role=${u.role} | custom_id=${u.custom_id ?? '(none)'}`);
  }

  const doctors = await client.execute({
    sql: `SELECT id, user_id, specialization, approval_status FROM doctors WHERE user_id IN (?)`,
    args: [users.rows.map(r => r.id)],
  });

  if (doctors.rows.length === 0) {
    console.log('⚠️  No doctors row found for this user -> dashboard returns null (roster empty).');
  }
  for (const d of doctors.rows) {
    console.log(`Doctor row: id=${d.id} | user_id=${d.user_id} | spec=${d.specialization} | approval=${d.approval_status}`);

    const relations = await client.execute({
      sql: `SELECT patient_id FROM doctor_patient_relations WHERE doctor_id = ?`,
      args: [d.id],
    });
    console.log(`  Linked patients (doctor_patient_relations): ${relations.rows.length}`);

    if (relations.rows.length > 0) {
      const ids = relations.rows.map(r => r.patient_id);
      const roster = await client.execute({
        sql: `SELECT p.id, u.name, u.custom_id, p.chronic_conditions, p.dob
              FROM patients p
              INNER JOIN users u ON u.id = p.user_id
              WHERE p.id IN (${ids.map(() => '?').join(',')})`,
        args: ids,
      });
      for (const r of roster.rows) {
        console.log(`    - ${r.name ?? '(no name)'} | ${r.custom_id ?? '(no custom_id)'} | chronic: ${(r.chronic_conditions ?? '').slice(0, 50) || '(empty)'}`);
      }
    }
  }

  const allPatients = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM patients`,
  });
  console.log(`\nTotal patients rows in DB: ${allPatients.rows[0]?.n ?? 0}`);

  const withName = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM patients p INNER JOIN users u ON u.id = p.user_id WHERE u.name IS NOT NULL`,
  });
  console.log(`Patients with a non-null linked user name: ${withName.rows[0]?.n ?? 0}`);

  const maya = await client.execute({
    sql: `SELECT u.id, u.name, p.id AS patient_id FROM users u INNER JOIN patients p ON p.user_id = u.id WHERE lower(u.name) LIKE '%maya%'`,
  });
  console.log(`\nSearch "maya" in users.name:`);
  if (maya.rows.length === 0) console.log('  ❌ No user named "Maya" found at all.');
  for (const r of maya.rows) console.log(`  ✔ id=${r.id} | name=${r.name} | patient_id=${r.patient_id}`);
}

run()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.close());