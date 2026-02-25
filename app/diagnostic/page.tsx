import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import DiagnosticPage from "@/components/DiagnosticPage";
import { getDiagnosticsForPatient } from "@/app/actions/diagnostic";

export const metadata = {
    title: "Diagnostic Pathway | NiraivaHealth",
    description:
        "Interactive condition pathway visualising diagnosis, treatment, and health trends.",
};

export default async function DiagnosticRoute() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const [userData] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

    if (!userData) redirect("/login");
    if (!userData.isOnboarded) redirect("/onboarding");

    const [patientData] = await db
        .select()
        .from(patients)
        .where(eq(patients.userId, userData.id))
        .limit(1);

    if (!patientData) redirect("/dashboard");

    // Fetch all doctor-created diagnostic pathways for this patient
    const diagnostics = await getDiagnosticsForPatient(patientData.id);

    return (
        <DiagnosticPage
            user={{
                id: userData.id,
                name: userData.name,
                customId: userData.customId,
                image: userData.image,
                email: userData.email,
            }}
            patient={{
                name: userData.name,
                age: patientData.age,
                dateOfBirth: patientData.dateOfBirth,
                gender: patientData.gender,
                bloodGroup: patientData.bloodGroup,
                height: patientData.height,
                weight: patientData.weight,
                chronicConditions: patientData.chronicConditions,
            }}
            diagnostics={diagnostics}
        />
    );
}
