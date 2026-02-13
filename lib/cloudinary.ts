import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a PDF file to Cloudinary
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param patientId - Patient ID for organizing files
 * @returns Cloudinary secure URL
 */
export async function uploadPdfToCloudinary(
    buffer: Buffer,
    fileName: string,
    patientId: string
): Promise<string> {
    try {
        // Convert buffer to base64 data URI
        const base64File = buffer.toString('base64');
        const dataURI = `data:application/pdf;base64,${base64File}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            resource_type: 'raw', // For PDFs, use 'raw' resource type
            folder: `lab-reports/${patientId}`, // Organize by patient
            public_id: `${Date.now()}-${fileName.replace(/\.pdf$/i, '')}`, // Unique filename
            format: 'pdf',
        });

        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload file to cloud storage');
    }
}

/**
 * Delete a PDF file from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deletePdfFromCloudinary(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw',
        });
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        // Don't throw - deletion failure shouldn't break the app
    }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary secure URL
 * @returns Public ID
 */
export function extractPublicIdFromUrl(url: string): string {
    // Example URL: https://res.cloudinary.com/dx4zhyxk4/raw/upload/v1234567890/lab-reports/patient-id/filename.pdf
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (matches && matches[1]) {
        return matches[1].replace(/\.[^/.]+$/, ''); // Remove extension
    }
    return '';
}
