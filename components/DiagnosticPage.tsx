"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Info, HeartPulse, Pill, TrendingDown, TrendingUp,
    Brain, AlertCircle, BarChart2, FileText, User, CalendarDays, Minus
} from 'lucide-react';
import Link from 'next/link';
import DashboardNavbar from '@/components/DashboardNavbar';
import { DiagnosticMap, DiagnosticNode } from '@/components/DiagnosticMap';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PatientInfo {
    name: string | null;
    age: number | null;
    dateOfBirth: string | null;
    gender: string | null;
    bloodGroup: string | null;
    height: string | null;
    weight: string | null;
    chronicConditions: string | null;
}

interface DiagnosticReport {
    id: string;
    conditionName: string;
    conditionStatus: string;
    nodes: any[];
    clinicalNotes: string;
    treatmentPlan: string;
    createdAt: string | null;
    updatedAt: string | null;
    doctorId: string | null;
}

interface DiagnosticPageProps {
    user: { id: string; name: string | null; customId: string | null; image: string | null; email: string };
    patient: PatientInfo;
    diagnostics: DiagnosticReport[];
    initialDiagnosticId?: string; // pre-select a condition when coming from dashboard
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    improving: { label: 'Improving', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', Icon: TrendingDown },
    stable: { label: 'Stable', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', Icon: Minus },
    worsening: { label: 'Worsening', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', Icon: TrendingUp },
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob: string | null, age: number | null): number | null {
    if (age) return age;
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
}

function mapNodesToMapNodes(nodes: any[]): DiagnosticNode[] {
    return nodes.map((n, i) => ({
        id: n.id || `n${i}`,
        title: n.title || 'Node',
        description: n.description || '',
        type: n.type || 'diagnosis',
        date: n.date ? new Date(n.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        x: i,
        y: 0,
        connections: n.connections || [],
        parameters: (n.parameters || []).map((p: any) => ({
            id: `${n.id}-${p.name}`,
            name: p.name,
            value: p.value,
            unit: p.unit,
            status: p.status ?? 'normal',
            timestamp: n.date || '',
        })),
    }));
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ patientName }: { patientName: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-violet-50 border-2 border-violet-100 flex items-center justify-center mb-5">
                <Brain className="w-9 h-9 text-violet-400" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">No Diagnostic Pathway Yet</h2>
            <p className="text-sm text-slate-500 font-medium max-w-sm leading-relaxed">
                Your doctor hasn&apos;t created a diagnostic pathway for{' '}
                <span className="font-bold text-slate-700">{patientName}</span> yet.
                Once they add it during a consultation, it will appear here with your full clinical pathway and trends.
            </p>
            <Link
                href="/dashboard"
                className="mt-6 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-colors"
            >
                Back to Dashboard
            </Link>
        </div>
    );
}

// ─── Condition Tab ─────────────────────────────────────────────────────────────

function ConditionTab({ report, active, onClick }: { report: DiagnosticReport; active: boolean; onClick: () => void }) {
    const cfg = STATUS_CONFIG[report.conditionStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.stable;
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${active
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-700'
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white' : cfg.dot}`} />
            {report.conditionName}
        </button>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DiagnosticPage({ user, patient, diagnostics, initialDiagnosticId }: DiagnosticPageProps) {
    const [selected, setSelected] = useState<DiagnosticReport | null>(
        (initialDiagnosticId ? diagnostics.find(d => d.id === initialDiagnosticId) : null) ?? diagnostics[0] ?? null
    );
    const [mapNodes, setMapNodes] = useState<DiagnosticNode[]>([]);

    const patientAge = calcAge(patient.dateOfBirth, patient.age);

    useEffect(() => {
        if (selected) {
            setMapNodes(mapNodesToMapNodes(selected.nodes));
        }
    }, [selected]);

    const statusCfg = selected
        ? (STATUS_CONFIG[selected.conditionStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.stable)
        : STATUS_CONFIG.stable;

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
            <DashboardNavbar user={user} />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8"
                >
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Diagnostic <span className="text-teal-600">Pathway</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">
                        Your doctor&apos;s clinical pathway and treatment history for{' '}
                        <span className="font-bold text-slate-700">{patient.name ?? user.name ?? 'You'}</span>
                    </p>
                </motion.div>

                {/* ── No diagnostics ── */}
                {diagnostics.length === 0 ? (
                    <EmptyState patientName={patient.name ?? user.name ?? 'you'} />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                        {/* ── Map Panel (2/3) ── */}
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6"
                        >
                            {/* Condition tabs */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Condition Pathway</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Click nodes for details · Pinch/scroll to zoom</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {diagnostics.map(d => (
                                        <ConditionTab
                                            key={d.id}
                                            report={d}
                                            active={selected?.id === d.id}
                                            onClick={() => setSelected(d)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Status banner */}
                            {selected && (
                                <div className={`mb-4 p-3.5 ${statusCfg.bg} rounded-xl border ${statusCfg.border} flex items-center gap-2.5`}>
                                    <statusCfg.Icon className={`w-4 h-4 ${statusCfg.color} flex-shrink-0`} />
                                    <p className={`text-xs font-bold ${statusCfg.color}`}>
                                        <span className="font-black">{selected.conditionName}</span>
                                        {' '}— Patient is currently{' '}
                                        <span className="underline underline-offset-2">{statusCfg.label.toLowerCase()}</span>{' '}
                                        as per the latest clinical assessment.
                                    </p>
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                {selected && (
                                    <motion.div
                                        key={selected.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        {mapNodes.length > 0 ? (
                                            <DiagnosticMap nodes={mapNodes} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                <Brain className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-sm font-bold text-slate-400">No pathway steps added yet</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* ── Summary Panel (1/3) ── */}
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            className="flex flex-col gap-5"
                        >
                            {/* Patient Card */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                                        <User className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <h2 className="text-base font-black text-slate-900">Patient Summary</h2>
                                </div>

                                <div className="space-y-0">
                                    {[
                                        { label: 'Name', value: patient.name ?? user.name ?? '—' },
                                        { label: 'Age', value: patientAge ? `${patientAge} yrs` : '—' },
                                        { label: 'Gender', value: patient.gender ?? '—' },
                                        { label: 'Blood Group', value: patient.bloodGroup ?? '—' },
                                        { label: 'Height', value: patient.height ? `${patient.height} cm` : '—' },
                                        { label: 'Weight', value: patient.weight ? `${patient.weight} kg` : '—' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                            <span className="text-xs text-slate-400 font-medium">{label}</span>
                                            <span className="text-sm font-bold text-slate-800 capitalize">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Current status card */}
                            {selected && (
                                <>
                                    {/* Status badge */}
                                    <div className={`rounded-3xl border p-5 ${statusCfg.bg} ${statusCfg.border}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <statusCfg.Icon className={`w-4 h-4 ${statusCfg.color}`} />
                                            <h3 className={`font-black text-sm ${statusCfg.color}`}>{statusCfg.label}</h3>
                                            <span className={`w-2 h-2 rounded-full ${statusCfg.dot} ml-auto animate-pulse`} />
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                            Doctor&apos;s assessment for <span className="font-bold">{selected.conditionName}</span>
                                        </p>
                                        {selected.updatedAt && (
                                            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                                <CalendarDays className="w-3 h-3" />
                                                Last updated: {new Date(selected.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>

                                    {/* Treatment Plan */}
                                    {selected.treatmentPlan && (
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-7 h-7 rounded-xl bg-teal-50 flex items-center justify-center">
                                                    <Pill className="w-3.5 h-3.5 text-teal-600" />
                                                </div>
                                                <h3 className="font-black text-sm text-slate-900">Treatment Plan</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                                                {selected.treatmentPlan}
                                            </p>
                                        </div>
                                    )}

                                    {/* Clinical Notes */}
                                    {selected.clinicalNotes && (
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center">
                                                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                                                </div>
                                                <h3 className="font-black text-sm text-slate-900">Clinical Notes</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                                                {selected.clinicalNotes}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </div>
                )}

                {/* ── All conditions overview (only shown when diagnostics exist and multiple) ── */}
                {selected && diagnostics.length > 1 && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="conditions-grid"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6"
                        >
                            <h2 className="text-lg font-black text-slate-900 mb-4">All Conditions Overview</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {diagnostics.map(d => {
                                    const cfg = STATUS_CONFIG[d.conditionStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.stable;
                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelected(d)}
                                            className={`text-left p-4 rounded-2xl border transition-all duration-200 ${selected.id === d.id
                                                ? 'border-teal-300 bg-teal-50/60 shadow-sm'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-black text-sm text-slate-900 leading-tight">{d.conditionName}</h3>
                                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                                                    <cfg.Icon className="w-2.5 h-2.5" />
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                                                {d.treatmentPlan || d.clinicalNotes || `${d.nodes.length} pathway steps`}
                                            </p>
                                            {d.updatedAt && (
                                                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                    Updated {new Date(d.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}

            </div>
        </div>
    );
}
