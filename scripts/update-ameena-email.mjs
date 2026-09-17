// update-ameena-email.mjs
// Changes the login email for Mrs. Kavitha Sivakumar (formerly Ameena Begam)
// from ameena.begam@niraiva.health → kavitha.sivakumar@niraiva.health
// Only the users.email column is updated. Password unchanged.
//
// Usage: node scripts/update-ameena-email.mjs

import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ quiet: true });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const USER_ID   = 'demo-oncotrack-ameena-user';
const OLD_EMAIL = 'ameena.begam@niraiva.health';
const NEW_EMAIL = 'kavitha.sivakumar@niraiva.health';

async function exec(sql, args = []) {
    return client.execute({ sql, args });
}

async function run() {
    // Confirm current state
    const before = await exec(`SELECT id, name, email FROM users WHERE id = ?`, [USER_ID]);
    if (!before.rows.length) {
        console.error(`❌ User ${USER_ID} not found in DB.`);
        process.exit(1);
    }
    console.log(`Before: name="${before.rows[0].name}" | email="${before.rows[0].email}"`);

    // Update email in users table
    await exec(`UPDATE users SET email = ? WHERE id = ?`, [NEW_EMAIL, USER_ID]);

    // Verify
    const after = await exec(`SELECT id, name, email FROM users WHERE id = ?`, [USER_ID]);
    console.log(`After : name="${after.rows[0].name}" | email="${after.rows[0].email}"`);

    console.log(`\n🎉 Email updated successfully.`);
    console.log(`   Name     : ${after.rows[0].name}`);
    console.log(`   Old email: ${OLD_EMAIL}`);
    console.log(`   New email: ${NEW_EMAIL}`);
    console.log(`   Password : NiraivaDemo@2026 (unchanged)`);
    console.log(`   Custom ID: NRV-ONC-005 (unchanged)`);
}

run()
    .catch(err => { console.error('Update failed:', err); process.exitCode = 1; })
    .finally(() => client.close());
