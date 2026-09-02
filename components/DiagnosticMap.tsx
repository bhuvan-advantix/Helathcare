"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
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
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Move,
    MousePointerClick
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
    dotColor: string;
    Icon: typeof Activity;
}> = {
    screening: {
        label: 'Screening and imaging evidence',
        short: 'Screening',
        border: 'border-emerald-300',
        bg: 'bg-emerald-600',
        text: 'text-emerald-700',
        soft: 'bg-emerald-50',
        dotColor: '#059669',
        Icon: Stethoscope,
    },
    symptom: {
        label: 'Symptoms and clinical signals',
        short: 'Signals',
        border: 'border-sky-300',
        bg: 'bg-sky-600',
        text: 'text-sky-700',
        soft: 'bg-sky-50',
        dotColor: '#0284c7',
        Icon: AlertCircle,
    },
    pathology: {
        label: 'Biopsy and pathology confirmation',
        short: 'Pathology',
        border: 'border-violet-300',
        bg: 'bg-violet-600',
        text: 'text-violet-700',
        soft: 'bg-violet-50',
        dotColor: '#7c3aed',
        Icon: Microscope,
    },
    surgery: {
        label: 'Procedure or surgery',
        short: 'Procedure',
        border: 'border-rose-300',
        bg: 'bg-rose-600',
        text: 'text-rose-700',
        soft: 'bg-rose-50',
        dotColor: '#e11d48',
        Icon: Syringe,
    },
    therapy: {
        label: 'Treatment action',
        short: 'Treatment',
        border: 'border-amber-300',
        bg: 'bg-amber-500',
        text: 'text-amber-800',
        soft: 'bg-amber-50',
        dotColor: '#f59e0b',
        Icon: TestTube,
    },
    surveillance: {
        label: 'Monitoring and follow-up',
        short: 'Follow-up',
        border: 'border-cyan-300',
        bg: 'bg-cyan-600',
        text: 'text-cyan-700',
        soft: 'bg-cyan-50',
        dotColor: '#0891b2',
        Icon: Shield,
    },
    diagnosis: {
        label: 'Clinical decision',
        short: 'Decision',
        border: 'border-teal-300',
        bg: 'bg-teal-600',
        text: 'text-teal-700',
        soft: 'bg-teal-50',
        dotColor: '#0d9488',
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
        .find(param => param.name.toLowerCase() === 'stage')?.value?.toString() || 'Stage III';
}

function tnmFrom(nodes: DiagnosticNode[]) {
    return nodes
        .flatMap(node => node.parameters || [])
        .find(param => param.name.toLowerCase() === 'tnm')?.value?.toString() || 'cT2aN2M0';
}

function statusClass(status?: string) {
    if (status === 'critical') return 'text-red-700 bg-red-50 border-red-200';
    if (status === 'high') return 'text-rose-700 bg-rose-50 border-rose-200';
    if (status === 'low') return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
}

export function DiagnosticMap({ nodes }: DiagnosticMapProps) {
    const [zoom, setZoom] = useState(1);

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

    // Compact Card Dimensions for Pixel-Perfect Canvas Fitting
    const CARD_WIDTH = 232;
    const CARD_HEIGHT = 122;
    const COL_GAP = 24;
    const ROW_GAP = 24;

    // Initial Layout Coordinates (3 columns, 4 rows, perfectly centered with margin)
    const initialCoords = useMemo(() => {
        const map: Record<string, { x: number; y: number }> = {};
        orderedNodes.forEach((node, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            map[node.id] = {
                x: 20 + col * (CARD_WIDTH + COL_GAP),
                y: 20 + row * (CARD_HEIGHT + ROW_GAP),
            };
        });
        return map;
    }, [orderedNodes]);

    // Dynamic positions state when dragging cards
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

    useEffect(() => {
        setPositions(initialCoords);
    }, [initialCoords]);

    const handleReset = () => {
        setZoom(1);
        setPositions(initialCoords);
    };

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
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs font-sans">
            {/* Header Controls Bar */}
            <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-teal-700">
                        <Activity className="w-3.5 h-3.5" />
                        Interactive Diagnostic Mind Map
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-0.5">Clinical Pathway Canvas</h3>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black ${stageTone}`}>{stage}</span>
                    {tnm && <span className="px-2.5 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] font-black text-slate-700">{tnm}</span>}

                    {/* Zoom Toolbar */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs ml-1">
                        <button
                            onClick={() => setZoom(z => Math.min(z + 0.1, 1.3))}
                            className="p-1 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-600 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setZoom(z => Math.max(z - 0.1, 0.6))}
                            className="p-1 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-600 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleReset}
                            className="p-1 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-600 transition-colors"
                            title="Reset Layout"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-black text-slate-400 px-1.5 border-l border-slate-100">
                            {Math.round(zoom * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Instruction Banner */}
            <div className="bg-teal-50/50 border-b border-teal-100/50 px-4 py-1.5 flex items-center justify-between text-xs text-teal-800 font-semibold">
                <div className="flex items-center gap-1.5">
                    <MousePointerClick className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-[11px]">Drag any card to reposition. Dotted connectors update automatically.</span>
                </div>
                <span className="text-[10px] font-black text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                    {orderedNodes.length} Steps
                </span>
            </div>

            {/* CANVAS BOARD CONTAINER */}
            <div className="relative w-full h-[610px] overflow-auto bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:20px_20px] bg-slate-50/60 border-b border-slate-100 shadow-inner">
                <div
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: '0 0',
                        width: '790px',
                        height: '610px',
                        position: 'relative'
                    }}
                    className="transition-transform duration-200 ease-out p-3"
                >
                    {/* SVG DOTTED CONNECTING LINES LAYER */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <marker id="arrowHead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#0d9488" />
                            </marker>
                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#0d9488" />
                                <stop offset="100%" stopColor="#0284c7" />
                            </linearGradient>
                        </defs>

                        {/* Edge-to-Edge Dotted Lines from Step 1 -> Step 2 -> Step 3... */}
                        {orderedNodes.map((node, i) => {
                            if (i === orderedNodes.length - 1) return null;
                            const nextNode = orderedNodes[i + 1];
                            const p1 = positions[node.id] || initialCoords[node.id];
                            const p2 = positions[nextNode.id] || initialCoords[nextNode.id];
                            if (!p1 || !p2) return null;

                            const isHorizontalNext = Math.abs(p2.x - (p1.x + CARD_WIDTH)) < (COL_GAP + 100);

                            let x1, y1, x2, y2;
                            if (isHorizontalNext && p2.x > p1.x) {
                                x1 = p1.x + CARD_WIDTH;
                                y1 = p1.y + CARD_HEIGHT / 2;
                                x2 = p2.x;
                                y2 = p2.y + CARD_HEIGHT / 2;
                            } else {
                                x1 = p1.x + CARD_WIDTH / 2;
                                y1 = p1.y + CARD_HEIGHT;
                                x2 = p2.x + CARD_WIDTH / 2;
                                y2 = p2.y;
                            }

                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const cx1 = x1 + (isHorizontalNext ? dx * 0.4 : 0);
                            const cy1 = y1 + (isHorizontalNext ? 0 : dy * 0.4);
                            const cx2 = x1 + (isHorizontalNext ? dx * 0.6 : dx);
                            const cy2 = y1 + (isHorizontalNext ? dy : dy * 0.6);

                            const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

                            return (
                                <g key={`edge-${node.id}-${nextNode.id}`}>
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="#ccfbf1"
                                        strokeWidth="4"
                                    />
                                    <path
                                        d={pathD}
                                        fill="none"
                                        stroke="url(#lineGrad)"
                                        strokeWidth="2"
                                        strokeDasharray="5 4"
                                        markerEnd="url(#arrowHead)"
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* DRAGGABLE COMPACT NODE CARDS */}
                    {orderedNodes.map((node, index) => {
                        const type = node.type || 'diagnosis';
                        const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.diagnosis;
                        const Icon = cfg.Icon;
                        const active = selectedNode?.id === node.id;
                        const pos = positions[node.id] || initialCoords[node.id] || { x: 20, y: 20 };

                        return (
                            <motion.div
                                key={node.id}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                onDrag={(_, info) => {
                                    setPositions(prev => ({
                                        ...prev,
                                        [node.id]: {
                                            x: (prev[node.id]?.x ?? pos.x) + info.delta.x / zoom,
                                            y: (prev[node.id]?.y ?? pos.y) + info.delta.y / zoom,
                                        }
                                    }));
                                }}
                                style={{
                                    left: `${pos.x}px`,
                                    top: `${pos.y}px`,
                                    width: `${CARD_WIDTH}px`,
                                    height: `${CARD_HEIGHT}px`,
                                    position: 'absolute'
                                }}
                                onClick={() => setSelectedId(node.id)}
                                whileHover={{ scale: 1.02 }}
                                whileDrag={{ scale: 1.05, zIndex: 50 }}
                                className={`z-10 rounded-2xl bg-white border-2 p-2.5 shadow-xs cursor-grab active:cursor-grabbing flex flex-col justify-between transition-shadow ${active ? `${cfg.border} ring-4 ring-teal-500/20 shadow-md border-teal-500` : 'border-slate-200 hover:border-teal-300'
                                    }`}
                            >
                                {/* Top Row: Circular Step Badge + Category + Drag handle */}
                                <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        {/* STEP NUMBER BADGE */}
                                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                            {index + 1}
                                        </span>
                                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${cfg.soft} ${cfg.text}`}>
                                            {cfg.short}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-bold text-slate-400">Step {index + 1}</span>
                                        <Move className="w-3 h-3 text-slate-300 hover:text-slate-600 cursor-grab" />
                                    </div>
                                </div>

                                {/* Content: Crisp Title & Description */}
                                <div className="py-1">
                                    <div className="flex items-start gap-1.5">
                                        <span className={`w-5 h-5 rounded-lg ${cfg.bg} text-white flex items-center justify-center shrink-0 mt-0.5`}>
                                            <Icon className="w-3 h-3" />
                                        </span>
                                        <h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-2">
                                            {node.title}
                                        </h4>
                                    </div>
                                </div>

                                {/* Bottom Footer Row: Date + Evidence Tag */}
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-1.5">
                                    <span className="flex items-center gap-1 text-slate-500 truncate">
                                        <Calendar className="w-2.5 h-2.5 text-slate-400" />
                                        {node.date || 'Tracked'}
                                    </span>
                                    <span className="text-teal-700 font-extrabold bg-teal-50 px-1.5 py-0.5 rounded text-[8px] border border-teal-100 shrink-0">
                                        {(node.parameters || []).length} items
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* SELECTED NODE DETAILS PANEL */}
            {selectedNode && (
                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
                        <div className={`xl:col-span-7 rounded-2xl border ${selectedCfg.border} ${selectedCfg.soft} p-3.5`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl ${selectedCfg.bg} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
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
                                <div className="mt-3 rounded-xl bg-white/80 border border-white px-3.5 py-2.5 shadow-2xs">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Info className="w-3 h-3 text-teal-600" />
                                        Clinical trigger & rationale
                                    </p>
                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">{selectedNode.rationale}</p>
                                </div>
                            )}
                        </div>

                        <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                            <div className="flex items-center gap-2 mb-2.5">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence and clinical output</p>
                            </div>

                            {selectedNode.parameters && selectedNode.parameters.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2.5">
                                    {selectedNode.parameters.slice(0, 4).map((param) => (
                                        <div key={param.id || `${selectedNode.id}-${param.name}`} className={`rounded-xl border px-2.5 py-1.5 ${statusClass(param.status)}`}>
                                            <p className="text-[9px] font-black uppercase tracking-wide opacity-70 truncate">{param.name}</p>
                                            <p className="text-xs font-black text-slate-950 mt-0.5 truncate">
                                                {param.value} <span className="text-[9px] font-bold text-slate-500">{param.unit || ''}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedNode.outcome && (
                                <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 shadow-2xs">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Documented Decision
                                    </p>
                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">{selectedNode.outcome}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DiagnosticMap;
