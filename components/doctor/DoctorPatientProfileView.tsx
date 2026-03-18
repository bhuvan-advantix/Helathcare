"use client";

import { useState } from 'react';
import {
    User, Calendar, FileText, Activity, Pill,
    AlertTriangle, Mail, Phone, MapPin,
    ChevronRight, ArrowLeft, Weight, Ruler, Droplet, Heart, Stethoscope, Clock,
    Syringe, Briefcase, UserPlus, FileEdit, Eye, Play, Square, Ban, EyeOff, Edit2, X, Trash2, Loader2, ChevronDown, Lock
} from 'lucide-react';
import { deleteLabReport } from '@/app/actions/labReports';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { stopMedication, restartMedication, hideMedication, updateMedication } from "@/app/actions/medications";
import CheckinHistorySection from "@/components/checkin/CheckinHistorySection";

const FREQUENCIES = [
    { label: 'Once a day', multiplier: 1 },
    { label: 'Twice a day', multiplier: 2 },
    { label: 'Thrice a day', multiplier: 3 },
    { label: 'Four times a day', multiplier: 4 },
    { label: 'Every other day', multiplier: 0.5 },
    { label: 'Weekly', multiplier: 1 / 7 },
    { label: 'As needed (PRN)', multiplier: 0 }
];

