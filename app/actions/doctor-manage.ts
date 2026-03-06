"use server";

import { db } from "@/db";
import { medications, patientAllergies, patientConditions, doctorPrivateNotes, timelineEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// --- Generic Status Update ---
export async function updateItemStatus(
    type: 'medication' | 'allergy' | 'condition',
    itemId: string,
    status: 'active' | 'stopped' | 'hidden' | 'completed' | 'cancelled'
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'doctor') return { success: false, error: "Unauthorized" };

    try {
        if (type === 'medication') {
            await db.update(medications).set({ status }).where(eq(medications.id, itemId));
        } else if (type === 'allergy') {
            await db.update(patientAllergies).set({ status }).where(eq(patientAllergies.id, itemId));
        } else if (type === 'condition') {
            await db.update(patientConditions).set({ status }).where(eq(patientConditions.id, itemId));
        }

        revalidatePath('/doctor/patient/[id]');
        return { success: true };
    } catch (error) {
        console.error("Error updating status:", error);
        return { success: false, error: "Failed to update status" };
    }
}

// --- Add Medication ---
export async function addMedication(data: any) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'doctor') return { success: false, error: "Unauthorized" };

    try {
        await db.insert(medications).values({
            patientId: data.patientId,
            name: data.name,
            dosage: data.dosage,
            frequency: data.frequency,
            purpose: data.purpose,
            startDate: data.startDate,
            status: 'active',
            addedBy: `Dr. ${session.user.name}`,
            // In schema we didn't add doctorId column to medications table properly in previous steps 
            // (Wait, I checked schema.ts, I didn't add doctorId to medications, only addedBy text).
            // But I added doctorId to allergies/conditions.
            // Requirement said "append like that".
            // Implementation: addedBy text is used for display.
        });
        revalidatePath('/doctor/patient/[id]');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to add medication" };
    }
}

// --- Add Allergy ---
export async function addAllergy(data: any) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'doctor') return { success: false, error: "Unauthorized" };

    try {
        await db.insert(patientAllergies).values({
            patientId: data.patientId,
            allergen: data.allergen,
            severity: data.severity,
            reaction: data.reaction,
            status: 'active',
            addedBy: `Dr. ${session.user.name}`,
            doctorId: data.doctorId // Assuming we pass doctor ID from client or fetch it here
        });
        revalidatePath('/doctor/patient/[id]');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to add allergy" };
    }
}

// --- Add Private Note ---
export async function addPrivateNote(data: any) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'doctor') return { success: false, error: "Unauthorized" };

    try {
        await db.insert(doctorPrivateNotes).values({
            patientId: data.patientId,
            doctorId: data.doctorId,
            noteContent: data.noteContent
        });
        revalidatePath('/doctor/patient/[id]');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to save note" };
    }
}
