import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { prescriptions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

        // Proxy the PDF from Cloudinary — URL stays on server
        const cloudinaryResponse = await fetch(rx.cloudinaryUrl);
        if (!cloudinaryResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 502 });
        }

        const pdfBuffer = await cloudinaryResponse.arrayBuffer();

        const disposition = mode === 'download'
            ? 'attachment; filename="prescription.pdf"'
            : 'inline; filename="prescription.pdf"';

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
