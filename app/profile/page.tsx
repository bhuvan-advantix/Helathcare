import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, patients, doctors } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProfileView from '@/components/ProfileView';
import DoctorProfileView from '@/components/DoctorProfileView';
import DashboardNavbar from '@/components/DashboardNavbar';
import DoctorNavbar from '@/components/doctor/DoctorNavbar';
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

    // Fetch profile data based on role
    let patientData = null;
    let doctorData = null;

    if (userData.role === 'patient') {
        const [patient] = await db.select().from(patients).where(eq(patients.userId, userId)).limit(1);
        patientData = patient;
    } else if (userData.role === 'doctor') {
        const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId)).limit(1);
        doctorData = doctor;
    }

    // Prepare data object
    const user = {
        id: userData.id,
        name: userData.name || "User",
        customId: userData.customId || "Pending",
        email: userData.email,
        image: userData.image || null,
        isOnboarded: userData.isOnboarded,
        role: userData.role
    };

    const patient = patientData ? {
        ...patientData,
        createdAt: patientData.createdAt?.toISOString() || null
    } : null;

    const doctor = doctorData ? {
        ...doctorData,
        createdAt: doctorData.createdAt?.toISOString() || null
    } : null;

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            {user.role === 'doctor' ? (
                <DoctorNavbar user={user} />
            ) : (
                <DashboardNavbar user={user} />
            )}
            <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {user.role === 'doctor' ? (
                    <DoctorProfileView user={user} doctor={doctor} />
                ) : (
                    <ProfileView user={user} patient={patient} />
                )}
            </main>
            <Footer />
        </div>
    );
}
