"use server";

import { db, ensureCheckinsSchema } from "@/db";
import { preCheckins, postCheckins, patients, users, timelineEvents, doctors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { sendPreCheckinEmail, sendPostCheckinEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Token Generator ──────────────────────────────────────────────────────────
// Creates a URL-safe unique token tied to the appointment
function generateToken(): string {
    return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
}

// ─── Create Pre-Check-In Record & Send Email ──────────────────────────────────
// Called after staff books OR doctor sets follow-up
export async function createPreCheckinAndSendEmail({
    appointmentId,
    patientId,
    patientUserId,
    appointmentDate,
    doctorName,
    hospitalName,
}: {
    appointmentId: string;
    patientId: string;
    patientUserId: string;
    appointmentDate: string;  // ISO string e.g. "2026-03-20T09:00"
    doctorName?: string;
    hospitalName?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await ensureCheckinsSchema();

        // Fetch patient email
        const [user] = await db.select({ name: users.name, email: users.email })
            .from(users).where(eq(users.id, patientUserId)).limit(1);
        if (!user?.email) return { success: false, error: "Patient email not found" };

        // Check if a pre-checkin already exists for this appointment
        const existing = await db.select({ id: preCheckins.id })
            .from(preCheckins)
            .where(eq(preCheckins.appointmentId, appointmentId))
            .limit(1);
        if (existing.length > 0) return { success: true }; // already created, skip

        // Calculate token expiry: appointment time (or end of appointment day)
        const apptDate = new Date(appointmentDate);
        // Token expires at the appointment time itself
        const tokenExpiresAt = isNaN(apptDate.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : apptDate;

        const token = generateToken();

        // Insert pre-checkin record
        await db.insert(preCheckins).values({
            appointmentId,
            patientId,
            patientUserId,
            token,
            tokenExpiresAt,
            isSubmitted: false,
            createdAt: new Date(),
        });

        // Determine if email should be sent now or scheduled
        const now = Date.now();
        const apptMs = apptDate.getTime();
        const hoursUntilAppt = (apptMs - now) / (1000 * 60 * 60);

        // If appointment is more than 24 hrs away, we register it — 
        // a background job (or cron-like API route) will send it 24 hrs before.
        // If appointment is within 24 hrs, send immediately.
        if (hoursUntilAppt <= 24 || isNaN(hoursUntilAppt)) {
            // Send immediately
            await sendPreCheckinEmail({
                patientName: user.name || 'Patient',
                patientEmail: user.email,
                appointmentDate,
                doctorName,
                hospitalName,
                token,
            });
        }
        // If > 24 hrs, the /api/checkin/send-scheduled API route handles it

        return { success: true };
    } catch (error: any) {
        console.error('[Checkin] createPreCheckinAndSendEmail failed:', error);
        return { success: false, error: error?.message };
    }
}

// ─── Create Post-Check-In Record ──────────────────────────────────────────────
// Called when a staff/doctor marks appointment as completed
export async function createPostCheckinRecord({
    appointmentId,
    patientId,
    patientUserId,
    appointmentDate,
    doctorName,
}: {
    appointmentId: string;
    patientId: string;
    patientUserId: string;
    appointmentDate: string;
    doctorName?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await ensureCheckinsSchema();

        // Check if already exists
        const existing = await db.select({ id: postCheckins.id })
            .from(postCheckins)
            .where(eq(postCheckins.appointmentId, appointmentId))
            .limit(1);
        if (existing.length > 0) return { success: true };

        // Token expires 7 days after appointment
        const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const token = generateToken();

        await db.insert(postCheckins).values({
            appointmentId,
            patientId,
            patientUserId,
            token,
            tokenExpiresAt,
            isSubmitted: false,
            createdAt: new Date(),
        });

        // The email will be sent by the scheduled API route 2-3 days after appointment
        return { success: true };
    } catch (error: any) {
        console.error('[Checkin] createPostCheckinRecord failed:', error);
        return { success: false, error: error?.message };
    }
}

// ─── Validate Pre-Checkin Token ───────────────────────────────────────────────
// Used on the pre-checkin page to validate the token + enforce patient match
export async function validatePreCheckinToken(token: string): Promise<{
    valid: boolean;
    alreadySubmitted?: boolean;
    expired?: boolean;
    data?: {
        id: string;
        patientId: string;
        patientUserId: string;
        appointmentId: string;
    };
    error?: string;
}> {
    try {
        await ensureCheckinsSchema();

        const [record] = await db.select()
            .from(preCheckins)
            .where(eq(preCheckins.token, token))
            .limit(1);

        if (!record) return { valid: false, error: "Invalid or unknown link." };

        if (record.isSubmitted) {
            return { valid: false, alreadySubmitted: true };
        }

        const now = new Date();
        if (record.tokenExpiresAt && record.tokenExpiresAt < now) {
            return { valid: false, expired: true };
        }

        return {
            valid: true,
            data: {
                id: record.id,
                patientId: record.patientId,
                patientUserId: record.patientUserId,
                appointmentId: record.appointmentId,
            },
        };
    } catch (error: any) {
        return { valid: false, error: error?.message };
    }
}

// ─── Validate Post-Checkin Token ──────────────────────────────────────────────
export async function validatePostCheckinToken(token: string): Promise<{
    valid: boolean;
    alreadySubmitted?: boolean;
    expired?: boolean;
    data?: {
        id: string;
        patientId: string;
        patientUserId: string;
        appointmentId: string;
    };
    error?: string;
}> {
    try {
        await ensureCheckinsSchema();

        const [record] = await db.select()
            .from(postCheckins)
            .where(eq(postCheckins.token, token))
            .limit(1);

        if (!record) return { valid: false, error: "Invalid or unknown link." };

        if (record.isSubmitted) {
            return { valid: false, alreadySubmitted: true };
        }

        const now = new Date();
        if (record.tokenExpiresAt && record.tokenExpiresAt < now) {
            return { valid: false, expired: true };
        }

        return {
            valid: true,
            data: {
                id: record.id,
                patientId: record.patientId,
                patientUserId: record.patientUserId,
                appointmentId: record.appointmentId,
            },
        };
    } catch (error: any) {
        return { valid: false, error: error?.message };
    }
}

// ─── Submit Pre-Checkin Form ───────────────────────────────────────────────────
export async function submitPreCheckin(
    token: string,
    answers: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'patient') {
            return { success: false, error: "You must be logged in as a patient to submit this form." };
        }

        await ensureCheckinsSchema();

        const [record] = await db.select()
            .from(preCheckins)
            .where(eq(preCheckins.token, token))
            .limit(1);

        if (!record) return { success: false, error: "Invalid link." };
        if (record.isSubmitted) return { success: false, error: "This form has already been submitted." };

        const now = new Date();
        if (record.tokenExpiresAt && record.tokenExpiresAt < now) {
            return { success: false, error: "This link has expired." };
        }

        // Security: logged-in user must match the patient this token belongs to
        if (record.patientUserId !== session.user.id) {
            return { success: false, error: "This form is not meant for your account." };
        }

        await db.update(preCheckins)
            .set({
                isSubmitted: true,
                submittedAt: now,
                answers,
            })
            .where(eq(preCheckins.token, token));

        return { success: true };
    } catch (error: any) {
        console.error('[Checkin] submitPreCheckin failed:', error);
        return { success: false, error: error?.message };
    }
}

// ─── Submit Post-Checkin Form ─────────────────────────────────────────────────
export async function submitPostCheckin(
    token: string,
    answers: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'patient') {
            return { success: false, error: "You must be logged in as a patient to submit this form." };
        }

        await ensureCheckinsSchema();

        const [record] = await db.select()
            .from(postCheckins)
            .where(eq(postCheckins.token, token))
            .limit(1);

        if (!record) return { success: false, error: "Invalid link." };
        if (record.isSubmitted) return { success: false, error: "This form has already been submitted." };

        const now = new Date();
        if (record.tokenExpiresAt && record.tokenExpiresAt < now) {
            return { success: false, error: "This link has expired." };
        }

        // Security: logged-in user must match the patient this token belongs to
        if (record.patientUserId !== session.user.id) {
            return { success: false, error: "This form is not meant for your account." };
        }

        await db.update(postCheckins)
            .set({
                isSubmitted: true,
                submittedAt: now,
                answers,
            })
            .where(eq(postCheckins.token, token));

        return { success: true };
    } catch (error: any) {
        console.error('[Checkin] submitPostCheckin failed:', error);
        return { success: false, error: error?.message };
    }
}

