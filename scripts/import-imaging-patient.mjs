#!/usr/bin/env node

/**
 * Create an anonymised patient account and import an imaging observation.
 *
 * This script intentionally accepts the observation values as input instead of
 * embedding a particular patient's data in the application UI. It is useful
 * for an unknown/unidentified patient workflow and can optionally retain the
 * original image as a data URL when a local image path is supplied.
 */
import 'dotenv/config';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomInt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const rawUrl = process.env.TURSO_DATABASE_URL || '';
const dbUrl = rawUrl.startsWith('libsql://') ? rawUrl.replace(/^libsql:\/\//, 'https://') : rawUrl;
if (!dbUrl || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.');
}

const client = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN });

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    args[key] = next && !next.startsWith('--') ? next : true;
    if (args[key] !== true) i += 1;
  }
  return args;
}

function pick(items) {
  return items[randomInt(items.length)];
}

function generateAlias() {
  const given = ['Aarav', 'Ishita', 'Kiran', 'Meera', 'Nila', 'Rohan', 'Tara', 'Vihaan'];
  const family = ['Sharma', 'Iyer', 'Khan', 'Menon', 'Rao', 'Das', 'Kapoor', 'Nair'];
  return `${pick(given)} ${pick(family)}-${randomInt(100, 1000)}`;
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const chars = Array.from({ length: 14 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `Niraiva@${chars}`;
}

function required(args, name) {
  const value = args[name] === true || args[name] == null ? '' : String(args[name]).trim();
  if (!value) throw new Error(`Missing required value: --${name}`);
  return value;
}

function toBase64DataUrl(buffer, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

const args = parseArgs(process.argv.slice(2));
const now = new Date();
const reportDate = args['report-date'] && args['report-date'] !== true ? String(args['report-date']).trim() : null;
const patientName = String(args.name || generateAlias());
const gestationalSac = required(args, 'sac');
const gestationalAge = required(args, 'ga');
const edd = required(args, 'edd');
const sourceFile = args.image && args.image !== true ? path.resolve(String(args.image)) : null;
const sourceImage = sourceFile ? toBase64DataUrl(await readFile(sourceFile), sourceFile) : null;

const users = await client.execute({
  sql: "SELECT custom_id FROM users WHERE custom_id LIKE '#Nrivaa%'",
  args: [],
});
let maxNumber = 0;
for (const row of users.rows) {
  const match = String(row.custom_id || '').match(/^#Nrivaa(\d+)$/);
  if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
}

const customId = `#Nrivaa${String(maxNumber + 1).padStart(3, '0')}`;
const systemEmail = `${customId.slice(1).toLowerCase()}@niraiva.health`;
const plainPassword = generatePassword();
const hashedPassword = await bcrypt.hash(plainPassword, 12);
const userId = randomUUID();
const patientId = randomUUID();
const reportId = randomUUID();
const diagnosticId = randomUUID();
const eventId = randomUUID();
// Drizzle's SQLite timestamp mode stores Unix seconds (not JavaScript milliseconds).
const timestampSeconds = Math.floor(Date.now() / 1000);

const doctorResult = await client.execute({
  sql: 'SELECT id FROM doctors ORDER BY created_at ASC LIMIT 1',
  args: [],
});
const doctorId = doctorResult.rows[0]?.id ? String(doctorResult.rows[0].id) : null;

const extractedData = {
  results: [
    {
      category: 'Obstetric ultrasound observations',
      tests: [
        { name: 'Gestational sac (GS)', value: gestationalSac, unit: 'cm', sourceLabel: 'GS' },
        { name: 'Gestational age displayed by console', value: gestationalAge, unit: '', sourceLabel: 'GA' },
        { name: 'Estimated date of delivery displayed by console', value: edd, unit: '', sourceLabel: 'EDD' },
      ],
    },
  ],
  metadata: {
    modality: 'Obstetric ultrasound',
    source: 'Photographed ultrasound screen supplied for intake',
    documentType: 'imaging-observation',
    recordStatus: 'transcribed',
    reportTitle: 'Obstetric Ultrasound Observation Record',
    examDate: reportDate,
    recordedAt: now.toISOString(),
    imageRetained: Boolean(sourceImage),
    visibleMeasurements: {
      gestationalSacCm: gestationalSac,
      gestationalAge,
      estimatedDateOfDelivery: edd,
    },
    limitations: [
      'Single photographed monitor frame; the complete diagnostic study and any facility-issued report were not supplied.',
      'The visible measurements and console calculations are transcribed as displayed and have not been independently recalculated.',
      'The frame does not establish pregnancy location, viability, or other findings not explicitly displayed.',
    ],
  },
};

const nodes = [
  {
    id: 'source-observation',
    reportId,
    title: 'Early pregnancy ultrasound image',
    description: 'Values transcribed from the supplied ultrasound console image.',
    type: 'test',
    date: now.toISOString(),
    connections: [],
    parameters: [
      { name: 'GS', value: gestationalSac, unit: 'cm' },
      { name: 'GA', value: gestationalAge, unit: '' },
      { name: 'EDD', value: edd, unit: '' },
    ],
    x: 0,
    y: 0,
  },
];

await client.batch([
  {
    sql: `INSERT INTO users (id, name, email, password, role, is_onboarded, custom_id, is_banned)
          VALUES (?, ?, ?, ?, 'patient', 1, ?, 0)`,
    args: [userId, patientName, systemEmail, hashedPassword, customId],
  },
  {
    sql: `INSERT INTO patients (id, user_id, age, gender, blood_group, chronic_conditions, medical_history, created_at)
          VALUES (?, ?, NULL, 'Unknown', 'Unknown', ?, ?, ?)`,
    args: [
      patientId,
      userId,
      'Not established from imaging intake',
      'Anonymous imaging intake; demographic details were not supplied.',
      timestampSeconds,
    ],
  },
  {
    sql: `INSERT INTO lab_reports
          (id, patient_id, file_name, report_date, lab_name, patient_name, doctor_name, extracted_data, raw_text, file_size, page_count, file_data, uploaded_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?)`,
    args: [
      reportId,
      patientId,
      sourceFile ? path.basename(sourceFile) : 'Obstetric Ultrasound Observation Record',
      reportDate,
      null,
      patientName,
      JSON.stringify(extractedData),
      'Photographed ultrasound console image; visible values transcribed into a structured observation record.',
      sourceImage ? Buffer.byteLength(sourceImage, 'utf8') : 0,
      sourceImage,
      timestampSeconds,
    ],
  },
  {
    sql: `INSERT INTO timeline_events
          (id, user_id, title, description, event_date, event_type, status, report_id, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, 'test', 'completed', ?, 'system', ?)`,
    args: [
      eventId,
      userId,
      'Obstetric ultrasound image received',
      `Console values transcribed: GS ${gestationalSac} cm; GA ${gestationalAge}; EDD ${edd}.`,
      now.toISOString().slice(0, 10),
      reportId,
      timestampSeconds,
    ],
  },
  {
    sql: `INSERT INTO patient_diagnostics
          (id, patient_id, doctor_id, condition_name, condition_status, nodes, clinical_notes, treatment_plan, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'source_transcribed', ?, ?, ?, ?, ?)`,
    args: [
      diagnosticId,
      patientId,
      doctorId,
      'Obstetric ultrasound image observations',
      JSON.stringify(nodes),
      'This pathway contains console values transcribed from a photographed ultrasound screen. It does not represent an independently interpreted examination.',
      'No diagnosis or treatment recommendation is generated from this single image. The displayed EDD is recorded verbatim and has not been independently assigned.',
      timestampSeconds,
      timestampSeconds,
    ],
  },
], 'write');

if (doctorId) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO doctor_patient_relations (id, doctor_id, patient_id, added_at) VALUES (?, ?, ?, ?)`,
    args: [randomUUID(), doctorId, patientId, timestampSeconds],
  });
}

console.log(JSON.stringify({
  success: true,
  patientName,
  userId,
  healthId: customId,
  loginEmail: systemEmail,
  password: plainPassword,
  patientId,
  reportId,
  diagnosticId,
  imageStored: Boolean(sourceImage),
  reportDate,
}, null, 2));

