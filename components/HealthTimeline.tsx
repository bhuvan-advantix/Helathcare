"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    FileText,
    Pill,
    Activity,
    ChevronDown,
    Search,
    Filter,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    X,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTimelineEvents, addTimelineEvent } from '@/app/actions/timeline';
import DashboardNavbar from '@/components/DashboardNavbar';
import Footer from '@/components/Footer';

// Use same types as server action
type TimelineEvent = {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    eventDate: string;
    eventType: string;
    status: string | null;
    reportId?: string | null;
    isReport?: boolean;
};

export default function HealthTimeline({ user }: { user: any }) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchEvents();
    }, [user.id]);

    const fetchEvents = async () => {
        setLoading(true);
        const res = await getTimelineEvents(user.id);
        if (res.success && res.events) {
            setEvents(res.events);
        }
        setLoading(false);
    };

    const handleAddEvent = async (data: any) => {
        const res = await addTimelineEvent({
            ...data,
            userId: user.id
        });
        if (res.success) {
            setIsAddModalOpen(false);
            fetchEvents();
            return true;
        } else {
            return false;
        }
    };

    // Filter Logic
    const filteredEvents = events.filter(event => {
        const matchesType = filterType === 'All' || event.eventType.toLowerCase() === filterType.toLowerCase();
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesType && matchesSearch;
    });

    // Separate Upcoming and Past
    const now = new Date();
    // Keep consistent: Upcoming = Future. The user said "upcoming pending not completed", which likely refers to status *tagging* inside, which we added.
    const upcomingEvents = filteredEvents
        .filter(e => new Date(e.eventDate) > now)
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    const pastEvents = filteredEvents.filter(e => new Date(e.eventDate) <= now).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    // Stats
    const stats = {
        completed: events.filter(e => e.status === 'completed').length,
        upcoming: events.filter(e => new Date(e.eventDate) > now).length,
        reports: events.filter(e => e.eventType === 'test').length,
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardNavbar user={user} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div className="max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                            Health <span className="text-teal-500">Timeline</span>
                        </h1>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed">
                            Track your entire health journey, from past appointments to future checkups and lab reports, all in one chronological view.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        Add Event
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm transition-all focus:shadow-md"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                        {['All', 'Appointment', 'Test', 'Medication'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${filterType === type
                                    ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 hover:shadow-md'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Timeline Column */}
                    <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">

                        {/* Upcoming Events Section (Pinned at top) */}
                        {upcomingEvents.length > 0 && (
                            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-teal-600" />
                                    Upcoming Events
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    {upcomingEvents.map(event => (
                                        <div key={event.id} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3 sm:gap-4 hover:border-teal-200 transition-colors">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 text-teal-600 font-bold border border-teal-100">
                                                <div className="text-center leading-none">
                                                    <span className="block text-[0.6rem] sm:text-xs uppercase text-teal-400 mb-0.5">{new Date(event.eventDate).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-base sm:text-lg">{new Date(event.eventDate).getDate()}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900">{event.title}</h4>
                                                <p className="text-sm text-slate-500 mt-1">{event.description || "No specific details"}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-md border ${event.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        event.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            'bg-amber-50 text-amber-600 border-amber-100'
                                                        }`}>
                                                        {event.status || 'Pending'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium capitalize">• {event.eventType}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline Header */}
                        <div className="flex items-center justify-between pt-6 mb-6 px-1">
                            <h3 className="font-bold text-xl text-slate-900 tracking-tight">Recent Events</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-50"></div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pending</span>
                                </div>
                            </div>
                        </div>

                        {/* Vertical Timeline */}
                        <div className="relative space-y-6">
                            {/* Vertical Line */}
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] sm:left-[25px] top-6 bottom-6 w-0 border-l-2 border-dashed border-teal-200/60"></div>

                            {pastEvents.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Clock className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-slate-900 font-bold">No past events</h3>
                                    <p className="text-slate-500 text-sm mt-1">Add an event or upload a report to see history</p>
                                </div>
                            )}

                            {pastEvents.map((event) => (
                                <TimelineCard key={event.id} event={event} />
                            ))}

                        </div>
                    </div>

                    {/* Right Widget Column */}
                    <div className="flex flex-col gap-6 order-1 lg:order-2">
                        {/* Summary Widget */}
                        <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 sticky top-28 overflow-hidden">
                            <div className="p-6 bg-gradient-to-br from-teal-600 to-teal-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                <h3 className="font-bold text-white text-lg flex items-center gap-2 relative z-10">
                                    <Activity className="w-5 h-5 text-teal-100" />
                                    Health Summary
                                </h3>
                                <p className="text-teal-100 text-xs mt-1 font-medium opacity-90 relative z-10">Overview of your timeline activity</p>
                            </div>

                            <div className="p-3 space-y-2 md:p-5 md:space-y-3">
                                <div className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-white hover:shadow-md transition-all group cursor-default">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white shadow-sm flex items-center justify-center text-teal-600 group-hover:bg-teal-50 transition-colors">
                                            <FileText className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-teal-700 transition-colors">Lab Reports</span>
                                    </div>
                                    <span className="text-lg md:text-xl font-black text-slate-900">{stats.reports}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-white hover:shadow-md transition-all group cursor-default">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                                            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">Completed</span>
                                    </div>
                                    <span className="text-lg md:text-xl font-black text-slate-900">{stats.completed}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-white hover:shadow-md transition-all group cursor-default">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-600 group-hover:bg-amber-50 transition-colors">
                                            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <span className="text-xs md:text-sm font-bold text-slate-600 group-hover:text-amber-700 transition-colors">Upcoming</span>
                                    </div>
                                    <span className="text-lg md:text-xl font-black text-slate-900">{stats.upcoming}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <AddEventModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddEvent} />
        </div>
    );
}

// Modern Timeline Card
function TimelineCard({ event }: { event: TimelineEvent }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();

    // Icon Logic
    let Icon = Activity;
    let iconBg = "bg-slate-100 text-slate-600";
    if (event.eventType === 'appointment') { Icon = Calendar; iconBg = "bg-purple-50 text-purple-600 border-purple-100"; }
    else if (event.eventType === 'test') { Icon = FileText; iconBg = "bg-blue-50 text-blue-600 border-blue-100"; }
    else if (event.eventType === 'medication') { Icon = Pill; iconBg = "bg-rose-50 text-rose-600 border-rose-100"; }

    // Status Color
    const statusColor = event.status === 'completed'
        ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
        : event.status === 'cancelled'
            ? 'text-red-600 bg-red-50 border-red-100'
            : 'text-amber-600 bg-amber-50 border-amber-100';

    const isReport = event.isReport || event.reportId;

    const handleCardClick = () => {
        if (isReport && event.reportId) {
            router.push(`/labreports/${event.reportId}`);
        }
    };

    return (
        <div className="relative pl-9 sm:pl-12 group">
            {/* Dot on Line */}
            <div className={`absolute left-0 top-5 sm:top-6 w-9 sm:w-12 flex justify-center`}>
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-[2px] sm:border-[3px] border-white ring-1 ring-slate-200 shadow-sm transition-all group-hover:scale-125 group-hover:ring-teal-400 bg-white z-10 box-content`}>
                    <div className={`w-full h-full rounded-full ${event.status === 'completed' ? 'bg-teal-500' : 'bg-slate-300'}`}></div>
                </div>
            </div>

            {/* Main Card */}
            <motion.div
                layout
                onClick={handleCardClick}
                className={`bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-6 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] transition-all duration-300 ${isReport ? 'cursor-pointer hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/10 active:scale-[0.99]' : 'hover:shadow-lg hover:-translate-y-1 hover:border-teal-100'}`}
            >
                <div className="flex flex-row justify-between items-start gap-2.5 sm:gap-4 mb-2 sm:mb-3">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                        <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 border ${iconBg}`}>
                            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight sm:leading-normal truncate">
                                {event.title}
                            </h4>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                                <span className="text-[10px] sm:text-sm font-bold text-slate-400 whitespace-nowrap">
                                    {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">
                                    {event.eventType}
                                </span>
                            </div>
                        </div>
                    </div>

                    <span className={`flex-shrink-0 px-2 py-0.5 sm:px-3 sm:py-1.5 text-[0.6rem] sm:text-xs font-bold uppercase rounded-lg sm:rounded-xl border flex items-center gap-1 self-start ml-auto ${statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${event.status === 'completed' ? 'bg-emerald-500' : event.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                        {event.status || 'Pending'}
                    </span>
                </div>

                <div className="pl-[3rem] sm:pl-16 text-slate-500 font-medium text-xs sm:text-sm leading-relaxed mb-2 sm:mb-4">
                    {event.description || "No description provided."}
                </div>

                <div className="pl-[3rem] sm:pl-16 flex items-center gap-4">
                    {isReport ? (
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-slate-50 text-slate-600 font-bold text-[0.7rem] sm:text-sm rounded-lg sm:rounded-xl transition-all border border-slate-100 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 shadow-sm">
                            View Analysis
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors"
                        >
                            {isExpanded ? "Hide Details" : "View Details"}
                            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {isExpanded && !isReport && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pl-[3rem] sm:pl-16"
                        >
                            <div className="pt-4 mt-4 border-t border-slate-50 text-sm text-slate-600 bg-slate-50/50 -mx-6 px-6 pb-2 rounded-b-2xl">
                                <p className="mb-2"><span className="font-bold text-slate-900">Notes:</span> {event.description || "No additional notes."}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

// Custom Select Component (Adapted from ProfileView)
const CustomSelect = ({ value, options, onChange, placeholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium text-slate-700 hover:border-teal-200"
            >
                <span className={value ? "text-slate-900" : "text-slate-400"}>
                    {value ? (value.charAt(0).toUpperCase() + value.slice(1)) : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-teal-500' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                        >
                            {options.map((opt: any) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${value === opt.value ? 'text-teal-600 bg-teal-50' : 'text-slate-600'}`}
                                >
                                    {opt.label}
                                    {value === opt.value && <CheckCircle2 className="w-4 h-4 text-teal-500" />}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
        </div>
    );
};

// Simple Modal
function AddEventModal({ isOpen, onClose, onSubmit }: any) {
    const [formData, setFormData] = useState({
        title: '',
        eventDate: new Date().toISOString().split('T')[0],
        eventType: 'appointment',
        description: '',
        status: 'pending' // Default status
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Automatically set status based on date (optional but good practice)
    // Actually, user wants "Upcoming pending not completed" -> so default pending is fine.

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: '',
                eventDate: new Date().toISOString().split('T')[0],
                eventType: 'appointment',
                description: '',
                status: 'pending'
            });
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.eventDate || !formData.eventType) {
            setError("Please fill in all mandatory fields (*)");
            return;
        }
        setError(null);
        setIsSubmitting(true);
        const success = await onSubmit(formData);
        setIsSubmitting(false);
        if (!success) {
            setError("Failed to add event. Please try again.");
        }
    };

    const typeOptions = [
        { value: 'appointment', label: 'Appointment' },
        { value: 'test', label: 'Test / Lab' },
        { value: 'medication', label: 'Medication' },
        { value: 'general', label: 'General' }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-black text-xl text-slate-900 tracking-tight">Add New Event</h3>
                        <p className="text-sm text-slate-500 font-medium">Log a new health activity</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-pulse">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Event Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-300 font-medium text-slate-900"
                            placeholder="e.g. Dentist Appointment"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]} // Restrict to today and future
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-medium text-slate-600"
                                value={formData.eventDate}
                                onChange={e => setFormData({ ...formData, eventDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <CustomSelect
                                value={formData.eventType}
                                options={typeOptions}
                                onChange={(val: string) => setFormData({ ...formData, eventType: val })}
                                placeholder="Select Type"
                            />
                        </div>
                    </div>

                    {/* Status field removed as requested. Defaults to 'pending' */}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Description <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent h-28 resize-none transition-all placeholder:text-slate-300 font-medium text-slate-900"
                            placeholder="Add any notes, doctor names, or details..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>
                </div>

                <div className="p-6 pt-2 flex justify-end gap-3 bg-slate-50/50 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isSubmitting ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {isSubmitting ? 'Saving...' : 'Save Event'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