// ─── Fetch Checkins for a Patient (Doctor/Staff View) ─────────────────────────
// Security: Only doctors and staff can call this function — not patients.
export async function getCheckinsForPatient(patientId: string): Promise<{
    success: boolean;
    preCheckins?: any[];
    postCheckins?: any[];
    error?: string;
}> {
    try {
        // Security: only doctors and staff may view patient check-in data
        const session = await getServerSession(authOptions);
        if (!session || (session.user.role !== 'doctor' && session.user.role !== 'staff' && session.user.role !== 'admin')) {
            return { success: false, error: "Unauthorized. Only doctors and staff can view patient check-in history." };
        }

        if (!patientId) return { success: false, error: "Patient ID is required." };

        await ensureCheckinsSchema();

        const [pre, post] = await Promise.all([
            db.select().from(preCheckins).where(eq(preCheckins.patientId, patientId)),
            db.select().from(postCheckins).where(eq(postCheckins.patientId, patientId)),
        ]);

        // Helper: safely extract sortable timestamp from a createdAt field
        // Drizzle returns Date objects from timestamp columns, but SQLite may store them as numbers
        const getTs = (record: any): number => {
            const ca = record.createdAt;
            if (!ca) return 0;
            if (ca instanceof Date) return ca.getTime();
            if (typeof ca === 'number') return ca;
            return new Date(ca).getTime() || 0;
        };

        // Enrich with appointment info
        const enrichPre = await Promise.all(pre.map(async (p) => {
            const [appt] = await db.select({ title: timelineEvents.title, eventDate: timelineEvents.eventDate })
                .from(timelineEvents).where(eq(timelineEvents.id, p.appointmentId)).limit(1);
            return { ...p, appointmentTitle: appt?.title, appointmentDate: appt?.eventDate };
        }));

        const enrichPost = await Promise.all(post.map(async (p) => {
            const [appt] = await db.select({ title: timelineEvents.title, eventDate: timelineEvents.eventDate })
                .from(timelineEvents).where(eq(timelineEvents.id, p.appointmentId)).limit(1);
            return { ...p, appointmentTitle: appt?.title, appointmentDate: appt?.eventDate };
        }));

        return {
            success: true,
            preCheckins: enrichPre.sort((a, b) => getTs(b) - getTs(a)),
            postCheckins: enrichPost.sort((a, b) => getTs(b) - getTs(a)),
        };
    } catch (error: any) {
        console.error('[Checkin] getCheckinsForPatient failed:', error);
        return { success: false, error: error?.message };
    }
}
