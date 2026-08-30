"use client";

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Calendar,
    CheckCircle2,
    FileText,
    Info,
    Microscope,
    Shield,
    Stethoscope,
    Syringe,
    TestTube,
    AlertCircle,
} from 'lucide-react';

export interface DiagnosticNodeParameter {
    id: string;
    name: string;
    value: string | number;
    unit?: string;
    status?: 'normal' | 'high' | 'low' | 'critical';
    timestamp?: string;
}

type NodeType = 'screening' | 'symptom' | 'pathology' | 'surgery' | 'therapy' | 'surveillance' | 'diagnosis';

export interface DiagnosticNode {
    id: string;
    title: string;
    description?: string;
    rationale?: string;
    type?: NodeType;
    date?: string;
    outcome?: string;
    x?: number;
    y?: number;
    connections?: string[];
    parameters?: DiagnosticNodeParameter[];
}

interface DiagnosticMapProps {
    nodes: DiagnosticNode[];
}

const TYPE_CONFIG: Record<NodeType, {
    label: string;
    short: string;
    border: string;
    bg: string;
    text: string;
    soft: string;
    Icon: typeof Activity;
}> = {
    screening: {
        label: 'Screening and imaging evidence',
        short: 'Screening',
        border: 'border-emerald-300',
        bg: 'bg-emerald-600',
        text: 'text-emerald-700',
        soft: 'bg-emerald-50',
        Icon: Stethoscope,
    },
    symptom: {
        label: 'Symptoms and clinical signals',
        short: 'Signals',
        border: 'border-sky-300',
        bg: 'bg-sky-600',
        text: 'text-sky-700',
        soft: 'bg-sky-50',
        Icon: AlertCircle,
    },
    pathology: {
        label: 'Biopsy and pathology confirmation',
        short: 'Pathology',
        border: 'border-violet-300',
        bg: 'bg-violet-600',
        text: 'text-violet-700',
        soft: 'bg-violet-50',
        Icon: Microscope,
    },
    surgery: {
        label: 'Procedure or surgery',
        short: 'Procedure',
        border: 'border-rose-300',
        bg: 'bg-rose-600',
        text: 'text-rose-700',
        soft: 'bg-rose-50',
        Icon: Syringe,
    },
    therapy: {
        label: 'Treatment action',
        short: 'Treatment',
        border: 'border-amber-300',
        bg: 'bg-amber-500',
        text: 'text-amber-800',
        soft: 'bg-amber-50',
        Icon: TestTube,
    },
    surveillance: {
        label: 'Monitoring and follow-up',
        short: 'Follow-up',
        border: 'border-cyan-300',
        bg: 'bg-cyan-600',
        text: 'text-cyan-700',
        soft: 'bg-cyan-50',
        Icon: Shield,
    },
    diagnosis: {
        label: 'Clinical decision',
        short: 'Decision',
        border: 'border-teal-300',
        bg: 'bg-teal-600',
        text: 'text-teal-700',
        soft: 'bg-teal-50',
        Icon: Activity,
    },
};

const STAGE_CONFIG = {
    'Stage I': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Stage II': 'bg-sky-50 text-sky-800 border-sky-200',
    'Stage III': 'bg-amber-50 text-amber-900 border-amber-200',
    'Stage IV': 'bg-rose-50 text-rose-800 border-rose-200',
};

function stageFrom(nodes: DiagnosticNode[]) {
    return nodes
        .flatMap(node => node.parameters || [])
        .find(param => param.name.toLowerCase() === 'stage')?.value?.toString() || 'Stage';
}

function tnmFrom(nodes: DiagnosticNode[]) {
    return nodes
        .flatMap(node => node.parameters || [])
        .find(param => param.name.toLowerCase() === 'tnm')?.value?.toString() || '';
}

function statusClass(status?: string) {
    if (status === 'critical') return 'text-red-700 bg-red-50 border-red-200';
    if (status === 'high') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (status === 'low') return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
}

