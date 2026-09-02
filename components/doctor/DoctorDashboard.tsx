"use client";

import { useState, useEffect, useMemo } from 'react';
import {
    Search, Loader2, Calendar, Activity,
    Clock, ArrowUpRight, Plus, Users, CheckCircle2, Trash2,
    FileText, X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { addPatientToClinic, removePatientFromClinic } from '@/app/actions/doctor';
import { useRouter } from 'next/navigation';

interface DashboardProps {
    user: any;
    initialData: any;
}

export default function DoctorDashboard({ user, initialData }: DashboardProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [dashboardData, setDashboardData] = useState<any>(initialData || { stats: [], patients: [] });
    const [isLoadingStats, setIsLoadingStats] = useState(!initialData);
    const [filterTab, setFilterTab] = useState<'all' | 'oncology' | 'recent'>('all');

    useEffect(() => {
        if (initialData) {
            setDashboardData(initialData);
            setIsLoadingStats(false);
        }
    }, [initialData]);

    // Search Debounce
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.trim().length >= 2) {
            performSearch(debouncedQuery.trim());
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const performSearch = async (searchQuery: string) => {
        setIsSearching(true);
        try {
            const res = await fetch(`/api/doctor/search-patients?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setResults(data.patients || []);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const existingPatientIds = useMemo(() => {
        return new Set((dashboardData?.patients || []).map((p: any) => p.id));
    }, [dashboardData]);

    // Filter Patients
    const filteredPatients = useMemo(() => {
        const list = dashboardData?.patients || [];
        if (filterTab === 'oncology') {
            return list.filter((p: any) =>
                (p.chronicConditions || '').toLowerCase().includes('cancer') ||
                (p.chronicConditions || '').toLowerCase().includes('carcinoma') ||
                (p.chronicConditions || '').toLowerCase().includes('stage')
            );
        }
        if (filterTab === 'recent') {
            return [...list].reverse();
        }
        return list;
    }, [dashboardData, filterTab]);

    // Today's Appointments List
    const todayAppointments = [
        {
            time: '10:00 AM',
            name: 'Farah Khan',
            id: 'NRV-ONC-003',
            type: 'Consolidation Immunotherapy Review',
            stage: 'Stage III NSCLC',
            linkId: 'demo-oncotrack-stage3-patient',
            status: 'Completed'
        },
        {
            time: '11:30 AM',
            name: 'Raman Iyer',
            id: 'NRV-ONC-002',
            type: 'Free PSA & Post-Radiation Review',
            stage: 'Stage II Prostate Adenocarcinoma',
            linkId: 'demo-oncotrack-stage2-patient',
            status: 'Completed'
        },
        {
            time: '02:00 PM',
            name: 'Maya Srinivasan',
            id: 'NRV-ONC-001',
            type: 'CA 15-3 Surveillance Audit',
            stage: 'Stage I Breast Adenocarcinoma',
            linkId: 'demo-oncotrack-stage1-patient',
            status: 'Scheduled'
        },
        {
            time: '04:30 PM',
            name: 'Daniel Mathew',
            id: 'NRV-ONC-004',
            type: 'CEA Restaging & Therapy Review',
            stage: 'Stage IV Sigmoid Colorectal',
            linkId: 'demo-oncotrack-stage4-patient',
            status: 'Scheduled'
        }
    ];

    return (
        <div className="space-y-5 pb-12 max-w-7xl mx-auto font-sans">

            {/* 1. TOP GREETING BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        Welcome back, Dr. {user?.name.split(' ')[0] || 'Oncologist'}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Clinical care roster & active diagnostic surveillance overview
                    </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 self-start sm:self-auto bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            </div>

            {/* 2. TOP 4 STATS OVERVIEW CARDS (DocuVerse Inspired Style) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Total Patients */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Patients</p>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900">
                            {dashboardData?.patients?.length || 4}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-teal-700">Active Roster</span>
                            <span className="text-[10px] font-bold text-slate-400">100%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-teal-500 h-full rounded-full w-full" />
                        </div>
                    </div>
                </div>

                {/* Today's Consultations */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Today's Visits</p>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900">4 Scheduled</h3>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-indigo-700">2 Completed</span>
                            <span className="text-[10px] font-bold text-slate-400">50%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full w-1/2" />
                        </div>
                    </div>
                </div>

                {/* Active Oncology Cases */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Oncology Cases</p>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900">4 Active</h3>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-emerald-700">Surveillance</span>
                            <span className="text-[10px] font-bold text-slate-400">100%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full w-full" />
                        </div>
                    </div>
                </div>

                {/* Diagnostic Reports */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lab Reports</p>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900">7 Audits</h3>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-amber-700">Diagnostic Reviews</span>
                            <span className="text-[10px] font-bold text-slate-400">Active</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full w-[80%]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PATIENT SEARCH BAR (SLEEK & COMPACT SEARCH RESULTS) */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs space-y-2">
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all px-3.5 py-2">
                    <Search className="w-4 h-4 text-teal-600 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search patient by name, custom ID (e.g., NRV-ONC-001), or mobile..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full ml-2.5 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-200 rounded-md text-slate-400">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {isSearching && <Loader2 className="w-4 h-4 animate-spin text-teal-600 ml-2 shrink-0" />}
                </div>

                {/* Sleek, Horizontal Search Result List (Compact & Professional) */}
                <AnimatePresence>
                    {results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-2 space-y-1.5 border-t border-slate-100 overflow-hidden"
                        >
                            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                                <span>Search Results ({results.length})</span>
                                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-700 font-bold lowercase">close</button>
                            </div>
                            <div className="space-y-1.5">
                                {results.map((patient) => (
                                    <PatientSearchRow
                                        key={patient.id}
                                        patient={patient}
                                        isExisting={existingPatientIds.has(patient.id)}
                                        onAddSuccess={() => router.refresh()}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {query.length >= 2 && !isSearching && results.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-2 border-t border-slate-100 text-center py-2.5"
                        >
                            <p className="text-xs font-bold text-slate-700">No patient records found for "{query}"</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Try searching "Farah", "Raman", "Maya", or "Daniel".</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 4. MAIN WORKSPACE SPLIT (Left 8 Cols / Right 4 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: Patient Roster (8 Cols) */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-teal-600" />
                                    My Clinic Patients
                                </h2>
                                <p className="text-[11px] text-slate-500 font-medium">Patients assigned to your active clinical care roster</p>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setFilterTab('all')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${filterTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    All ({dashboardData?.patients?.length || 0})
                                </button>
                                <button
                                    onClick={() => setFilterTab('oncology')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${filterTab === 'oncology' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Oncology Care
                                </button>
                                <button
                                    onClick={() => setFilterTab('recent')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${filterTab === 'recent' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Recent Visits
                                </button>
                            </div>
                        </div>

                        {/* Compact Patient Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredPatients.map((patient: any) => (
                                <ClinicPatientCard key={patient.id} patient={patient} />
                            ))}

                            {filteredPatients.length === 0 && (
                                <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <Users className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                                    <p className="text-slate-800 font-bold text-xs">No patients match this filter</p>
                                    <p className="text-slate-400 text-[11px] mt-0.5">Use the search bar above to look up and add patients.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Today's Schedule Timeline (4 Cols) */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-teal-600" />
                                Today's Schedule
                            </h3>
                            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                4 Visits
                            </span>
                        </div>

                        {/* Timeline with connecting vertical line & dots */}
                        <div className="space-y-0 relative">
                            {todayAppointments.map((apt, idx) => {
                                const isCompleted = apt.status === 'Completed';
                                const isLast = idx === todayAppointments.length - 1;

                                return (
                                    <div key={apt.id} className="relative pl-6 pb-4 last:pb-0 group">
                                        {/* Continuous Vertical Line */}
                                        {!isLast && (
                                            <div className="absolute left-[7px] top-3 bottom-0 w-[2px] bg-slate-200 group-hover:bg-teal-300 transition-colors" />
                                        )}

                                        {/* Timeline Circular Dot Node */}
                                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${isCompleted ? 'bg-emerald-500 shadow-2xs' : 'bg-teal-600 shadow-2xs ring-2 ring-teal-100'
                                            }`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </div>

                                        {/* Appointment Card */}
                                        <div className="p-3 bg-slate-50/70 group-hover:bg-teal-50/40 rounded-xl border border-slate-100 group-hover:border-teal-200 transition-all space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-slate-900">
                                                    {apt.time}
                                                </span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                                                    {apt.status}
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-extrabold text-slate-900">{apt.name}</h4>
                                                <p className="text-[10px] font-bold text-teal-700">{apt.stage}</p>
                                                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{apt.type}</p>
                                            </div>

                                            <Link
                                                href={`/doctor/patient/${apt.linkId}`}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 pt-0.5"
                                            >
                                                <span>View Patient Profile</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Sub-component: Sleek Horizontal Search Result Row (Compact & Easy to Use)
function PatientSearchRow({ patient, isExisting, onAddSuccess }: { patient: any, isExisting: boolean, onAddSuccess?: () => void }) {
    const [isAdding, setIsAdding] = useState(false);
    const [added, setAdded] = useState(isExisting);

    const handleAddToClinic = async () => {
        setIsAdding(true);
        try {
            const result = await addPatientToClinic(patient.id);
            if (result.success) {
                setAdded(true);
                if (onAddSuccess) onAddSuccess();
            } else {
                alert(result.error || "Failed to add patient");
            }
        } catch (e) {
            console.error(e);
            alert("Error adding patient");
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-all gap-3">
            {/* Left: Avatar & Details */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 relative overflow-hidden shrink-0 flex items-center justify-center text-teal-700 font-extrabold text-xs shadow-2xs">
                    {patient.image ? (
                        <Image src={patient.image} alt={patient.name} fill className="object-cover" />
                    ) : (
                        patient.name?.charAt(0) || 'P'
                    )}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{patient.name}</h4>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            #{patient.customId || 'N/A'}
                        </span>
                    </div>
                    {patient.chronicConditions && (
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {patient.chronicConditions}
                        </p>
                    )}
                </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
                <Link
                    href={`/doctor/patient/${patient.id}`}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                    View Profile
                </Link>

                {!added ? (
                    <button
                        onClick={handleAddToClinic}
                        disabled={isAdding}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                    >
                        {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        Add to Clinic
                    </button>
                ) : (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        In Clinic
                    </span>
                )}
            </div>
        </div>
    );
}

// Sub-component: Compact Clinic Patient Card
function ClinicPatientCard({ patient }: { patient: any }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await removePatientFromClinic(patient.id);
            if (res.success) {
                router.refresh();
                setShowDeleteModal(false);
            } else {
                alert(res.error || "Failed to remove patient");
                setIsDeleting(false);
            }
        } catch (e) {
            alert("Error removing patient");
            setIsDeleting(false);
        }
    };

    const formattedDate = useMemo(() => {
        if (!patient.addedAt) return 'Recently';
        try {
            return new Date(patient.addedAt).toLocaleDateString('en-GB');
        } catch {
            return 'Recently';
        }
    }, [patient.addedAt]);

    // Condition color pill & short title styling
    const { conditionStyle, shortCondition } = useMemo(() => {
        const cond = (patient.chronicConditions || '').toLowerCase();
        let style = 'bg-slate-100 text-slate-800 border-slate-200';
        let label = patient.chronicConditions || 'Oncology Care';

        if (cond.includes('breast') || cond.includes('ductal')) {
            style = 'bg-rose-50 text-rose-800 border-rose-200';
            label = 'Stage I Breast Cancer';
        } else if (cond.includes('prostate')) {
            style = 'bg-indigo-50 text-indigo-800 border-indigo-200';
            label = 'Stage II Prostate Cancer';
        } else if (cond.includes('lung') || cond.includes('nsclc')) {
            style = 'bg-teal-50 text-teal-800 border-teal-200';
            label = 'Stage III NSCLC Lung';
        } else if (cond.includes('colorectal') || cond.includes('sigmoid')) {
            style = 'bg-amber-50 text-amber-800 border-amber-200';
            label = 'Stage IV Colorectal';
        }

        return { conditionStyle: style, shortCondition: label };
    }, [patient.chronicConditions]);

    return (
        <>
            <div className="bg-slate-50/50 hover:bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 relative overflow-hidden shrink-0 shadow-2xs flex items-center justify-center text-teal-700 font-extrabold text-sm">
                            {patient.image ? (
                                <Image src={patient.image} alt={patient.name} fill className="object-cover" />
                            ) : (
                                patient.name?.charAt(0) || 'P'
                            )}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{patient.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400">ID: #{patient.customId || 'N/A'}</p>
                            {patient.chronicConditions && (
                                <span
                                    title={patient.chronicConditions}
                                    className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md border truncate max-w-[170px] ${conditionStyle}`}
                                >
                                    {shortCondition}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 shrink-0"
                        title="Remove from Clinic"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="font-semibold text-slate-600">Age {patient.age || 'N/A'}, {patient.gender || 'N/A'}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Added {formattedDate}</span>
                </div>

                <Link
                    href={`/doctor/patient/${patient.id}`}
                    className="flex items-center justify-center gap-1 w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                    View Patient Profile
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm border border-slate-100"
                        >
                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center mb-3 mx-auto text-rose-600 border border-rose-100">
                                <Trash2 className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-900 text-center mb-1">Remove Patient?</h3>
                            <p className="text-slate-500 text-center text-xs mb-4 leading-relaxed">
                                Remove <span className="font-bold text-slate-900">{patient.name}</span> from your clinic list?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition-colors text-xs border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-2xs text-xs flex items-center justify-center gap-1.5"
                                >
                                    {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {isDeleting ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}