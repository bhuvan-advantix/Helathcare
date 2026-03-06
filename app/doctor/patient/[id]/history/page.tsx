import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { patients, users, healthParameters, labReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import DoctorNavbar from "@/components/doctor/DoctorNavbar";
import Footer from "@/components/Footer";
import HealthParameters from "@/components/HealthParameters";

export default async function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        redirect('/login');
    }

    const { id: patientId } = await params;

    // Fetch Patient & User Details
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

    // Fetch Health History
    const history = await db.select().from(healthParameters)
        .where(eq(healthParameters.patientId, patient.id))
        .orderBy(desc(healthParameters.testDate));

    // Fetch analyses linked to lab reports
    const reports = await db.select({
        id: labReports.id,
        analysis: labReports.analysis
    }).from(labReports).where(eq(labReports.patientId, patient.id));

    const analyses: Record<string, string> = {};
    reports.forEach(r => {
        if (r.analysis) analyses[r.id] = r.analysis;
    });

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col pt-20">
            {/* Doctor Navbar */}
            <DoctorNavbar user={session.user} />

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
                <div className="mb-6 px-4">
                    <h1 className="text-3xl font-black text-teal-600">
                        Patient Health History
                    </h1>
                    <p className="text-base text-slate-500 mt-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                        Viewing historical health parameters for <span className="text-2xl font-black text-teal-600 mt-1 sm:mt-0">{user.name || user.customId}</span>
                    </p>
                </div>
                {/* Health Parameters Component Box */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden pt-4 -mx-4 sm:mx-0">
                    <HealthParameters history={history || []} analyses={analyses || {}} />
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
