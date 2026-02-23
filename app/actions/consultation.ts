"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import {
    patients,
    healthParameters,
    medications,
    timelineEvents,
    doctorPrivateNotes,
    doctors,
    users
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Compute a future ISO date string from a human-readable follow-up string like "In 3 days", "In 1 week", etc. */
function computeFollowUpDate(followUp: string): string | null {
    const now = new Date();
    const lower = followUp.toLowerCase().trim();

    if (lower.includes('3 day')) {
        now.setDate(now.getDate() + 3);
    } else if (lower.includes('1 week')) {
        now.setDate(now.getDate() + 7);
    } else if (lower.includes('2 week')) {
        now.setDate(now.getDate() + 14);
    } else if (lower.includes('1 month')) {
        now.setMonth(now.getMonth() + 1);
    } else if (lower.includes('sos') || lower.includes('when needed')) {
        // no specific date, use 30 days as placeholder
        now.setDate(now.getDate() + 30);
    } else {
        return null; // Unknown format, skip
    }

    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

export async function finishConsultation(
    patientId: string,
    data: {
        height?: string;
        weight?: string;
        vitals: Array<{ name: string; value: string; unit: string }>;
        medications: Array<{ name: string; time: string; days: string }>;
        clinicalNotesPrivate?: string;
        patientNote?: string;       // Visible to patient in their Doctor Notes
        diagnosis?: string;
        followUp?: string;
    }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'doctor') {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);
        if (!doctor) return { success: false, error: "Doctor profile not found" };

        const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (!patient) return { success: false, error: "Patient not found" };

        const doctorDisplayName = `Dr. ${session.user.name || 'Doctor'}`;
        const todayISO = new Date().toISOString().split('T')[0];

        // 1. Update Height and Weight if provided
        if (data.height || data.weight) {
            await db.update(patients)
                .set({
                    ...(data.height ? { height: data.height } : {}),
                    ...(data.weight ? { weight: data.weight } : {})
                })
                .where(eq(patients.id, patientId));
        }

        // 2. Insert Vitals
        for (const vital of data.vitals) {
            if (vital.value && vital.value.trim() !== '') {
                await db.insert(healthParameters).values({
                    patientId: patientId,
                    parameterName: vital.name,
                    value: vital.value,
                    unit: vital.unit,
                    testDate: new Date().toISOString(),
                    status: 'normal'
                });
            }
        }

        // 3. Insert Medications
        for (const med of data.medications) {
            if (med.name && med.name.trim() !== '') {
                await db.insert(medications).values({
                    patientId: patientId,
                    name: med.name,
                    dosage: med.days ? `${med.days} days` : '',
                    frequency: med.time,
                    status: 'Active',
                    addedBy: doctorDisplayName,
                    startDate: new Date().toISOString().split('T')[0],
                    purpose: data.diagnosis || ''
                });
            }
        }

        // 4. Insert Private Clinical Note as a new record per consultation (append-only history)
        if (data.clinicalNotesPrivate && data.clinicalNotesPrivate.trim() !== '') {
            await db.insert(doctorPrivateNotes).values({
                doctorId: doctor.id,
                patientId: patientId,
                noteContent: data.clinicalNotesPrivate
            });
        }

        // 5. Build today's consultation description for patient timeline
        let consultationDesc = '';
        if (doctor.clinicName) consultationDesc += `Hospital: ${doctor.clinicName}.\n`;
        if (data.diagnosis) consultationDesc += `Diagnosis: ${data.diagnosis}.\n`;
        if (data.medications.length > 0) {
            const medNames = data.medications.map(m => m.name).filter(Boolean).join(', ');
            consultationDesc += `Prescribed: ${medNames}.\n`;
        }
        if (data.patientNote && data.patientNote.trim()) {
            consultationDesc += `Doctor's Advice: ${data.patientNote.trim()}`;
        }
        if (!consultationDesc.trim()) {
            consultationDesc = 'General Consultation';
        }

        // Insert today's consultation timeline event (visible to patient)
        await db.insert(timelineEvents).values({
            userId: patient.userId,
            title: `Consultation with ${doctorDisplayName}`,
            description: consultationDesc.trim(),
            eventDate: todayISO,
            eventType: 'appointment',
            status: 'completed',
            doctorId: doctor.id,
            createdBy: 'doctor'
        });

        // 6. If a follow-up is scheduled, create a SEPARATE pending follow-up timeline event
        if (data.followUp && data.followUp.trim() && data.followUp !== 'No Follow-up Scheduled') {
            const followUpDate = computeFollowUpDate(data.followUp);
            if (followUpDate) {
                await db.insert(timelineEvents).values({
                    userId: patient.userId,
                    title: `Follow-up with ${doctorDisplayName}`,
                    description: `Scheduled follow-up appointment. Reason: ${data.diagnosis || 'Routine follow-up'}.`,
                    eventDate: followUpDate,
                    eventType: 'appointment',
                    status: 'pending',  // Future, not yet completed
                    doctorId: doctor.id,
                    createdBy: 'doctor'
                });
            }
        }

        revalidatePath(`/doctor/patient/${patientId}`);
        revalidatePath(`/doctor/consultation/${patientId}`);
        revalidatePath(`/dashboard`);
        revalidatePath(`/timeline`);

        return { success: true };
    } catch (error) {
        console.error("Failed to finish consultation:", error);
        return { success: false, error: "Failed to save consultation data" };
    }
}

/**
 * Append new clinical context to a patient record WITHOUT overwriting.
 * - allergies / pastSurgeries: comma-separated, new items are merged (de-duped, case-insensitive)
 * - lifestyle: free text appended with a separator if something already exists
 */
export async function appendPatientClinicalContext(
    patientId: string,
    newData: {
        allergies?: string;      // comma-separated new items
        pastSurgeries?: string;  // comma-separated new items
        lifestyle?: string;      // free text to append
    }
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'doctor') {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
        if (!patient) return { success: false, error: "Patient not found" };

        const updates: Partial<typeof patients.$inferInsert> = {};

        // Helper: merge two comma-separated lists, case-insensitive de-duplication
        const mergeList = (existing: string | null, incoming: string) => {
            const existingItems = (existing || '').split(',').map(s => s.trim()).filter(Boolean);
            const newItems = incoming.split(',').map(s => s.trim()).filter(Boolean);
            const lowerExisting = existingItems.map(s => s.toLowerCase());
            for (const item of newItems) {
                if (item && !lowerExisting.includes(item.toLowerCase())) {
                    existingItems.push(item);
                    lowerExisting.push(item.toLowerCase());
                }
            }
            return existingItems.join(', ');
        };

        if (newData.allergies?.trim()) {
            updates.allergies = mergeList(patient.allergies, newData.allergies);
        }

        if (newData.pastSurgeries?.trim()) {
            updates.pastSurgeries = mergeList(patient.pastSurgeries, newData.pastSurgeries);
        }

        if (newData.lifestyle?.trim()) {
            const existing = (patient.lifestyle || '').trim();
            updates.lifestyle = existing
                ? `${existing}; ${newData.lifestyle.trim()}`
                : newData.lifestyle.trim();
        }

        if (Object.keys(updates).length > 0) {
            await db.update(patients).set(updates).where(eq(patients.id, patientId));
        }

        revalidatePath(`/doctor/patient/${patientId}`);
        revalidatePath(`/doctor/consultation/${patientId}`);

        return { success: true };
    } catch (error) {
        console.error("Failed to append clinical context:", error);
        return { success: false, error: "Failed to update patient record" };
    }
}
