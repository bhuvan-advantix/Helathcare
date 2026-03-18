import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { validatePostCheckinToken } from "@/app/actions/checkin";
import { db } from "@/db";
import { users, timelineEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import PostCheckinForm from "@/components/checkin/PostCheckinForm";

export const metadata = {
    title: "Post-Visit Follow-Up | NiraivaHealth",
    description: "Share how you're feeling after your appointment.",
};

interface Props {
    params: Promise<{ token: string }>;
}

export default async function PostCheckinPage({ params }: Props) {
    const { token } = await params;

    // 1. Must be logged in
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect(`/login?callbackUrl=/post-checkin/${token}&message=Please+log+in+to+access+your+follow-up+form`);
    }
    if (session.user.role !== 'patient') {
        redirect('/');
    }

    // 2. Validate token
    const validation = await validatePostCheckinToken(token);

    if (!validation.valid) {
        const reason = validation.alreadySubmitted
            ? 'already_submitted'
            : validation.expired
                ? 'expired'
                : 'invalid';
        return <PostCheckinForm token={token} status={reason} session={null} appointmentInfo={null} />;
    }

    const { data } = validation;

    // 3. Security: logged-in user must match this token's patient
    if (data!.patientUserId !== session.user.id) {
        return <PostCheckinForm token={token} status="wrong_patient" session={null} appointmentInfo={null} />;
    }

    // 4. Fetch appointment info
    const [appt] = await db.select()
        .from(timelineEvents)
        .where(eq(timelineEvents.id, data!.appointmentId))
        .limit(1);

    const [user] = await db.select({ name: users.name, customId: users.customId })
        .from(users).where(eq(users.id, session.user.id)).limit(1);

    const desc = appt?.description || '';
    const doctorMatch = desc.match(/Doctor:\s*([^\n]+)/);
    const hospitalMatch = desc.match(/Hospital:\s*([^\n]+)/);
    // Also handle "Consultation with Dr. X" title format
    const titleDoctorMatch = appt?.title?.match(/with (.+)/);

    const appointmentInfo = {
        date: appt?.eventDate || '',
        doctorName: doctorMatch?.[1]?.trim() || titleDoctorMatch?.[1]?.trim() || null,
        hospitalName: hospitalMatch?.[1]?.trim() || null,
        patientName: user?.name || session.user.name || 'Patient',
        customId: user?.customId || '',
    };

    return (
        <PostCheckinForm
            token={token}
            status="valid"
            session={{ userId: session.user.id, name: session.user.name }}
            appointmentInfo={appointmentInfo}
        />
    );
}
