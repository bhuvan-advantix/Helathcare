import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path if needed
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, patients, medications } from "@/db/schema";
import { eq } from "drizzle-orm";
import PatientDashboard from '@/components/PatientDashboard';

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
    if (patientData) {
        patientMedications = await db.select().from(medications).where(eq(medications.patientId, patientData.id));
    }

    // Prepare data object (serializing dates/etc if needed)
    const dashboardData = {
        user: {
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
            }))
        } : null
    };

    return <PatientDashboard data={dashboardData} />;
}
