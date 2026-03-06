"use server";

import { db } from "@/db";
import { labAccounts, patients, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { extractAndSaveLabReportByPatientId } from "./labReports";

const LAB_SESSION_COOKIE = "lab_session";

// ─── Lab Auth ────────────────────────────────────────────────────────────────

export async function labLogin(email: string, password: string): Promise<{ success: boolean; error?: string; labId?: string }> {
    const [lab] = await db.select().from(labAccounts).where(eq(labAccounts.email, email)).limit(1);
    if (!lab) return { success: false, error: "No lab account found with this email." };
    if (!lab.isActive) return { success: false, error: "This lab account has been disabled. Contact admin." };

    const valid = await bcrypt.compare(password, lab.password);
    if (!valid) return { success: false, error: "Incorrect password." };

    const cookieStore = await cookies();
    cookieStore.set(LAB_SESSION_COOKIE, lab.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 12, // 12 hours
        path: "/",
    });

    return { success: true, labId: lab.id };
}

export async function labLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(LAB_SESSION_COOKIE);
}

export async function getLabSession(): Promise<{ labId: string; labName: string; email: string } | null> {
    const cookieStore = await cookies();
    const labId = cookieStore.get(LAB_SESSION_COOKIE)?.value;
    if (!labId) return null;

    const [lab] = await db.select().from(labAccounts).where(eq(labAccounts.id, labId)).limit(1);
    if (!lab || !lab.isActive) return null;

    return { labId: lab.id, labName: lab.labName, email: lab.email };
}

// ─── Patient Search ───────────────────────────────────────────────────────────

export async function searchPatientForLab(query: string) {
    const session = await getLabSession();
    if (!session) return null;

    const trimmed = query.trim();
    if (!trimmed) return null;

    // Build the search value: add # prefix if missing
    const searchVal = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    // Case-insensitive match using SQLite LOWER()
    let user: { id: string; name: string | null; email: string; customId: string | null } | undefined;

    // First try exact case-insensitive match (e.g. "#Nrivaa007" or "#NRIVAA007")
    const exactResults = await db.select().from(users)
        .where(sql`LOWER(${users.customId}) = LOWER(${searchVal})`)
        .limit(1);

    if (exactResults.length > 0) {
        user = exactResults[0];
    } else {
        // Fallback: search by suffix digits only (e.g. user types "007" or "7")
        const digits = trimmed.replace(/\D/g, '');
        if (digits) {
            const suffixResults = await db.select().from(users)
                .where(sql`${users.customId} LIKE ${'%' + digits}`)
                .limit(1);
            if (suffixResults.length > 0) user = suffixResults[0];
        }
    }

    if (!user) return null;

    const [patient] = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
    if (!patient) return null;

    return {
        patientId: patient.id,
        name: user.name,
        customId: user.customId,
        gender: patient.gender,
        age: patient.age,
        bloodGroup: patient.bloodGroup,
        city: patient.city,
        phone: patient.phoneNumber,
    };
}

// ─── Lab Upload ───────────────────────────────────────────────────────────────

export async function labUploadReport(data: {
    patientId: string;
    cloudinaryUrl: string;
    fileName: string;
    fileSize: number;
    labName: string;
}): Promise<{ success: boolean; error?: string }> {
    const session = await getLabSession();
    if (!session) return { success: false, error: "Unauthorized. Please login again." };

    // Run full LlamaParse + Mistral AI extraction pipeline
    const result = await extractAndSaveLabReportByPatientId({
        patientId: data.patientId,
        cloudinaryUrl: data.cloudinaryUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        labNameOverride: data.labName || session.labName,
    });

    if (result.success) {
        revalidatePath('/dashboard');
    }

    return result.success
        ? { success: true }
        : { success: false, error: result.error || "Upload failed" };
}

