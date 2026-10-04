import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, patients, doctors, doctorPatientRelations } from "@/db/schema";
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
        const [doctor] = await db.select({ id: doctors.id })
            .from(doctors)
            .where(eq(doctors.userId, session.user.id))
            .limit(1);

        if (!doctor) {
            return NextResponse.json({ error: "Doctor profile not found" }, { status: 403 });
        }

        // Search only the current doctor's explicitly linked patients.
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
            .from(doctorPatientRelations)
            .innerJoin(patients, eq(patients.id, doctorPatientRelations.patientId))
            .innerJoin(users, eq(users.id, patients.userId))
            .where(
                and(
                    eq(doctorPatientRelations.doctorId, doctor.id),
                    eq(users.role, 'patient'),
                    or(
                        ilike(users.customId, `%${query}%`),  // matches anywhere in ID
                        ilike(users.name, `%${query}%`),       // case-insensitive name search
                        ilike(users.email, `%${query}%`),      // also allow email search
                    )
                )
            )
            .limit(15);


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
