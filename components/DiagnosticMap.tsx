"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, X, Calendar } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthParameter {
    id: string;
    name: string;
    value: string;
    unit: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    timestamp: string;
}

export interface DiagnosticNode {
    id: string;
    title: string;
    description: string;
    date: string;
    x: number;
    y: number;
    connections: string[];
    parameters: HealthParameter[];
}

interface DiagnosticMapProps {
    nodes: DiagnosticNode[];
    className?: string;
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

function getNodeType(node: DiagnosticNode) {
    const t = node.title.toLowerCase();
    if (node.id.startsWith('init') || node.id === 'start') return 'initial';
    if (node.id.startsWith('terminal') || t.includes('recovery') || t.includes('remission')) return 'terminal';
    if (t.includes('symptom')) return 'symptoms';
    if (t.includes('treatment') || t.includes('medication') || t.includes('therapy')) return 'treatment';
    if (t.includes('care') || t.includes('monitoring')) return 'care';
    if (t.includes('diagnosis') || t.includes('confirmed') || t.includes('screen')) return 'diagnosis';
    return 'diagnosis';
}

const NODE_STYLES: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    initial: { bg: '#ECFDF5', border: '#6EE7B7', text: '#065F46', accent: '#10B981' },
    terminal: { bg: '#EFF6FF', border: '#93C5FD', text: '#1E3A8A', accent: '#3B82F6' },
    symptoms: { bg: '#FEF3C7', border: '#FCD34D', text: '#78350F', accent: '#F59E0B' },
    treatment: { bg: '#F0FDF4', border: '#86EFAC', text: '#14532D', accent: '#22C55E' },
    care: { bg: '#E0F2FE', border: '#7DD3FC', text: '#075985', accent: '#0EA5E9' },
    diagnosis: { bg: '#F5F3FF', border: '#C4B5FD', text: '#3B0764', accent: '#8B5CF6' },
};

function getConnectionColor(src: DiagnosticNode, tgt: DiagnosticNode): string {
    const s = src.title.toLowerCase();
    const t = tgt.title.toLowerCase();
    if (s.includes('symptom') || t.includes('symptom')) return '#F59E0B';
    if (s.includes('treatment') || t.includes('treatment') || s.includes('medication') || t.includes('medication')) return '#22C55E';
    if (s.includes('care') || t.includes('care') || s.includes('monitor') || t.includes('monitor')) return '#0EA5E9';
    if (s.includes('recovery') || t.includes('recovery') || s.includes('remission') || t.includes('remission')) return '#06B6D4';
    return '#8B5CF6';
}

const LEGEND = [
    { color: '#F59E0B', label: 'Symptoms' },
    { color: '#22C55E', label: 'Treatment' },
    { color: '#0EA5E9', label: 'Care' },
    { color: '#8B5CF6', label: 'Diagnosis' },
    { color: '#06B6D4', label: 'Recovery' },
];

