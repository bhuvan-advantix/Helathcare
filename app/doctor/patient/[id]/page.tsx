import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { patients, users, labReports, healthParameters, timelineEvents, medications, patientAllergies, patientConditions, doctorPrivateNotes, doctors, patientVitals } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import DoctorNavbar from "@/components/doctor/DoctorNavbar";
import Footer from "@/components/Footer";
import DoctorPatientProfileView from "@/components/doctor/DoctorPatientProfileView";
import { autoStopExpiredMedications } from "@/app/actions/medications";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
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

    // Auto-stop any medications whose duration has passed
    await autoStopExpiredMedications(patient.id);

    // Parallel Fetching
    const [
        reports,
        paramsData,
        timeline,
        meds,
        allergies,
        conditions,
        privateNotes,
        allDoctors,
        staffVitals,
    ] = await Promise.all([
        db.select().from(labReports).where(eq(labReports.patientId, patient.id)).orderBy(desc(labReports.uploadedAt)),
        db.select().from(healthParameters).where(eq(healthParameters.patientId, patient.id)).orderBy(desc(healthParameters.testDate)),
        db.select().from(timelineEvents).where(eq(timelineEvents.userId, user.id)).orderBy(desc(timelineEvents.eventDate)),
        db.select().from(medications).where(eq(medications.patientId, patient.id)).orderBy(desc(medications.createdAt)),
        db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patient.id)),
        db.select().from(patientConditions).where(eq(patientConditions.patientId, patient.id)),
        // Fetch ALL private notes for this patient (all doctors, all consultations) newest first
        db.select().from(doctorPrivateNotes).where(eq(doctorPrivateNotes.patientId, patient.id)).orderBy(desc(doctorPrivateNotes.createdAt)),
        // Fetch all doctors so we can resolve names from doctorId
        db.select({ id: doctors.id, userId: doctors.userId, specialization: doctors.specialization, clinicName: doctors.clinicName }).from(doctors),
        // Fetch staff-recorded vitals (BP, temp, pulse, SpO2, etc.) newest first
        db.select().from(patientVitals).where(eq(patientVitals.patientId, patient.id)).orderBy(desc(patientVitals.recordedAt)).limit(5),
    ]);

    const doctorMap: Record<string, { name: string; specialization: string; clinicName: string }> = {};
    for (const d of allDoctors) {
        const u = await db.select({ name: users.name }).from(users).where(eq(users.id, d.userId)).limit(1);
        doctorMap[d.id] = { name: u[0]?.name || 'Unknown Doctor', specialization: d.specialization, clinicName: d.clinicName || '' };
    }

    const enrichedPrivateNotes = privateNotes.map(note => {
        const docInfo = doctorMap[note.doctorId] || { name: 'Unknown Doctor', clinicName: 'Unknown Clinic' };
        return {
            ...note,
            doctorName: `Dr. ${docInfo.name}`,
            clinicName: docInfo.clinicName || 'Unknown Clinic'
        };
    });

    // Build Consultation History: one entry per completed appointment timeline event (created by doctor)
    const consultationEvents = timeline.filter((e: any) =>
        e.eventType === 'appointment' && e.status === 'completed' && e.createdBy === 'doctor'
    );

    const consultationHistory = consultationEvents.map((event: any) => {
        const eventDate = event.eventDate; // YYYY-MM-DD
        const doctorInfo = event.doctorId ? doctorMap[event.doctorId] : null;

        // Medications prescribed on this date by this doctor
        const doctorDisplayName = doctorInfo ? `Dr. ${doctorInfo.name}` : null;
        const prescribedMeds = meds.filter((m: any) =>
            m.startDate === eventDate &&
            (doctorDisplayName ? m.addedBy === doctorDisplayName : m.addedBy?.startsWith('Dr.'))
        );

        // Vitals recorded on this date
        const vitalsOnDate = paramsData.filter((p: any) => {
            const pDate = (p.testDate || '').toString().slice(0, 10);
            return pDate === eventDate;
        });

        // Private doctor note closest in time to this event (same doctor)
        const privateNote = event.doctorId
            ? privateNotes.find((n: any) => {
                const nDate = n.createdAt
                    ? new Date(typeof n.createdAt === 'number' ? n.createdAt : n.createdAt).toISOString().slice(0, 10)
                    : '';
                return n.doctorId === event.doctorId && nDate === eventDate;
            })
            : null;

        // Parse diagnosis and patient advice from event description
        let diagnosis = '';
        let patientAdvice = '';
        const desc = event.description || '';
        const diagMatch = desc.match(/Diagnosis:\s*(.+?)(?:\.|$|\n)/i);
        const adviceMatch = desc.match(/Doctor's Advice:\s*([\s\S]+?)(?:$)/i);
        if (diagMatch) diagnosis = diagMatch[1].trim();
        if (adviceMatch) patientAdvice = adviceMatch[1].trim();

        // Find follow-up event: pending appointment by same doctor, with eventDate AFTER this consultation's date
        const followUpEvent = event.doctorId
            ? timeline.find((e: any) =>
                e.eventType === 'appointment' &&
                e.status === 'pending' &&
                e.createdBy === 'doctor' &&
                e.doctorId === event.doctorId &&
                e.eventDate > eventDate
            )
            : null;

        return {
            id: event.id,
            date: eventDate,
            createdAt: event.createdAt,
            doctorId: event.doctorId,
            doctorName: doctorInfo ? `Dr. ${doctorInfo.name}` : 'Unknown Doctor',
            doctorSpecialization: doctorInfo?.specialization || '',
            doctorClinic: doctorInfo?.clinicName || '',
            diagnosis,
            patientAdvice,
            prescribedMeds,
            vitals: vitalsOnDate,
            privateNote: privateNote?.noteContent || null,
            followUpDate: followUpEvent?.eventDate || null,
        };
    });

    // Sort: latest consultation first (newest createdAt on top)
    consultationHistory.sort((a: any, b: any) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()) : 0;
        if (bTime !== aTime) return bTime - aTime;
        // fallback: compare eventDate strings
        return b.date > a.date ? 1 : b.date < a.date ? -1 : 0;
    });

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DoctorNavbar user={session.user} />
            <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <DoctorPatientProfileView
                    patient={{ ...user, ...patient, userId: user.id }}
                    doctor={doctor}
                    reports={reports}
                    healthParams={paramsData}
                    timeline={timeline}
                    medications={meds}
                    allergies={allergies}
                    conditions={conditions}
                    privateNotes={enrichedPrivateNotes}
                    consultationHistory={consultationHistory}
                    staffVitals={staffVitals.map(v => ({ ...v, recordedAt: v.recordedAt ? v.recordedAt.toISOString() : null }))}
                />
            </main>
            <Footer />
        </div>
    );
}
