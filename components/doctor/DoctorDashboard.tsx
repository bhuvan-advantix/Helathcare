"use client";

import { useState, useEffect, useMemo } from 'react';
import {
    Search, Loader2, User, Calendar, Phone, Activity,
    Clock, ChevronRight, ArrowUpRight, Plus,
    ClipboardList, Users, AlertCircle, CheckCircle2, Trash2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { getDoctorDashboardStats, addPatientToClinic, removePatientFromClinic } from '@/app/actions/doctor';
import { useRouter } from 'next/navigation';

// ... (keep constants) ...

// Design Constants for Easy Theming
const THEME = {
    primary: "teal",
    primaryRaw: "#0d9488", // teal-600
    accent: "indigo",
    surface: "bg-white",
    background: "bg-slate-50/50",
    textMain: "text-slate-900",
    textMuted: "text-slate-500",
    border: "border-slate-200/60",
};

interface DashboardProps {
    user: any;
    initialData: any;
}

export default function DoctorDashboard({ user, initialData }: DashboardProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [dashboardData, setDashboardData] = useState<any>(initialData || { stats: [], patients: [], insights: {} });
    const [isLoadingStats, setIsLoadingStats] = useState(!initialData);

    // Data is now passed from server component
    useEffect(() => {
        if (initialData) {
            setDashboardData(initialData);
            setIsLoadingStats(false);
        }
    }, [initialData]);

    // Search Logic
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(query), 400);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.length >= 2) performSearch(debouncedQuery);
        else setResults([]);
    }, [debouncedQuery]);

    const performSearch = async (searchQuery: string) => {
        setIsSearching(true);
        try {
            const res = await fetch(`/api/doctor/search-patients?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setResults(data.patients || []);
        } catch (err) {
            setError('Search service unavailable');
        } finally {
            setIsSearching(false);
        }
    };

    const router = useRouter();
    const existingPatientIds = new Set(dashboardData?.patients?.map((p: any) => p.id) || []);

    return (
        <div className={`min-h-screen ${THEME.background} space-y-8 pb-12`}>

            {/* 1. TOP BAR: Identity */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className={`text-4xl font-black ${THEME.textMain} tracking-tight italic`}>
                        Doctor <span className={`text-${THEME.primary}-600`}>Dashboard</span>
                    </h1>
                    <p className={`${THEME.textMuted} font-medium`}>Welcome back, Dr. {user?.name.split(' ')[0]}</p>
                </div>
            </header>

            {/* 2. STATS GRID: Immediate Awareness */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoadingStats ? (
                    [1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100" />)
                ) : (
                    dashboardData?.stats?.map((stat: any, i: number) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            className={`bg-white p-6 rounded-3xl border ${THEME.border} shadow-sm hover:shadow-md transition-shadow group`}
                        >
                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-2xl ${i === 0 ? 'bg-teal-50 text-teal-600' : i === 1 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'} group-hover:scale-110 transition-transform`}>
                                    {i === 0 ? <Activity className="w-6 h-6" /> : i === 1 ? <Users className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.trendDir === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className={`text-sm font-bold ${THEME.textMuted} uppercase tracking-wider`}>{stat.label}</p>
                                <h3 className={`text-3xl font-black ${THEME.textMain} mt-1`}>{stat.value}</h3>
                            </div>
                        </motion.div>
                    ))
                )}
            </section>

            {/* 3. MAIN WORKSPACE: Search & Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN: Search & Patient Management (Now Full Width) */}
                <div className="lg:col-span-12 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 focus-within:shadow-md focus-within:border-teal-500 transition-all duration-300 ease-in-out">
                        <div className="relative flex items-center px-6 py-5">
                            <Search className={`w-5 h-5 transition-colors ${isSearching ? `text-${THEME.primary}-600` : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Search patient by name, ID or phone..."
                                className="w-full ml-4 bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-lg font-medium placeholder:text-slate-400 text-slate-900"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            {isSearching && <Loader2 className={`w-5 h-5 animate-spin text-${THEME.primary}-600 ml-2`} />}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {results.length > 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results.map((patient, idx) => (
                                    <PatientCard
                                        key={patient.id}
                                        patient={patient}
                                        delay={idx}
                                        isExisting={existingPatientIds.has(patient.id)}
                                        onAddSuccess={() => {
                                            // Optimistic update or refresh
                                            router.refresh();
                                            // Also update local state to hide button immediately if needed, 
                                            // but checking existingPatientIds derived from initialData won't update automatically solely by router.refresh() 
                                            // unless initialData is repassed. 
                                            // Ideally we refetch or update a local list. 
                                            // For V1, forcing a reload or just relying on the button state change
                                            window.location.reload(); // Simple refresh to fetch new stats
                                        }}
                                    />
                                ))}
                            </motion.div>
                        ) : query.length > 2 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <p className="text-slate-400 font-medium">No records found for "{query}"</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h2 className={`text-lg font-bold ${THEME.textMain} flex items-center gap-2`}>
                                    <Users className={`w-5 h-5 text-${THEME.primary}-600`} />
                                    Hospital / Clinic Patients
                                </h2>
                                {/* Medium Card Grid for Clinic Patients */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {dashboardData?.patients?.map((patient: any) => (
                                        <ClinicPatientCard key={patient.id} patient={patient} />
                                    ))}
                                    {(!dashboardData?.patients || dashboardData.patients.length === 0) && (
                                        <div className="col-span-full p-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                                                <Users className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h3 className="text-slate-900 font-bold text-lg">No Patients Yet</h3>
                                            <p className="text-slate-500 text-sm mt-1">Search for patients above to add them to your clinic.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}

// Sub-component for Clean Code & Modern Design
function PatientCard({ patient, delay, isExisting, onAddSuccess }: { patient: any, delay: number, isExisting: boolean, onAddSuccess?: () => void }) {
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
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay * 0.05 }}
            className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-teal-500 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between"
        >
            <div>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-100 shrink-0">
                        {patient.image ? (
                            <Image src={patient.image} alt={patient.name} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-teal-600 bg-teal-50">
                                <User className="w-6 h-6" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 truncate text-lg leading-tight">{patient.name}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">ID: #{patient.customId || 'N/A'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-5">
                    <div className="bg-slate-50 px-3 py-2 rounded-xl flex-1 text-center border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Age</p>
                        <p className="text-sm font-black text-slate-700">{patient.age || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 px-3 py-2 rounded-xl flex-1 text-center border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Sex</p>
                        <p className="text-sm font-black text-slate-700">{patient.gender || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="mt-5 space-y-2">
                <Link
                    href={`/doctor/patient/${patient.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                    Open Profile
                    <ArrowUpRight className="w-4 h-4" />
                </Link>

                {!added ? (
                    <button
                        onClick={handleAddToClinic}
                        disabled={isAdding}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-xl text-sm font-bold hover:bg-teal-100 transition-colors"
                    >
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isAdding ? "Adding..." : "Add to My Clinic"}
                    </button>
                ) : (
                    <Link
                        href={`/doctor/patient/${patient.id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Added - View Profile
                    </Link>
                )}
            </div>
        </motion.div>
    );
}

// Clinic Patient Card Component
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
                alert(res.error);
                setIsDeleting(false);
            }
        } catch (e) {
            alert("Failed to remove");
            setIsDeleting(false);
        }
    };

    // Stable Date Formatting for Hydration
    const formattedDate = useMemo(() => {
        if (!patient.addedAt) return 'Recently';
        return new Date(patient.addedAt).toLocaleDateString('en-GB');
    }, [patient.addedAt]);

    return (
        <>
            <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all group flex flex-col gap-4 relative">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white relative overflow-hidden border border-emerald-100 shrink-0 shadow-sm">
                            {patient.image ? (
                                <Image src={patient.image} alt={patient.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-emerald-600 bg-emerald-50">
                                    <User className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-base line-clamp-1">{patient.name}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">ID: #{patient.customId}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Link href={`/doctor/patient/${patient.id}`}>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition-colors border border-emerald-100 shadow-sm cursor-pointer">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                        </Link>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isDeleting}
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white transition-colors border border-rose-100 shadow-sm"
                            title="Remove from Clinic"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 flex-1 text-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-emerald-600/70 block">Age</span>
                        <span className="text-sm font-bold text-slate-700">{patient.age}</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-100 flex-1 text-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-emerald-600/70 block">Sex</span>
                        <span className="text-sm font-bold text-slate-700">{patient.gender}</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-emerald-100/50 flex items-center gap-2 text-xs font-medium text-emerald-900/60">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Added: {formattedDate}
                </div>
            </div>

            {/* Custom Delete Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-100"
                        >
                            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <Trash2 className="w-6 h-6 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Remove Patient?</h3>
                            <p className="text-slate-500 text-center text-sm mb-6">
                                Are you sure you want to remove <span className="font-bold text-slate-900">{patient.name}</span> from your clinic list? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-2.5 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                                >
                                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
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