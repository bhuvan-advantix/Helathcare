import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

let labReportsSchemaEnsured = false;

export async function ensureLabReportsSchema() {
    if (labReportsSchemaEnsured) return;

    const tableInfo = await client.execute("PRAGMA table_info('lab_reports')");
    const existingColumns = new Set(
        tableInfo.rows.map((row) => String((row as Record<string, unknown>).name))
    );

    // Keep runtime DB aligned with current Drizzle schema for lab_reports.
    const expectedColumns: Array<{ name: string; type: string }> = [
        { name: "id", type: "TEXT" },
        { name: "patient_id", type: "TEXT" },
        { name: "file_name", type: "TEXT" },
        { name: "report_date", type: "TEXT" },
        { name: "lab_name", type: "TEXT" },
        { name: "patient_name", type: "TEXT" },
        { name: "doctor_name", type: "TEXT" },
        { name: "extracted_data", type: "TEXT" },
        { name: "raw_text", type: "TEXT" },
        { name: "file_size", type: "INTEGER" },
        { name: "page_count", type: "INTEGER" },
        { name: "file_data", type: "TEXT" },
        { name: "uploaded_at", type: "INTEGER" },
    ];

    if (existingColumns.size === 0) {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS lab_reports (
                id TEXT PRIMARY KEY NOT NULL,
                patient_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                report_date TEXT,
                lab_name TEXT,
                patient_name TEXT,
                doctor_name TEXT,
                extracted_data TEXT NOT NULL,
                raw_text TEXT,
                file_size INTEGER,
                page_count INTEGER,
                file_data TEXT,
                uploaded_at INTEGER
            )
        `);
    } else {
        for (const column of expectedColumns) {
            if (!existingColumns.has(column.name)) {
                await client.execute(
                    `ALTER TABLE lab_reports ADD COLUMN ${column.name} ${column.type}`
                );
            }
        }
    }

    labReportsSchemaEnsured = true;
}