export function DiagnosticMap({ nodes }: DiagnosticMapProps) {
    const orderedNodes = useMemo(() => {
        return [...nodes].sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            return aTime - bTime;
        });
    }, [nodes]);

    const [selectedId, setSelectedId] = useState(orderedNodes[0]?.id || '');
    const selectedNode = orderedNodes.find(node => node.id === selectedId) || orderedNodes[0];
    const stage = stageFrom(orderedNodes);
    const tnm = tnmFrom(orderedNodes);
    const stageTone = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG] || 'bg-teal-50 text-teal-800 border-teal-200';
    const architectureSteps = [
        'Profile & exposure',
        'Symptoms/signals',
        'Labs & imaging',
        'Pathology',
        'TNM staging',
        'Plan & closure',
    ];

    if (orderedNodes.length === 0) {
        return (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                No diagnostic pathway available.
            </div>
        );
    }

    const selectedType = selectedNode?.type || 'diagnosis';
    const selectedCfg = TYPE_CONFIG[selectedType] || TYPE_CONFIG.diagnosis;
    const SelectedIcon = selectedCfg.Icon;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-teal-700">
                            <Activity className="w-3.5 h-3.5" />
                            Clinical Workflow
                        </div>
                        <h3 className="text-lg font-black text-slate-950 mt-0.5">Signal to diagnosis to follow-up</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-black ${stageTone}`}>{stage}</span>
                        {tnm && <span className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-black text-slate-700">{tnm}</span>}
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="mb-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {architectureSteps.map((step, index) => (
                        <div key={step} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-[10px] font-black text-white">
                                    {index + 1}
                                </span>
                                <p className="text-[10px] sm:text-[11px] font-black text-slate-800 leading-tight break-words min-w-0">{step}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {orderedNodes.map((node, index) => {
                        const type = node.type || 'diagnosis';
                        const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.diagnosis;
                        const Icon = cfg.Icon;
                        const active = selectedNode?.id === node.id;

                        return (
                            <motion.button
                                key={node.id}
                                type="button"
                                whileHover={{ y: -2 }}
                                onClick={() => setSelectedId(node.id)}
                                className={`relative min-h-[118px] overflow-hidden text-left rounded-2xl border-2 bg-white p-3 shadow-sm transition-all ${active ? `${cfg.border} ring-4 ring-slate-100` : 'border-slate-100 hover:border-slate-300'}`}
                            >
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <span className={`w-8 h-8 rounded-xl ${cfg.bg} text-white flex items-center justify-center shadow-sm shrink-0`}>
                                        <Icon className="w-4 h-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2 min-w-0">
                                            <span className={`min-w-0 max-w-[82px] truncate rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${cfg.soft} ${cfg.text}`}>
                                                {cfg.short}
                                            </span>
                                            <span className="flex-shrink-0 text-[9px] font-black text-slate-400">Step {index + 1}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-950 mt-1.5 leading-snug line-clamp-2 break-words">{node.title}</h4>
                                        {node.description && (
                                            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500 line-clamp-2 break-words">{node.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    {node.date && (
                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 min-w-0">
                                            <Calendar className="w-3 h-3" />
                                            {node.date}
                                        </p>
                                    )}
                                    <span className="text-[9px] font-black text-slate-400 whitespace-nowrap">
                                        {(node.parameters || []).length} evidence
                                    </span>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {selectedNode && (
                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-3">
                        <div className={`xl:col-span-7 rounded-2xl border ${selectedCfg.border} ${selectedCfg.soft} p-3.5`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl ${selectedCfg.bg} text-white flex items-center justify-center shrink-0`}>
                                    <SelectedIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${selectedCfg.text}`}>{selectedCfg.label}</p>
                                    <h4 className="text-base font-black text-slate-950 mt-0.5">{selectedNode.title}</h4>
                                    {selectedNode.description && (
                                        <p className="text-xs text-slate-700 font-semibold leading-relaxed mt-1.5">{selectedNode.description}</p>
                                    )}
                                </div>
                            </div>

                            {selectedNode.rationale && (
                                <div className="mt-3 rounded-xl bg-white/80 border border-white px-3 py-2.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Info className="w-3 h-3 text-teal-600" />
                                        Clinical trigger
                                    </p>
                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">{selectedNode.rationale}</p>
                                </div>
                            )}
                        </div>

                        <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                            <div className="flex items-center gap-2 mb-2.5">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence and output</p>
                            </div>

                            {selectedNode.parameters && selectedNode.parameters.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2.5">
                                    {selectedNode.parameters.slice(0, 4).map((param) => (
                                        <div key={param.id || `${selectedNode.id}-${param.name}`} className={`rounded-xl border px-2.5 py-2 ${statusClass(param.status)}`}>
                                            <p className="text-[9px] font-black uppercase tracking-wide opacity-70 truncate">{param.name}</p>
                                            <p className="text-xs font-black text-slate-950 mt-0.5 truncate">
                                                {param.value} <span className="text-[9px] font-bold text-slate-500">{param.unit || ''}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedNode.outcome && (
                                <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Decision
                                    </p>
                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">{selectedNode.outcome}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                        Clinician-reviewed pathway. Source evidence is retained, trends are explained, and follow-up remains assigned until documented closure.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default DiagnosticMap;
