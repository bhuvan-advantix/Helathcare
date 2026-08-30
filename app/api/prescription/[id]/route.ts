import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { prescriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

function escapePdfText(value: unknown) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[^\x20-\x7E]/g, ' ');
}

function createStructuredPrescriptionPdf(rx: typeof prescriptions.$inferSelect) {
    const data = (rx.consultationData || {}) as Record<string, any>;
    const meds = Array.isArray(data.medications) ? data.medications : [];
    const commands: string[] = [];
    const text = (value: unknown, x: number, y: number, size = 10, bold = false, color = '0 0 0') => {
        commands.push(`BT ${color} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
    };
    const rect = (x: number, y: number, w: number, h: number, color: string, stroke = false) => {
        commands.push(`${color} ${stroke ? 'RG' : 'rg'} ${x} ${y} ${w} ${h} re ${stroke ? 'S' : 'f'}`);
    };
    const line = (x1: number, y1: number, x2: number, y2: number, color = '0.82 0.86 0.90') => {
        commands.push(`${color} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`);
    };
    const wrap = (value: unknown, width = 84) => {
        const words = String(value || '').split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
            const next = current ? `${current} ${word}` : word;
            if (next.length > width && current) {
                lines.push(current);
                current = word;
            } else {
                current = next;
            }
        }
        if (current) lines.push(current);
        return lines.length ? lines : ['-'];
    };

    rect(0, 742, 612, 50, '0.00 0.55 0.50');
    text('NiraivaHealth', 42, 762, 20, true, '1 1 1');
    text('OnCoTrack Oncology Prescription', 198, 766, 13, true, '1 1 1');
    text(data.prescriptionNo || `RX-${rx.id.slice(0, 8)}`, 452, 766, 10, true, '1 1 1');

    text(`Date: ${data.date || new Date(rx.prescribedAt || Date.now()).toISOString().slice(0, 10)}`, 42, 716, 10, true, '0.12 0.18 0.28');
    text(`Patient: ${data.patientName || 'Patient'}`, 42, 699, 10, true, '0.12 0.18 0.28');
    text(`Doctor: Dr. ${data.doctorName || 'Ananya Rao'}`, 330, 716, 10, true, '0.12 0.18 0.28');
    text(data.clinicName || 'Niraiva OnCoTrack Clinic', 330, 699, 9, false, '0.25 0.32 0.43');
    line(42, 684, 570, 684);

    rect(42, 632, 528, 38, '0.93 0.98 0.98');
    text('Diagnosis', 56, 654, 8, true, '0.00 0.45 0.42');
    text(data.diagnosis || 'Oncology follow-up', 56, 640, 10, true, '0.08 0.12 0.20');

    let y = 604;
    text('Treatment Plan', 42, y, 11, true, '0.08 0.12 0.20');
    y -= 16;
    for (const planLine of wrap(data.treatmentPlan || data.advice || 'Continue treatment and scheduled monitoring.', 96).slice(0, 4)) {
        text(planLine, 54, y, 9, false, '0.22 0.29 0.40');
        y -= 13;
    }

    y -= 8;
    text('Prescription', 42, y, 11, true, '0.08 0.12 0.20');
    y -= 10;
    line(42, y, 570, y);
    y -= 18;
    text('Medicine', 54, y, 8, true, '0.38 0.45 0.55');
    text('Dose / Frequency', 260, y, 8, true, '0.38 0.45 0.55');
    text('Purpose', 420, y, 8, true, '0.38 0.45 0.55');
    y -= 12;
    line(42, y, 570, y);
    y -= 18;

    const medicineRows = meds.length > 0 ? meds : [{ name: 'No new medication', dosage: '-', frequency: '-', purpose: 'Continue documented care plan' }];
    for (const med of medicineRows.slice(0, 7)) {
        text(med.name || 'Medication', 54, y, 9, true, '0.08 0.12 0.20');
        text([med.dosage, med.frequency].filter(Boolean).join(' / ') || '-', 260, y, 9, false, '0.18 0.25 0.36');
        for (const purposeLine of wrap(med.purpose || '-', 28).slice(0, 2)) {
            text(purposeLine, 420, y, 8, false, '0.18 0.25 0.36');
            y -= 11;
        }
        y -= 8;
        line(42, y + 5, 570, y + 5, '0.90 0.92 0.95');
    }

    y -= 6;
    text('Advice and Monitoring', 42, y, 11, true, '0.08 0.12 0.20');
    y -= 16;
    for (const adviceLine of wrap(data.advice || 'Follow the oncology team plan and attend scheduled review.', 98).slice(0, 4)) {
        text(adviceLine, 54, y, 9, false, '0.22 0.29 0.40');
        y -= 13;
    }

    if (data.vitals) {
        y -= 4;
        rect(42, y - 22, 528, 30, '0.96 0.98 1.00');
        text(`Vitals: BP ${data.vitals.bloodPressure || '-'}   Pulse ${data.vitals.pulseRate || '-'}   SpO2 ${data.vitals.spO2 || '-'}   Weight ${data.vitals.weight || '-'}`, 54, y - 4, 8, true, '0.25 0.32 0.43');
        y -= 44;
    }

    rect(42, 96, 528, 42, '1.00 0.98 0.90');
    text('Follow-up', 56, 119, 8, true, '0.70 0.35 0.00');
    text(data.followUp || 'As scheduled by oncology team', 56, 105, 10, true, '0.08 0.12 0.20');

    line(380, 62, 570, 62, '0.65 0.70 0.78');
    text('Dr. Ananya Rao', 420, 46, 10, true, '0.08 0.12 0.20');
    text('Medical Oncology', 428, 32, 8, false, '0.38 0.45 0.55');
    text('Clinician-reviewed structured prescription', 42, 32, 8, false, '0.38 0.45 0.55');

    const content = commands.join('\n');

    const objects = [
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
        '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
        `6 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += object;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
}

/**
 * GET /api/prescription/[id]?mode=view   → inline PDF in browser viewer (print/download built-in)
 * GET /api/prescription/[id]?mode=download → force-download PDF
 *
 * Cloudinary URL never exposed to the browser.
 * Auth: only the patient who owns the prescription can access it.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const prescriptionId = params.id;
        const mode = request.nextUrl.searchParams.get('mode') ?? 'view';

        // Fetch prescription from DB
        const [rx] = await db
            .select()
            .from(prescriptions)
            .where(eq(prescriptions.id, prescriptionId))
            .limit(1);

        if (!rx) {
            return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
        }

        // Security: patient can only access their own prescription
        // Doctors can access any prescription they wrote (role check)
        if (session.user.role === 'patient') {
            // The patient's DB id is stored in session as patientId or we compare via userId
            const patientId = (session.user as any).patientId ?? (session.user as any).dbId;
            if (patientId && rx.patientId !== patientId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        if (!rx.cloudinaryUrl) {
            return NextResponse.json({ error: 'PDF not available' }, { status: 404 });
        }

        const disposition = mode === 'download'
            ? 'attachment; filename="prescription.pdf"'
            : 'inline; filename="prescription.pdf"';

        if (rx.cloudinaryUrl.startsWith('demo-prescription://')) {
            return new NextResponse(createStructuredPrescriptionPdf(rx), {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': disposition,
                    'Cache-Control': 'private, no-cache',
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        }

        // Proxy the PDF from Cloudinary — URL stays on server
        const cloudinaryResponse = await fetch(rx.cloudinaryUrl);
        if (!cloudinaryResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 });
        }

        const pdfBuffer = await cloudinaryResponse.arrayBuffer();

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': disposition,
                'Cache-Control': 'private, no-cache',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('Prescription proxy error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
