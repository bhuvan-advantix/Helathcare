"use server";

import { db } from "@/db";
import {
    staffAccounts, patients, users, medications, doctors,
    timelineEvents, patientVitals, patientAllergies, patientConditions
} from "@/db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { createPreCheckinAndSendEmail, createPostCheckinRecord } from "@/app/actions/checkin";

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
    revalidatePath("/admin/dashboard");
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
        recordedByName?: string; // staff's entered name
    }
): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const { recordedByName, ...vitals } = vitalsData;
    const recorderName = (recordedByName || "").trim() || staff.staffName;

    await db.insert(patientVitals).values({
        patientId,
        ...vitals,
        recordedBy: recorderName,
    });

    if (vitals.weight || vitals.height) {
        await db
            .update(patients)
            .set({
                ...(vitals.weight ? { weight: vitals.weight } : {}),
                ...(vitals.height ? { height: vitals.height } : {}),
            })
            .where(eq(patients.id, patientId));
    }

    revalidatePath("/staff");
    return { success: true };
}

// ─── Get Available Doctors ────────────────────────────────────────────────────

export async function getAvailableDoctors(): Promise<{
    success: boolean;
    doctors?: { id: string; name: string; specialization: string; hospitalTiming: string | null; workingDays: string | null; clinicName: string | null }[];
    error?: string;
}> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const allDoctors = await db
        .select({
            id: doctors.id,
            userId: doctors.userId,
            specialization: doctors.specialization,
            hospitalTiming: doctors.hospitalTiming,
            workingDays: doctors.workingDays,
            clinicName: doctors.clinicName,
            approvalStatus: doctors.approvalStatus,
        })
        .from(doctors)
        .where(eq(doctors.approvalStatus, "approved"));

    const enriched = await Promise.all(
        allDoctors.map(async (d) => {
            const [u] = await db
                .select({ name: users.name, isBanned: users.isBanned })
                .from(users)
                .where(eq(users.id, d.userId))
                .limit(1);
            return {
                id: d.id,
                name: u?.name ?? "Unknown Doctor",
                specialization: d.specialization,
                hospitalTiming: d.hospitalTiming,
                workingDays: d.workingDays,
                clinicName: d.clinicName,
                isBanned: u?.isBanned ?? false,
            };
        })
    );

    return {
        success: true,
        doctors: enriched.filter(d => !d.isBanned),
    };
}

// ─── Create Appointment ───────────────────────────────────────────────────────

export async function createAppointmentForPatient(data: {
    patientUserId: string;
    patientId: string;
    title: string;
    appointmentDate: string;
    appointmentTime?: string;
    hospitalName: string;
    doctorName?: string;
    notes?: string;
    appointmentType: string;
}): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const dateTime = data.appointmentTime
        ? `${data.appointmentDate}T${data.appointmentTime}`
        : data.appointmentDate;

    const descParts = [
        data.notes || null,
        `Hospital: ${data.hospitalName}`,
        `Type: ${data.appointmentType}`,
        data.doctorName ? `Doctor: ${data.doctorName}` : null,
        data.appointmentTime ? `Time: ${data.appointmentTime}` : null,
        `Scheduled by: ${staff.staffName}`,
    ].filter(Boolean);

    const [insertedAppt] = await db.insert(timelineEvents).values({
        userId: data.patientUserId,
        title: data.title,
        description: descParts.join("\n"),
        eventDate: dateTime,
        eventType: "appointment",
        status: "pending",
        createdBy: "staff",
    }).returning({ id: timelineEvents.id });

    // Trigger pre-checkin email (immediate if within 24hrs, otherwise scheduled by cron)
    // and pre-create post-checkin record (cron sends email 2-3 days after completion)
    if (insertedAppt?.id) {
        const [patient] = await db.select({ id: patients.id })
            .from(patients)
            .where(eq(patients.userId, data.patientUserId))
            .limit(1);

        if (patient) {
            // Fire and forget — don't block the response
            createPreCheckinAndSendEmail({
                appointmentId: insertedAppt.id,
                patientId: patient.id,
                patientUserId: data.patientUserId,
                appointmentDate: dateTime,
                doctorName: data.doctorName,
                hospitalName: data.hospitalName,
            }).catch(err => console.error('[Staff] Pre-checkin email error:', err));

            createPostCheckinRecord({
                appointmentId: insertedAppt.id,
                patientId: patient.id,
                patientUserId: data.patientUserId,
                appointmentDate: dateTime,
                doctorName: data.doctorName,
            }).catch(err => console.error('[Staff] Post-checkin record error:', err));
        }
    }


    revalidatePath("/staff");
    revalidatePath("/staff/dashboard");
    return { success: true };
}

// ─── Token Queue System (auto-populated from today's appointments) ────────────

