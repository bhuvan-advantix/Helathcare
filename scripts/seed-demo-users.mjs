// Demo User Seeder — run with: node scripts/seed-demo-users.mjs
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { config } from "dotenv";

config(); // Load .env

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const PASSWORD = "NiraivaDemo@2026";

const demoUsers = [
  {
    email: "ananya.rao@niraiva.health",
    name: "Dr. Ananya Rao",
    role: "doctor",
    customId: "NRV-DOC-001",
    isOnboarded: 1,
  },
  {
    email: "maya.srinivasan@niraiva.health",
    name: "Maya Srinivasan",
    role: "patient",
    customId: "NRV-ONC-001",
    isOnboarded: 1,
  },
  {
    email: "raman.iyer@niraiva.health",
    name: "Raman Iyer",
    role: "patient",
    customId: "NRV-ONC-002",
    isOnboarded: 1,
  },
  {
    email: "farah.khan@niraiva.health",
    name: "Farah Khan",
    role: "patient",
    customId: "NRV-ONC-003",
    isOnboarded: 1,
  },
  {
    email: "daniel.mathew@niraiva.health",
    name: "Daniel Mathew",
    role: "patient",
    customId: "NRV-ONC-004",
    isOnboarded: 1,
  },
];

async function seed() {
  console.log("🌱 Seeding demo users...\n");
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const user of demoUsers) {
    // Check if user already exists
    const existing = await client.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [user.email],
    });

    if (existing.rows.length > 0) {
      // Update password if user exists
      await client.execute({
        sql: "UPDATE users SET password = ? WHERE email = ?",
        args: [hashedPassword, user.email],
      });
      console.log(`✅ Updated password for: ${user.email}`);
    } else {
      const id = randomUUID();
      await client.execute({
        sql: `INSERT INTO users (id, name, email, password, role, is_onboarded, custom_id, is_banned)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        args: [id, user.name, user.email, hashedPassword, user.role, user.isOnboarded, user.customId],
      });
      console.log(`✅ Created user: ${user.email} (${user.role})`);
    }
  }

  // Ensure doctor record exists for Dr. Ananya
  const doctorUser = await client.execute({
    sql: "SELECT id FROM users WHERE email = 'ananya.rao@niraiva.health'",
    args: [],
  });

  if (doctorUser.rows.length > 0) {
    const userId = doctorUser.rows[0].id;
    const existingDoctor = await client.execute({
      sql: "SELECT id FROM doctors WHERE user_id = ?",
      args: [userId],
    });

    if (existingDoctor.rows.length === 0) {
      const doctorId = randomUUID();
      await client.execute({
        sql: `INSERT INTO doctors (id, user_id, specialization, license_number, approval_status)
              VALUES (?, ?, ?, ?, ?)`,
        args: [doctorId, userId, "Oncology", "LIC-NIRAIVA-001", "approved"],
      });
      console.log(`✅ Created doctor profile for Dr. Ananya Rao`);
    } else {
      console.log(`✅ Doctor profile already exists for Dr. Ananya Rao`);
    }
  }

  // Ensure patient records exist
  const patientEmails = [
    "maya.srinivasan@niraiva.health",
    "raman.iyer@niraiva.health",
    "farah.khan@niraiva.health",
    "daniel.mathew@niraiva.health",
  ];

  for (const email of patientEmails) {
    const patientUser = await client.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (patientUser.rows.length > 0) {
      const userId = patientUser.rows[0].id;
      const existingPatient = await client.execute({
        sql: "SELECT id FROM patients WHERE user_id = ?",
        args: [userId],
      });

      if (existingPatient.rows.length === 0) {
        const patientId = randomUUID();
        await client.execute({
          sql: `INSERT INTO patients (id, user_id) VALUES (?, ?)`,
          args: [patientId, userId],
        });
        console.log(`✅ Created patient profile for: ${email}`);
      } else {
        console.log(`✅ Patient profile already exists for: ${email}`);
      }
    }
  }

  console.log("\n🎉 Seeding complete!");
  console.log("\nDemo credentials:");
  console.log("  Doctor: ananya.rao@niraiva.health / NiraivaDemo@2026");
  console.log("  Patients: maya.srinivasan@niraiva.health / NiraivaDemo@2026");
  console.log("           raman.iyer@niraiva.health / NiraivaDemo@2026");
  console.log("           farah.khan@niraiva.health / NiraivaDemo@2026");
  console.log("           daniel.mathew@niraiva.health / NiraivaDemo@2026");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
