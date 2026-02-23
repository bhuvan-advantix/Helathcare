"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    FileText,
    Pill,
    Activity,
    ChevronDown,
    Search,
    Clock,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DoctorHealthTimeline({ events }: { events: any[] }) {
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter Logic
    const filteredEvents = events.filter(event => {
        const matchesType = filterType === 'All' || event.eventType.toLowerCase() === filterType.toLowerCase();
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesType && matchesSearch;
    });

    // Separate Upcoming and Past
    const now = new Date();
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-all focus:bg-white"
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

            <div className="space-y-8">
                {/* Upcoming Events Section (Pinned at top) */}
                {upcomingEvents.length > 0 && (
                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-teal-600" />
                            Upcoming Events
                        </h3>
                        <div className="space-y-4 relative z-10">
                            {upcomingEvents.map((event, idx) => (
                                <div key={idx} className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3 sm:gap-4 hover:border-teal-200 transition-colors">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 text-teal-600 font-bold border border-teal-100">
                                        <div className="text-center leading-none">
                                            <span className="block text-[0.6rem] sm:text-xs uppercase text-teal-400 mb-0.5">{new Date(event.eventDate).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-base sm:text-lg">{new Date(event.eventDate).getDate()}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900">{event.title}</h4>
                                        <p className="text-sm text-slate-500 mt-1">{event.description || "No specific details"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline Header */}
                <div className="flex items-center justify-between pt-6 mb-6 px-1">
                    <h3 className="font-bold text-xl text-slate-900 tracking-tight">Recent Activity</h3>
                </div>

                {/* Vertical Timeline */}
                <div className="relative space-y-6">
                    {/* Vertical Line */}
                    <div className="absolute left-[19px] sm:left-[25px] top-6 bottom-6 w-0 border-l-2 border-dashed border-teal-200/60"></div>

                    {pastEvents.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h3 className="text-slate-900 font-bold">No past events</h3>
                        </div>
                    )}

                    {pastEvents.map((event, idx) => (
                        <TimelineCard key={idx} event={event} />
                    ))}

                </div>
            </div>
        </div>
    );
}

// Reuse Timeline Card Logic
function TimelineCard({ event }: { event: any }) {
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
                className={`bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-6 border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-teal-100`}
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
            </motion.div>
        </div>
    );
}

