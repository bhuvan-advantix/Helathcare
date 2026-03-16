'use server';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function getCloudinarySignature(folder: string = 'lab_reports') {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Signature MUST be generated with the exact same folder used in the upload
    const signature = cloudinary.utils.api_sign_request({
        timestamp,
        folder,
    }, process.env.CLOUDINARY_API_SECRET!);

    return {
        timestamp,
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder,
    };
}

