"use client";

import { useState } from "react";
import PreCheckinForm from "@/components/checkin/PreCheckinForm";
import PostCheckinForm from "@/components/checkin/PostCheckinForm";

export default function PreviewFormsPage() {
    const [activeTab, setActiveTab] = useState<"pre" | "post">("pre");
    
    // Mock user session & appointment info
    const mockSession = { userId: "preview-user-id", name: "Preview Patient" };
    const mockAppt = {
        date: "2026-03-31",
        doctorName: "Dr. Awesome",
        hospitalName: "Niraiva Hospital",
        time: "10:00 AM",
        patientName: "Jane Doe",
        customId: "P-12345"
    };

    return (
        <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Developer Switcher - positioned below the form's fixed navbar (h-16 = 64px) */}
            <div style={{
                position: "fixed", top: "64px", left: 0, right: 0, zIndex: 40,
                padding: "10px 24px", background: "#1e293b", color: "#f8fafc",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid #334155", boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Dev Preview
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                        onClick={() => setActiveTab("pre")}
                        style={{
                            padding: "6px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "none",
                            background: activeTab === "pre" ? "#0d9488" : "#334155", color: "#fff", transition: "background 0.2s"
                        }}
                    >
                        Pre-Check-in
                    </button>
                    <button 
                        onClick={() => setActiveTab("post")}
                        style={{
                            padding: "6px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "none",
                            background: activeTab === "post" ? "#0d9488" : "#334155", color: "#fff", transition: "background 0.2s"
                        }}
                    >
                        Post-Check-in
                    </button>
                </div>
            </div>

            {/* Extra top padding: 64px (navbar) + 45px (dev bar) = 109px */}
            <div style={{ paddingTop: "109px" }}>
                {activeTab === "pre" ? (
                    <PreCheckinForm token="dev-preview-token" status="valid" session={mockSession} appointmentInfo={mockAppt} />
                ) : (
                    <PostCheckinForm token="dev-preview-token" status="valid" session={mockSession} appointmentInfo={mockAppt} />
                )}
            </div>

            {/* Visual indicator explaining submission won't work */}
            <div style={{ position: "fixed", bottom: 20, right: 20, background: "rgba(15,23,42,0.9)", color: "white", padding: "10px 16px", borderRadius: "8px", fontSize: "13px", zIndex: 9999, pointerEvents: "none", maxWidth: "320px" }}>
                Note: Submit will fail in preview mode — this is expected.
            </div>
        </div>
    );
}
