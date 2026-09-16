// Diagnostic + fix for the "incorrect password" issue on seeded doctor accounts.
//
// Usage:
//   node scripts/debug-doctor-login.mjs                          # diagnose only
//   node scripts/debug-doctor-login.mjs [email]                  # diagnose a specific email
//   node scripts/debug-doctor-login.mjs [email] --fix            # dedupe + reset password (defaults to NiraivaDemo@2026)
//   node scripts/debug-doctor-login.mjs [email] --fix --password <yourPassword>
//
// Connects to the same Turso DB as the app, using .env values (dotenv loads it).

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config({ quiet: true });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const args = process.argv.slice(2);
const FIX = args.includes('--fix') || args.includes('-f');
const positionals = args.filter(a => !a.startsWith('--'));
const EMAIL = positionals[0] ?? 'ananya.rao@niraiva.health';
const passwordFlagIndex = args.indexOf('--password');
const PASSWORD = (passwordFlagIndex !== -1 && args[passwordFlagIndex + 1])
  ? args[passwordFlagIndex + 1]
  : (process.env.ONCOTRACK_DEMO_PASSWORD || 'NiraivaDemo@2026');

async function run() {
  console.log('─'.repeat(64));
  console.log(`Diagnosing email: ${EMAIL}`);
  console.log(`Candidate password: ${PASSWORD}`);
  console.log('─'.repeat(64));

  const result = await client.execute({
    sql: `SELECT id, name, email, role, custom_id, is_onboarded, is_banned,
                 length(password) AS pwd_len, substr(password, 1, 7) AS pwd_prefix
          FROM users WHERE email = ?`,
    args: [EMAIL],
  });

  if (result.rows.length === 0) {
    console.log('❌ No user found with that email.');
    return;
  }

  console.log(`\nFound ${result.rows.length} user row(s) for this email (duplicates = earlier seeds):\n`);
  for (const row of result.rows) {
    const hash = row.password ?? '';
    const matches = bcrypt.compareSync(PASSWORD, hash);
    console.log(`  id          : ${row.id}`);
    console.log(`  name        : ${row.name ?? '(none)'}`);
    console.log(`  role        : ${row.role}`);
    console.log(`  custom_id   : ${row.custom_id ?? '(none)'}`);
    console.log(`  is_onboarded: ${row.is_onboarded}`);
    console.log(`  is_banned   : ${row.is_banned}`);
    console.log(`  password len: ${row.pwd_len ?? 0} (valid bcrypt = 60 chars, "$2b$...")`);
    console.log(`  password hdr: ${row.pwd_prefix ?? '(empty)'}`);
    console.log(`  bcrypt check: ${matches ? '✅ MATCHES' : '❌ does NOT match'} '${PASSWORD}'\n`);
  }

  if (FIX) {
    console.log('─'.repeat(64));
    console.log('Running --fix');
    console.log('─'.repeat(64));

    if (result.rows.length > 1) {
      console.log('\nRemoving duplicate rows (keeping this one):');
      for (const row of result.rows) {
        console.log(`  - delete id: ${row.id} (${row.custom_id ?? 'no custom_id'})`);
      }
      const keep = result.rows[0];
      for (const row of result.rows.slice(1)) {
        await client.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [row.id] }).catch(() => null);
        console.log(`  ✔ deleted ${row.id}`);
      }
      console.log(`  ✔ kept      ${keep.id}`);
    }

    const hash = await bcrypt.hash(PASSWORD, 10);
    await client.execute({
      sql: `UPDATE users SET password = ?, role = 'doctor', is_onboarded = 1, is_banned = 0 WHERE email = ?`,
      args: [hash, EMAIL],
    });
    console.log(`\n✔ Password reset to hash of "${PASSWORD}" for ${EMAIL}`);
    console.log('✔ role=doctor, is_onboarded=1, is_banned=0');
    console.log('\nTry logging in again now.');
  }
}

run()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.close());