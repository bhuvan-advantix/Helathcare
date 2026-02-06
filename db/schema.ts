import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import type { AdapterAccount } from '@auth/core/adapters';
import { v4 as uuidv4 } from 'uuid';

export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => uuidv4()),
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
    image: text('image'),
    role: text('role').notNull().default('pending'), // 'patient' | 'doctor' | 'admin' | 'pending'
    isOnboarded: integer('is_onboarded', { mode: 'boolean' }).default(false),
    customId: text('custom_id').unique(), // #Nrivaa001
});

export const accounts = sqliteTable('accounts', {
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
}, (account) => ({
    compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
    }),
}));

export const sessions = sqliteTable('sessions', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

export const verificationTokens = sqliteTable('verificationToken', {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
}, (vt) => ({
    compoundKey: primaryKey({
        columns: [vt.identifier, vt.token],
    }),
}));

// Role Specific Tables

export const patients = sqliteTable('patients', {
    id: text('id').primaryKey().$defaultFn(() => uuidv4()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Personal Details
    dateOfBirth: text('dob'),
    age: integer('age'),
    gender: text('gender'),
    phoneNumber: text('phone_number'),
    address: text('address'),
    city: text('city'),
    maritalStatus: text('marital_status'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    guardianName: text('guardian_name'),
    guardianRelation: text('guardian_relation'),

    // Medical Details
    bloodGroup: text('blood_group'),
    height: text('height'), // text to allow decimals if needed or simple storage
    weight: text('weight'),
    allergies: text('allergies'),
    currentMedications: text('current_medications'),
    pastSurgeries: text('past_surgeries'),
    chronicConditions: text('chronic_conditions'),
    lifestyle: text('lifestyle'),
    medicalHistory: text('medical_history'), // Keep legacy if needed

    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const doctors = sqliteTable('doctors', {
    id: text('id').primaryKey().$defaultFn(() => uuidv4()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Personal Details
    dateOfBirth: text('dob'),
    age: integer('age'),
    gender: text('gender'),
    phoneNumber: text('phone_number'),
    address: text('address'),
    city: text('city'),
    maritalStatus: text('marital_status'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    guardianName: text('guardian_name'),
    guardianRelation: text('guardian_relation'),

    // Professional Details
    specialization: text('specialization').notNull(),
    clinicName: text('clinic_name'),
    licenseNumber: text('license_number').notNull(),
    experienceYears: integer('experience_years'),
    degree: text('degree'),
    hospitalTiming: text('hospital_timing'),
    workingDays: text('working_days'),
    bio: text('bio'),

    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
