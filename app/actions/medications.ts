
"use server";

import { db, ensureMedicationsSchema } from "@/db";
import { medications } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eq, and, or } from "drizzle-orm";
import { patients } from "@/db/schema";

interface AddMedicationData {
    name: string;
    dosage?: string;
    purpose?: string;
    startDate: string;
    frequency?: string;
    durationDays?: number | null; // How many days to take (null = indefinite)
}

export async function addMedication(patientId: string, data: AddMedicationData): Promise<{ success: boolean; error?: string }> {
    try {
        await ensureMedicationsSchema();
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const addedBy = session.user.role === 'doctor' ? `Dr. ${session.user.name}` : 'Self';

        await db.insert(medications).values({
            patientId: patientId,
            name: data.name,
            dosage: data.dosage,
            purpose: data.purpose,
            startDate: data.startDate,
            frequency: data.frequency,
            durationDays: data.durationDays ?? null,
            status: "Active",
            addedBy: addedBy
        });

        revalidatePath("/dashboard");
        revalidatePath(`/doctor/patient/${patientId}`);
        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to add medication:", error);
        return { success: false, error: "Failed to add medication" };
    }
}

export async function stopMedication(medicationId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        let whereClause;
        if (session.user.role === 'doctor') {
            whereClause = eq(medications.id, medicationId);
        } else {
            whereClause = and(eq(medications.id, medicationId), eq(medications.addedBy, 'Self'));
        }

        const result = await db.update(medications)
            .set({ status: "Stopped" })
            .where(whereClause)
            .returning({ updatedId: medications.id, patientId: medications.patientId });

        if (result.length === 0) {
            return { success: false, error: "Medication not found or permission denied" };
        }

        revalidatePath("/dashboard");
        revalidatePath(`/doctor/patient/${result[0].patientId}`);
        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to stop medication:", error);
        return { success: false, error: "Failed to stop medication" };
    }
}

export async function restartMedication(medicationId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        let whereClause;
        if (session.user.role === 'doctor') {
            whereClause = eq(medications.id, medicationId);
        } else {
            whereClause = and(eq(medications.id, medicationId), eq(medications.addedBy, 'Self'));
        }

        const result = await db.update(medications)
            .set({ status: "Active" })
            .where(whereClause)
            .returning({ updatedId: medications.id, patientId: medications.patientId });

        if (result.length === 0) {
            return { success: false, error: "Medication not found or permission denied" };
        }

        revalidatePath("/dashboard");
        revalidatePath(`/doctor/patient/${result[0].patientId}`);
        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to restart medication:", error);
        return { success: false, error: "Failed to restart medication" };
    }
}

export async function hideMedication(medicationId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || session.user.role !== 'doctor') {
            return { success: false, error: "Unauthorized" };
        }

        const result = await db.update(medications)
            .set({ status: "Hidden" })
            .where(eq(medications.id, medicationId))
            .returning({ updatedId: medications.id, patientId: medications.patientId });

        if (result.length === 0) {
            return { success: false, error: "Medication not found" };
        }

        revalidatePath(`/doctor/patient/${result[0].patientId}`);
        revalidatePath("/profile");
        return { success: true };

    } catch (error) {
        console.error("Failed to hide medication:", error);
        return { success: false, error: "Failed to hide medication" };
    }
}

export async function updateMedication(
    patientId: string,
    medicationId: string,
    data: { name: string; dosage?: string; purpose?: string; frequency?: string; status?: string; originalName?: string; durationDays?: number | null },
    isLegacy?: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        await ensureMedicationsSchema();
        const session = await getServerSession(authOptions);

        if (!session || !session.user || session.user.role !== 'doctor') {
            return { success: false, error: "Unauthorized" };
        }

        const addedBy = `Dr. ${session.user.name}`;

        if (!isLegacy) {
            await db.update(medications).set({
                name: data.name,
                dosage: data.dosage,
                purpose: data.purpose,
                frequency: data.frequency,
                durationDays: data.durationDays ?? null,
                ...(data.status && { status: data.status })
            }).where(eq(medications.id, medicationId));
        } else {
            await db.insert(medications).values({
                patientId: patientId,
                name: data.name,
                dosage: data.dosage,
                purpose: data.purpose,
                frequency: data.frequency,
                durationDays: data.durationDays ?? null,
                status: data.status || "Active",
                addedBy: addedBy
            });

            if (data.originalName) {
                const patientData = await db.select({ currentMedications: patients.currentMedications }).from(patients).where(eq(patients.id, patientId)).limit(1);
                if (patientData.length > 0 && patientData[0].currentMedications) {
                    const oldList = patientData[0].currentMedications.split(',').map((s: string) => s.trim()).filter(Boolean);
                    const newList = oldList.filter((n: string) => n.toLowerCase() !== data.originalName!.toLowerCase());
                    await db.update(patients)
                        .set({ currentMedications: newList.join(', ') })
                        .where(eq(patients.id, patientId));
                }
            }
        }

        revalidatePath("/dashboard");
        revalidatePath(`/doctor/patient/${patientId}`);
        revalidatePath("/profile");
        return { success: true };

    } catch (error) {
        console.error("Failed to update medication:", error);
        return { success: false, error: "Failed to update medication" };
    }
}

/**
 * Auto-stop medications that have exceeded their duration.
 * Called server-side on the patient profile page load.
 */
export async function autoStopExpiredMedications(patientId: string): Promise<void> {
    try {
        await ensureMedicationsSchema();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all active meds with a duration for this patient
        const activeMeds = await db.select()
            .from(medications)
            .where(and(
                eq(medications.patientId, patientId),
                eq(medications.status, 'Active')
            ));

        for (const med of activeMeds) {
            if (!med.durationDays || !med.startDate) continue;

            const start = new Date(med.startDate);
            start.setHours(0, 0, 0, 0);
            const endDate = new Date(start);
            endDate.setDate(start.getDate() + med.durationDays);

            if (today >= endDate) {
                await db.update(medications)
                    .set({ status: 'Stopped' })
                    .where(eq(medications.id, med.id));
            }
        }
    } catch (error) {
        console.error("Failed to auto-stop expired medications:", error);
    }
}
