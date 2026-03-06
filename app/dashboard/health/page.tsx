import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHealthHistory } from "@/app/actions/labReports";
import HealthParameters from "@/components/HealthParameters";
import DashboardNavbar from "@/components/DashboardNavbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default async function HealthHistoryPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const { success, history, analyses, error } = await getHealthHistory(session.user.id);

    if (!success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <DashboardNavbar user={session.user} />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
                        <p className="text-slate-500 mb-6">{error || "Could not load health history."}</p>
                        <Link href="/dashboard" className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors inline-block">
                            Go Back
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-20">
            {/* Dashboard Navbar */}
            <DashboardNavbar user={session.user} />

            {/* Main Content */}
            <main className="flex-1">
                <HealthParameters history={history || []} analyses={analyses || {}} />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
