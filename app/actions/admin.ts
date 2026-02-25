"use server";

import { db } from "@/db";
import {
    users, patients, doctors, supportTickets, labAccounts,
    doctorPatientRelations, medications, labReports, timelineEvents
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { extractAndSaveLabReportByPatientId } from "./labReports";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_COOKIE = "admin_session";

// ─── Admin Auth ─────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        return { success: false, error: "Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in environment variables." };
    }
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return { success: false, error: "Invalid admin credentials." };
    }
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 8,
        path: "/",
    });
    return { success: true };
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function checkAdminSession(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "authenticated";
}

// ─── Full Stats ───────────────────────────────────────────────────────────────

export async function getAdminStats() {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return null;

    const allUsers = await db.select().from(users);
    const allPatients = await db.select().from(patients);
    const allDoctors = await db.select().from(doctors);
    const allTickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    const allLabs = await db.select().from(labAccounts).orderBy(desc(labAccounts.createdAt));
    const allMeds = await db.select().from(medications);
    const allLabReports = await db.select().from(labReports);

    // Enrich tickets with user's customId (try userId first, fallback to email lookup)
    const enrichedTickets = await Promise.all(allTickets.map(async (t) => {
        try {
            // Try userId first
            if (t.userId) {
                const [u] = await db.select({ customId: users.customId, role: users.role })
                    .from(users).where(eq(users.id, t.userId)).limit(1);
                if (u) return { ...t, userCustomId: u.customId, userRole: u.role };
            }
            // Fallback: lookup by email
            if (t.userEmail) {
                const [u] = await db.select({ customId: users.customId, role: users.role })
                    .from(users).where(eq(users.email, t.userEmail)).limit(1);
                if (u) return { ...t, userCustomId: u.customId, userRole: u.role };
            }
        } catch (_) { }
        return { ...t, userCustomId: null, userRole: null };
    }));

    const patientCount = allPatients.length;
    const doctorCount = allDoctors.length;
    const pendingDoctors = allDoctors.filter(d => d.approvalStatus === 'pending').length;
    const bannedUsers = allUsers.filter(u => u.isBanned).length;
    const openTickets = allTickets.filter(t => t.status === 'open').length;

    // ─── Enrich Doctors with full data ─────────────────────────
    const enrichedDoctors = await Promise.all(allDoctors.map(async (d) => {
        const [u] = await db.select({ name: users.name, email: users.email, isBanned: users.isBanned, image: users.image })
            .from(users).where(eq(users.id, d.userId)).limit(1);

        // Clinic patients
        const clinicPatients = await db.select().from(doctorPatientRelations)
            .where(eq(doctorPatientRelations.doctorId, d.id));

        // Total consultations (completed timeline events by this doctor)
        const [consultations] = await db.select({ count: sql<number>`count(*)` })
            .from(timelineEvents)
            .where(and(eq(timelineEvents.doctorId, d.id), eq(timelineEvents.status, 'completed')));

        // Medicines prescribed (medications where addedBy starts with 'Dr.')
        const medsGiven = allMeds.filter(m => m.addedBy && m.addedBy.includes(u?.name || ''));

        // Recent consultations (last 5)
        const recentConsultations = await db.select()
            .from(timelineEvents)
            .where(and(eq(timelineEvents.doctorId, d.id), eq(timelineEvents.eventType, 'appointment')))
            .orderBy(desc(timelineEvents.eventDate))
            .limit(5);

        // Lab reports uploaded to this doctor's patients
        const clinicPatientIds = clinicPatients.map(cp => cp.patientId);
        const relatedLabReports = allLabReports.filter(lr => clinicPatientIds.includes(lr.patientId));

        return {
            ...d,
            userName: u?.name || 'Unknown',
            userEmail: u?.email || '',
            userImage: u?.image || null,
            isBanned: u?.isBanned || false,
            clinicPatientsCount: clinicPatients.length,
            totalConsultations: consultations.count,
            medsGiven: medsGiven.length,
            recentConsultations,
            labReportsCount: relatedLabReports.length,
        };
    }));

    // ─── Enrich Patients with full data ────────────────────────
    const enrichedPatients = await Promise.all(allPatients.map(async (p) => {
        const [u] = await db.select({ name: users.name, email: users.email, isBanned: users.isBanned, customId: users.customId, image: users.image })
            .from(users).where(eq(users.id, p.userId)).limit(1);

        // Medications
        const patientMeds = allMeds.filter(m => m.patientId === p.id);

        // Lab Reports
        const patientReports = allLabReports.filter(lr => lr.patientId === p.id);

        // Total consultations
        const [consultations] = await db.select({ count: sql<number>`count(*)` })
            .from(timelineEvents)
            .where(and(eq(timelineEvents.userId, p.userId), eq(timelineEvents.status, 'completed')));

        // Clinic doctors (which doctors have this patient)
        const doctorRelations = await db.select({ doctorId: doctorPatientRelations.doctorId })
            .from(doctorPatientRelations)
            .where(eq(doctorPatientRelations.patientId, p.id));

        return {
            ...p,
            userName: u?.name || 'Unknown',
            userEmail: u?.email || '',
            userImage: u?.image || null,
            customId: u?.customId || '',
            isBanned: u?.isBanned || false,
            medicationsCount: patientMeds.length,
            activeMeds: patientMeds.filter(m => m.status === 'Active'),
            labReportsCount: patientReports.length,
            totalConsultations: consultations.count,
            linkedDoctorsCount: doctorRelations.length,
            recentMeds: patientMeds.slice(0, 5),
        };
    }));

    return {
        stats: {
            patientCount,
            doctorCount,
            pendingDoctors,
            bannedUsers,
            openTickets,
            labCount: allLabs.length,
            totalMeds: allMeds.length,
            totalLabReports: allLabReports.length,
        },
        doctors: enrichedDoctors,
        patients: enrichedPatients,
        tickets: enrichedTickets,
        labs: allLabs,
    };
}

