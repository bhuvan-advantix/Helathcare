import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DoctorOnboardingForm from "@/components/doctor/DoctorOnboardingForm";

export default async function OnboardingPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'doctor') {
        redirect('/login');
    }

    if (session.user.isOnboarded) {
        redirect('/doctor/dashboard');
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <DoctorOnboardingForm user={session.user} />
            </div>
        </div>
    );
}
