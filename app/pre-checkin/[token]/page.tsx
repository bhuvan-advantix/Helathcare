import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { validatePreCheckinToken } from "@/app/actions/checkin";
import { db } from "@/db";
import { patients, users, timelineEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import PreCheckinForm from "@/components/checkin/PreCheckinForm";

export const metadata = {
    title: "Pre-Visit Check-In | NiraivaHealth",
    description: "Complete your pre-visit form before your appointment.",
};

interface Props {
    params: Promise<{ token: string }>;
}

export default async function PreCheckinPage({ params }: Props) {
    const { token } = await params;

    // 1. Must be logged in
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect(`/login?callbackUrl=/pre-checkin/${token}&message=Please+log+in+to+access+your+pre-check-in+form`);
    }
    if (session.user.role !== 'patient') {
        redirect('/');
    }

    // 2. Validate token
    const validation = await validatePreCheckinToken(token);

    if (!validation.valid) {
        const reason = validation.alreadySubmitted
            ? 'already_submitted'
            : validation.expired
                ? 'expired'
                : 'invalid';
        return <PreCheckinForm token={token} status={reason} session={null} appointmentInfo={null} />;
    }

    const { data } = validation;

    // 3. Security: logged-in user must match this token's patient
    if (data!.patientUserId !== session.user.id) {
        return <PreCheckinForm token={token} status="wrong_patient" session={null} appointmentInfo={null} />;
    }

    // 4. Fetch appointment and patient info for display
    const [appt] = await db.select()
        .from(timelineEvents)
        .where(eq(timelineEvents.id, data!.appointmentId))
        .limit(1);

    const [user] = await db.select({ name: users.name, email: users.email, customId: users.customId })
        .from(users).where(eq(users.id, session.user.id)).limit(1);

    // Parse appointment details from description
    const desc = appt?.description || '';
    const doctorMatch = desc.match(/Doctor:\s*([^\n]+)/);
    const hospitalMatch = desc.match(/Hospital:\s*([^\n]+)/);
    const timeMatch = desc.match(/Time:\s*([^\n]+)/);

    const appointmentInfo = {
        date: appt?.eventDate || '',
        doctorName: doctorMatch?.[1]?.trim() || null,
        hospitalName: hospitalMatch?.[1]?.trim() || null,
        time: timeMatch?.[1]?.trim() || null,
        patientName: user?.name || session.user.name || 'Patient',
        customId: user?.customId || '',
    };

    return (
        <PreCheckinForm
            token={token}
            status="valid"
            session={{ userId: session.user.id, name: session.user.name }}
            appointmentInfo={appointmentInfo}
        />
    );
}
