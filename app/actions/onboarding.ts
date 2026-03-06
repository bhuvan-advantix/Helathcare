"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patients, doctors, deletedAccounts } from "@/db/schema";
import { eq, desc, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(role: "patient" | "doctor", formData: any, avatarUrl?: string) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    try {
        // 0. Check if User is already Onboarded
        const [existingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!existingUser) {
            return { success: false, error: "User not found. Please sign out and sign in again." };
        }

        if (existingUser.isOnboarded) {
            return { success: false, error: "Account already exists and is setup. Please login." };
        }

        // 1. Check for Duplicate Phone Number
        const fullPhone = `${formData.countryCode} ${formData.phone}`;
        const [existingPatient] = await db.select().from(patients).where(eq(patients.phoneNumber, fullPhone)).limit(1);
        const [existingDoctor] = await db.select().from(doctors).where(eq(doctors.phoneNumber, fullPhone)).limit(1);

        if (existingPatient || existingDoctor) {
            return { success: false, error: "This phone number is already linked to an existing account. Kindly login with that existing account." };
        }

        // 2. Generate Custom ID with Retry Mechanism (Optimistic Locking)
        let newCustomId = "";
        let isUnique = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        // Determine ID Prefix based on Role
        const idPrefix = role === "doctor" ? "#DR" : "#Nrivaa";

        while (!isUnique && attempts < MAX_ATTEMPTS) {
            attempts++;

            // Fetch ALL users with IDs matching this prefix from BOTH active and deleted accounts
            // This prevents ID reuse when accounts are deleted
            const activeUsers = await db.select({ customId: users.customId })
                .from(users)
                .where(like(users.customId, `${idPrefix}%`));

            const deletedUsers = await db.select({ customId: deletedAccounts.customId })
                .from(deletedAccounts)
                .where(like(deletedAccounts.customId, `${idPrefix}%`));

            // Combine both lists
            const allIdsEverUsed = [...activeUsers, ...deletedUsers];

            let maxNum = 0;

            // Extract numeric part from each ID and find the maximum
            for (const record of allIdsEverUsed) {
                if (record.customId) {
                    const numStr = record.customId.replace(idPrefix, "");
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            }

            // Next ID is max + 1
            const nextNum = maxNum + 1;
            newCustomId = `${idPrefix}${nextNum.toString().padStart(3, "0")}`;

            // Double-check uniqueness in active users only (deleted IDs can be duplicated in archive)
            const [conflict] = await db.select().from(users).where(eq(users.customId, newCustomId)).limit(1);
            if (!conflict) {
                isUnique = true;
            }
        }

        if (!isUnique) {
            return { success: false, error: "System busy. Please try again." };
        }


        // 3. Update User Table
        // We catch unique constraint errors here in case the ID was taken in the microsecond between check and update
        try {
            await db.update(users)
                .set({
                    role: role,
                    isOnboarded: true,
                    customId: newCustomId,
                    name: formData.name, // Ensure name is synced if changed
                    image: avatarUrl || undefined,
                })
                .where(eq(users.id, userId));
        } catch (e: any) {
            if (e.message?.includes('UNIQUE constraint failed') || e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                // Fallback: This user might have hit a race condition on customId (or email, but email didn't change).
                // In a production app, we would loop this update inside the retry block.
                // For now, let's try ONE more time with a higher number just to be safe, or ask user to retry.
                return { success: false, error: "System busy generating ID. Please try again." };
            }
            throw e;
        }

        // 4. Insert into Role Specific Table
        if (role === "patient") {
            await db.insert(patients).values({
                userId: userId,
                // Personal
                dateOfBirth: formData.dob,
                age: formData.age ? parseInt(formData.age) : null,
                gender: formData.gender,
                phoneNumber: fullPhone,
                address: formData.address,
                city: formData.city,
                maritalStatus: formData.maritalStatus,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: `${formData.emergencyContactCountryCode} ${formData.emergencyContactPhone}`,
                guardianName: formData.guardianName,
                guardianRelation: formData.guardianRelation,

                // Medical
                bloodGroup: formData.bloodGroup,
                height: formData.height,
                weight: formData.weight,
                allergies: formData.allergies,
                currentMedications: formData.currentMedications,
                pastSurgeries: formData.pastSurgeries,
                chronicConditions: formData.chronicConditions,
                lifestyle: formData.lifestyle,
            });
        } else if (role === "doctor") {
            await db.insert(doctors).values({
                userId: userId,
                // Personal
                dateOfBirth: formData.dob,
                age: formData.age ? parseInt(formData.age) : null,
                gender: formData.gender,
                phoneNumber: fullPhone,
                address: formData.address,
                city: formData.city,
                maritalStatus: formData.maritalStatus,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: `${formData.emergencyContactCountryCode} ${formData.emergencyContactPhone}`,
                guardianName: formData.guardianName,
                guardianRelation: formData.guardianRelation,

                // Professional
                specialization: formData.specialization,
                clinicName: formData.clinicName,
                licenseNumber: formData.licenseNumber,
                experienceYears: formData.experience ? parseInt(formData.experience) : 0,
                degree: formData.degree,
                hospitalTiming: formData.hospitalTiming,
                workingDays: formData.workingDays,
                bio: formData.bio,
            });
        }

        revalidatePath("/");
        return { success: true, customId: newCustomId };

    } catch (error) {
        console.error("Onboarding Error:", error);
        return { success: false, error: "Failed to complete onboarding" };
    }
}
