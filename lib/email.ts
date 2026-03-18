// ─── Server-side Email using EmailJS REST API ─────────────────────────────────
// Uses the SEPARATE EmailJS account dedicated to check-in emails
// (Different from the existing contact-form EmailJS account)

const EMAILJS_API = "https://api.emailjs.com/api/v1.0/email/send";

// ✅ New separate account for check-in emails
const SERVICE_ID   = process.env.EMAILJS_CHECKIN_SERVICE_ID!;   // service_yk9fd95
const PUBLIC_KEY   = process.env.EMAILJS_CHECKIN_PUBLIC_KEY!;   // CMxuTiG-xftNsqQZR
const PRIVATE_KEY  = process.env.EMAILJS_CHECKIN_PRIVATE_KEY!;  // W9g4VQNmRcTwP8STBpdHH (required for server-side)

const PRE_CHECKIN_TEMPLATE  = process.env.EMAILJS_TEMPLATE_PRE_CHECKIN!;
const POST_CHECKIN_TEMPLATE = process.env.EMAILJS_TEMPLATE_POST_CHECKIN!;

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ─── Shared sender ────────────────────────────────────────────────────────────
async function sendViaEmailJS(
    templateId: string,
    templateParams: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(EMAILJS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service_id:      SERVICE_ID,
                template_id:     templateId,
                user_id:         PUBLIC_KEY,
                accessToken:     PRIVATE_KEY,   // ← required for server-side REST calls
                template_params: templateParams,
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `EmailJS error ${res.status}: ${text}` };
        }
        return { success: true };
    } catch (err: any) {
        console.error("[Email] EmailJS send failed:", err);
        return { success: false, error: err?.message };
    }
}

// ─── Send Pre-Checkin Email ───────────────────────────────────────────────────
export async function sendPreCheckinEmail({
    patientName,
    patientEmail,
    appointmentDate,
    doctorName,
    hospitalName,
    token,
}: {
    patientName: string;
    patientEmail: string;
    appointmentDate: string;
    doctorName?: string;
    hospitalName?: string;
    token: string;
}): Promise<{ success: boolean; error?: string }> {
    const link = `${BASE_URL}/pre-checkin/${token}`;
    const formattedDate = formatAppointmentDate(appointmentDate);

    // These variable names must match your EmailJS template placeholders
    return sendViaEmailJS(PRE_CHECKIN_TEMPLATE, {
        to_name: patientName,
        to_email: patientEmail,
        subject: `Your Appointment on ${formattedDate} — Complete Pre-Check-In`,
        appointment_date: formattedDate,
        doctor_name: doctorName || "your doctor",
        hospital_name: hospitalName || "the clinic",
        checkin_link: link,
        form_type: "pre-check-in",
        message: `Dear ${patientName},\n\nYou have an upcoming appointment on ${formattedDate}${doctorName ? ` with ${doctorName}` : ""}. Please complete your pre-visit form using the link below before your appointment.\n\nPre-Check-In Link:\n${link}\n\nPlease log in using the email and password provided by our staff, or your existing NiraivaHealth account credentials.\n\nThis form is optional and the link is valid only for you.\n\nThank you,\nNiraivaHealth`,
    });
}

// ─── Send Post-Checkin Email ──────────────────────────────────────────────────
export async function sendPostCheckinEmail({
    patientName,
    patientEmail,
    appointmentDate,
    doctorName,
    token,
}: {
    patientName: string;
    patientEmail: string;
    appointmentDate: string;
    doctorName?: string;
    token: string;
}): Promise<{ success: boolean; error?: string }> {
    const link = `${BASE_URL}/post-checkin/${token}`;
    const formattedDate = formatAppointmentDate(appointmentDate);

    return sendViaEmailJS(POST_CHECKIN_TEMPLATE, {
        to_name: patientName,
        to_email: patientEmail,
        subject: `How Are You Feeling After Your Visit on ${formattedDate}? — NiraivaHealth`,
        appointment_date: formattedDate,
        doctor_name: doctorName || "your doctor",
        checkin_link: link,
        form_type: "post-check-in",
        message: `Dear ${patientName},\n\nIt's been a few days since your visit on ${formattedDate}${doctorName ? ` with ${doctorName}` : ""}. We'd love to know how you're recovering.\n\nPlease share your recovery update:\n${link}\n\nIf you're not feeling better, you can also book a follow-up appointment from the form.\n\nThis form is optional and can only be submitted once.\n\nThank you,\nNiraivaHealth`,
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAppointmentDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
    } catch {
        return dateStr;
    }
}