// Parse a time string like "09:00" or "9:00 AM" to minutes since midnight
function parseTimeToMinutes(t: string): number {
    if (!t) return 9999;
    const clean = t.trim();
    const ampm = /([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?/i.exec(clean);
    if (!ampm) return 9999;
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = (ampm[3] || "").toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
}

export async function getTodayQueue(): Promise<{
    success: boolean;
    queue?: any[];
    error?: string;
}> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    // Use IST date (UTC+5:30)
    const nowUTC = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(nowUTC.getTime() + istOffset);
    const todayStr = todayIST.toISOString().split("T")[0];

    // Fetch all today's appointments (eventDate starts with todayStr)
    const allAppts = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.eventType, "appointment"));

    const todayAppts = allAppts.filter(a =>
        (a.eventDate || "").startsWith(todayStr) && a.status !== "cancelled"
    );

    // Enrich with patient name + parse time
    const enriched = await Promise.all(
        todayAppts.map(async (appt) => {
            const [u] = await db
                .select({ name: users.name, customId: users.customId })
                .from(users)
                .where(eq(users.id, appt.userId))
                .limit(1);

            const desc = appt.description || "";
            const timeMatch = desc.match(/Time:\s*([^\n]+)/);
            const doctorMatch = desc.match(/Doctor:\s*([^\n]+)/);
            const typeMatch = desc.match(/Type:\s*([^\n]+)/);
            const hospitalMatch = desc.match(/Hospital:\s*([^\n]+)/);

            const apptTime = timeMatch ? timeMatch[1].trim() :
                (appt.eventDate?.includes("T") ? appt.eventDate.split("T")[1].substring(0, 5) : null);

            return {
                id: appt.id,
                patientName: u?.name ?? "Unknown",
                customId: u?.customId ?? "",
                appointmentTime: apptTime,
                timeMinutes: parseTimeToMinutes(apptTime || ""),
                doctor: doctorMatch ? doctorMatch[1].trim() : null,
                type: typeMatch ? typeMatch[1].trim() : "Consultation",
                hospital: hospitalMatch ? hospitalMatch[1].trim() : null,
                title: appt.title,
                status: appt.status === "completed" ? "done" :
                    appt.status === "cancelled" ? "no_show" : "waiting",
                dbStatus: appt.status,
            };
        })
    );

    // Sort by appointment time ascending
    enriched.sort((a, b) => a.timeMinutes - b.timeMinutes);

    // Assign token numbers in order
    const queue = enriched.map((item, idx) => ({
        ...item,
        tokenNumber: idx + 1,
    }));

    return { success: true, queue };
}

export async function updateQueueTokenStatus(
    tokenId: string,
    status: "waiting" | "in_progress" | "done" | "no_show"
): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    const dbStatus =
        status === "done" ? "completed" :
            status === "no_show" ? "cancelled" :
                "pending";

    await db.update(timelineEvents)
        .set({ status: dbStatus })
        .where(eq(timelineEvents.id, tokenId));

    revalidatePath("/staff");
    return { success: true };
}

export async function deleteQueueToken(
    tokenId: string
): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    await db.update(timelineEvents)
        .set({ status: "cancelled" })
        .where(eq(timelineEvents.id, tokenId));

    revalidatePath("/staff");
    return { success: true };
}

// ─── Get Appointment Stats ───────────────────────────────────────────────────

export async function getStaffAppointmentStats(): Promise<{
    success: boolean;
    data?: {
        todayTotal: number;
        todayFollowUps: number;
        todayNew: number;
        todayStr: string;
        allAppointments: any[];
    };
    error?: string;
}> {
    const staff = await getStaffSession();
    if (!staff) return { success: false, error: "Unauthorized" };

    // IST-aware today
    const nowUTC = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(nowUTC.getTime() + istOffset);
    const todayStr = todayIST.toISOString().split("T")[0];

    const allAppointments = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.eventType, "appointment"));

    const todayAppointments = allAppointments.filter(a =>
        (a.eventDate || "").startsWith(todayStr)
    );
    const todayTotal = todayAppointments.length;
    const todayFollowUps = todayAppointments.filter(a => a.title.toLowerCase().includes("follow")).length;
    const todayNew = todayTotal - todayFollowUps;

    // Enrich all appointments with patient info
    const enriched = await Promise.all(
        allAppointments.map(async (appt) => {
            const [u] = await db
                .select({ name: users.name, customId: users.customId })
                .from(users)
                .where(eq(users.id, appt.userId))
                .limit(1);

            const desc = appt.description || "";
            const doctorMatch = desc.match(/Doctor:\s*([^\n]+)/);
            const hospitalMatch = desc.match(/Hospital:\s*([^\n]+)/);
            const timeMatch = desc.match(/Time:\s*([^\n]+)/);
            const typeMatch = desc.match(/Type:\s*([^\n]+)/);
            const dateOnly = (appt.eventDate || "").substring(0, 10);

            return {
                ...appt,
                patientName: u?.name ?? "Unknown",
                customId: u?.customId ?? "",
                doctorName: doctorMatch ? doctorMatch[1].trim() : null,
                hospitalName: hospitalMatch ? hospitalMatch[1].trim() : null,
                appointmentTime: timeMatch ? timeMatch[1].trim() : null,
                appointmentType: typeMatch ? typeMatch[1].trim() : null,
                dateOnly,
            };
        })
    );

    const toMins = (t: string | null) => {
        if (!t) return 0;
        const m = /(\d{1,2}):(\d{2})/.exec(t);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const todayList = enriched
        .filter(a => a.dateOnly === todayStr)
        .sort((a, b) => toMins(a.appointmentTime) - toMins(b.appointmentTime));
    const upcomingList = enriched
        .filter(a => a.dateOnly > todayStr)
        .sort((a, b) => (a.eventDate || "").localeCompare(b.eventDate || ""));
    const pastList = enriched
        .filter(a => a.dateOnly < todayStr)
        .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || ""));

    return {
        success: true,
        data: { todayTotal, todayFollowUps, todayNew, todayStr, allAppointments: [...todayList, ...upcomingList, ...pastList] }
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
