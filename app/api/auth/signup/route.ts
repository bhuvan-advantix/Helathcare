import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, role } = body;

        // Validation
        if (!email || !password || !role) {
            return NextResponse.json(
                { error: "Email, password, and role are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters long" },
                { status: 400 }
            );
        }

        if (!['patient', 'doctor'].includes(role)) {
            return NextResponse.json(
                { error: "Invalid role. Must be 'patient' or 'doctor'" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const [existingUser] = await db.select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await db.insert(users).values({
            email,
            password: hashedPassword,
            role,
            isOnboarded: false,
        });

        return NextResponse.json(
            { message: "Account created successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Failed to create account. Please try again." },
            { status: 500 }
        );
    }
}
