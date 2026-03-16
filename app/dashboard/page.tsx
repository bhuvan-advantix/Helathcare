import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, ensureLabReportsSchema, ensureMedicationsSchema } from "@/db";
import { users, patients, medications, labReports, timelineEvents, doctors, patientDiagnostics } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import PatientDashboard from '@/components/PatientDashboard';
import { getLatestHealthParameters } from '@/app/actions/labReports';
import { autoStopExpiredMedications } from '@/app/actions/medications';
import { getPrescriptionsForPatient } from '@/app/actions/consultation';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const userId = session.user.id;

    // Fetch User and Patient details
    const [userData] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!userData) {
        redirect("/login");
    }

    if (!userData.isOnboarded) {
        redirect("/onboarding");
    }

    // For now, assume it's a patient. We can add a check for 'doctor' later.
    const [patientData] = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);

    // Fetch Medications if patient exists
    let patientMedications: any[] = [];
    let patientReports: any[] = [];
    let healthParams: Record<string, any> = {};
    let patientDoctorNotes: any[] = [];
    let diagnosticConditions: { id: string; conditionName: string; conditionStatus: string; createdAt: string | null }[] = [];
    let upcomingAppointmentsForDashboard: { id: string; title: string; eventDate: string; status: string | null; description: string | null }[] = [];
    let patientPrescriptions: any[] = [];

    if (patientData) {
        await ensureLabReportsSchema();
        await ensureMedicationsSchema();
        // Auto-stop any medications whose duration has elapsed
        await autoStopExpiredMedications(patientData.id);
        patientMedications = await db.select().from(medications).where(eq(medications.patientId, patientData.id));

        // Fetch this patient's diagnostic conditions (set by doctor on Diagnostic page)
        const diagnosticRows = await db
            .select({
                id: patientDiagnostics.id,
                conditionName: patientDiagnostics.conditionName,
                conditionStatus: patientDiagnostics.conditionStatus,
                createdAt: patientDiagnostics.createdAt,
            })
            .from(patientDiagnostics)
            .where(eq(patientDiagnostics.patientId, patientData.id));

        diagnosticConditions = diagnosticRows.map(r => ({
            id: r.id,
            conditionName: r.conditionName,
            conditionStatus: r.conditionStatus ?? 'stable',
            createdAt: r.createdAt?.toISOString() ?? null,
        }));
        patientReports = await db.query.labReports.findMany({
            where: eq(labReports.patientId, patientData.id),
            orderBy: (reports, { desc }) => [desc(reports.uploadedAt)],
            columns: {
                id: true,
                patientId: true,
                fileName: true,
                reportDate: true,
                labName: true,
                patientName: true,
                doctorName: true,
                fileSize: true,
                pageCount: true,
                uploadedAt: true
            }
        });

        // Fetch latest health parameters
        const healthParamsResult = await getLatestHealthParameters(userId);
        if (healthParamsResult.success && healthParamsResult.parameters) {
            healthParams = healthParamsResult.parameters;
        }

        // Fetch patient-visible doctor notes from timeline events (created by doctor, type=appointment, status=completed)
        const doctorEvents = await db.select()
            .from(timelineEvents)
            .where(and(
                eq(timelineEvents.userId, userId),
                eq(timelineEvents.createdBy, 'doctor'),
                eq(timelineEvents.eventType, 'appointment'),
                eq(timelineEvents.status, 'completed')
            ))
            .orderBy(desc(timelineEvents.createdAt))
            .limit(10);

        // Fetch staff-scheduled upcoming appointments (visible to patient)
        const staffAppointments = await db.select()
            .from(timelineEvents)
            .where(and(
                eq(timelineEvents.userId, userId),
                eq(timelineEvents.createdBy, 'staff'),
                eq(timelineEvents.eventType, 'appointment')
            ))
            .orderBy(desc(timelineEvents.eventDate))
            .limit(20);

        // For each event, try to get the doctor's name
        const doctorIds = [...new Set(doctorEvents.map(e => e.doctorId).filter(Boolean))];
        const doctorRecords: Record<string, any> = {};
        for (const docId of doctorIds) {
            if (docId) {
                const [doc] = await db.select().from(doctors).where(eq(doctors.id, docId)).limit(1);
                if (doc) {
                    const [docUser] = await db.select().from(users).where(eq(users.id, doc.userId)).limit(1);
                    if (docUser) {
                        doctorRecords[docId] = {
                            name: docUser.name || 'Doctor',
                            specialty: doc.specialization || 'General Physician'
                        };
                    }
                }
            }
        }

        patientDoctorNotes = doctorEvents.map(event => ({
            id: event.id,
            doctorId: event.doctorId,
            doctorName: event.doctorId && doctorRecords[event.doctorId]
                ? `Dr. ${doctorRecords[event.doctorId].name}`
                : event.title.replace('Consultation with ', '').trim(),
            specialty: event.doctorId && doctorRecords[event.doctorId]
                ? doctorRecords[event.doctorId].specialty
                : 'General Physician',
            date: (() => {
                if (!event.eventDate) return '';
                try {
                    return new Date(event.eventDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    });
                } catch {
                    return event.eventDate;
                }
            })(),
            note: event.description || '',
            createdAt: event.createdAt?.toISOString() || null,
        }));

        // Map staff appointments for patient view
        upcomingAppointmentsForDashboard = staffAppointments.map(e => ({
            id: e.id,
            title: e.title,
            eventDate: e.eventDate,
            status: e.status,
            description: e.description,
        }));

        // Fetch prescriptions for this patient
        const prescriptionsResult = await getPrescriptionsForPatient(patientData.id);
        if (prescriptionsResult.success && prescriptionsResult.data) {
            patientPrescriptions = prescriptionsResult.data.map(p => ({
                ...p,
                prescribedAt: p.prescribedAt ? new Date(p.prescribedAt).toISOString() : null,
            }));
        }
    }

    // Prepare data object (serializing dates/etc if needed)
    const dashboardData = {
        user: {
            id: userData.id,
            name: userData.name || "User",
            customId: userData.customId || "Pending",
            email: userData.email,
            image: userData.image || null,
        },
        patient: patientData ? {
            ...patientData,
            // Convert Date objects to strings for Client Component
            createdAt: patientData.createdAt?.toISOString() || null,
            medications: patientMedications.map(m => ({
                ...m,
                createdAt: m.createdAt?.toISOString() || null
            })),
            reports: patientReports.map(r => ({
                ...r,
                reportDate: r.reportDate ? r.reportDate.toString() : null, // Ensure string
                uploadedAt: r.uploadedAt?.toISOString() || null,
            }))
        } : null,
        healthParameters: healthParams,
        doctorNotes: patientDoctorNotes,
        diagnosticConditions,
        upcomingAppointments: upcomingAppointmentsForDashboard,
        prescriptions: patientPrescriptions,
    };

    return <PatientDashboard data={dashboardData} />;
}
