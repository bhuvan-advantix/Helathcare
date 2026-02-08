import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import HelpSupportView from "@/components/HelpSupportView";
import DashboardNavbar from "@/components/DashboardNavbar";
import Footer from "@/components/Footer";

export default async function HelpSupportPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/");
    }

    const user = session.user;

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DashboardNavbar user={user} />

            <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <HelpSupportView />
            </main>

            <Footer />
        </div>
    );
}
