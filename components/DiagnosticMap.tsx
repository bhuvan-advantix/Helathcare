"use client";

import {
    useCallback, useEffect, useLayoutEffect,
    useMemo, useRef, useState,
} from 'react';
import {
    Activity, AlertCircle, AlertTriangle, Calendar,
    CheckCircle2, ChevronRight, Crosshair, FileText,
    Info, Maximize2, Microscope, Move, RotateCcw,
    Shield, Stethoscope, Syringe, TestTube,
    ZoomIn, ZoomOut,
} from 'lucide-react';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DiagnosticNodeParameter {
    id: string;
    name: string;
    value: string | number;
    unit?: string;
    status?: 'normal' | 'high' | 'low' | 'critical';
    timestamp?: string;
}

export interface DiagnosticNode {
    id: string;
    title: string;
    description?: string;
    rationale?: string;
    type?: string;
    date?: string;
    outcome?: string;
    x?: number;
    y?: number;
    connections?: string[];
    parameters?: DiagnosticNodeParameter[];
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
    label: string;
    bg: string;
    accent: string;
    headerBg: string;
    iconBg: string;
    Icon: typeof Activity;
}> = {
    screening:    { label: 'Screening',        bg: '#f0fdfa', accent: '#0d9488', headerBg: 'linear-gradient(135deg, #0d9488, #0f766e)', iconBg: 'rgba(255,255,255,0.22)', Icon: Stethoscope },
    symptom:      { label: 'Clinical Signal',  bg: '#eff6ff', accent: '#2563eb', headerBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)', iconBg: 'rgba(255,255,255,0.22)', Icon: AlertCircle },
    pathology:    { label: 'Pathology',        bg: '#faf5ff', accent: '#7c3aed', headerBg: 'linear-gradient(135deg, #7c3aed, #6d28d9)', iconBg: 'rgba(255,255,255,0.22)', Icon: Microscope },
    surgery:      { label: 'Procedure',        bg: '#fff1f2', accent: '#e11d48', headerBg: 'linear-gradient(135deg, #e11d48, #be123c)', iconBg: 'rgba(255,255,255,0.22)', Icon: Syringe },
    therapy:      { label: 'Treatment',        bg: '#fffbeb', accent: '#d97706', headerBg: 'linear-gradient(135deg, #d97706, #b45309)', iconBg: 'rgba(255,255,255,0.22)', Icon: TestTube },
    surveillance: { label: 'Surveillance',     bg: '#ecfeff', accent: '#0891b2', headerBg: 'linear-gradient(135deg, #0891b2, #0e7490)', iconBg: 'rgba(255,255,255,0.22)', Icon: Shield },
    diagnosis:    { label: 'Clinical Decision',bg: '#f0fdfa', accent: '#0d9488', headerBg: 'linear-gradient(135deg, #0d9488, #0f766e)', iconBg: 'rgba(255,255,255,0.22)', Icon: Activity },
    profile:      { label: 'Patient Profile',  bg: '#f8fafc', accent: '#475569', headerBg: 'linear-gradient(135deg, #475569, #334155)', iconBg: 'rgba(255,255,255,0.22)', Icon: Activity },
    followup:     { label: 'Follow-up',        bg: '#ecfeff', accent: '#0891b2', headerBg: 'linear-gradient(135deg, #0891b2, #0e7490)', iconBg: 'rgba(255,255,255,0.22)', Icon: Shield },
    baseline:     { label: 'Baseline',         bg: '#f0fdfa', accent: '#059669', headerBg: 'linear-gradient(135deg, #059669, #047857)', iconBg: 'rgba(255,255,255,0.22)', Icon: Activity },
};

const getCfg = (t?: string) => TYPE_CONFIG[t ?? ''] ?? TYPE_CONFIG.diagnosis;

// ─── Layout constants ─────────────────────────────────────────────────────────

const CANVAS_W = 780;
const NODE_W   = 210;

