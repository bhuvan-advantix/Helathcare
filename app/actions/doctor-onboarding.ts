"use server";

import { db } from "@/db";
import { doctors, users, patients } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function onboardDoctor(data: any) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Check for existing phone number in Doctors table
        const existingDoctorPhone = await db.select().from(doctors).where(eq(doctors.phoneNumber, data.phoneNumber)).limit(1);
        if (existingDoctorPhone.length > 0) {
            return { success: false, error: "Phone number already in use by another account." };
        }

        // Check for existing phone number in Patients table
        const existingPatientPhone = await db.select().from(patients).where(eq(patients.phoneNumber, data.phoneNumber)).limit(1);
        if (existingPatientPhone.length > 0) {
            return { success: false, error: "Phone number already in use by another account." };
        }

        // Create Doctor Profile
        await db.insert(doctors).values({
            userId: session.user.id,
            // Personal
            dateOfBirth: data.dateOfBirth,
            age: parseInt(data.age),
            gender: data.gender,
            phoneNumber: data.phoneNumber,
            address: data.address,
            city: data.city,
            maritalStatus: data.maritalStatus,
            // Professional
            specialization: data.specialization,
            clinicName: data.clinicName,
            licenseNumber: data.licenseNumber,
            experienceYears: parseInt(data.experienceYears),
            degree: data.degree,
            hospitalTiming: data.hospitalTiming,
            workingDays: data.workingDays,
            bio: data.bio,
        });

        // Update User Onboarding Status
        await db.update(users)
            .set({ isOnboarded: true })
            .where(eq(users.id, session.user.id));

        return { success: true };
    } catch (error) {
        console.error("Onboarding error:", error);
        return { success: false, error: "Failed to save profile" };
    }
}
