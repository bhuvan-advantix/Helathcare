'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, ensureDiabetesSchema } from '@/db';
import { doctors, diabetesRecords } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export interface DiabetesRecordInput {
    patientId: string;
    hba1c: string;
    fastingGlucose?: string;
    postPrandialGlucose?: string;
    insulinDosage?: string;
    glycemicVariability?: string;
    retinopathyStatus?: string;
    nephropathyStatus?: string;
    neuropathyStatus?: string;
    notes?: string;
    testDate: string;
}

export async function addDiabetesRecord(input: DiabetesRecordInput) {
    await ensureDiabetesSchema();
    const session = await getServerSession(authOptions);

    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const [doctorRecord] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, session.user.id))
        .limit(1);

    const doctorId = doctorRecord?.id ?? null;

    await db.insert(diabetesRecords).values({
        id: uuidv4(),
        patientId: input.patientId,
        doctorId: doctorId,
        hba1c: input.hba1c.trim(),
        fastingGlucose: input.fastingGlucose?.trim() || null,
        postPrandialGlucose: input.postPrandialGlucose?.trim() || null,
        insulinDosage: input.insulinDosage?.trim() || null,
        glycemicVariability: input.glycemicVariability?.trim() || 'Moderate',
        retinopathyStatus: input.retinopathyStatus?.trim() || 'Clear',
        nephropathyStatus: input.nephropathyStatus?.trim() || 'Normal',
        neuropathyStatus: input.neuropathyStatus?.trim() || 'None',
        notes: input.notes?.trim() || null,
        testDate: input.testDate || new Date().toISOString().split('T')[0],
        recordedAt: new Date(),
    });

    revalidatePath('/doctor');
    revalidatePath('/diagnostic');
    revalidatePath('/dashboard');
    return { success: true };
}

export async function getDiabetesRecordsForPatient(patientId: string) {
    await ensureDiabetesSchema();
    const records = await db
        .select()
        .from(diabetesRecords)
        .where(eq(diabetesRecords.patientId, patientId))
        .orderBy(desc(diabetesRecords.testDate));

    return records.map(r => ({
        id: r.id,
        patientId: r.patientId,
        doctorId: r.doctorId,
        hba1c: r.hba1c,
        fastingGlucose: r.fastingGlucose,
        postPrandialGlucose: r.postPrandialGlucose,
        insulinDosage: r.insulinDosage,
        glycemicVariability: r.glycemicVariability,
        retinopathyStatus: r.retinopathyStatus,
        nephropathyStatus: r.nephropathyStatus,
        neuropathyStatus: r.neuropathyStatus,
        notes: r.notes,
        testDate: r.testDate,
        recordedAt: r.recordedAt ? r.recordedAt.toISOString() : null,
    }));
}

export async function getAllDiabetesRecords() {
    await ensureDiabetesSchema();
    const records = await db
        .select()
        .from(diabetesRecords)
        .orderBy(desc(diabetesRecords.recordedAt));


    return records.map(r => ({
        id: r.id,
        patientId: r.patientId,
        hba1c: r.hba1c,
        fastingGlucose: r.fastingGlucose,
        postPrandialGlucose: r.postPrandialGlucose,
        insulinDosage: r.insulinDosage,
        glycemicVariability: r.glycemicVariability,
        retinopathyStatus: r.retinopathyStatus,
        nephropathyStatus: r.nephropathyStatus,
        neuropathyStatus: r.neuropathyStatus,
        testDate: r.testDate,
    }));
}
