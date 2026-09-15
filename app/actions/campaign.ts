"use server";

import { db } from "@/db";
import { users, patients, doctorPatientRelations, doctors } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export interface CampaignFormData {
    name: string;
    aadhaarNumber?: string;
    phone: string;
    age: number;
    dob?: string;
    gender: "Male" | "Female" | "Other";
    state: string;
    city: string;
    bloodGroup: string;
    height?: string;
    weight?: string;
    bloodPressure?: string;
    bloodSugar?: string;
    chronicConditions: string[];
    otherConditions?: string;
    badHabits: string[];
    consentGiven: boolean;
}

const PASSWORD_WORDS = ["Niraiva", "Health", "Care", "Wellness", "Pulse", "Vital"];

function generateProfessionalPassword(): string {
    const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `${word}@${digits}`;
}

export async function registerCampaignPatient(formData: CampaignFormData) {
    try {
        if (!formData.name || !formData.name.trim()) {
            return { success: false, error: "Patient full name is required." };
        }

        const cleanPhone = formData.phone.trim().replace(/\D/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : formData.phone;

        // Clean Aadhaar format
        const cleanAadhaar = (formData.aadhaarNumber || "").replace(/\D/g, "");
        const formattedAadhaar = cleanAadhaar.length === 12
            ? `${cleanAadhaar.slice(0, 4)} ${cleanAadhaar.slice(4, 8)} ${cleanAadhaar.slice(8, 12)}`
            : formData.aadhaarNumber || "";

        // Generate Custom ID (#Nrivaa001, #Nrivaa002...)
        const idPrefix = "#Nrivaa";
        const allUsersWithPrefix = await db.select({ customId: users.customId })
            .from(users)
            .where(like(users.customId, `${idPrefix}%`));

        let maxNum = 0;
        for (const u of allUsersWithPrefix) {
            if (u.customId) {
                const numStr = u.customId.replace(idPrefix, "");
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }

        const nextNum = maxNum + 1;
        const customId = `${idPrefix}${nextNum.toString().padStart(3, "0")}`;

        // Generate professional password
        const plainPassword = generateProfessionalPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 12);

        // Generate unique system email identifier
        const emailSlug = customId.toLowerCase().replace("#", "");
        const systemEmail = `${emailSlug}@niraiva.health`;

        // Insert into Users table
        const [newUser] = await db.insert(users).values({
            name: formData.name.trim(),
            email: systemEmail,
            password: hashedPassword,
            role: "patient",
            isOnboarded: true,
            customId: customId,
        }).returning();

        if (!newUser) {
            return { success: false, error: "Failed to create patient account record." };
        }

        // Combine chronic conditions + typed other conditions
        const allConditions = [...formData.chronicConditions];
        if (formData.otherConditions && formData.otherConditions.trim()) {
            allConditions.push(formData.otherConditions.trim());
        }

        const conditionsString = allConditions.length > 0
            ? allConditions.join(", ")
            : "Routine Health Screening";

        // Lifestyle & Vitals summary
        const habitsString = formData.badHabits.length > 0
            ? formData.badHabits.join(", ")
            : "No Risk Habits Reported";

        const vitalsParts: string[] = [];
        if (formData.bloodPressure && formData.bloodPressure.trim()) vitalsParts.push(`BP: ${formData.bloodPressure.trim()}`);
        if (formData.bloodSugar && formData.bloodSugar.trim()) vitalsParts.push(`Blood Sugar: ${formData.bloodSugar.trim()} mg/dL`);

        const lifestyleString = `Habits: ${habitsString}${vitalsParts.length > 0 ? ` | ${vitalsParts.join(" | ")}` : ""}`;

        // Address string combining State, City & Aadhaar
        const addressParts: string[] = [];
        if (formData.city) addressParts.push(formData.city);
        if (formData.state) addressParts.push(formData.state);
        if (formattedAadhaar) addressParts.push(`Aadhaar: ${formattedAadhaar}`);

        // Calculate DOB if missing
        let computedDob = formData.dob;
        if (!computedDob && formData.age) {
            const birthYear = new Date().getFullYear() - formData.age;
            computedDob = `${birthYear}-01-01`;
        }

        // Insert into Patients table
        const [newPatient] = await db.insert(patients).values({
            userId: newUser.id,
            age: formData.age,
            dateOfBirth: computedDob || null,
            gender: formData.gender,
            phoneNumber: formattedPhone,
            address: addressParts.join(", ") || null,
            city: formData.city || "Primary City",
            bloodGroup: formData.bloodGroup || "Unknown",
            height: formData.height ? `${formData.height} cm` : null,
            weight: formData.weight ? `${formData.weight} kg` : null,
            chronicConditions: conditionsString,
            lifestyle: lifestyleString,
            medicalHistory: "Health Screening Campaign Intake",
        }).returning();

        // Automatically link patient to main clinic doctor
        const [defaultDoctor] = await db.select().from(doctors).limit(1);
        if (defaultDoctor && newPatient) {
            await db.insert(doctorPatientRelations).values({
                doctorId: defaultDoctor.id,
                patientId: newPatient.id,
                addedAt: new Date(),
            }).catch(() => {});
        }

        revalidatePath("/campaign");
        revalidatePath("/doctor/dashboard");
        revalidatePath("/admin/dashboard");

        return {
            success: true,
            patientId: newPatient.id,
            customId: customId,
            plainPassword: plainPassword,
            patientName: formData.name.trim(),
            systemEmail: systemEmail,
        };
    } catch (err: any) {
        console.error("Campaign registration error:", err);
        return { success: false, error: err.message || "An unexpected error occurred during registration." };
    }
}

export async function getCampaignLiveStats() {
    try {
        const allPatients = await db.select({
            id: patients.id,
            age: patients.age,
            gender: patients.gender,
            chronicConditions: patients.chronicConditions,
            createdAt: patients.createdAt,
            name: users.name,
            customId: users.customId,
        })
        .from(patients)
        .leftJoin(users, eq(patients.userId, users.id));

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayPatients = allPatients.filter(p => {
            if (!p.createdAt) return false;
            return new Date(p.createdAt) >= todayStart;
        });

        const totalToday = todayPatients.length;

        let maleCount = 0;
        let femaleCount = 0;
        let otherCount = 0;

        let bpCount = 0;
        let diabetesCount = 0;
        let thyroidCount = 0;
        let healthyCount = 0;

        todayPatients.forEach(p => {
            const gender = (p.gender || "").toLowerCase();
            const cond = (p.chronicConditions || "").toLowerCase();

            if (gender === "female") {
                femaleCount++;
            } else if (gender === "male") {
                maleCount++;
            } else {
                otherCount++;
            }

            let hasCondition = false;
            if (cond.includes("bp") || cond.includes("hyperten") || cond.includes("pressure")) {
                bpCount++;
                hasCondition = true;
            }
            if (cond.includes("diabet") || cond.includes("glucose") || cond.includes("sugar")) {
                diabetesCount++;
                hasCondition = true;
            }
            if (cond.includes("thyroid")) {
                thyroidCount++;
                hasCondition = true;
            }

            if (!hasCondition || cond.includes("routine") || cond.includes("none")) {
                healthyCount++;
            }
        });

        const recentRegistrations = todayPatients.slice(-5).reverse().map(p => ({
            id: p.id,
            name: p.name || "Patient",
            customId: p.customId || "",
            gender: p.gender || "Adult",
            age: p.age || 0,
            conditions: p.chronicConditions || "Screened",
            time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Just now",
        }));

        return {
            totalToday,
            maleCount,
            femaleCount,
            otherCount,
            bpCount,
            diabetesCount,
            thyroidCount,
            healthyCount,
            recentRegistrations,
        };
    } catch (err) {
        console.error("Failed to fetch campaign stats:", err);
        return {
            totalToday: 0,
            maleCount: 0,
            femaleCount: 0,
            otherCount: 0,
            bpCount: 0,
            diabetesCount: 0,
            thyroidCount: 0,
            healthyCount: 0,
            recentRegistrations: [],
        };
    }
}
