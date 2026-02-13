"use server";

import { db } from "@/db";
import { timelineEvents, labReports, users, doctors, patients } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from "next/cache";

export type TimelineEvent = {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    eventDate: string;
    eventType: string;
    status: string | null;
    reportId?: string | null;
    doctorId?: string | null;
    createdBy?: string | null;
    createdAt: Date | null;
};

export async function getTimelineEvents(userId: string) {
    try {
        // 1. Fetch Patient ID
        const [patient] = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);

        // 2. Fetch Manual Timeline Events
        const manualEvents = await db.select().from(timelineEvents)
            .where(eq(timelineEvents.userId, userId));

        // 3. Fetch Lab Reports (if patient exists)
        let reportEvents: any[] = [];
        if (patient) {
            const reports = await db.select().from(labReports)
                .where(eq(labReports.patientId, patient.id));

            reportEvents = reports.map(r => ({
                id: r.id, // Use report ID
                userId: userId,
                title: r.fileName || "Lab Report", // Use filename or type
                description: r.analysis ? "Analysis available" : "Lab Report",
                eventDate: (() => {
                    const d = r.reportDate || r.uploadedAt;
                    // Ensure d is not null before passing to Date
                    const dateToParse = d ? d : new Date();
                    const parsed = new Date(dateToParse);
                    return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                })(),
                eventType: 'test',
                status: 'completed',
                reportId: r.id, // Important for linking
                createdBy: 'system',
                createdAt: r.uploadedAt,
                isReport: true // Tag to identify
            }));
        }

        // 4. Merge and Sort
        // We need a unified type.
        const allEvents = [...manualEvents, ...reportEvents].sort((a, b) => {
            const dateA = new Date(a.eventDate).getTime();
            const dateB = new Date(b.eventDate).getTime();
            return dateB - dateA; // Descending
        });

        return { success: true, events: allEvents };
    } catch (error) {
        console.error("Error fetching timeline events:", error);
        return { success: false, error: "Failed to fetch timeline events" };
    }
}

export async function addTimelineEvent(data: {
    userId: string;
    title: string;
    description?: string;
    eventDate: string;
    eventType: string;
    status?: string;
    reportId?: string;
}) {
    try {
        await db.insert(timelineEvents).values({
            userId: data.userId,
            title: data.title,
            description: data.description,
            eventDate: data.eventDate,
            eventType: data.eventType,
            status: data.status || 'pending',
            reportId: data.reportId,
            createdBy: 'patient', // manually added by patient
        });

        revalidatePath('/timeline');
        return { success: true };
    } catch (error) {
        console.error("Error adding timeline event:", error);
        return { success: false, error: "Failed to add event" };
    }
}
