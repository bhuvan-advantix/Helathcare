import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, patients } from "@/db/schema";
import { ilike, and, eq, like, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
        return NextResponse.json({ patients: [] });
    }

    try {
        // We JOIN with patients table to get age/gender and the correct Patient ID
        const rawPatients = await db.select({
            id: patients.id, // We want the PATIENT ID for actions/links
            userId: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            customId: users.customId,
            role: users.role,
            age: patients.age,
            gender: patients.gender,
            dateOfBirth: patients.dateOfBirth,
        })
            .from(users)
            .innerJoin(patients, eq(users.id, patients.userId))
            .where(
                and(
                    eq(users.role, 'patient'),
                    or(
                        like(users.customId, `%${query}`), // Matches end of customId
                        like(users.name, `%${query}%`) // Also search by name
                    )
                )
            )
            .limit(10);

        const matchingPatients = rawPatients.map(p => {
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
            return { ...p, age };
        });

        return NextResponse.json({ patients: matchingPatients });
    } catch (error) {
        console.error("Error searching patients:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
