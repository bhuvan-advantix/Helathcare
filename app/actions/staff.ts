"use server";

import { db } from "@/db";
import {
    staffAccounts, patients, users, medications,
    timelineEvents, patientVitals, patientAllergies, patientConditions
} from "@/db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const STAFF_SESSION_COOKIE = "staff_session";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function staffLogin(
    email: string,
    password: string
): Promise<{ success: boolean; error?: string }> {
    const [account] = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.email, email.toLowerCase().trim()))
        .limit(1);

    if (!account) return { success: false, error: "Invalid email or password." };
    if (!account.isActive) return { success: false, error: "This account has been disabled. Contact admin." };

    const valid = await bcrypt.compare(password, account.password);
    if (!valid) return { success: false, error: "Invalid email or password." };

    const cookieStore = await cookies();
    cookieStore.set(STAFF_SESSION_COOKIE, account.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 12,
        path: "/",
    });

    return { success: true };
}

export async function staffLogout(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(STAFF_SESSION_COOKIE);
}

export async function getStaffSession(): Promise<typeof staffAccounts.$inferSelect | null> {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
    if (!sessionId) return null;

    const [account] = await db
        .select()
        .from(staffAccounts)
        .where(and(eq(staffAccounts.id, sessionId), eq(staffAccounts.isActive, true)))
        .limit(1);

    return account ?? null;
}

// ─── Patient Search ───────────────────────────────────────────────────────────

export async function searchPatientByIdOrName(query: string): Promise<{
    success: boolean;
    patients?: any[];
    error?: string;
}> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const q = query.trim().toLowerCase();
    if (!q) return { success: true, patients: [] };

    const allPatients = await db
        .select({
            id: patients.id,
            userId: patients.userId,
            age: patients.age,
            gender: patients.gender,
            phoneNumber: patients.phoneNumber,
            bloodGroup: patients.bloodGroup,
            height: patients.height,
            weight: patients.weight,
            allergies: patients.allergies,
        })
        .from(patients);

    const enriched = await Promise.all(
        allPatients.map(async (p) => {
            const [u] = await db
                .select({ name: users.name, email: users.email, customId: users.customId, image: users.image })
                .from(users)
                .where(eq(users.id, p.userId))
                .limit(1);
            return {
                ...p,
                userName: u?.name ?? "",
                userEmail: u?.email ?? "",
                customId: u?.customId ?? "",
                userImage: u?.image ?? null,
            };
        })
    );

    const filtered = enriched.filter(
        (p) =>
            p.userName?.toLowerCase().includes(q) ||
            p.customId?.toLowerCase().includes(q) ||
            p.userEmail?.toLowerCase().includes(q) ||
            p.phoneNumber?.includes(q)
    );

    return { success: true, patients: filtered };
}

// ─── Register New Patient (Full Onboarding) ───────────────────────────────────