// Column x-positions for 3-column alternating layout
const COL_L = 30;
const COL_C = CANVAS_W / 2 - NODE_W / 2;
const COL_R = CANVAS_W - NODE_W - 30;
const V_GAP = 56; // vertical gap between nodes

function colX(i: number): number {
    // Flow: centre → left → right → centre → left → right
    return [COL_C, COL_L, COL_R][i % 3];
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function chipStyle(s?: string): { bg: string; text: string; bdr: string } {
    if (s === 'critical') return { bg: '#fef2f2', text: '#b91c1c', bdr: '#fecaca' };
    if (s === 'high')     return { bg: '#fff7ed', text: '#c2410c', bdr: '#fed7aa' };
    if (s === 'low')      return { bg: '#fffbeb', text: '#92400e', bdr: '#fde68a' };
    return                       { bg: '#f0fdf4', text: '#166534', bdr: '#bbf7d0' };
}

// ─── Bezier path ──────────────────────────────────────────────────────────────

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const cy = (y1 + y2) / 2;
    // Offset control points horizontally if x differ greatly for a nice S-curve
    const cx1 = x1, cx2 = x2;
    return `M${x1},${y1} C${cx1},${cy} ${cx2},${cy} ${x2},${y2}`;
}

// ─── Node Card ────────────────────────────────────────────────────────────────

interface CardProps {
    node: DiagnosticNode;
    index: number;
    selected: boolean;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onClick: () => void;
    cardRef: (el: HTMLDivElement | null) => void;
    pos: { x: number; y: number };
}

