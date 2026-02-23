import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DoctorDashboard from "@/components/doctor/DoctorDashboard";
import DoctorNavbar from "@/components/doctor/DoctorNavbar";
import Footer from "@/components/Footer";

import { getDoctorDashboardStats } from "@/app/actions/doctor";

export default async function Page() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        redirect('/login');
    }

    // Middleware handles onboarding redirect, but safe check
    if (!session.user.isOnboarded) {
        redirect('/doctor/onboarding');
    }

    const dashboardStats = await getDoctorDashboardStats();

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DoctorNavbar user={session.user} />
            <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <DoctorDashboard user={session.user} initialData={dashboardStats} />
            </main>
            <Footer />
        </div>
    );
}