export default function DoctorPatientProfileView({
    patient, doctor, reports, healthParams, timeline, medications, allergies, conditions, privateNotes, consultationHistory, staffVitals
}: any) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [editingMed, setEditingMed] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: '', dosage: '', frequency: '', purpose: '', durationDays: '' });
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
    const [confirmDeleteReport, setConfirmDeleteReport] = useState<{ id: string; fileName: string } | null>(null);
    const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
    const [isFreqDropdownOpen, setIsFreqDropdownOpen] = useState(false);

    const handleDeleteReport = (reportId: string, fileName: string) => {
        setConfirmDeleteReport({ id: reportId, fileName });
    };

    const confirmAndDelete = async () => {
        if (!confirmDeleteReport) return;
        const { id: reportId } = confirmDeleteReport;
        setDeletingReportId(reportId);
        setConfirmDeleteReport(null);
        try {
            const result = await deleteLabReport(reportId);
            if (result.success) {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setDeletingReportId(null);
        }
    };

    // Combine DB medications with legacy patient.currentMedications
    const getDisplayMedications = () => {
        const meds = [...(medications || [])];
        const existingNames = new Set(meds.map(m => m.name.toLowerCase()));

        if (patient?.currentMedications && patient.currentMedications !== 'None' && patient.currentMedications !== 'undefined') {
            const legacyList = patient.currentMedications.split(',').map((s: string) => s.trim()).filter(Boolean);
            legacyList.forEach((name: string, idx: number) => {
                const lowerName = name.toLowerCase();
                if (!existingNames.has(lowerName)) {
                    meds.push({
                        id: `legacy-${idx}-${lowerName.replace(/\s+/g, '-')}`,
                        name: name,
                        status: 'Active',
                        dosage: 'Not specified',
                        frequency: 'Legacy Record',
                        purpose: '',
                        isLegacy: true
                    });
                    existingNames.add(lowerName);
                }
            });
        }
        return meds;
    };

    const displayMedications = (() => {
        const meds = getDisplayMedications();
        // Sort: Active first, then Stopped, then Hidden
        const order: Record<string, number> = { Active: 0, Stopped: 1, Hidden: 2 };
        return meds.sort((a: any, b: any) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
    })();

    // Helper: compute days remaining for a timed medication
    const getDaysRemaining = (med: any): number | null => {
        if (!med.durationDays || !med.startDate) return null;
        const start = new Date(med.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + med.durationDays);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // Medication Actions
    const handleMedAction = async (action: string, med: any) => {
        setIsLoading(med.id);
        try {
            if (med.isLegacy) {
                let newStatus = 'Active';
                if (action === 'stop') newStatus = 'Stopped';
                if (action === 'hide') newStatus = 'Hidden';
                if (action === 'unhide') newStatus = 'Active';
                await updateMedication(patient.id, med.id, {
                    name: med.name, originalName: med.name, status: newStatus
                }, true);
            } else {
                if (action === 'stop') await stopMedication(med.id);
                if (action === 'resume') await restartMedication(med.id);
                if (action === 'hide') await hideMedication(med.id);
                if (action === 'unhide') await restartMedication(med.id);
            }
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to update medication");
        } finally {
            setIsLoading(null);
        }
    };

    const openEditModal = (med: any) => {
        setEditingMed(med);
        setEditForm({
            name: med.name,
            dosage: med.dosage === 'Not specified' ? '' : med.dosage || '',
            frequency: med.frequency === 'Legacy Record' ? '' : med.frequency || '',
            purpose: med.purpose || '',
            durationDays: med.durationDays ? String(med.durationDays) : ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingMed || !editForm.name.trim()) return;
        setIsLoading(editingMed.id + '-save');
        try {
            await updateMedication(patient.id, editingMed.id, {
                ...editForm,
                durationDays: editForm.durationDays ? parseInt(editForm.durationDays, 10) : null,
                originalName: editingMed.isLegacy ? editingMed.name : undefined
            }, editingMed.isLegacy);
            setEditingMed(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to save medication");
        } finally {
            setIsLoading(null);
        }
    };

    // Helper to calculate age from DOB
    const calculateAge = (dob: string) => {
        if (!dob) return patient.age || '--';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(patient.dateOfBirth);

    // Does the current viewing doctor have a pending follow-up scheduled with this patient?
    const todayStr = new Date().toISOString().split('T')[0];
    const myPendingFollowUp = (consultationHistory || []).find(
        (c: any) => c.doctorId === doctor?.id && c.followUpDate && c.followUpDate >= todayStr
    );
    const hasFollowUp = !!myPendingFollowUp;

    // Helper to get latest vital
    const getLatestVital = (name: string, altName?: string) => {
        const param = healthParams.find((p: any) =>
            p.parameterName.toLowerCase() === name.toLowerCase() ||
            (altName && p.parameterName.toLowerCase() === altName.toLowerCase())
        );
        return param ? param.value : '--';
    };

    // Helper to get unit
    const getVitalUnit = (name: string, altName?: string) => {
        const param = healthParams.find((p: any) =>
            p.parameterName.toLowerCase() === name.toLowerCase() ||
            (altName && p.parameterName.toLowerCase() === altName.toLowerCase())
        );
        return param ? param.unit : '';
    };

    // Helper to get allergy icon
    const getAllergySymbol = (allergy: string) => {
        const lower = allergy.toLowerCase();
        if (lower.includes('dust')) return '🤧';
        if (lower.includes('peanut') || lower.includes('nut')) return '🥜';
        if (lower.includes('milk') || lower.includes('lactose') || lower.includes('dairy')) return '🥛';
        if (lower.includes('egg')) return '🥚';
        if (lower.includes('fish') || lower.includes('seafood') || lower.includes('shellfish')) return '🦐';
        if (lower.includes('cat') || lower.includes('dog') || lower.includes('pet')) return '🐈';
        if (lower.includes('penicillin') || lower.includes('med') || lower.includes('drug') || lower.includes('antibiotic')) return '💊';
        if (lower.includes('pollen') || lower.includes('flower') || lower.includes('grass')) return '🌸';
        if (lower.includes('latex')) return '🧤';
        if (lower.includes('sun')) return '☀️';
        if (lower.includes('cold')) return '❄️';
        if (lower.includes('smoke')) return '💨';
        if (lower.includes('soy')) return '🫘';
        if (lower.includes('wheat') || lower.includes('gluten')) return '🌾';
        return '⚠️';
    };

    // Helper to get lifestyle icon
    const getLifestyleSymbol = (item: string) => {
        const lower = item.toLowerCase();
        if (lower.includes('smok') || lower.includes('cigar') || lower.includes('tobacco') || lower.includes('vape')) return '🚬';
        if (lower.includes('alcohol') || lower.includes('drink') || lower.includes('wine') || lower.includes('beer') || lower.includes('liquor')) return '🍷';
        if (lower.includes('exercis') || lower.includes('workout') || lower.includes('gym') || lower.includes('run') || lower.includes('activ')) return '🏃‍♂️';
        if (lower.includes('yoga') || lower.includes('meditat')) return '🧘‍♀️';
        if (lower.includes('diet') || lower.includes('vegan') || lower.includes('veg') || lower.includes('food')) return '🥗';
        if (lower.includes('sedentar') || lower.includes('sit')) return '🪑';
        if (lower.includes('sleep')) return '😴';
        if (lower.includes('stress')) return '🤯';
        if (lower.includes('water') || lower.includes('hydrat')) return '💧';
        return '🔹';
    };

    // Helper to get surgery icon
    const getSurgerySymbol = (surgery: string) => {
        const lower = surgery.toLowerCase();
        if (lower.includes('heart') || lower.includes('cardio') || lower.includes('bypass') || lower.includes('cabg') || lower.includes('valve')) return '🫀';
        if (lower.includes('brain') || lower.includes('neuro')) return '🧠';
        if (lower.includes('bone') || lower.includes('fracture') || lower.includes('ortho') || lower.includes('knee') || lower.includes('hip') || lower.includes('joint')) return '🦴';
        if (lower.includes('eye') || lower.includes('lasik') || lower.includes('vision') || lower.includes('cataract')) return '👁️';
        if (lower.includes('kidney') || lower.includes('renal')) return '🫘';
        if (lower.includes('tooth') || lower.includes('dental') || lower.includes('extract') || lower.includes('wisdom')) return '🦷';
        if (lower.includes('lung')) return '🫁';
        if (lower.includes('stomach') || lower.includes('gastric') || lower.includes('append') || lower.includes('hernia') || lower.includes('bowel') || lower.includes('colon')) return '🫄';
        if (lower.includes('skin') || lower.includes('plastic') || lower.includes('cosmetic')) return '🩹';
        if (lower.includes('c-section') || lower.includes('cesarean') || lower.includes('birth')) return '👶';
        if (lower.includes('liver')) return '🩸';
        if (lower.includes('spine') || lower.includes('back') || lower.includes('disc')) return '⚕️';
        if (lower.includes('tumor') || lower.includes('cancer') || lower.includes('oncology')) return '🎗️';
        return '🏥';
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 animate-in fade-in duration-500">

                {/* ── Patient Header Card ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-gradient-to-br from-teal-50 to-transparent rounded-bl-full -mr-12 -mt-12 sm:-mr-20 sm:-mt-20 opacity-60 z-0 pointer-events-none" />

                    <div className="p-4 sm:p-6 md:p-8 relative z-10">

                        {/* Top: avatar + info + button */}
                        <div className="flex items-start gap-3 sm:gap-6">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <div className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-white shadow-md bg-slate-100">
                                    {patient.image ? (
                                        <Image src={patient.image} alt={patient.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-teal-50">
                                            <User className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 text-teal-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Name + badges + CTA */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                                    <div className="min-w-0">
                                        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 leading-tight truncate">{patient.name}</h1>
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-800 rounded-lg border border-teal-200 font-bold text-[10px] sm:text-xs">
                                                <span className="opacity-60 uppercase tracking-wider text-[9px]">ID:</span>
                                                {patient.customId || 'N/A'}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 font-bold text-[10px] sm:text-xs capitalize">
                                                <span className="opacity-60 uppercase tracking-wider text-[9px]">Gender:</span>
                                                {patient.gender}
                                            </span>
                                            {patient.bloodGroup && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-800 rounded-lg border border-red-200 font-bold text-[10px] sm:text-xs">
                                                    <span className="opacity-60 uppercase tracking-wider text-[9px]">Blood:</span>
                                                    {patient.bloodGroup}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {hasFollowUp ? (
                                        <Link
                                            href={`/doctor/consultation/${patient.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 text-xs sm:text-sm shrink-0 w-full sm:w-auto mt-1 sm:mt-0"
                                        >
                                            <Calendar className="w-4 h-4" />
                                            Start Follow-up Consultation
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/doctor/consultation/${patient.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-200 transition-all hover:-translate-y-0.5 text-xs sm:text-sm shrink-0 w-full sm:w-auto mt-1 sm:mt-0"
                                        >
                                            <Stethoscope className="w-4 h-4" />
                                            Start Consultation
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 w-full my-3 sm:my-4" />

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-3 sm:gap-y-5 bg-slate-50/80 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100">
                            {[
                                { label: 'Date of Birth', icon: <Calendar className="w-3.5 h-3.5 text-teal-600" />, value: patient.dateOfBirth || 'N/A' },
                                { label: 'Age', icon: <User className="w-3.5 h-3.5 text-teal-600" />, value: `${age || '--'} yrs` },
                                { label: 'Contact', icon: <Phone className="w-3.5 h-3.5 text-teal-600" />, value: patient.phoneNumber || patient.contactNumber || '--' },
                                { label: 'Marital Status', icon: <User className="w-3.5 h-3.5 text-teal-600" />, value: patient.maritalStatus || '--' },
                                { label: 'Height', icon: <Ruler className="w-3.5 h-3.5 text-teal-600" />, value: patient.height || '--' },
                                { label: 'Weight', icon: <Weight className="w-3.5 h-3.5 text-teal-600" />, value: patient.weight || '--' },
                            ].map(item => (
                                <div key={item.label} className="space-y-1">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                                    <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs sm:text-sm">
                                        {item.icon}
                                        <span className="truncate">{item.value}</span>
                                    </div>
                                </div>
                            ))}
                            {/* Emergency contact — slightly wider */}
                            <div className="col-span-2 sm:col-span-1 space-y-1">
                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency</p>
                                <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs sm:text-sm">
                                    <UserPlus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                    <div className="flex flex-col leading-tight min-w-0">
                                        <span className="truncate">{patient.emergencyContactName || '--'}</span>
                                        {patient.emergencyContactPhone && (
                                            <span className="text-slate-500 text-[10px] font-bold mt-0.5">{patient.emergencyContactPhone}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        {patient.address && (
                            <div className="flex items-start gap-3 bg-slate-50/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 mt-3">
                                <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
                                    <MapPin className="w-4 h-4 text-teal-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Address</p>
                                    <p className="text-xs sm:text-sm text-slate-900 font-black leading-relaxed">
                                        {patient.address}{patient.city ? `, ${patient.city}` : ''}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Check-In History (compact, right below profile) ── */}
                <CheckinHistorySection patientId={patient.id} />

                {/* ── Main Content Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

                    {/* ── Left Column ── */}
                    <div className="lg:col-span-4 space-y-4 sm:space-y-6">

                        {/* Staff-Recorded Vitals (Today / Latest) */}
                        {staffVitals && staffVitals.length > 0 && (() => {
                            const latest = staffVitals[0];
                            const recordedDate = latest.recordedAt ? new Date(latest.recordedAt) : null;
                            const formattedDate = recordedDate ? recordedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                            const formattedTime = recordedDate ? recordedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                            const vitalItems = [
                                { label: 'BP', value: latest.bloodPressure, unit: 'mmHg', icon: '❤️' },
                                { label: 'Temp', value: latest.temperature, unit: '', icon: '🌡️' },
                                { label: 'Pulse', value: latest.pulseRate, unit: 'bpm', icon: '💓' },
                                { label: 'SpO2', value: latest.spO2, unit: '', icon: '🫁' },
                                { label: 'Weight', value: latest.weight, unit: '', icon: '⚖️' },
                                { label: 'Height', value: latest.height, unit: '', icon: '📏' },
                            ].filter(v => v.value);
                            return (
                                <section className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-sm border border-teal-200 p-4 sm:p-5 mb-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
                                                <Activity className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-teal-900">Staff-Recorded Vitals</h2>
                                                <p className="text-[10px] text-teal-600 font-bold">
                                                    Recorded by <span className="text-teal-800">{latest.recordedBy || 'Staff'}</span>
                                                    {formattedDate && <> &bull; {formattedDate} at {formattedTime}</>}
                                                </p>
                                            </div>
                                        </div>
                                        {staffVitals.length > 1 && (
                                            <span className="text-[10px] font-bold text-teal-600 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full">
                                                +{staffVitals.length - 1} more records
                                            </span>
                                        )}
                                    </div>
                                    {vitalItems.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {vitalItems.map(v => (
                                                <div key={v.label} className="bg-white/80 rounded-xl px-3 py-2 border border-teal-100">
                                                    <p className="text-[9px] font-black text-teal-500 uppercase tracking-widest mb-0.5">{v.label}</p>
                                                    <p className="text-sm font-black text-slate-900">
                                                        {v.icon} {v.value}
                                                        {v.unit && <span className="text-[10px] text-slate-400 font-medium ml-0.5">{v.unit}</span>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-teal-600 font-medium">All vital values were empty.</p>
                                    )}
                                    {latest.notes && (
                                        <div className="mt-2 bg-white/70 rounded-lg px-3 py-2 border border-teal-100">
                                            <p className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-0.5">Staff Notes</p>
                                            <p className="text-xs text-slate-700 font-medium">{latest.notes}</p>
                                        </div>
                                    )}
                                </section>
                            );
                        })()}

                        {/* Vitals Snapshot */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                                    Vitals Snapshot
                                </h2>
                                <Link
                                    href={`/doctor/patient/${patient.id}/history`}
                                    className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-teal-100 transition-colors"
                                >
                                    View History
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                {[
                                    { label: 'HbA1c', value: getLatestVital('HbA1c'), unit: getVitalUnit('HbA1c') || '%', threshold: 6.0 },
                                    { label: 'Glucose', value: getLatestVital('Blood Glucose', 'Blood Sugar'), unit: getVitalUnit('Blood Glucose', 'Blood Sugar') || 'mg/dL', threshold: 100 },
                                    { label: 'Blood Pressure', value: getLatestVital('Blood Pressure').toString().replace(/mm\s*hg/i, '').trim(), unit: getVitalUnit('Blood Pressure') || 'mm Hg', threshold: null },
                                    { label: 'Cholesterol', value: getLatestVital('Total Cholesterol'), unit: getVitalUnit('Total Cholesterol') || 'mg/dL', threshold: 200 },
                                ].map(v => (
                                    <div key={v.label} className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-center">
                                        <div className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 sm:mb-2">{v.label}</div>
                                        <div className="flex items-end gap-1 flex-wrap">
                                            <span className={`text-lg sm:text-2xl font-black leading-none ${v.threshold !== null && v.value !== '--' && parseFloat(v.value) > v.threshold ? 'text-red-500' : 'text-green-500'}`}>
                                                {v.value}
                                            </span>
                                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold mb-0.5">{v.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>


                        {/* Known Allergies */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
                            <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                Known Allergies
                            </h2>
                            {allergies && allergies.length > 0 ? (
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {allergies.map((allergy: any) => (
                                        <div key={allergy.id} className="bg-yellow-50/80 border border-yellow-200 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl flex items-center gap-2 sm:gap-3 shadow-sm transition-all hover:bg-yellow-100/80">
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <div className="absolute w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-30"></div>
                                                <span className="text-base sm:text-xl relative z-10 drop-shadow-sm">{getAllergySymbol(allergy.allergen)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-yellow-800 font-extrabold text-xs sm:text-sm tracking-wide">{allergy.allergen}</span>
                                                {allergy.reaction && <span className="text-[10px] sm:text-xs text-yellow-600 font-bold mt-0.5">{allergy.reaction}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : patient.allergies && patient.allergies.toLowerCase() !== 'none' && patient.allergies !== "undefined" ? (
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {patient.allergies.split(',').map((a: string) => a.trim()).filter(Boolean).map((allergy: string, idx: number) => (
                                        <div key={idx} className="bg-yellow-50/80 border border-yellow-200 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl flex items-center gap-2 sm:gap-3 shadow-sm hover:bg-yellow-100/80">
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <div className="absolute w-5 h-5 bg-yellow-400 rounded-full animate-ping opacity-30"></div>
                                                <span className="text-base sm:text-xl relative z-10 drop-shadow-sm">{getAllergySymbol(allergy)}</span>
                                            </div>
                                            <span className="text-yellow-800 font-extrabold text-xs sm:text-sm tracking-wide">{allergy}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-green-100 font-medium text-xs sm:text-sm">
                                    <span className="text-base sm:text-lg">✅</span>
                                    <span>No known allergies recorded.</span>
                                </div>
                            )}
                        </section>

                        {/* Past Surgeries */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
                            <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                                <Syringe className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                                Past Surgeries
                            </h2>
                            {patient.pastSurgeries && patient.pastSurgeries !== "undefined" && patient.pastSurgeries.toLowerCase() !== "none" ? (
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {patient.pastSurgeries.split(',').map((s: string) => s.trim()).filter(Boolean).map((surgery: string, idx: number) => (
                                        <div key={idx} className="bg-indigo-50/80 text-indigo-900 pr-3 pl-2.5 py-2 sm:pr-4 sm:pl-3 rounded-xl border border-indigo-100 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:bg-indigo-100/80">
                                            <span className="text-base sm:text-xl drop-shadow-sm">{getSurgerySymbol(surgery)}</span>
                                            <span className="tracking-wide">{surgery}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 font-medium text-xs sm:text-sm bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-100 flex items-center gap-2">
                                    <span className="text-base sm:text-lg">⚪</span>
                                    None recorded
                                </p>
                            )}
                        </section>

                        {/* Lifestyle */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
                            <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
                                Lifestyle
                            </h2>
                            {patient.lifestyle && patient.lifestyle !== "undefined" && patient.lifestyle.toLowerCase() !== "none" ? (
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {patient.lifestyle.split(',').map((item: string) => item.trim()).filter(Boolean).map((item: string, idx: number) => (
                                        <div key={idx} className="bg-pink-50/80 text-pink-900 pr-3 pl-2.5 py-2 sm:pr-4 sm:pl-3 rounded-xl border border-pink-100 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:bg-pink-100/80">
                                            <span className="text-base sm:text-xl drop-shadow-sm">{getLifestyleSymbol(item)}</span>
                                            <span className="tracking-wide capitalize">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 font-medium text-xs sm:text-sm bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-100 flex items-center gap-2">
                                    <span className="text-base sm:text-lg">⚪</span>
                                    No details available
                                </p>
                            )}
                        </section>
                    </div>

                    {/* ── Right Column ── */}
                    <div className="lg:col-span-8 space-y-4 sm:space-y-6">

                        {/* Private Clinical Notes */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                                <FileEdit className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                                Private Clinical Notes
                            </h2>
                            <div className="space-y-4">
                                {privateNotes && privateNotes.length > 0 ? (
                                    <div className="flex flex-col gap-3">
                                        {privateNotes.map((note: any, idx: number) => {
                                            const noteDate = new Date(note.createdAt);
                                            const formattedDate = noteDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                            const formattedTime = noteDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                                            return (
                                                <div key={note.id || idx} className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 relative">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2 sm:mb-3 pb-2 border-b border-slate-200/60">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                                                <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">{note.doctorName}</p>
                                                                {note.clinicName && (
                                                                    <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                                                        <span>🏥</span> {note.clinicName}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 mt-1 sm:mt-0">
                                                            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                <Calendar className="w-3 h-3 text-teal-600" />
                                                                {formattedDate}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 sm:mt-1">
                                                                <Clock className="w-3 h-3 text-teal-600" />
                                                                {formattedTime}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">
                                                        {note.noteContent}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-slate-400 italic text-xs sm:text-sm">No clinical notes added for this patient.</div>
                                )}
                            </div>
                        </section>

                        {/* Current Medications */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                                    Current Medications
                                </h2>
                                <Link
                                    href={`/doctor/consultation/${patient.id}?tab=meds`}
                                    className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-colors"
                                >
                                    + Prescribe New
                                </Link>
                            </div>

                            {displayMedications.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {displayMedications.map((med: any) => (
                                        <div
                                            key={med.id}
                                            className={`px-4 py-3 sm:p-4 hover:bg-slate-50 transition-colors group ${isLoading === med.id ? 'opacity-50 pointer-events-none' : ''} ${med.status === 'Hidden' ? 'opacity-50 grayscale bg-slate-50/50' : ''}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                {/* Med Info */}
                                                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                                                        <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-0.5">
                                                            <h4 className={`font-bold text-xs sm:text-sm ${med.status === 'Hidden' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{med.name}</h4>
                                                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${med.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : med.status === 'Hidden' ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                                {med.status.toUpperCase()}
                                                            </span>
                                                            {/* Duration badge */}
                                                            {med.durationDays && (() => {
                                                                const remaining = getDaysRemaining(med);
                                                                if (med.status === 'Active' && remaining !== null) {
                                                                    return (
                                                                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${remaining <= 2 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                                            ⏱ {remaining > 0 ? `${remaining}d left` : 'Ending today'}
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                                                                        {med.durationDays}d course
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                                                            {med.dosage} • {med.frequency}
                                                            {med.purpose && <span className="ml-1 text-slate-400">• For {med.purpose}</span>}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    {med.status === 'Active' && (
                                                        <button
                                                            onClick={() => handleMedAction('stop', med)}
                                                            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-md transition-all"
                                                            title="Stop"
                                                        >
                                                            <Square className="w-3 h-3 fill-current" />
                                                            <span className="hidden sm:inline">Stop</span>
                                                        </button>
                                                    )}
                                                    {med.status === 'Stopped' && (
                                                        <button
                                                            onClick={() => handleMedAction('resume', med)}
                                                            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-green-600 bg-white border border-slate-200 hover:border-green-200 hover:bg-green-50 rounded-md transition-all"
                                                            title="Resume"
                                                        >
                                                            <Play className="w-3 h-3 fill-current" />
                                                            <span className="hidden sm:inline">Resume</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openEditModal(med)}
                                                        className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-blue-600 bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-md transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                        <span className="hidden sm:inline">Edit</span>
                                                    </button>
                                                    {med.status !== 'Hidden' ? (
                                                        <button
                                                            onClick={() => handleMedAction('hide', med)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                                            title="Hide from list"
                                                        >
                                                            <EyeOff className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleMedAction('unhide', med)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                                            title="Show in list"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 text-xs sm:text-sm font-medium">No active medications prescribed.</p>
                                </div>
                            )}
                        </section>

                        {/* Lab Reports */}
                        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                    Lab Reports
                                </h2>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{reports.length} Files</span>
                            </div>

                            {reports.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {reports.slice(0, 5).map((report: any) => (
                                        <div key={report.id} className="px-4 py-3 sm:p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center justify-between gap-2 sm:gap-4">
                                                {/* File info */}
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
                                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{report.fileName || 'Lab Report'}</h4>
                                                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">
                                                            {new Date(report.uploadedAt).toLocaleDateString('en-GB')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                    <a
                                                        href={report.cloudinaryUrl || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        <span>View</span>
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteReport(report.id, report.fileName || 'Lab Report')}
                                                        disabled={deletingReportId === report.id}
                                                        className="p-1.5 sm:p-2 bg-red-50 text-red-500 rounded-lg border border-red-100 hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Delete report"
                                                    >
                                                        {deletingReportId === report.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-medium text-xs sm:text-sm">No reports uploaded yet</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            {/* ══ Consultation History ══ */}
            <div className="mt-4 sm:mt-6">
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                                <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Consultation History</h2>
                                <p className="text-[11px] font-semibold text-teal-100 mt-0.5">Full visit records — visible to all doctors</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 bg-white/20 border border-white/30 text-white text-xs font-black px-3 py-1.5 rounded-full">
                            {(consultationHistory || []).length} {(consultationHistory || []).length === 1 ? 'Visit' : 'Visits'}
                        </div>
                    </div>

                    {(consultationHistory || []).length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {(consultationHistory as any[]).map((c, index) => {
                                const isExpanded = expandedConsultation === c.id;
                                const dateObj = c.date ? new Date(c.date) : null;
                                const formattedDate = dateObj
                                    ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : c.date;
                                const formattedTime = c.createdAt
                                    ? new Date(typeof c.createdAt === 'number' ? c.createdAt : c.createdAt)
                                        .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                                    : '';
                                const medCount = c.prescribedMeds?.length || 0;

                                return (
                                    <div key={c.id}>
                                        {/* ── Collapsed header row ── */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedConsultation(isExpanded ? null : c.id)}
                                            className={`w-full text-left transition-all duration-200 ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                                        >
                                            <div className="flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
                                                {/* Visit number + date block */}
                                                <div className="flex-shrink-0 relative">
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-200 flex flex-col items-center justify-center">
                                                        <span className="text-[10px] font-black text-teal-100 uppercase tracking-widest leading-none">
                                                            {dateObj ? dateObj.toLocaleDateString('en-GB', { month: 'short' }) : ''}
                                                        </span>
                                                        <span className="text-xl sm:text-2xl font-black text-white leading-tight">
                                                            {dateObj ? dateObj.getDate() : ''}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-teal-200 leading-none">
                                                            {dateObj ? dateObj.getFullYear() : ''}
                                                        </span>
                                                    </div>
                                                    {/* Visit index badge */}
                                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center border-2 border-white">
                                                        <span className="text-[9px] font-black text-white">{index + 1}</span>
                                                    </div>
                                                </div>

                                                {/* Main info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm sm:text-base font-black text-slate-900">{c.doctorName}</p>
                                                        {c.doctorSpecialization && (
                                                            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">{c.doctorSpecialization}</span>
                                                        )}
                                                    </div>
                                                    {c.doctorClinic && (
                                                        <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <span className="text-slate-300">🏥</span> {c.doctorClinic}
                                                        </p>
                                                    )}
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                                        {formattedDate}{formattedTime ? ` · ${formattedTime}` : ''}
                                                    </p>
                                                    {c.diagnosis && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {c.diagnosis.split(',').map((d: string) => d.trim()).filter(Boolean).map((d: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0 inline-block" />
                                                                    {d}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {c.followUpDate && c.doctorId === doctor?.id && (
                                                        <p className="text-[11px] font-bold text-amber-700 mt-1.5 flex items-center gap-1">
                                                            <span>📅</span>
                                                            Follow-up: {new Date(c.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Right: only chevron, no medicine count */}
                                                <div className="flex-shrink-0 flex flex-col items-end">
                                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isExpanded ? 'border-teal-400 bg-teal-50 rotate-180' : 'border-slate-200 bg-white'}`}>
                                                        <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-teal-500' : 'text-slate-400'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* ── Expanded content — smooth CSS transition, no jerk ── */}
                                        <div
                                            className="overflow-hidden transition-all duration-300 ease-in-out"
                                            style={{ maxHeight: isExpanded ? '2000px' : '0px', opacity: isExpanded ? 1 : 0 }}
                                        >
                                            <div className="border-t-2 border-teal-100 bg-gradient-to-b from-slate-50 to-white px-4 py-5 sm:px-6 sm:py-6 space-y-5">

                                                {/* Diagnosis */}
                                                {c.diagnosis && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2.5">
                                                            <div className="w-1 h-4 rounded-full bg-teal-500" />
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Diagnosis</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {c.diagnosis.split(',').map((d: string) => d.trim()).filter(Boolean).map((d: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 text-sm font-black text-teal-800 bg-teal-50 border-2 border-teal-200 px-3 py-1.5 rounded-xl shadow-sm">
                                                                    <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                                                                    {d}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Medications */}
                                                {c.prescribedMeds?.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-1 h-4 rounded-full bg-purple-500" />
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Medications Prescribed</p>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {c.prescribedMeds.map((med: any, mi: number) => {
                                                                // Split comma-separated timing into individual chips
                                                                const timingChips: string[] = med.frequency
                                                                    ? med.frequency.split(',').map((t: string) => t.trim()).filter(Boolean)
                                                                    : [];
                                                                const timingColors: Record<string, string> = {
                                                                    morning: 'text-amber-700 bg-amber-50 border-amber-200',
                                                                    afternoon: 'text-orange-700 bg-orange-50 border-orange-200',
                                                                    evening: 'text-rose-700 bg-rose-50 border-rose-200',
                                                                    night: 'text-indigo-700 bg-indigo-50 border-indigo-200',
                                                                    daily: 'text-teal-700 bg-teal-50 border-teal-200',
                                                                    'twice a day': 'text-teal-700 bg-teal-50 border-teal-200',
                                                                    'thrice a day': 'text-teal-700 bg-teal-50 border-teal-200',
                                                                };
                                                                const getTimingColor = (t: string) =>
                                                                    timingColors[t.toLowerCase()] || 'text-slate-600 bg-slate-100 border-slate-200';
                                                                return (
                                                                    <div key={med.id || mi} className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
                                                                        {/* Top strip */}
                                                                        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-purple-50">
                                                                            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                                                                                <Pill className="w-4.5 h-4.5 text-purple-600" />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="text-sm font-black text-slate-900 leading-snug">{med.name}</p>
                                                                                {med.dosage && (
                                                                                    <p className="text-xs font-bold text-purple-600">{med.dosage}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {/* Bottom detail row */}
                                                                        <div className="px-4 py-3 space-y-2">
                                                                            {/* Timing chips */}
                                                                            {timingChips.length > 0 && (
                                                                                <div className="flex flex-wrap gap-1.5 items-center">
                                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-full">When to take</span>
                                                                                    {timingChips.map((t: string, ti: number) => (
                                                                                        <span key={ti} className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${getTimingColor(t)}`}>{t}</span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                            {/* Duration + Purpose */}
                                                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                                                {med.durationDays && (
                                                                                    <span className="text-[11px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
                                                                                        🗓 {med.durationDays} Days
                                                                                    </span>
                                                                                )}
                                                                                {med.purpose && (
                                                                                    <span className="text-[11px] font-bold text-slate-500">For: <span className="text-teal-600 font-black">{med.purpose}</span></span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Vitals */}
                                                {c.vitals?.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2.5">
                                                            <div className="w-1 h-4 rounded-full bg-blue-500" />
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Vitals Recorded</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                                            {c.vitals.map((v: any) => (
                                                                <div key={v.id} className="bg-white rounded-xl border-2 border-blue-100 px-4 py-3 shadow-sm text-center">
                                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider leading-none mb-1">{v.parameterName}</p>
                                                                    <p className="text-xl font-black text-slate-900 leading-none">{v.value}</p>
                                                                    {v.unit && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{v.unit}</p>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Patient Advice */}
                                                {c.patientAdvice && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2.5">
                                                            <div className="w-1 h-4 rounded-full bg-sky-500" />
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Advice to Patient</p>
                                                        </div>
                                                        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl px-4 py-3.5">
                                                            <p className="text-sm font-semibold text-sky-900 leading-relaxed">{c.patientAdvice}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Follow-up */}
                                                {c.followUpDate && c.doctorId === doctor?.id && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-1 h-4 rounded-full bg-amber-500" />
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Next Follow-up</p>
                                                        </div>
                                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                                            <span className="text-xl">📅</span>
                                                            <div>
                                                                <p className="text-sm font-black text-amber-900">
                                                                    {new Date(c.followUpDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[11px] font-semibold text-amber-600 mt-0.5">Scheduled follow-up with {c.doctorName}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Private Doctor Note */}
                                                {c.privateNote && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2.5">
                                                            <div className="w-1 h-4 rounded-full bg-amber-500" />
                                                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                                                            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Private Note</p>
                                                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Doctors Only</span>
                                                        </div>
                                                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3.5">
                                                            <p className="text-sm font-semibold text-amber-900 leading-relaxed">{c.privateNote}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Empty fallback */}
                                                {!c.diagnosis && !c.prescribedMeds?.length && !c.vitals?.length && !c.patientAdvice && !c.privateNote && (
                                                    <p className="text-sm text-slate-400 font-medium italic text-center py-4">No detailed records found for this visit.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Stethoscope className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-black text-base">No Consultation History</p>
                            <p className="text-slate-400 text-sm font-medium mt-1">Records will appear here after completing a consultation</p>
                        </div>
                    )}
                </section>
            </div>



            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
                {confirmDeleteReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setConfirmDeleteReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col items-center pt-7 pb-4 px-5 text-center">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center mb-4">
                                    <Trash2 className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">Delete Lab Report?</h3>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                                    You are about to permanently delete
                                </p>
                                <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 w-full">
                                    <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-bold text-red-700 truncate">
                                        {confirmDeleteReport.fileName}
                                    </span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-3">
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
                                <button
                                    onClick={() => setConfirmDeleteReport(null)}
                                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAndDelete}
                                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm shadow-red-200 flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Edit Medication Modal (Bottom-sheet on mobile, centred on desktop) ── */}
            <AnimatePresence>
                {editingMed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setEditingMed(null)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drag handle — mobile only */}
                            <div className="flex justify-center pt-3 pb-1 sm:hidden">
                                <div className="w-10 h-1 bg-slate-200 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    Edit Medication
                                </h3>
                                <button
                                    onClick={() => setEditingMed(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Medicine Name *</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="e.g. Dolo 650"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Dosage</label>
                                        <input
                                            type="text"
                                            value={editForm.dosage}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, dosage: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                            placeholder="e.g. 500mg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Frequency</label>
                                        <div className="relative">
                                            <div
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg text-sm font-medium cursor-pointer flex justify-between items-center transition-all hover:border-teal-500"
                                                onClick={() => setIsFreqDropdownOpen(!isFreqDropdownOpen)}
                                            >
                                                <span className={editForm.frequency ? "text-slate-900" : "text-slate-400"}>
                                                    {editForm.frequency || "Select frequency..."}
                                                </span>
                                                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isFreqDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            {isFreqDropdownOpen && (
                                                <div className="absolute top-[100%] mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                                                    <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                                                        {FREQUENCIES.map(f => (
                                                            <button
                                                                key={f.label}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditForm(prev => ({ ...prev, frequency: f.label }));
                                                                    setIsFreqDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors rounded-lg mb-0.5 ${editForm.frequency === f.label ? 'bg-teal-50 text-teal-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                                                            >
                                                                {f.label}
                                                            </button>
                                                        ))}
                                                        {editForm.frequency && !FREQUENCIES.some(f => f.label === editForm.frequency) && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsFreqDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-sm font-bold transition-colors rounded-lg bg-teal-50 text-teal-700"
                                                            >
                                                                {editForm.frequency} (Custom)
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purpose</label>
                                    <input
                                        type="text"
                                        value={editForm.purpose}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, purpose: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="e.g. For fever"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Duration (days)</label>
                                    <p className="text-[10px] text-slate-400 font-medium mb-1.5">Leave blank for ongoing / indefinite medication</p>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={editForm.durationDays}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, durationDays: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                        placeholder="e.g. 10  (auto-stops after 10 days)"
                                    />
                                    {(() => {
                                        const freq = FREQUENCIES.find(f => f.label === editForm.frequency);
                                        const days = parseInt(editForm.durationDays);
                                        if (freq && freq.multiplier > 0 && days > 0) {
                                            const total = Math.ceil(freq.multiplier * days);
                                            return (
                                                <p className="mt-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                                                    💊 Total needed: {total} tablets/doses
                                                </p>
                                            )
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-4 sm:px-5 sm:py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setEditingMed(null)}
                                    className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={!editForm.name.trim() || isLoading?.endsWith('-save')}
                                    className="px-4 sm:px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                                >
                                    {isLoading?.endsWith('-save') ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                                            Saving...
                                        </>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
