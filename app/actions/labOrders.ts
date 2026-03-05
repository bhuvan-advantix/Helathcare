"use server";

import { db } from "@/db";
import { labOrders, doctors, patients, staffAccounts, labAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getDoctorId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "doctor") return null;
    const [doc] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);
    return doc?.id ?? null;
}

async function getDoctorName(): Promise<string> {
    const session = await getServerSession(authOptions);
    return `Dr. ${session?.user?.name || "Doctor"}`;
}

async function getStaffSession(): Promise<{ staffId: string; staffName: string } | null> {
    const cookieStore = await cookies();
    const staffId = cookieStore.get("staff_session")?.value;
    if (!staffId) return null;
    const [staff] = await db.select({ id: staffAccounts.id, staffName: staffAccounts.staffName })
        .from(staffAccounts).where(eq(staffAccounts.id, staffId)).limit(1);
    if (!staff || !staff.staffName) return null;
    return { staffId: staff.id, staffName: staff.staffName };
}

async function getLabSession(): Promise<{ labId: string; labName: string } | null> {
    const cookieStore = await cookies();
    const labId = cookieStore.get("lab_session")?.value;
    if (!labId) return null;
    const [lab] = await db.select({ id: labAccounts.id, labName: labAccounts.labName })
        .from(labAccounts).where(eq(labAccounts.id, labId)).limit(1);
    if (!lab) return null;
    return { labId: lab.id, labName: lab.labName };
}

// ─── Doctor: Add Lab Orders ───────────────────────────────────────────────────

export async function addLabOrders(
    patientId: string,
    orders: Array<{ name: string; type: "lab" | "injection"; notes?: string }>
): Promise<{ success: boolean; error?: string }> {
    const doctorId = await getDoctorId();
    if (!doctorId) return { success: false, error: "Unauthorized" };

    const filtered = orders.filter(o => o.name.trim() !== "");
    if (filtered.length === 0) return { success: true }; // nothing to save

    const doctorName = await getDoctorName();
    const todayISO = new Date().toISOString().split("T")[0];

    try {
        for (const order of filtered) {
            await db.insert(labOrders).values({
                patientId,
                doctorId,
                doctorName,
                name: order.name.trim(),
                type: order.type,
                notes: order.notes?.trim() || null,
                orderedDate: todayISO,
            });
        }
        revalidatePath(`/doctor/consultation/${patientId}`);
        return { success: true };
    } catch (e: any) {
        console.error("addLabOrders error:", e);
        return { success: false, error: e.message || "Failed to save orders" };
    }
}

// ─── Staff: Get Lab Orders for Patient ───────────────────────────────────────

export async function getLabOrdersForPatient(
    patientId: string
): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    // Allow both staff and lab
    const staff = await getStaffSession();
    const lab = await getLabSession();
    if (!staff && !lab) return { success: false, error: "Unauthorized" };

    try {
        const rows = await db.select().from(labOrders)
            .where(eq(labOrders.patientId, patientId))
            .orderBy(desc(labOrders.orderedAt));
        return { success: true, orders: rows };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─── Staff / Lab: Mark Selected Orders as Paid ────────────────────────────────

export async function markLabOrdersPaid(
    orderIds: string[],
    paidBy: string
): Promise<{ success: boolean; error?: string }> {
    const staff = await getStaffSession();
    const lab = await getLabSession();
    if (!staff && !lab) return { success: false, error: "Unauthorized" };

    if (!orderIds.length) return { success: false, error: "No orders selected" };

    try {
        const now = new Date();
        for (const id of orderIds) {
            await db.update(labOrders)
                .set({ isPaid: true, paidAt: now, paidBy })
                .where(eq(labOrders.id, id));
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
