"use client";

import { useState, useEffect } from "react";
import { getCheckinsForPatient } from "@/app/actions/checkin";

interface Props { patientId: string; }

function fmt(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return dateStr; }
}

function fmtTs(ts: any): string {
    if (!ts) return "";
    try { return new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
}

function parseAnswers(raw: any): { q: string; a: string }[] {
    if (!raw) return [];
    if (raw.responses && Array.isArray(raw.responses)) {
        return raw.responses
            .filter((r: any) => r.answer !== undefined && r.answer !== null && r.answer !== "" && r.answer !== "—")
            .map((r: any) => ({ q: r.question || r.id, a: Array.isArray(r.answer) ? r.answer.join(", ") : String(r.answer) }));
    }
    return Object.entries(raw)
        .filter(([k, v]) => k !== "submittedAt" && v !== null && v !== "")
        .map(([k, v]) => ({ q: k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()), a: Array.isArray(v) ? (v as string[]).join(", ") : String(v) }));
}

// ─── Modal overlay for expanded answers ───────────────────────────────────────
function AnswerModal({ item, type, onClose }: { item: any; type: "pre" | "post"; onClose: () => void }) {
    const parsed = parseAnswers(item.answers);
    const isPreVisit = type === "pre";
    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "520px",
                    maxHeight: "85vh", display: "flex", flexDirection: "column",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                    overflow: "hidden",
                }}
            >
                {/* Modal header */}
                <div style={{
                    padding: "16px 20px",
                    background: isPreVisit ? "linear-gradient(135deg,#6EC5C0,#A7DCDC)" : "linear-gradient(135deg,#22c55e,#86efac)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
                }}>
                    <div>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: "15px" }}>
                            {isPreVisit ? "📋 Pre-Visit Form" : "💚 Post-Visit Follow-Up"}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", marginTop: "2px" }}>
                            Appt: {fmt(item.appointmentDate)}
                            {item.submittedAt && <> &middot; Submitted: {fmtTs(item.submittedAt)}</>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "50%",
                            width: 32, height: 32, cursor: "pointer", color: "#fff",
                            fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                        aria-label="Close"
                    >×</button>
                </div>

                {/* Modal body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                    {parsed.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No answers recorded.</p>
                    ) : (
                        <div style={{ display: "grid", gap: "8px" }}>
                            {parsed.map((item2, i) => (
                                <div key={i} style={{
                                    padding: "10px 14px",
                                    background: isPreVisit ? "#f0fafa" : "#f0fff4",
                                    borderRadius: "10px",
                                    border: `1px solid ${isPreVisit ? "#A7DCDC44" : "#86efac44"}`,
                                }}>
                                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isPreVisit ? "#6EC5C0" : "#22c55e", marginBottom: "4px" }}>
                                        {item2.q}
                                    </div>
                                    <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{item2.a}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CheckinHistorySection({ patientId }: Props) {
    const [data, setData] = useState<{ preCheckins: any[]; postCheckins: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"pre" | "post">("pre");
    const [modalItem, setModalItem] = useState<any | null>(null);

    useEffect(() => {
        if (!patientId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const result = await getCheckinsForPatient(patientId);
            if (cancelled) return;
            if (result.success) {
                setData({ preCheckins: result.preCheckins ?? [], postCheckins: result.postCheckins ?? [] });
            } else {
                setError(result.error || "Failed to load.");
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [patientId]);

    const preList = data?.preCheckins ?? [];
    const postList = data?.postCheckins ?? [];
    const currentList = activeTab === "pre" ? preList : postList;

    return (
        <>
            {/* ─── Modal ─── */}
            {modalItem && (
                <AnswerModal item={modalItem} type={activeTab} onClose={() => setModalItem(null)} />
            )}

            <div style={{
                background: "#fff", borderRadius: "14px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                overflow: "hidden",
            }}>
                {/* ─── Header row ─── */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "1px solid #F1F5F9",
                    flexWrap: "wrap", gap: "8px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "15px" }}>📋</span>
                        <div>
                            <span style={{ fontWeight: 700, fontSize: "13px", color: "#1E293B" }}>Check-In History</span>
                            <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>patient-only, per ID</span>
                        </div>
                    </div>

                    {/* Tab pills */}
                    <div style={{ display: "flex", gap: "4px", background: "#F7F9FA", padding: "3px", borderRadius: "50px" }}>
                        {(["pre", "post"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: "5px 14px", borderRadius: "50px", fontSize: "12px", fontWeight: 600,
                                    border: "none", cursor: "pointer",
                                    background: activeTab === tab
                                        ? tab === "pre" ? "linear-gradient(135deg,#6EC5C0,#A7DCDC)" : "linear-gradient(135deg,#22c55e,#86efac)"
                                        : "transparent",
                                    color: activeTab === tab ? "#fff" : "#64748b",
                                    transition: "all 0.15s",
                                }}
                            >
                                {tab === "pre" ? "Pre-Visit" : "Post-Visit"}
                                {(tab === "pre" ? preList : postList).length > 0 && (
                                    <span style={{ marginLeft: "5px", fontSize: "11px", opacity: 0.85 }}>
                                        ({(tab === "pre" ? preList : postList).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Content ─── */}
                <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                    {loading ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            Loading…
                        </div>
                    ) : error ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "#ef4444", fontSize: "13px" }}>
                            ⚠️ {error}
                        </div>
                    ) : currentList.length === 0 ? (
                        <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            {activeTab === "pre" ? "No pre-visit forms yet." : "No post-visit follow-ups yet."}
                        </div>
                    ) : (
                        <div>
                            {currentList.map((item: any, idx: number) => {
                                const submitted = item.isSubmitted;
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "10px",
                                            padding: "9px 16px",
                                            borderBottom: idx < currentList.length - 1 ? "1px solid #F1F5F9" : "none",
                                            background: submitted ? (activeTab === "pre" ? "#f9fffe" : "#f9fff9") : "#fff",
                                            transition: "background 0.15s",
                                        }}
                                    >
                                        {/* Status dot */}
                                        <div style={{
                                            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                                            background: submitted ? (activeTab === "pre" ? "#6EC5C0" : "#22c55e") : "#E5E7EB",
                                        }} />

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                                <span style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>
                                                    {item.appointmentTitle || "Consultation"}
                                                </span>
                                                <span style={{
                                                    fontSize: "10px", fontWeight: 700, padding: "1px 8px",
                                                    borderRadius: "50px",
                                                    background: submitted ? (activeTab === "pre" ? "#6EC5C0" : "#22c55e") : "#E5E7EB",
                                                    color: submitted ? "#fff" : "#94a3b8",
                                                }}>
                                                    {submitted ? "Submitted" : "Pending"}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                                                {fmt(item.appointmentDate)}
                                                {item.submittedAt && <> &middot; {fmtTs(item.submittedAt)}</>}
                                            </div>
                                        </div>

                                        {/* View button */}
                                        {submitted && item.answers && (
                                            <button
                                                onClick={() => setModalItem(item)}
                                                style={{
                                                    fontSize: "11px", fontWeight: 600, flexShrink: 0,
                                                    padding: "4px 10px", borderRadius: "6px",
                                                    border: `1px solid ${activeTab === "pre" ? "#A7DCDC" : "#86efac"}`,
                                                    background: "transparent",
                                                    color: activeTab === "pre" ? "#6EC5C0" : "#22c55e",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                View →
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
