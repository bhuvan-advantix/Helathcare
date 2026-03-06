import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { folder } = await req.json();

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json(
                { error: 'Cloudinary environment variables not configured.' },
                { status: 500 }
            );
        }

        const timestamp = Math.round(Date.now() / 1000);
        const uploadFolder = folder || 'lab-reports';

        // Build the string to sign — must match exactly what the upload sends
        const str = `folder=${uploadFolder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(str).digest('hex');

        return NextResponse.json({
            signature,
            timestamp,
            cloudName,
            apiKey,
            folder: uploadFolder,
        });
    } catch (err: any) {
        console.error('Cloudinary signature error:', err);
        return NextResponse.json({ error: err.message || 'Failed to generate signature' }, { status: 500 });
    }
}
