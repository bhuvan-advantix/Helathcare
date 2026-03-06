'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { doctors, patients, patientDiagnostics, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export interface DiagnosticNodeInput {
    id: string;
    title: string;
    description: string;
    type: string;
    date?: string;
    connections: string[];
    parameters: { name: string; value: string; unit: string; status?: string }[];
    x: number;
    y: number;
}

export interface SaveDiagnosticInput {
    conditionName: string;
    conditionStatus: 'improving' | 'stable' | 'worsening';
    nodes: DiagnosticNodeInput[];
    clinicalNotes: string;
    treatmentPlan: string;
    existingId?: string; // if editing
}

export async function saveDiagnostic(patientId: string, input: SaveDiagnosticInput) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    // Get doctor record from the logged-in doctor user
    const [doctorRecord] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.userId, session.user.id))
        .limit(1);

    if (!doctorRecord) return { success: false, error: 'Doctor not found' };

    const now = new Date();
    const nodesWithDate = input.nodes.map(n => ({ ...n, date: n.date ?? now.toISOString() }));

    if (input.existingId) {
        // Update existing
        await db
            .update(patientDiagnostics)
            .set({
                conditionName: input.conditionName.trim(),
                conditionStatus: input.conditionStatus,
                nodes: nodesWithDate,
                clinicalNotes: input.clinicalNotes.trim() || null,
                treatmentPlan: input.treatmentPlan.trim() || null,
                updatedAt: now,
            })
            .where(eq(patientDiagnostics.id, input.existingId));
    } else {
        // Insert new
        await db.insert(patientDiagnostics).values({
            id: uuidv4(),
            patientId,
            doctorId: doctorRecord.id,
            conditionName: input.conditionName.trim(),
            conditionStatus: input.conditionStatus,
            nodes: nodesWithDate,
            clinicalNotes: input.clinicalNotes.trim() || null,
            treatmentPlan: input.treatmentPlan.trim() || null,
            createdAt: now,
            updatedAt: now,
        });
    }

    revalidatePath('/diagnostic');
    revalidatePath('/dashboard');
    return { success: true };
}

export async function getDiagnosticsForPatient(patientId: string) {
    const rows = await db
        .select()
        .from(patientDiagnostics)
        .where(eq(patientDiagnostics.patientId, patientId));

    return rows.map(r => ({
        id: r.id,
        conditionName: r.conditionName,
        conditionStatus: r.conditionStatus ?? 'stable',
        nodes: (r.nodes as any[]) ?? [],
        clinicalNotes: r.clinicalNotes ?? '',
        treatmentPlan: r.treatmentPlan ?? '',
        createdAt: r.createdAt?.toISOString() ?? null,
        updatedAt: r.updatedAt?.toISOString() ?? null,
        doctorId: r.doctorId ?? null,
    }));
}

export async function deleteDiagnostic(diagnosticId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    await db.delete(patientDiagnostics).where(eq(patientDiagnostics.id, diagnosticId));
    revalidatePath('/diagnostic');
    return { success: true };
}