function NodeCard({ node, index, selected, onPointerDown, onPointerMove, onPointerUp, onClick, cardRef, pos }: CardProps) {
    const cfg = getCfg(node.type);
    const Icon = cfg.Icon;

    return (
        <div
            ref={cardRef}
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: NODE_W,
                zIndex: selected ? 20 : 10,
                cursor: 'grab',
                transition: 'filter 0.2s ease',
                filter: selected
                    ? `drop-shadow(0 0 16px ${cfg.accent}55) drop-shadow(0 4px 12px rgba(0,0,0,0.10))`
                    : 'drop-shadow(0 2px 8px rgba(15,23,42,0.10))',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onClick}
        >
            {/* Card container */}
            <div
                style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: selected ? `2px solid ${cfg.accent}` : '1.5px solid #e2e8f0',
                    background: '#ffffff',
                }}
            >
                {/* ── Header with gradient ── */}
                <div
                    style={{
                        background: cfg.headerBg,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                    }}
                >
                    {/* Step badge */}
                    <span
                        style={{
                            width: 20, height: 20,
                            borderRadius: 99,
                            background: 'rgba(255,255,255,0.25)',
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.3)',
                        }}
                    >{index + 1}</span>

                    {/* Icon */}
                    <span
                        style={{
                            width: 20, height: 20,
                            borderRadius: 6,
                            background: cfg.iconBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Icon style={{ width: 11, height: 11, color: '#fff' }} />
                    </span>

                    {/* Type label */}
                    <span
                        style={{
                            fontSize: 8.5,
                            fontWeight: 800,
                            flexGrow: 1,
                            color: 'rgba(255,255,255,0.92)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}
                    >{cfg.label}</span>

                    {/* Drag hint */}
                    <Move style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                </div>

                {/* ── Body ── */}
                <div style={{ padding: '8px 10px', background: cfg.bg }}>

                    {/* Title */}
                    <p style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.35,
                        marginBottom: node.description ? 4 : 0,
                    }}>
                        {node.title}
                    </p>

                    {/* Description */}
                    {node.description && (
                        <p style={{
                            fontSize: 9.5,
                            color: '#475569',
                            lineHeight: 1.45,
                            marginBottom: node.parameters && node.parameters.length > 0 ? 6 : 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}>
                            {node.description}
                        </p>
                    )}

                    {/* Parameters */}
                    {node.parameters && node.parameters.length > 0 && (
                        <div style={{
                            borderRadius: 7,
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            marginTop: 5,
                        }}>
                            {node.parameters.map((p, pi) => {
                                const cs = chipStyle(p.status);
                                return (
                                    <div
                                        key={p.id || p.name}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '2.5px 7px',
                                            background: pi % 2 === 0 ? '#f8fafc' : '#fff',
                                            borderTop: pi > 0 ? '1px solid #f1f5f9' : 'none',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 8.5,
                                            color: '#64748b',
                                            fontWeight: 600,
                                            flexShrink: 0,
                                            maxWidth: '52%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginRight: 5,
                                        }}>
                                            {p.name}
                                        </span>
                                        <span style={{
                                            fontSize: 8.5,
                                            fontWeight: 800,
                                            padding: '1px 5px',
                                            borderRadius: 99,
                                            background: cs.bg,
                                            color: cs.text,
                                            border: `1px solid ${cs.bdr}`,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {p.value}{p.unit ? ` ${p.unit}` : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Date footer */}
                    {node.date && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 6,
                            paddingTop: 5,
                            borderTop: '1px solid #e2e8f0',
                        }}>
                            <Calendar style={{ width: 9, height: 9, color: '#94a3b8' }} />
                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
                                {(() => {
                                    try {
                                        return new Date(node.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                    } catch { return node.date; }
                                })()}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Selected highlight bottom bar ── */}
                {selected && (
                    <div style={{
                        height: 3,
                        background: cfg.headerBg,
                    }} />
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DiagnosticMap({ nodes }: { nodes: DiagnosticNode[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [zoom,       setZoom]   = useState(0.80);
    const [pan,        setPan]    = useState({ x: 30, y: 24 });
    const [heights,    setHeights]   = useState<Record<string, number>>({});
    const [positions,  setPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [selectedId, setSelectedId] = useState('');

    // Sort chronologically by date
    const ordered = useMemo(() =>
        [...nodes].sort((a, b) => (a.date ? +new Date(a.date) : 0) - (b.date ? +new Date(b.date) : 0)),
    [nodes]);

    // Build initial staggered column layout
    const buildLayout = useCallback(
        (hs: Record<string, number>): Record<string, { x: number; y: number }> => {
            const coords: Record<string, { x: number; y: number }> = {};
            let y = 40;
            ordered.forEach((n, i) => {
                coords[n.id] = { x: colX(i), y };
                y += (hs[n.id] ?? 110) + V_GAP;
            });
            return coords;
        },
        [ordered],
    );

    // Measure real heights after DOM paint
    useLayoutEffect(() => {
        const hs: Record<string, number> = {};
        ordered.forEach(n => {
            const el = cardRefs.current[n.id];
            if (el) hs[n.id] = el.offsetHeight;
        });
        setHeights(hs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ordered]);

    // Rebuild positions when heights are known
    useEffect(() => {
        if (ordered.length === 0) return;
        setPositions(buildLayout(heights));
        setSelectedId(ordered[0]?.id ?? '');
    }, [ordered, heights, buildLayout]);

    const selectedNode = useMemo(
        () => ordered.find(n => n.id === selectedId) ?? ordered[0] ?? null,
        [ordered, selectedId],
    );

    // ── Drag & Pan (pointer capture) ──────────────────────────────────────

    const drag = useRef<{
        mode: 'none' | 'node' | 'pan';
        id: string; sx: number; sy: number; px: number; py: number;
    }>({ mode: 'none', id: '', sx: 0, sy: 0, px: 0, py: 0 });

    const startNode = useCallback((e: React.PointerEvent, id: string) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const p = positions[id] ?? { x: 0, y: 0 };
        drag.current = { mode: 'node', id, sx: e.clientX, sy: e.clientY, px: p.x, py: p.y };
    }, [positions]);

    const startPan = useCallback((e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { mode: 'pan', id: '', sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    }, [pan]);

    const onMove = useCallback((e: React.PointerEvent) => {
        const d = drag.current;
        if (d.mode === 'none') return;
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (d.mode === 'pan') {
            setPan({ x: d.px + dx, y: d.py + dy });
        } else {
            setPositions(prev => ({
                ...prev,
                [d.id]: { x: d.px + dx / zoom, y: d.py + dy / zoom },
            }));
        }
    }, [zoom]);

    const onUp = useCallback(() => { drag.current.mode = 'none'; }, []);

    // ── Scroll-wheel zoom ─────────────────────────────────────────────────

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            e.preventDefault();
            setZoom(z => Math.min(2.0, Math.max(0.2, z + (e.deltaY > 0 ? -0.08 : 0.08))));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    const resetView = () => {
        setPositions(buildLayout(heights));
        setZoom(0.80);
        setPan({ x: 30, y: 24 });
    };

    const canvasH = useMemo(() => {
        const ys = ordered.map(n => (positions[n.id]?.y ?? 0) + (heights[n.id] ?? 110));
        return Math.max(600, ...ys) + 100;
    }, [ordered, positions, heights]);

    if (ordered.length === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: 260, borderRadius: 18,
                border: '2px dashed #e2e8f0', background: '#f8fafc',
                color: '#94a3b8',
            }}>
                <Activity style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontWeight: 700 }}>No pathway steps recorded yet</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            borderRadius: 20,
            border: '1.5px solid #e2e8f0',
            background: '#fff',
            overflow: 'hidden',
            boxShadow: '0 4px 24px -4px rgba(15,23,42,0.08)',
            userSelect: 'none',
        }}>

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(to right, #f8fafc, #f0fdfa)',
                flexWrap: 'wrap',
                gap: 8,
                flexShrink: 0,
            }}>
                {/* Left: title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
                    }}>
                        <Activity style={{ width: 14, height: 14, color: '#fff' }} />
                    </div>
                    <div>
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
                            Clinical Pathway Map
                        </span>
                        <span style={{
                            marginLeft: 8,
                            background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                            color: '#fff',
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: '1.5px 7px',
                            borderRadius: 99,
                        }}>
                            {ordered.length} steps
                        </span>
                    </div>
                </div>

                {/* Right: controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                        Scroll to zoom · Drag to pan · Click to inspect
                    </span>

                    {/* Zoom controls */}
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '2px 3px',
                        gap: 1,
                    }}>
                        <button
                            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                            title="Zoom In"
                            style={{
                                width: 26, height: 26, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#64748b',
                            }}
                        >
                            <ZoomIn style={{ width: 13, height: 13 }} />
                        </button>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', width: 34, textAlign: 'center' }}>
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                            title="Zoom Out"
                            style={{
                                width: 26, height: 26, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#64748b',
                            }}
                        >
                            <ZoomOut style={{ width: 13, height: 13 }} />
                        </button>
                        <div style={{ width: 1, height: 14, background: '#e2e8f0', margin: '0 2px' }} />
                        <button
                            onClick={resetView}
                            title="Reset View"
                            style={{
                                width: 26, height: 26, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#64748b',
                            }}
                        >
                            <RotateCcw style={{ width: 12, height: 12 }} />
                        </button>
                        <button
                            onClick={() => {
                                // Center on selected node
                                const pos = selectedNode ? positions[selectedNode.id] : null;
                                if (pos) setPan({ x: 80 - pos.x * zoom, y: 80 - pos.y * zoom });
                            }}
                            title="Focus Selected"
                            style={{
                                width: 26, height: 26, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: '#0d9488',
                            }}
                        >
                            <Crosshair style={{ width: 12, height: 12 }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Canvas ──────────────────────────────────────────────────── */}
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'grab',
                    height: 520,
                    background: `
                        radial-gradient(circle, rgba(13,148,136,0.07) 1px, transparent 1px),
                        linear-gradient(to bottom right, #f0fdfa, #f8fafc, #eff6ff)
                    `,
                    backgroundSize: '24px 24px, 100% 100%',
                }}
                onPointerDown={startPan}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
            >
                <div style={{
                    position: 'absolute',
                    left: pan.x,
                    top: pan.y,
                    transformOrigin: '0 0',
                    transform: `scale(${zoom})`,
                    width: CANVAS_W,
                    height: canvasH,
                }}>

                    {/* ── SVG Arrows (rendered below nodes, z:8) ─────────── */}
                    <svg
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: CANVAS_W,
                            height: canvasH,
                            pointerEvents: 'none',
                            zIndex: 8,
                            overflow: 'visible',
                        }}
                    >
                        <defs>
                            {/* Arrowhead marker — solid teal */}
                            <marker id="arrowTeal" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                                <path d="M1,2 L9,5 L1,8 Z" fill="#0d9488" />
                            </marker>
                            {/* Gradient stroke */}
                            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#0d9488" />
                                <stop offset="60%" stopColor="#0891b2" />
                                <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.4} />
                            </linearGradient>
                            {/* Glow filter */}
                            <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="1.8" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {ordered.map((node, i) => {
                            if (i === ordered.length - 1) return null;
                            const next = ordered[i + 1];
                            const p1   = positions[node.id];
                            const p2   = positions[next.id];
                            if (!p1 || !p2) return null;

                            const h1 = heights[node.id] ?? 110;
                            // Arrow exits from bottom-center of source card
                            const x1 = p1.x + NODE_W / 2;
                            const y1 = p1.y + h1 + 1;
                            // Arrow enters top-center of target card
                            const x2 = p2.x + NODE_W / 2;
                            const y2 = p2.y - 1;

                            const d = bezierPath(x1, y1 + 2, x2, y2 - 8);

                            return (
                                <g key={`edge-${node.id}-${next.id}`}>
                                    {/* Glow halo */}
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke="#0d9488"
                                        strokeWidth={10}
                                        strokeOpacity={0.08}
                                        strokeLinecap="round"
                                        filter="url(#edgeGlow)"
                                    />
                                    {/* Main edge */}
                                    <path
                                        d={d}
                                        fill="none"
                                        stroke="url(#edgeGrad)"
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                        strokeDasharray="none"
                                        markerEnd="url(#arrowTeal)"
                                    />
                                    {/* Midpoint label dot */}
                                    <circle
                                        cx={(x1 + x2) / 2}
                                        cy={(y1 + y2) / 2}
                                        r={3}
                                        fill="#0d9488"
                                        fillOpacity={0.35}
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* ── Node Cards ────────────────────────────────────── */}
                    {ordered.map((node, idx) => {
                        const pos = positions[node.id] ?? { x: COL_C, y: 40 + idx * 140 };
                        const sel = selectedId === node.id;
                        return (
                            <NodeCard
                                key={node.id}
                                node={node}
                                index={idx}
                                selected={sel}
                                pos={pos}
                                cardRef={el => { cardRefs.current[node.id] = el; }}
                                onPointerDown={e => startNode(e, node.id)}
                                onPointerMove={onMove}
                                onPointerUp={onUp}
                                onClick={() => setSelectedId(node.id)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ── Node Inspector Panel ──────────────────────────────────── */}
            {selectedNode && (
                <div style={{
                    borderTop: '1px solid #f1f5f9',
                    background: 'linear-gradient(to right, #f8fafc, #f0fdfa)',
                    padding: '14px 18px',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

                        {/* Left: node details */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                            {/* Type + Date row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: 9.5,
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: '#fff',
                                    background: getCfg(selectedNode.type).headerBg,
                                    padding: '2px 9px',
                                    borderRadius: 99,
                                }}>
                                    {getCfg(selectedNode.type).label}
                                </span>
                                {selectedNode.date && (
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar style={{ width: 11, height: 11 }} />
                                        {(() => {
                                            try { return new Date(selectedNode.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
                                            catch { return selectedNode.date; }
                                        })()}
                                    </span>
                                )}
                                <span style={{
                                    marginLeft: 'auto',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    background: '#f1f5f9',
                                    padding: '1px 8px',
                                    borderRadius: 99,
                                }}>
                                    Step {(ordered.findIndex(n => n.id === selectedNode.id) + 1)} of {ordered.length}
                                </span>
                            </div>

                            {/* Title */}
                            <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 3 }}>
                                {selectedNode.title}
                            </p>

                            {/* Description */}
                            {selectedNode.description && (
                                <p style={{ fontSize: 12, fontWeight: 500, color: '#475569', lineHeight: 1.55, marginBottom: 4 }}>
                                    {selectedNode.description}
                                </p>
                            )}

                            {/* Rationale */}
                            {selectedNode.rationale && (
                                <p style={{
                                    fontSize: 11, fontWeight: 600, color: '#0d9488',
                                    display: 'flex', alignItems: 'flex-start', gap: 5,
                                    background: '#f0fdfa', padding: '5px 8px', borderRadius: 8,
                                    border: '1px solid #ccfbf1', marginTop: 4,
                                }}>
                                    <Info style={{ width: 11, height: 11, marginTop: 1, flexShrink: 0 }} />
                                    {selectedNode.rationale}
                                </p>
                            )}

                            {/* Outcome */}
                            {selectedNode.outcome && (
                                <p style={{
                                    fontSize: 11, fontWeight: 700, color: '#166534',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    marginTop: 5,
                                }}>
                                    <CheckCircle2 style={{ width: 12, height: 12, color: '#0d9488', flexShrink: 0 }} />
                                    {selectedNode.outcome}
                                </p>
                            )}
                        </div>

                        {/* Right: parameter evidence panel */}
                        {selectedNode.parameters && selectedNode.parameters.length > 0 && (
                            <div style={{ flexShrink: 0, width: 220 }}>
                                <p style={{
                                    fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase',
                                    letterSpacing: '0.5px', color: '#94a3b8',
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    marginBottom: 7,
                                }}>
                                    <FileText style={{ width: 11, height: 11 }} />
                                    Clinical Evidence
                                </p>
                                <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    {selectedNode.parameters.map((p, i) => {
                                        const cs = chipStyle(p.status);
                                        return (
                                            <div
                                                key={p.id || p.name}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '6px 12px',
                                                    background: i % 2 === 0 ? '#f8fafc' : '#fff',
                                                    borderTop: i > 0 ? '1px solid #f1f5f9' : 'none',
                                                }}
                                            >
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.name}
                                                </span>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 800,
                                                    padding: '1.5px 7px', borderRadius: 99,
                                                    background: cs.bg, color: cs.text, border: `1px solid ${cs.bdr}`,
                                                    whiteSpace: 'nowrap', flexShrink: 0,
                                                }}>
                                                    {p.value}{p.unit ? ` ${p.unit}` : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation prev/next */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                        {(() => {
                            const idx = ordered.findIndex(n => n.id === selectedNode.id);
                            const hasPrev = idx > 0;
                            const hasNext = idx < ordered.length - 1;
                            return (
                                <>
                                    {hasPrev && (
                                        <button
                                            onClick={() => setSelectedId(ordered[idx - 1].id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: 11, fontWeight: 700, color: '#0d9488',
                                                background: '#f0fdfa', border: '1px solid #ccfbf1',
                                                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                                            }}
                                        >
                                            ← Prev Step
                                        </button>
                                    )}
                                    {hasNext && (
                                        <button
                                            onClick={() => setSelectedId(ordered[idx + 1].id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: 11, fontWeight: 700, color: '#fff',
                                                background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                                                border: 'none',
                                                borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(13,148,136,0.25)',
                                            }}
                                        >
                                            Next Step → 
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DiagnosticMap;
