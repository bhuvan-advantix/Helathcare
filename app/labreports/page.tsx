
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { patients, labReports } from '@/db/schema';
import LabReports from '@/components/LabReports';

// Force dynamic rendering as this page depends on user session and DB
export const dynamic = 'force-dynamic';

export default async function LabReportsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/login');
    }

    // Get patient data
    const patient = await db.query.patients.findFirst({
        where: eq(patients.userId, session.user.id),
    });

    if (!patient) {
        redirect('/onboarding');
    }

    // Get lab reports
    const reports = await db.query.labReports.findMany({
        where: eq(labReports.patientId, patient.id),
        orderBy: (labReports, { desc }) => [desc(labReports.uploadedAt)],
    });

    return <LabReports user={session.user} reports={reports} variant="page" />;
}
