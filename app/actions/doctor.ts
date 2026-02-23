"use server";

import { db } from "@/db";
import { doctorPatientRelations, doctors, patients, timelineEvents, users, patientConditions } from "@/db/schema";
import { and, eq, like, asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

export async function getDoctorDashboardStats() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        return null;
    }

    try {
        const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);

        if (!doctor) return null;

        // 1. Fetch Hospital/Clinic Patients (Linked to this doctor)
        const rawClinicPatients = await db.select({
            id: patients.id,
            userId: users.id, // linked user id
            name: users.name,
            image: users.image,
            customId: users.customId,
            age: patients.age,
            gender: patients.gender,
            dateOfBirth: patients.dateOfBirth,
            addedAt: doctorPatientRelations.addedAt,
            lastVisit: patients.createdAt, // Using createdAt as proxy for now
        })
            .from(doctorPatientRelations)
            .innerJoin(patients, eq(patients.id, doctorPatientRelations.patientId))
            .innerJoin(users, eq(users.id, patients.userId))
            .where(eq(doctorPatientRelations.doctorId, doctor.id))
            .limit(10); // Limit for dashboard view

        const clinicPatients = rawClinicPatients.map(p => {
            let age = p.age;
            if (p.dateOfBirth) {
                const birthDate = new Date(p.dateOfBirth);
                const today = new Date();
                let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    calculatedAge--;
                }
                age = calculatedAge;
            }
            return { ...p, age }; // Keep other fields, update age
        });

        // 2. Fetch Stats
        const todayStr = new Date().toISOString().split('T')[0];

        // Daily Consultations (Completed appointments TODAY)
        const [dailyConsultations] = await db.select({ count: sql<number>`count(*)` })
            .from(timelineEvents)
            .where(and(
                eq(timelineEvents.doctorId, doctor.id),
                eq(timelineEvents.eventType, 'appointment'),
                eq(timelineEvents.status, 'completed'),
                eq(timelineEvents.eventDate, todayStr)
            ));

        // Total Patients (Cumulative)
        const [totalPatients] = await db.select({ count: sql<number>`count(*)` })
            .from(doctorPatientRelations)
            .where(eq(doctorPatientRelations.doctorId, doctor.id));


        // Hours Logged Logic: Time since "Shift Start"
        // 1. Check if a 'shift_start' event exists for today
        let [shiftStartEvent] = await db.select()
            .from(timelineEvents)
            .where(and(
                eq(timelineEvents.doctorId, doctor.id),
                eq(timelineEvents.eventType, 'shift_start'),
                eq(timelineEvents.eventDate, todayStr)
            ))
            .limit(1);

        // 2. If no shift_start event, create one (Auto-Clock In)
        if (!shiftStartEvent) {
            try {
                // insert returns an array in some drivers, so we just await it.
                // We need to fetch the inserted record or just use the current time.
                const now = new Date();
                const [newShift] = await db.insert(timelineEvents).values({
                    userId: session.user.id, // Doctor is also a user
                    doctorId: doctor.id,
                    title: "Shift Started",
                    description: "Auto-generated clock-in event based on dashboard access",
                    eventDate: todayStr,
                    eventType: "shift_start",
                    status: "completed",
                    createdBy: "system",
                    createdAt: now,
                }).returning();

                shiftStartEvent = newShift;
            } catch (err) {
                console.error("Failed to auto-clock in doctor:", err);
                // Fallback to avoid crashing page
            }
        }

        // 3. Calculate Hours
        let hoursLogged = "0.0";
        if (shiftStartEvent && shiftStartEvent.createdAt) {
            const start = new Date(shiftStartEvent.createdAt).getTime();
            const now = new Date().getTime();
            const diffHours = (now - start) / (1000 * 60 * 60);
            hoursLogged = Math.max(0, diffHours).toFixed(1);
        }

        return {
            stats: [
                { label: "Daily Consultations", value: dailyConsultations.count, trend: "Today", trendDir: "neutral" },
                { label: "Total Patients", value: totalPatients.count, trend: "All Time", trendDir: "neutral" },
                { label: "Hours Logged", value: `${hoursLogged}h`, trend: "Today", trendDir: "neutral" }
            ],
            patients: clinicPatients,
            // insights removed as requested
        };

    } catch (error) {
        console.error("Error fetching doctor stats:", error);
        return null;
    }
}


export async function addPatientToClinic(patientId: string) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Get Doctor ID
        const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);
        if (!doctor) {
            return { success: false, error: "Doctor profile not found" };
        }

        // Check if relation already exists
        const existing = await db.select()
            .from(doctorPatientRelations)
            .where(
                and(
                    eq(doctorPatientRelations.doctorId, doctor.id),
                    eq(doctorPatientRelations.patientId, patientId)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return { success: true, message: "Patient already in your clinic" };
        }

        // Add relation
        await db.insert(doctorPatientRelations).values({
            doctorId: doctor.id,
            patientId: patientId,
        });

        revalidatePath('/doctor/dashboard');
        return { success: true, message: "Patient added to clinic successfully" };
    } catch (error) {
        console.error("Error adding patient to clinic:", error);
        return { success: false, error: "Failed to add patient" };
    }
}
export async function removePatientFromClinic(patientId: string) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Get Doctor ID
        const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);
        if (!doctor) {
            return { success: false, error: "Doctor profile not found" };
        }

        // Delete relation
        await db.delete(doctorPatientRelations)
            .where(
                and(
                    eq(doctorPatientRelations.doctorId, doctor.id),
                    eq(doctorPatientRelations.patientId, patientId)
                )
            );

        revalidatePath('/doctor/dashboard');
        return { success: true, message: "Patient removed from clinic" };
    } catch (error) {
        console.error("Error removing patient from clinic:", error);
        return { success: false, error: "Failed to remove patient" };
    }
}
