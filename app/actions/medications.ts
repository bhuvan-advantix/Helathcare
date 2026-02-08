
"use server";

import { db } from "@/db";
import { medications } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust import if necessary
import { eq, and } from "drizzle-orm";
import { patients } from "@/db/schema";

interface AddMedicationData {
    name: string;
    dosage?: string;
    purpose?: string;
    startDate: string;
    frequency?: string;
}

export async function addMedication(patientId: string, data: AddMedicationData): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        await db.insert(medications).values({
            patientId: patientId,
            name: data.name,
            dosage: data.dosage,
            purpose: data.purpose,
            startDate: data.startDate,
            frequency: data.frequency,
            status: "Active",
            addedBy: "Self"
        });

        revalidatePath("/dashboard");
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

        // Only allow stopping if addedBy is 'Self'
        const result = await db.update(medications)
            .set({ status: "Stopped" })
            .where(and(eq(medications.id, medicationId), eq(medications.addedBy, 'Self')))
            .returning({ updatedId: medications.id });

        if (result.length === 0) {
            return { success: false, error: "Medication not found or permission denied (only manual entries can be stopped)" };
        }

        revalidatePath("/dashboard");
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

        // Only allow restarting if addedBy is 'Self'
        const result = await db.update(medications)
            .set({ status: "Active" })
            .where(and(eq(medications.id, medicationId), eq(medications.addedBy, 'Self')))
            .returning({ updatedId: medications.id });

        if (result.length === 0) {
            return { success: false, error: "Medication not found or permission denied (only manual entries can be restarted)" };
        }

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Failed to restart medication:", error);
        return { success: false, error: "Failed to restart medication" };
    }
}