const STATUS_COLOR: Record<string, string> = {
    normal: '#10B981',
    high: '#EF4444',
    low: '#F59E0B',
    critical: '#DC2626',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 200;
const NODE_H = 80;

function getNodePos(node: DiagnosticNode) {
    return { x: 200 + node.x * 350, y: 150 + node.y * 200 };
}

function getCurvePath(src: DiagnosticNode, tgt: DiagnosticNode) {
    const s = getNodePos(src);
    const t = getNodePos(tgt);
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2 - 30;
    return `M${s.x},${s.y} Q${mx},${my} ${t.x},${t.y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiagnosticMap({ nodes, className = '' }: DiagnosticMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [viewBox, setViewBox] = useState('0 0 1000 1000');
    const [activeNode, setActiveNode] = useState<DiagnosticNode | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastPan, setLastPan] = useState({ x: 0, y: 0 });

    const [pinchDistance, setPinchDistance] = useState<number | null>(null);
    const [lastZoom, setLastZoom] = useState(1);
    const [isPinching, setIsPinching] = useState(false);
    const [pinchFingerRemoved, setPinchFingerRemoved] = useState(false);
    const [initialTouchPos, setInitialTouchPos] = useState({ x: 0, y: 0 });

    const movedRef = useRef(false);
    const lastTapRef = useRef(0);
    const lastTapPosRef = useRef({ x: 0, y: 0 });

    // ── Sorted nodes ────────────────────────────────────────────────────────────
    const sorted = [...nodes].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // ── Initial viewBox ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (sorted.length === 0) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        sorted.forEach(n => {
            const p = getNodePos(n);
            minX = Math.min(minX, p.x - NODE_W / 2 - 80);
            maxX = Math.max(maxX, p.x + NODE_W / 2 + 80);
            minY = Math.min(minY, p.y - NODE_H / 2 - 80);
            maxY = Math.max(maxY, p.y + NODE_H / 2 + 80);
        });
        const pad = 150;
        setPan({ x: minX - pad, y: minY - pad });
        setZoom(1);
    }, [nodes.length]);

    // ── Sync viewBox ────────────────────────────────────────────────────────────
    useEffect(() => {
        setViewBox(`${pan.x} ${pan.y} ${1000 / zoom} ${1000 / zoom}`);
    }, [zoom, pan]);

    // ── Zoom helpers ────────────────────────────────────────────────────────────
    const calcZoomPan = useCallback(
        (cx: number, cy: number, nz: number, oz: number) => {
            const el = svgRef.current ?? containerRef.current;
            if (!el) return { nx: pan.x, ny: pan.y };
            const r = el.getBoundingClientRect();
            const vw = 1000 / oz, vh = 1000 / oz;
            const rx = (cx - r.left) / r.width, ry = (cy - r.top) / r.height;
            const sx = rx * vw + pan.x, sy = ry * vh + pan.y;
            return { nx: sx - rx * (1000 / nz), ny: sy - ry * (1000 / nz) };
        },
        [pan]
    );

    const zoomIn = useCallback(
        (cx?: number, cy?: number) => {
            const nz = Math.min(zoom + 0.2, 3);
            if (cx != null && cy != null) {
                const { nx, ny } = calcZoomPan(cx, cy, nz, zoom);
                setZoom(nz); setPan({ x: nx, y: ny });
            } else if (containerRef.current) {
                const r = containerRef.current.getBoundingClientRect();
                const { nx, ny } = calcZoomPan(r.left + r.width / 2, r.top + r.height / 2, nz, zoom);
                setZoom(nz); setPan({ x: nx, y: ny });
            } else setZoom(nz);
        },
        [zoom, calcZoomPan]
    );

    const zoomOut = useCallback(
        (cx?: number, cy?: number) => {
            const nz = Math.max(zoom - 0.2, 0.3);
            if (cx != null && cy != null) {
                const { nx, ny } = calcZoomPan(cx, cy, nz, zoom);
                setZoom(nz); setPan({ x: nx, y: ny });
            } else if (containerRef.current) {
                const r = containerRef.current.getBoundingClientRect();
                const { nx, ny } = calcZoomPan(r.left + r.width / 2, r.top + r.height / 2, nz, zoom);
                setZoom(nz); setPan({ x: nx, y: ny });
            } else setZoom(nz);
        },
        [zoom, calcZoomPan]
    );

    const resetView = useCallback(() => {
        if (sorted.length === 0) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        sorted.forEach(n => {
            const p = getNodePos(n);
            minX = Math.min(minX, p.x - NODE_W / 2 - 80);
            maxX = Math.max(maxX, p.x + NODE_W / 2 + 80);
            minY = Math.min(minY, p.y - NODE_H / 2 - 80);
            maxY = Math.max(maxY, p.y + NODE_H / 2 + 80);
        });
        const pad = 150;
        setZoom(1); setPan({ x: minX - pad, y: minY - pad });
    }, [sorted]);

    // ── Touch ──────────────────────────────────────────────────────────────────
    const getTouchDist = (e: React.TouchEvent) => {
        if (e.touches.length < 2) return null;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            movedRef.current = false;
            if (e.touches.length === 1) {
                setIsDragging(true);
                const p = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                setInitialTouchPos(p); setDragStart(p); setLastPan({ ...pan });
                setPinchFingerRemoved(false);
                setTimeout(() => setIsPinching(false), 50);
            } else if (e.touches.length === 2) {
                setIsPinching(true); setIsDragging(false);
                setPinchDistance(getTouchDist(e)); setLastZoom(zoom); setPinchFingerRemoved(false);
            }
        },
        [pan, zoom]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (isDragging && e.touches.length === 1 && (!isPinching || pinchFingerRemoved)) {
                e.preventDefault();
                const moved = Math.hypot(e.touches[0].clientX - initialTouchPos.x, e.touches[0].clientY - initialTouchPos.y);
                if (moved > 10) movedRef.current = true;
                const dx = (e.touches[0].clientX - dragStart.x) / zoom;
                const dy = (e.touches[0].clientY - dragStart.y) / zoom;
                setPan({ x: lastPan.x - dx, y: lastPan.y - dy });
            } else if (e.touches.length === 2) {
                e.preventDefault();
                setIsPinching(true);
                const nd = getTouchDist(e);
                if (nd == null) return;
                const nz = Math.max(0.3, Math.min(3, lastZoom * (nd / (pinchDistance || 1))));
                const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const { nx, ny } = calcZoomPan(cx, cy, nz, lastZoom);
                setZoom(nz); setPan({ x: nx, y: ny });
            }
        },
        [isDragging, dragStart, lastPan, zoom, pinchDistance, lastZoom, isPinching, pinchFingerRemoved, calcZoomPan, initialTouchPos]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            const changed = e.changedTouches[0];
            if (e.touches.length === 0) {
                if (isPinching) setPinchFingerRemoved(true);
                if (changed) {
                    const now = Date.now();
                    const dt = now - lastTapRef.current;
                    const dist = Math.hypot(changed.clientX - lastTapPosRef.current.x, changed.clientY - lastTapPosRef.current.y);
                    if (dt < 300 && dist < 25 && !movedRef.current) {
                        zoomIn(changed.clientX, changed.clientY);
                        lastTapRef.current = 0;
                    } else {
                        lastTapRef.current = now;
                        lastTapPosRef.current = { x: changed.clientX, y: changed.clientY };
                    }
                }
                setTimeout(() => { setIsDragging(false); setIsPinching(false); }, 100);
            } else if (e.touches.length === 1 && isPinching) {
                setPinchFingerRemoved(true);
                setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                setLastPan({ ...pan });
                setTimeout(() => setIsPinching(false), 100);
            }
            setPinchDistance(null);
        },
        [isPinching, pan, zoomIn]
    );

    // ── Mouse ─────────────────────────────────────────────────────────────────
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => { movedRef.current = false; setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); setLastPan({ ...pan }); },
        [pan]
    );
    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isDragging) return;
            if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 6) movedRef.current = true;
            setPan({ x: lastPan.x - (e.clientX - dragStart.x) / zoom, y: lastPan.y - (e.clientY - dragStart.y) / zoom });
        },
        [isDragging, dragStart, lastPan, zoom]
    );
    const handleMouseUp = useCallback(() => setIsDragging(false), []);
    const handleWheel = useCallback(
        (e: React.WheelEvent) => { e.preventDefault(); e.deltaY > 0 ? zoomOut(e.clientX, e.clientY) : zoomIn(e.clientX, e.clientY); },
        [zoomIn, zoomOut]
    );

    // prevent page scroll on touch
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const prevent = (e: TouchEvent) => { if (e.touches.length >= 1) e.preventDefault(); };
        el.addEventListener('touchmove', prevent, { passive: false });
        return () => el.removeEventListener('touchmove', prevent);
    }, []);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                {[
                    { icon: <ZoomIn className="w-4 h-4" />, fn: () => zoomIn(), label: 'Zoom In' },
                    { icon: <ZoomOut className="w-4 h-4" />, fn: () => zoomOut(), label: 'Zoom Out' },
                    { icon: <Maximize2 className="w-4 h-4" />, fn: resetView, label: 'Reset' },
                ].map(({ icon, fn, label }) => (
                    <motion.button
                        key={label}
                        whileTap={{ scale: 0.9 }}
                        onClick={fn}
                        aria-label={label}
                        className="w-9 h-9 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md flex items-center justify-center text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:shadow-teal-100/60 transition-all duration-150"
                    >
                        {icon}
                    </motion.button>
                ))}
            </div>

            {/* Canvas */}
            <div
                className="w-full h-[65vh] md:h-[600px] lg:h-[700px] rounded-2xl overflow-hidden touch-none select-none border border-slate-100 shadow-inner bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                onDoubleClick={e => zoomIn(e.clientX, e.clientY)}
            >
                <svg ref={svgRef} viewBox={viewBox} className="w-full h-full">
                    <defs>
                        {[
                            { id: 'arr-symptom', color: '#F59E0B' },
                            { id: 'arr-treatment', color: '#22C55E' },
                            { id: 'arr-care', color: '#0EA5E9' },
                            { id: 'arr-diagnosis', color: '#8B5CF6' },
                            { id: 'arr-recovery', color: '#06B6D4' },
                            { id: 'arr-default', color: '#9CA3AF' },
                        ].map(({ id, color }) => (
                            <marker key={id} id={id} markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
                                <polygon points="0 0, 7 3.5, 0 7" fill={color} />
                            </marker>
                        ))}
                    </defs>

                    {/* Connections */}
                    {sorted.map(node =>
                        node.connections.map(tid => {
                            const tgt = sorted.find(n => n.id === tid);
                            if (!tgt) return null;
                            const color = getConnectionColor(node, tgt);
                            const markerMap: Record<string, string> = {
                                '#F59E0B': 'arr-symptom',
                                '#22C55E': 'arr-treatment',
                                '#0EA5E9': 'arr-care',
                                '#8B5CF6': 'arr-diagnosis',
                                '#06B6D4': 'arr-recovery',
                            };
                            const marker = markerMap[color] ?? 'arr-default';
                            return (
                                <path
                                    key={`${node.id}-${tid}`}
                                    d={getCurvePath(node, tgt)}
                                    stroke={color}
                                    strokeWidth="2.5"
                                    fill="none"
                                    opacity="0.75"
                                    markerEnd={`url(#${marker})`}
                                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))' }}
                                />
                            );
                        })
                    )}

                    {/* Nodes */}
                    {sorted.map(node => {
                        const pos = getNodePos(node);
                        const type = getNodeType(node);
                        const style = NODE_STYLES[type] ?? NODE_STYLES.diagnosis;
                        const isActive = activeNode?.id === node.id;
                        const hasParams = node.parameters.length > 0;

                        return (
                            <g
                                key={node.id}
                                transform={`translate(${pos.x - NODE_W / 2},${pos.y - NODE_H / 2})`}
                                onClick={() => { if (!movedRef.current) setActiveNode(isActive ? null : node); }}
                                className="cursor-pointer group"
                            >
                                {/* Drop shadow rect */}
                                <rect x="3" y="5" width={NODE_W} height={NODE_H} rx="14" fill="rgba(0,0,0,0.07)" />
                                {/* Main card */}
                                <rect
                                    x="0" y="0" width={NODE_W} height={NODE_H} rx="14"
                                    fill={style.bg}
                                    stroke={isActive ? style.accent : style.border}
                                    strokeWidth={isActive ? 2.5 : 1.5}
                                />
                                {/* Left accent */}
                                <rect x="0" y="0" width="6" height={NODE_H} rx="14" fill={style.accent} />
                                <rect x="0" y="6" width="6" height={NODE_H - 12} fill={style.accent} />

                                {/* Title */}
                                <text
                                    x={NODE_W / 2 + 5}
                                    y={hasParams ? 28 : 46}
                                    textAnchor="middle"
                                    fill={style.text}
                                    fontWeight="700"
                                    fontSize="13"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {node.title.length > 22 ? node.title.slice(0, 21) + '…' : node.title}
                                </text>

                                {hasParams && (
                                    <text
                                        x={NODE_W / 2 + 5}
                                        y={50}
                                        textAnchor="middle"
                                        fill={style.text}
                                        fontSize="11"
                                        opacity="0.7"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {`${node.parameters[0].name}: ${node.parameters[0].value} ${node.parameters[0].unit}`}
                                    </text>
                                )}

                                {/* Date */}
                                <text
                                    x={NODE_W / 2 + 5}
                                    y={68}
                                    textAnchor="middle"
                                    fill={style.text}
                                    fontSize="10"
                                    opacity="0.5"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {new Date(node.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="mt-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Connection Types</p>
                <div className="flex flex-wrap gap-3">
                    {LEGEND.map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-slate-500 font-medium">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile tip */}
            <p className="md:hidden mt-2 text-center text-xs text-slate-400 font-medium">
                💡 Pinch to zoom · Drag to pan · Double-tap to zoom in
            </p>

            {/* Active node detail panel */}
            <AnimatePresence>
                {activeNode && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden"
                    >
                        {/* Header */}
                        <div
                            className="p-4 flex items-start justify-between"
                            style={{ backgroundColor: NODE_STYLES[getNodeType(activeNode)]?.bg ?? '#F9FAFB' }}
                        >
                            <div className="flex-1 min-w-0 pr-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: NODE_STYLES[getNodeType(activeNode)]?.accent }}
                                    />
                                    <span
                                        className="text-[10px] font-black uppercase tracking-widest"
                                        style={{ color: NODE_STYLES[getNodeType(activeNode)]?.accent }}
                                    >
                                        {getNodeType(activeNode)}
                                    </span>
                                </div>
                                <h3 className="text-base font-black text-slate-900">{activeNode.title}</h3>
                                <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                    <Calendar className="w-3 h-3" />
                                    <span className="text-[11px]">
                                        {new Date(activeNode.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveNode(null)}
                                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4">
                            {activeNode.description && (
                                <p className="text-sm text-slate-600 leading-relaxed mb-4">{activeNode.description}</p>
                            )}

                            {activeNode.parameters.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parameters</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {activeNode.parameters.map(param => (
                                            <div
                                                key={param.id}
                                                className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-0.5"
                                            >
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase">{param.name}</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span
                                                        className="text-base font-black"
                                                        style={{ color: STATUS_COLOR[param.status] ?? '#374151' }}
                                                    >
                                                        {param.value}
                                                    </span>
                                                    {param.unit && <span className="text-[10px] text-slate-400">{param.unit}</span>}
                                                </div>
                                                <span
                                                    className="text-[10px] font-bold capitalize"
                                                    style={{ color: STATUS_COLOR[param.status] ?? '#6B7280' }}
                                                >
                                                    {param.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
