import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { patients, users, labReports, healthParameters, timelineEvents, medications, patientAllergies, patientConditions, doctorPrivateNotes, doctors, patientVitals } from "@/db/schema";
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

    // Fetch Doctor with their user name (name lives in users table, not doctors table)
    const doctorRow = await db
        .select({ doctor: doctors, userName: users.name })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(doctors.userId, session.user.id))
        .limit(1);
    if (!doctorRow.length) redirect('/doctor/onboarding');
    const { doctor, userName: doctorUserName } = doctorRow[0];
    const doctorWithName = { ...doctor, userName: doctorUserName };

    // Parallel Fetching of all medical data
    const [
        reports,
        paramsData,
        timeline,
        meds,
        allergies,
        conditions,
        privateNotes,
        staffVitalsRaw,
    ] = await Promise.all([
        db.select().from(labReports).where(eq(labReports.patientId, patient.id)).orderBy(desc(labReports.uploadedAt)),
        db.select().from(healthParameters).where(eq(healthParameters.patientId, patient.id)).orderBy(desc(healthParameters.testDate)),
        db.select().from(timelineEvents).where(eq(timelineEvents.userId, user.id)).orderBy(desc(timelineEvents.eventDate)),
        db.select().from(medications).where(eq(medications.patientId, patient.id)).orderBy(desc(medications.createdAt)),
        db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patient.id)),
        db.select().from(patientConditions).where(eq(patientConditions.patientId, patient.id)),
        db.select().from(doctorPrivateNotes).where(and(eq(doctorPrivateNotes.patientId, patient.id), eq(doctorPrivateNotes.doctorId, doctor.id))),
        // Fetch staff-recorded vitals — newest first; limit to latest 5
        db.select().from(patientVitals).where(eq(patientVitals.patientId, patient.id)).orderBy(desc(patientVitals.recordedAt)).limit(5),
    ]);

    // Serialise Date objects so they survive the Server → Client boundary
    const staffVitals = staffVitalsRaw.map(v => ({
        ...v,
        recordedAt: v.recordedAt ? v.recordedAt.toISOString() : null,
    }));

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DoctorNavbar user={session.user} />
            <main className="flex-grow pt-28 pb-12 w-full">
                <DoctorConsultationView
                    patient={{ ...user, ...patient, userId: user.id }}
                    doctor={doctorWithName}
                    reports={reports}
                    healthParams={paramsData}
                    timeline={timeline}
                    medications={meds}
                    allergies={allergies}
                    conditions={conditions}
                    privateNotes={privateNotes}
                    staffVitals={staffVitals}
                />
            </main>
        </div>
    );
}
