import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { patients, users, labReports, healthParameters, timelineEvents, medications, patientAllergies, patientConditions, doctorPrivateNotes, doctors } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import DoctorConsultationView from "@/components/doctor/DoctorConsultationView";
import DoctorNavbar from "@/components/doctor/DoctorNavbar";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        redirect('/login');
    }

    const { id: patientId } = await params;

    // Fetch Patient Details
    const patientData = await db.select({
        patient: patients,
        user: users,
    })
        .from(patients)
        .innerJoin(users, eq(patients.userId, users.id))
        .where(eq(patients.id, patientId))
        .limit(1);

    if (patientData.length === 0) {
        return notFound();
    }

    const { patient, user } = patientData[0];

    // Fetch Doctor's ID (current session user)
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, session.user.id)).limit(1);
    if (!doctor) redirect('/doctor/onboarding');

    // Parallel Fetching of all medical data
    const [
        reports,
        paramsData,
        timeline,
        meds,
        allergies,
        conditions,
        privateNotes
    ] = await Promise.all([
        db.select().from(labReports).where(eq(labReports.patientId, patient.id)).orderBy(desc(labReports.uploadedAt)),
        db.select().from(healthParameters).where(eq(healthParameters.patientId, patient.id)).orderBy(desc(healthParameters.testDate)),
        db.select().from(timelineEvents).where(eq(timelineEvents.userId, user.id)).orderBy(desc(timelineEvents.eventDate)),
        db.select().from(medications).where(eq(medications.patientId, patient.id)).orderBy(desc(medications.createdAt)),
        db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patient.id)),
        db.select().from(patientConditions).where(eq(patientConditions.patientId, patient.id)),
        db.select().from(doctorPrivateNotes).where(and(eq(doctorPrivateNotes.patientId, patient.id), eq(doctorPrivateNotes.doctorId, doctor.id))),
    ]);

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DoctorNavbar user={session.user} />
            <main className="flex-grow pt-28 pb-12 w-full">
                <DoctorConsultationView
                    patient={{ ...user, ...patient, userId: user.id }}
                    doctor={doctor}
                    reports={reports}
                    healthParams={paramsData}
                    timeline={timeline}
                    medications={meds}
                    allergies={allergies}
                    conditions={conditions}
                    privateNotes={privateNotes}
                />
            </main>
        </div>
    );
}
