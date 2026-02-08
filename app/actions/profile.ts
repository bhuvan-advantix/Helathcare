'use server'

import { db } from "@/db";
import { users, patients, doctors, deletedAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ... (imports)

export async function updateProfile(userId: string, data: any) {
    try {
        if (!userId) {
            return { success: false, error: "User ID is required" };
        }

        // Update User table fields
        const userUpdates: any = {};
        if (data.name !== undefined) userUpdates.name = data.name;
        // image handling might be separate, but if passed here:
        if (data.image !== undefined) userUpdates.image = data.image;

        if (Object.keys(userUpdates).length > 0) {
            await db.update(users)
                .set(userUpdates)
                .where(eq(users.id, userId));
        }

        // Update Patient table fields
        const patientUpdates: any = {};

        const fieldMap: Record<string, keyof typeof patients.$inferInsert> = {
            dob: 'dateOfBirth',
            age: 'age',
            gender: 'gender',
            phone: 'phoneNumber',
            address: 'address',
            city: 'city',
            bloodGroup: 'bloodGroup',
            height: 'height',
            weight: 'weight',
            emergencyContactName: 'emergencyContactName',
            emergencyContactPhone: 'emergencyContactPhone',
            allergies: 'allergies',
            chronicConditions: 'chronicConditions'
        };

        for (const [dataKey, dbKey] of Object.entries(fieldMap)) {
            if (data[dataKey] !== undefined) {
                if (dbKey === 'age' && data[dataKey]) {
                    patientUpdates[dbKey] = parseInt(data[dataKey] as string);
                } else {
                    patientUpdates[dbKey] = data[dataKey];
                }
            }
        }

        if (Object.keys(patientUpdates).length > 0) {
            await db.update(patients)
                .set(patientUpdates)
                .where(eq(patients.userId, userId));
        }

        revalidatePath('/dashboard');
        revalidatePath('/profile');
        return { success: true };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Failed to update profile" };
    }
}

export async function deleteAccount(userId: string) {
    try {
        if (!userId) {
            return { success: false, error: "User ID is required" };
        }

        // 1. Fetch User Details
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // 2. Fetch Role Specific Details
        let profileData = null;
        if (user.role === 'patient') {
            profileData = await db.query.patients.findFirst({
                where: eq(patients.userId, userId)
            });
        } else if (user.role === 'doctor') {
            profileData = await db.query.doctors.findFirst({
                where: eq(doctors.userId, userId)
            });
        }

        // 3. Archive to Deleted Accounts
        await db.insert(deletedAccounts).values({
            originalUserId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            customId: user.customId,
            reason: 'User requested deletion',
            profileSnapshot: JSON.stringify(profileData),
        });

        // 4. Delete user (cascade should handle related records in patients/doctors tables)
        await db.delete(users).where(eq(users.id, userId));

        return { success: true };
    } catch (error) {
        console.error("Error deleting account:", error);
        return { success: false, error: "Failed to delete account" };
    }
}