export async function registerWalkInPatient(data: {
    name: string;
    email: string;
    phone: string;
    gender?: string;
    dateOfBirth?: string;
    age?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    address?: string;
    city?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergies?: string;
    chronicConditions?: string;
}): Promise<{ success: boolean; customId?: string; tempPassword?: string; patientEmail?: string; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1);
    if (existing) return { success: false, error: "A patient with this email already exists." };

    // Generate next ID in #Nrivaa format
    const activeIds = await db
        .select({ customId: users.customId })
        .from(users)
        .where(like(users.customId, "#Nrivaa%"));

    let maxNum = 0;
    for (const r of activeIds) {
        if (r.customId) {
            const n = parseInt(r.customId.replace("#Nrivaa", ""), 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        }
    }

    const customId = `#Nrivaa${(maxNum + 1).toString().padStart(3, "0")}`;
    const tempPassword = `Niraiva@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPw = await bcrypt.hash(tempPassword, 12);
    const newUserId = uuidv4();

    await db.insert(users).values({
        id: newUserId,
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPw,
        role: "patient",
        isOnboarded: true,
        customId,
        isBanned: false,
    });

    const patientId = uuidv4();
    await db.insert(patients).values({
        id: patientId,
        userId: newUserId,
        gender: data.gender ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        age: data.age ? parseInt(data.age) : null,
        bloodGroup: data.bloodGroup ?? null,
        phoneNumber: data.phone,
        maritalStatus: data.maritalStatus ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        allergies: data.allergies ?? null,
        chronicConditions: data.chronicConditions ?? null,
    });

    revalidatePath("/staff");
    return { success: true, customId, tempPassword, patientEmail: data.email.toLowerCase() };
}

// ─── Get Patient Full Detail ──────────────────────────────────────────────────

export async function getPatientForStaff(patientId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);
    if (!patient) return { success: false, error: "Patient not found" };

    const [user] = await db
        .select({ name: users.name, email: users.email, customId: users.customId, image: users.image })
        .from(users)
        .where(eq(users.id, patient.userId))
        .limit(1);

    const vitals = await db
        .select()
        .from(patientVitals)
        .where(eq(patientVitals.patientId, patientId))
        .orderBy(desc(patientVitals.recordedAt))
        .limit(5);

    const meds = await db
        .select()
        .from(medications)
        .where(and(eq(medications.patientId, patientId), eq(medications.status, "Active")));

    const upcoming = await db
        .select()
        .from(timelineEvents)
        .where(and(
            eq(timelineEvents.userId, patient.userId),
            eq(timelineEvents.eventType, "appointment")
        ))
        .orderBy(desc(timelineEvents.eventDate))
        .limit(10);

    return {
        success: true,
        data: { patient, user, vitals, medications: meds, appointments: upcoming, staffHospital: staff.hospitalName },
    };
}

// ─── Record Vitals ────────────────────────────────────────────────────────────

export async function recordPatientVitals(
    patientId: string,
    vitalsData: {
        bloodPressure?: string;
        temperature?: string;
        weight?: string;
        height?: string;
        pulseRate?: string;
        spO2?: string;
        notes?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    await db.insert(patientVitals).values({
        patientId,
        ...vitalsData,
        recordedBy: staff.staffName,
    });

    if (vitalsData.weight || vitalsData.height) {
        await db
            .update(patients)
            .set({
                ...(vitalsData.weight ? { weight: vitalsData.weight } : {}),
                ...(vitalsData.height ? { height: vitalsData.height } : {}),
            })
            .where(eq(patients.id, patientId));
    }

    revalidatePath("/staff");
    return { success: true };
}

// ─── Create Appointment ───────────────────────────────────────────────────────

export async function createAppointmentForPatient(data: {
    patientUserId: string;
    patientId: string;
    title: string;
    appointmentDate: string;
    hospitalName: string;
    notes?: string;
    appointmentType: string;
}): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const description = [
        data.notes ? data.notes : null,
        `Hospital: ${data.hospitalName}`,
        `Type: ${data.appointmentType}`,
        `Scheduled by: ${staff.staffName}`,
    ].filter(Boolean).join("\n");

    await db.insert(timelineEvents).values({
        userId: data.patientUserId,
        title: data.title,
        description,
        eventDate: data.appointmentDate,
        eventType: "appointment",
        status: "pending",
        createdBy: "staff",
    });

    revalidatePath("/staff");
    return { success: true };
}

// ─── Get Appointment Stats ─────────────────────────────────────────────────────

export async function getStaffAppointmentStats(): Promise<{
    success: boolean;
    data?: {
        todayTotal: number;
        todayFollowUps: number;
        todayNew: number;
        byHospital: { hospital: string; count: number }[];
    };
    error?: string;
}> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const todayStr = new Date().toISOString().split("T")[0];

    const todayAppointments = await db
        .select()
        .from(timelineEvents)
        .where(and(
            eq(timelineEvents.eventType, "appointment"),
            eq(timelineEvents.eventDate, todayStr)
        ));

    const todayTotal = todayAppointments.length;
    const todayFollowUps = todayAppointments.filter(a => a.title.toLowerCase().includes("follow")).length;
    const todayNew = todayTotal - todayFollowUps;

    // Group by hospital from description
    const hospitalCounts: Record<string, number> = {};
    for (const appt of todayAppointments) {
        const match = (appt.description || "").match(/Hospital:\s*(.+)/);
        const hospital = match ? match[1].trim() : (staff.hospitalName || "Unknown");
        hospitalCounts[hospital] = (hospitalCounts[hospital] || 0) + 1;
    }

    const byHospital = Object.entries(hospitalCounts).map(([hospital, count]) => ({ hospital, count }));

    return {
        success: true,
        data: { todayTotal, todayFollowUps, todayNew, byHospital }
    };
}

// ─── Admin: Create Staff Account ──────────────────────────────────────────────

export async function createStaffAccountAction(data: {
    staffName: string;
    email: string;
    password: string;
    hospitalName?: string;
    phone?: string;
}): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin_session")?.value === "authenticated";
    if (!isAdmin) return { success: false, error: "Unauthorized" };

    const existing = await db
        .select()
        .from(staffAccounts)
        .where(eq(staffAccounts.email, data.email.toLowerCase()))
        .limit(1);
    if (existing.length > 0) return { success: false, error: "Email already in use." };

    const hashed = await bcrypt.hash(data.password, 12);
    await db.insert(staffAccounts).values({
        staffName: data.staffName,
        email: data.email.toLowerCase(),
        password: hashed,
        hospitalName: data.hospitalName ?? null,
        phone: data.phone ?? null,
        isActive: true,
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
}

// ─── Admin: Toggle Staff Account ──────────────────────────────────────────────

export async function toggleStaffAccountAction(
    staffId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin_session")?.value === "authenticated";
    if (!isAdmin) return { success: false, error: "Unauthorized" };

    await db.update(staffAccounts).set({ isActive }).where(eq(staffAccounts.id, staffId));
    revalidatePath("/admin/dashboard");
    return { success: true };
}

// ─── Admin: Get All Staff Accounts ────────────────────────────────────────────

export async function getAllStaffAccounts(): Promise<typeof staffAccounts.$inferSelect[]> {
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get("admin_session")?.value === "authenticated";
    if (!isAdmin) return [];

    return db.select().from(staffAccounts).orderBy(desc(staffAccounts.createdAt));
}
