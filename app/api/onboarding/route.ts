import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, patients, doctors } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { role, formData, selectedAvatar } = body;

        // Update user with role and onboarding status
        await db.update(users)
            .set({
                role: role,
                isOnboarded: true,
                image: selectedAvatar || session.user.image,
                name: formData.name,
            })
            .where(eq(users.email, session.user.email));

        // Get the updated user to get the ID
        const [user] = await db.select()
            .from(users)
            .where(eq(users.email, session.user.email))
            .limit(1);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Create role-specific record
        if (role === "patient") {
            await db.insert(patients).values({
                userId: user.id,
                dateOfBirth: formData.dob,
                gender: formData.gender,
                bloodGroup: formData.bloodGroup,
                phoneNumber: formData.phone,
                address: formData.address,
                medicalHistory: formData.medicalHistory,
            });
        } else if (role === "doctor") {
            await db.insert(doctors).values({
                userId: user.id,
                specialization: formData.specialization,
                licenseNumber: formData.licenseNumber || "PENDING",
                experienceYears: parseInt(formData.experience) || 0,
                phoneNumber: formData.phone,
                bio: formData.bio || formData.address,
            });
        }

        return NextResponse.json({ success: true, role });
    } catch (error) {
        console.error("Onboarding error:", error);
        return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
    }
}
