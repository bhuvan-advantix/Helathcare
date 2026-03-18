import { NextRequest, NextResponse } from "next/server";
import { sendPreCheckinEmail, sendPostCheckinEmail } from "@/lib/email";

// Quick test route — only use during development
// Visit: GET /api/checkin/test-email?type=pre&email=you@example.com&name=TestUser
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type    = searchParams.get("type") || "pre";    // pre | post
    const email   = searchParams.get("email");
    const name    = searchParams.get("name") || "Test Patient";

    if (!email) {
        return NextResponse.json({ error: "Pass ?email=your@email.com in the URL" }, { status: 400 });
    }

    // Log what we're sending so we can spot config issues
    console.log("[Test Email] ENV check:", {
        SERVICE_ID:  process.env.EMAILJS_CHECKIN_SERVICE_ID,
        PUBLIC_KEY:  process.env.EMAILJS_CHECKIN_PUBLIC_KEY ? "✅ set" : "❌ MISSING",
        PRE_TMPL:    process.env.EMAILJS_TEMPLATE_PRE_CHECKIN,
        POST_TMPL:   process.env.EMAILJS_TEMPLATE_POST_CHECKIN,
        BASE_URL:    process.env.NEXTAUTH_URL,
    });

    let result;
    if (type === "post") {
        result = await sendPostCheckinEmail({
            patientName:     name,
            patientEmail:    email,
            appointmentDate: new Date().toISOString(),
            doctorName:      "Dr. Test Doctor",
            token:           "test-token-preview-only",
        });
    } else {
        result = await sendPreCheckinEmail({
            patientName:     name,
            patientEmail:    email,
            appointmentDate: new Date().toISOString(),
            doctorName:      "Dr. Test Doctor",
            hospitalName:    "NiraivaHealth Clinic",
            token:           "test-token-preview-only",
        });
    }

    return NextResponse.json({
        type,
        sentTo: email,
        result,
        envCheck: {
            SERVICE_ID:  process.env.EMAILJS_CHECKIN_SERVICE_ID || "❌ MISSING",
            PUBLIC_KEY:  process.env.EMAILJS_CHECKIN_PUBLIC_KEY ? "✅ set" : "❌ MISSING",
            PRE_TMPL:    process.env.EMAILJS_TEMPLATE_PRE_CHECKIN   || "❌ MISSING",
            POST_TMPL:   process.env.EMAILJS_TEMPLATE_POST_CHECKIN  || "❌ MISSING",
        },
    });
}