// ─── Doctor Actions ────────────────────────────────────────────────────────

export async function approveDoctorAction(doctorId: string): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    await db.update(doctors).set({ approvalStatus: 'approved' }).where(eq(doctors.id, doctorId));
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
    if (doctor) {
        await db.update(users).set({ role: 'doctor', isOnboarded: true }).where(eq(users.id, doctor.userId));
    }
    revalidatePath("/admin/dashboard");
    return { success: true };
}

export async function rejectDoctorAction(doctorId: string): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    await db.update(doctors).set({ approvalStatus: 'rejected' }).where(eq(doctors.id, doctorId));
    revalidatePath("/admin/dashboard");
    return { success: true };
}

// ─── Ban / Unban ──────────────────────────────────────────────────────────

export async function banUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    await db.update(users).set({ isBanned: true }).where(eq(users.id, userId));
    revalidatePath("/admin/dashboard");
    return { success: true };
}

export async function unbanUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    await db.update(users).set({ isBanned: false }).where(eq(users.id, userId));
    revalidatePath("/admin/dashboard");
    return { success: true };
}

// ─── Tickets ──────────────────────────────────────────────────────────────

export async function updateTicketStatusAction(ticketId: string, status: string): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    await db.update(supportTickets).set({
        status,
        updatedAt: new Date(),
        ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
    }).where(eq(supportTickets.id, ticketId));
    revalidatePath("/admin/dashboard");
    return { success: true };
}

// ─── Lab Accounts ─────────────────────────────────────────────────────────

export async function createLabAccountAction(data: {
    labName: string; email: string; password: string; city?: string; phone?: string;
}): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    const existing = await db.select().from(labAccounts).where(eq(labAccounts.email, data.email)).limit(1);
    if (existing.length > 0) return { success: false, error: "Email already exists for a lab account." };
    const hashed = await bcrypt.hash(data.password, 12);
    await db.insert(labAccounts).values({
        labName: data.labName, email: data.email, password: hashed,
        city: data.city || null, phone: data.phone || null, isActive: true,
    });
    revalidatePath("/admin/dashboard");
    return { success: true };
}

export async function toggleLabAccountAction(labId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };
    await db.update(labAccounts).set({ isActive }).where(eq(labAccounts.id, labId));
    revalidatePath("/admin/dashboard");
    return { success: true };
}

// ─── Admin Upload Lab Report for any Patient ──────────────────────────────────

export async function adminUploadLabReport(data: {
    patientId: string;
    cloudinaryUrl: string;
    fileName: string;
    fileSize: number;
    labName?: string;
}): Promise<{ success: boolean; error?: string }> {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) return { success: false, error: "Unauthorized" };

    // Run full LlamaParse + Mistral AI extraction pipeline
    const result = await extractAndSaveLabReportByPatientId({
        patientId: data.patientId,
        cloudinaryUrl: data.cloudinaryUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        labNameOverride: data.labName || 'Uploaded by Admin',
    });

    if (result.success) {
        revalidatePath("/admin/dashboard");
    }

    return result.success
        ? { success: true }
        : { success: false, error: result.error || "Upload failed" };
}
