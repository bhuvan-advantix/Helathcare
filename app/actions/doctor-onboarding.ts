"use server";

import { db } from "@/db";
import { doctors, users, patients, deletedAccounts } from "@/db/schema";
import { eq, or, like } from "drizzle-orm";
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
        if (existingDoctorPhone.length > 0 && existingDoctorPhone[0].userId !== session.user.id) {
            return { success: false, error: "Phone number already in use by another doctor account." };
        }

        // Create or Update Doctor Profile
        const [existingDoc] = await db.select().from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);

        const doctorPayload = {
            userId: session.user.id,
            dateOfBirth: data.dateOfBirth,
            age: parseInt(data.age) || null,
            gender: data.gender,
            phoneNumber: data.phoneNumber,
            address: data.address,
            city: data.city,
            maritalStatus: data.maritalStatus,
            specialization: data.specialization,
            clinicName: data.clinicName,
            licenseNumber: data.licenseNumber,
            experienceYears: parseInt(data.experienceYears) || 0,
            degree: data.degree,
            hospitalTiming: data.hospitalTiming,
            workingDays: data.workingDays,
            bio: data.bio,
        };

        if (existingDoc) {
            await db.update(doctors).set(doctorPayload).where(eq(doctors.id, existingDoc.id));
        } else {
            await db.insert(doctors).values(doctorPayload);
        }

        // Get user to check if they already have a customId
        const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        let userCustomId = currentUser?.customId;

        // Generate Custom ID if not present
        if (!userCustomId) {
            const idPrefix = "#DR";
            let maxNum = 0;
            
            const activeUsers = await db.select({ customId: users.customId }).from(users).where(like(users.customId, `${idPrefix}%`));
            const delUsers = await db.select({ customId: deletedAccounts.customId }).from(deletedAccounts).where(like(deletedAccounts.customId, `${idPrefix}%`));
            
            const allIds = [...activeUsers, ...delUsers];
            for (const record of allIds) {
                if (record.customId) {
                    const numPart = parseInt(record.customId.replace(idPrefix, ""), 10);
                    if (!isNaN(numPart) && numPart > maxNum) {
                        maxNum = numPart;
                    }
                }
            }
            userCustomId = `${idPrefix}${(maxNum + 1).toString().padStart(3, "0")}`;
        }

        // Update User Onboarding Status, Name, and Custom ID
        await db.update(users)
            .set({ 
                isOnboarded: true,
                customId: userCustomId,
                ...(data.name ? { name: data.name } : {})
            })
            .where(eq(users.id, session.user.id));

        return { success: true, customId: userCustomId };
    } catch (error) {
        console.error("Onboarding error:", error);
        return { success: false, error: "Failed to save profile" };
    }
}
