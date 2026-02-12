import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path if needed
import { redirect } from "next/navigation";
import { db, ensureLabReportsSchema } from "@/db";
import { users, patients, medications, labReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import PatientDashboard from '@/components/PatientDashboard';
import { getLatestHealthParameters } from '@/app/actions/labReports';

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

    if (patientData) {
        await ensureLabReportsSchema();
        patientMedications = await db.select().from(medications).where(eq(medications.patientId, patientData.id));
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
        healthParameters: healthParams
    };

    return <PatientDashboard data={dashboardData} />;
}
