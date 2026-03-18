import { NextRequest, NextResponse } from "next/server";
import { db, ensureCheckinsSchema } from "@/db";
import { preCheckins, postCheckins, users, timelineEvents } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sendPreCheckinEmail, sendPostCheckinEmail } from "@/lib/email";

// This route is called by a scheduled task (cron) every hour.
// It sends emails for:
//   1. Pre-checkins where appointment is ~24 hrs away and email not yet sent
//   2. Post-checkins where appointment was 2-3 days ago and email not yet sent
//
// To secure this endpoint, it checks for a secret key in the header.

export async function GET(req: NextRequest) {
    // Validate the cron secret — prevents unauthorized calls
    const secret = req.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCheckinsSchema();

    const now = new Date();
    const results: { pre: number; post: number; errors: string[] } = { pre: 0, post: 0, errors: [] };

    // ── 1. Pre-Checkin Emails (appointment within next 24 hrs, email not yet sent) ──
    try {
        const allPre = await db.select().from(preCheckins).where(eq(preCheckins.isSubmitted, false));

        for (const record of allPre) {
            try {
                // Fetch appointment
                const [appt] = await db.select()
                    .from(timelineEvents)
                    .where(eq(timelineEvents.id, record.appointmentId))
                    .limit(1);
                if (!appt) continue;

                const apptTime = new Date(appt.eventDate || '');
                const hoursUntil = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                // Send if appointment is between 22 and 26 hrs away (2hr window for cron timing flexibility)
                // and record was created more than 24 hrs ago (meaning it was a future appointment at booking time)
                const recordAge = (now.getTime() - (record.createdAt?.getTime() ?? now.getTime())) / (1000 * 60 * 60);

                if (hoursUntil >= 22 && hoursUntil <= 26 && recordAge >= 22) {
                    const [user] = await db.select({ name: users.name, email: users.email })
                        .from(users).where(eq(users.id, record.patientUserId)).limit(1);
                    if (!user?.email) continue;

                    // Parse doctor/hospital from appointment description
                    const desc = appt.description || '';
                    const doctorMatch = desc.match(/Doctor:\s*([^\n]+)/);
                    const hospitalMatch = desc.match(/Hospital:\s*([^\n]+)/);

                    const emailResult = await sendPreCheckinEmail({
                        patientName: user.name || 'Patient',
                        patientEmail: user.email,
                        appointmentDate: appt.eventDate || '',
                        doctorName: doctorMatch?.[1]?.trim(),
                        hospitalName: hospitalMatch?.[1]?.trim(),
                        token: record.token,
                    });

                    if (emailResult.success) {
                        results.pre++;
                    } else {
                        results.errors.push(`Pre-checkin ${record.id}: ${emailResult.error}`);
                    }
                }
            } catch (err: any) {
                results.errors.push(`Pre-checkin ${record.id}: ${err?.message}`);
            }
        }
    } catch (err: any) {
        results.errors.push(`Pre-checkin batch error: ${err?.message}`);
    }

    // ── 2. Post-Checkin Emails (appointment was 2-3 days ago, email not yet sent) ──
    try {
        const allPost = await db.select().from(postCheckins).where(
            and(eq(postCheckins.isSubmitted, false), isNull(postCheckins.emailSentAt))
        );

        for (const record of allPost) {
            try {
                const [appt] = await db.select()
                    .from(timelineEvents)
                    .where(eq(timelineEvents.id, record.appointmentId))
                    .limit(1);
                if (!appt) continue;
                if (appt.status !== 'completed') continue; // Only for completed appointments

                const apptTime = new Date(appt.eventDate?.substring(0, 10) || '');
                const daysSince = (now.getTime() - apptTime.getTime()) / (1000 * 60 * 60 * 24);

                // Send if appointment was 2–3 days ago
                if (daysSince >= 2 && daysSince <= 3) {
                    const [user] = await db.select({ name: users.name, email: users.email })
                        .from(users).where(eq(users.id, record.patientUserId)).limit(1);
                    if (!user?.email) continue;

                    const desc = appt.description || '';
                    const doctorMatch = desc.match(/Doctor:\s*([^\n]+)/);

                    const emailResult = await sendPostCheckinEmail({
                        patientName: user.name || 'Patient',
                        patientEmail: user.email,
                        appointmentDate: appt.eventDate || '',
                        doctorName: doctorMatch?.[1]?.trim() ||
                            (appt.title?.includes('with') ? appt.title.split('with ')[1] : undefined),
                        token: record.token,
                    });

                    if (emailResult.success) {
                        // Mark email as sent
                        await db.update(postCheckins)
                            .set({ emailSentAt: now })
                            .where(eq(postCheckins.id, record.id));
                        results.post++;
                    } else {
                        results.errors.push(`Post-checkin ${record.id}: ${emailResult.error}`);
                    }
                }
            } catch (err: any) {
                results.errors.push(`Post-checkin ${record.id}: ${err?.message}`);
            }
        }
    } catch (err: any) {
        results.errors.push(`Post-checkin batch error: ${err?.message}`);
    }

    return NextResponse.json({
        success: true,
        sentPre: results.pre,
        sentPost: results.post,
        errors: results.errors,
        timestamp: now.toISOString(),
    });
}
