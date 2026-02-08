import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProfileView from '@/components/ProfileView';
import DashboardNavbar from '@/components/DashboardNavbar';
import Footer from '@/components/Footer';

export default async function ProfilePage() {
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

    // For now, assume it's a patient.
    const [patientData] = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);

    // Prepare data object
    const user = {
        id: userData.id,
        name: userData.name || "User",
        customId: userData.customId || "Pending",
        email: userData.email,
        image: userData.image || null,
        isOnboarded: userData.isOnboarded
    };

    const patient = patientData ? {
        ...patientData,
        createdAt: patientData.createdAt?.toISOString() || null
    } : null;

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DashboardNavbar user={user} />
            <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <ProfileView user={user} patient={patient} />
            </main>
            <Footer />
        </div>
    );
}
