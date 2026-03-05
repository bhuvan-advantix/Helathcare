'use client';

import { useState, useTransition } from 'react';
import {
    Users, Stethoscope, FlaskConical, TicketCheck, ShieldCheck, LogOut, RefreshCw,
    BarChart3, Hourglass, Ban, Plus, Building2, FileText, Pill, Activity,
    ChevronDown, ChevronUp, Eye, CheckCircle, XCircle, ShieldOff, Clock,
    AlertTriangle, X, EyeOff, Upload
} from 'lucide-react';
import {
    approveDoctorAction, rejectDoctorAction, banUserAction, unbanUserAction,
    updateTicketStatusAction, createLabAccountAction, toggleLabAccountAction,
    adminLogout, adminUploadLabReport
} from '@/app/actions/admin';
import {
    createStaffAccountAction, toggleStaffAccountAction, getAllStaffAccounts
} from '@/app/actions/staff';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminData {
    stats: { patientCount: number; doctorCount: number; pendingDoctors: number; bannedUsers: number; openTickets: number; labCount: number; totalMeds: number; totalLabReports: number; staffCount: number; };
    doctors: any[]; patients: any[]; tickets: any[]; labs: any[]; staff: any[];
}

// ─── Confirm Popup ─────────────────────────────────────────────────────────────
const ConfirmPopup = ({ message, onConfirm, onCancel, danger }: { message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
                <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
            <p className="text-slate-800 font-bold text-center text-sm mb-6">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}>Confirm</button>
            </div>
        </div>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const Badge = ({ status }: { status: string }) => {
    const c: Record<string, string> = {
        approved: 'bg-emerald-50 text-emerald-700 border-emerald-200', pending: 'bg-amber-50 text-amber-700 border-amber-200',
        rejected: 'bg-red-50 text-red-700 border-red-200', open: 'bg-blue-50 text-blue-700 border-blue-200',
        in_progress: 'bg-purple-50 text-purple-700 border-purple-200', resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        closed: 'bg-slate-100 text-slate-500 border-slate-200', active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        banned: 'bg-red-50 text-red-700 border-red-200', disabled: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${c[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{status.replace('_', ' ')}</span>;
};

// ─── Admin PDF Upload ─────────────────────────────────────────────────────────
const AdminUpload = ({ patientId, patientName, onDone }: { patientId: string; patientName: string; onDone: () => void }) => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    const handle = async () => {
        if (!file) return;
        setStatus('uploading');
        try {
            const sigRes = await fetch('/api/cloudinary-signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: `lab-reports/${patientId}` }) });
            if (!sigRes.ok) throw new Error('Signature failed');
            const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json();
            const fd = new FormData();
            fd.append('file', file); fd.append('signature', signature); fd.append('timestamp', timestamp.toString()); fd.append('api_key', apiKey); fd.append('folder', folder);
            const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: fd });
            if (!up.ok) throw new Error('Upload failed');
            const data = await up.json();
            const res = await adminUploadLabReport({ patientId, cloudinaryUrl: data.secure_url, fileName: file.name, fileSize: file.size });
            if (res.success) { setStatus('success'); setMsg('Report uploaded!'); setFile(null); setTimeout(onDone, 1500); }
            else { setStatus('error'); setMsg(res.error || 'Failed'); }
        } catch (e: any) { setStatus('error'); setMsg(e.message); }
    };

    return (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload Lab Report</p>
            <label className="block cursor-pointer">
                <input type="file" accept=".pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setStatus('idle'); }} />
                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${file ? 'border-teal-400 bg-white' : 'border-teal-300 hover:bg-white'}`}>
                    {file ? <p className="text-sm font-bold text-teal-700">📄 {file.name} <span className="text-teal-400">({(file.size / 1024 / 1024).toFixed(2)}MB)</span></p>
                        : <p className="text-sm font-bold text-teal-500">Click to select PDF</p>}
                </div>
            </label>
            {status === 'error' && <p className="text-red-600 text-xs font-bold bg-red-50 px-3 py-2 rounded-lg">{msg}</p>}
            {status === 'success' && <p className="text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-2 rounded-lg">✓ {msg}</p>}
            {status === 'uploading' && <p className="text-blue-700 text-xs font-bold bg-blue-50 px-3 py-2 rounded-lg">⏳ Uploading...</p>}
            <button onClick={handle} disabled={!file || status === 'uploading'} className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors">
                {status === 'uploading' ? 'Uploading...' : 'Upload Now'}
            </button>
        </div>
    );
};

// ─── Doctor Card ──────────────────────────────────────────────────────────────
const DoctorCard = ({ doc, refresh }: { doc: any; refresh: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const [confirm, setConfirm] = useState<{ msg: string; fn: () => void; danger?: boolean } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showUpload, setShowUpload] = useState(false);

    const run = (fn: () => Promise<any>) => startTransition(async () => { await fn(); refresh(); });

    return (
        <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${doc.approvalStatus === 'pending' ? 'border-amber-200' : doc.isBanned ? 'border-red-200' : 'border-slate-100'}`}>
            {confirm && <ConfirmPopup message={confirm.msg} onConfirm={() => { confirm.fn(); setConfirm(null); }} onCancel={() => setConfirm(null)} danger={confirm.danger} />}

            <div className="p-5">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-teal-100">
                        {doc.userImage ? <img src={doc.userImage} className="w-12 h-12 rounded-2xl object-cover" alt="" /> : <Stethoscope className="w-6 h-6 text-teal-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                                <p className="font-black text-slate-900">{doc.userName}</p>
                                <p className="text-xs text-slate-500">{doc.userEmail}</p>
                                <p className="text-xs font-bold text-teal-600 mt-0.5">{doc.specialization}{doc.clinicName ? ` • ${doc.clinicName}` : ''}{doc.city ? ` • ${doc.city}` : ''}</p>
                                <p className="text-xs text-slate-400 font-bold">License: {doc.licenseNumber || '—'}</p>
                            </div>
                            <div className="flex gap-1.5 flex-wrap"><Badge status={doc.approvalStatus || 'pending'} />{doc.isBanned && <Badge status="banned" />}</div>
                        </div>

                        {/* Key figures */}
                        <div className="grid grid-cols-4 gap-1 sm:gap-4 mt-3 pt-3 border-t border-slate-50">
                            {[{ label: 'Patients', v: doc.clinicPatientsCount }, { label: 'Consults', v: doc.totalConsultations }, { label: 'Scripts', v: doc.medsGiven }, { label: 'Reports', v: doc.labReportsCount }].map(s => (
                                <div key={s.label} className="text-center">
                                    <p className="text-base sm:text-lg font-black text-slate-900">{s.v}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 flex-wrap">
                    {doc.approvalStatus === 'pending' && <>
                        <button disabled={isPending} onClick={() => setConfirm({ msg: `Approve Dr. ${doc.userName}?`, fn: () => run(() => approveDoctorAction(doc.id)) })} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                        <button disabled={isPending} onClick={() => setConfirm({ msg: `Reject Dr. ${doc.userName}?`, fn: () => run(() => rejectDoctorAction(doc.id)), danger: true })} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                    </>}
                    {!doc.isBanned
                        ? <button disabled={isPending} onClick={() => setConfirm({ msg: `Ban Dr. ${doc.userName}? They lose all access.`, fn: () => run(() => banUserAction(doc.userId)), danger: true })} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Ban</button>
                        : <button disabled={isPending} onClick={() => setConfirm({ msg: `Unban Dr. ${doc.userName}?`, fn: () => run(() => unbanUserAction(doc.userId)) })} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" /> Unban</button>}
                    <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 border-2 border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 ml-auto">
                        <Eye className="w-3.5 h-3.5" /> {expanded ? 'Hide' : 'Full Profile'} {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Expanded */}
            {expanded && (
                <div className="border-t-2 border-slate-100 bg-slate-50 p-5 space-y-4">
                    {/* Info rows */}
                    {[
                        { label: 'Degree', value: doc.degree }, { label: 'Experience', value: doc.experienceYears ? `${doc.experienceYears} yrs` : null },
                        { label: 'Timing', value: doc.hospitalTiming }, { label: 'Days', value: doc.workingDays },
                        { label: 'Phone', value: doc.phoneNumber }, { label: 'Address', value: doc.address },
                        { label: 'Marital', value: doc.maritalStatus }, { label: 'Joined', value: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null },
                    ].filter(f => f.value).map(f => (
                        <div key={f.label} className="flex gap-2 border-b border-slate-100 py-2 last:border-0">
                            <span className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-wide w-16 sm:w-28 flex-shrink-0 pt-0.5">{f.label}</span>
                            <span className="font-bold text-slate-800 text-xs sm:text-sm">{f.value}</span>
                        </div>
                    ))}
                    {doc.bio && <div className="bg-white rounded-xl p-3 border border-slate-100 text-sm text-slate-700">{doc.bio}</div>}

                    {/* Recent Consultations */}
                    {doc.recentConsultations?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recent Consultations</p>
                            {doc.recentConsultations.map((c: any) => (
                                <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100 mb-2">
                                    <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                    <span className="flex-1 text-sm font-bold text-slate-800 truncate">{c.title}</span>
                                    <span className="text-xs text-slate-400">{c.eventDate}</span>
                                    <Badge status={c.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Patient Card ─────────────────────────────────────────────────────────────
const PatientCard = ({ pat, refresh }: { pat: any; refresh: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const [confirm, setConfirm] = useState<{ msg: string; fn: () => void; danger?: boolean } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showUpload, setShowUpload] = useState(false);

    const run = (fn: () => Promise<any>) => startTransition(async () => { await fn(); refresh(); });

    const infoRows = [
        { label: 'Blood Group', value: pat.bloodGroup },
        { label: 'Date of Birth', value: pat.dateOfBirth },
        { label: 'Phone', value: pat.phoneNumber },
        { label: 'City', value: pat.city },
        { label: 'Gender', value: pat.gender },
        { label: 'Height / Weight', value: pat.height || pat.weight ? `${pat.height || '—'} cm / ${pat.weight || '—'} kg` : null },
        { label: 'Marital Status', value: pat.maritalStatus },
        { label: 'Address', value: pat.address },
        { label: 'Emergency Contact', value: pat.emergencyContactName ? `${pat.emergencyContactName} (${pat.emergencyContactPhone || '—'})` : null },
        { label: 'Guardian', value: pat.guardianName ? `${pat.guardianName} — ${pat.guardianRelation || ''}` : null },
        { label: 'Allergies', value: pat.allergies },
        { label: 'Chronic Conditions', value: pat.chronicConditions },
        { label: 'Past Surgeries', value: pat.pastSurgeries },
        { label: 'Lifestyle', value: pat.lifestyle },
        { label: 'Joined', value: pat.createdAt ? new Date(pat.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null },
    ].filter(f => f.value);

    return (
        <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${pat.isBanned ? 'border-red-200' : 'border-slate-100'}`}>
            {confirm && <ConfirmPopup message={confirm.msg} onConfirm={() => { confirm.fn(); setConfirm(null); }} onCancel={() => setConfirm(null)} danger={confirm.danger} />}

            <div className="p-5">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-blue-100">
                        {pat.userImage ? <img src={pat.userImage} className="w-12 h-12 rounded-2xl object-cover" alt="" /> : <Users className="w-6 h-6 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                                <p className="font-black text-slate-900">{pat.userName}</p>
                                <p className="text-xs text-slate-500">{pat.userEmail}</p>
                                <p className="text-xs font-bold text-blue-600 mt-0.5">
                                    {pat.customId} {pat.gender ? `• ${pat.gender}` : ''} {pat.age ? `• Age ${pat.age}` : ''} {pat.bloodGroup ? `• ${pat.bloodGroup}` : ''}
                                </p>
                            </div>
                            {pat.isBanned && <Badge status="banned" />}
                        </div>

                        {/* Key figures inline */}
                        <div className="grid grid-cols-4 gap-1 sm:gap-4 mt-3 pt-3 border-t border-slate-50">
                            {[{ label: 'Reports', v: pat.labReportsCount }, { label: 'Meds', v: pat.medicationsCount }, { label: 'Visits', v: pat.totalConsultations }, { label: 'Doctors', v: pat.linkedDoctorsCount }].map(s => (
                                <div key={s.label} className="text-center">
                                    <p className="text-base sm:text-lg font-black text-slate-900">{s.v}</p>
                                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                    {!pat.isBanned
                        ? <button disabled={isPending} onClick={() => setConfirm({ msg: `Ban ${pat.userName}? They lose all access immediately.`, fn: () => run(() => banUserAction(pat.userId)), danger: true })} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Ban</button>
                        : <button disabled={isPending} onClick={() => setConfirm({ msg: `Unban ${pat.userName}?`, fn: () => run(() => unbanUserAction(pat.userId)) })} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"><ShieldCheck className="w-3.5 h-3.5" /> Unban</button>}
                    <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 ml-auto">
                        <Eye className="w-3.5 h-3.5" /> {expanded ? 'Hide' : 'Full Profile'} {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Expanded */}
            {expanded && (
                <div className="border-t-2 border-slate-100 bg-slate-50 p-5 space-y-4">
                    {/* All DB info as clean rows */}
                    <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                        {infoRows.map(f => (
                            <div key={f.label} className="flex gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
                                <span className="text-slate-400 font-bold text-[9px] sm:text-xs uppercase tracking-wide w-20 sm:w-36 flex-shrink-0 pt-0.5 leading-tight">{f.label}</span>
                                <span className={`font-bold text-xs sm:text-sm ${f.label === 'Allergies' ? 'text-orange-700' : f.label === 'Chronic Conditions' ? 'text-red-700' : 'text-slate-800'}`}>{f.value}</span>
                            </div>
                        ))}
                        {infoRows.length === 0 && <p className="px-4 py-3 text-sm text-slate-400 font-medium">No additional details recorded yet.</p>}
                    </div>

                    {/* Medications */}
                    {pat.recentMeds?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Medications ({pat.medicationsCount})</p>
                            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
                                {pat.recentMeds.map((m: any) => (
                                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                        <Pill className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                        <span className="flex-1 text-sm font-bold text-slate-800">{m.name}</span>
                                        <span className="text-xs text-slate-400">{m.frequency}</span>
                                        <Badge status={m.status === 'Active' ? 'approved' : 'closed'} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin lab report upload */}
                    <div>
                        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 text-teal-700 font-bold text-xs mb-2">
                            <Upload className="w-3.5 h-3.5" /> {showUpload ? 'Hide Upload' : 'Upload Lab Report for this Patient'}
                        </button>
                        {showUpload && <AdminUpload patientId={pat.id} patientName={pat.userName} onDone={() => { setShowUpload(false); refresh(); }} />}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Ticket Card ──────────────────────────────────────────────────────────────
const pageLabels: Record<string, string> = {
    Dashboard: '📊 Dashboard', 'Lab Reports': '🧪 Lab Reports', Profile: '👤 Profile',
    Timeline: '📅 Timeline', 'Health Parameters': '❤️ Health Data', Other: '📌 Other',
};
const TicketCard = ({ ticket, refresh }: { ticket: any; refresh: () => void }) => {
    const [isPending, startTransition] = useTransition();
    const run = (status: string) => startTransition(async () => { await updateTicketStatusAction(ticket.id, status); refresh(); });
    const borderColor = ticket.status === 'open' ? 'border-blue-200' : ticket.status === 'in_progress' ? 'border-purple-200' : ticket.status === 'resolved' ? 'border-emerald-200' : 'border-slate-100';
    const bgColor = ticket.status === 'open' ? 'bg-blue-50' : ticket.status === 'in_progress' ? 'bg-purple-50' : ticket.status === 'resolved' ? 'bg-emerald-50' : 'bg-slate-50';

    return (
        <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${borderColor}`}>
            <div className={`px-3 sm:px-5 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 flex-wrap ${bgColor}`}>
                <span className="font-black text-slate-900 text-xs sm:text-sm">#{ticket.ticketNumber}</span>
                <Badge status={ticket.status} />
                {ticket.priority && <span className={`text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border uppercase tracking-widest ${ticket.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-200' : ticket.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{ticket.priority === 'urgent' ? '🚨' : '📌'} {ticket.priority}</span>}
                <span className="ml-auto text-[9px] sm:text-[10px] text-slate-400 font-bold whitespace-nowrap">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>

            <div className="p-3 sm:p-5 space-y-2.5 sm:space-y-3">
                {/* Reporter */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">{ticket.userName}</span>
                            {ticket.userCustomId && (
                                <span className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                    {ticket.userCustomId}
                                </span>
                            )}
                            {ticket.userRole && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${ticket.userRole === 'doctor' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                    {ticket.userRole}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">{ticket.userEmail}</p>
                    </div>
                </div>

                {/* Page */}
                <div className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-center gap-2 border border-slate-100">
                    <span className="text-sm">{pageLabels[ticket.selectedPage] || `📌 ${ticket.selectedPage}`}</span>
                    <span className="text-xs text-slate-400 font-medium">— issue reported on this page</span>
                </div>

                {/* Message */}
                <div className="bg-white border-2 border-slate-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Their message:</p>
                    <p className="text-slate-800 font-medium text-sm leading-relaxed">"{ticket.message}"</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                    {ticket.status === 'open' && <button disabled={isPending} onClick={() => run('in_progress')} className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 border-2 border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 disabled:opacity-50"><Clock className="w-3.5 h-3.5" /> Working on it</button>}
                    {(ticket.status === 'open' || ticket.status === 'in_progress') && <button disabled={isPending} onClick={() => run('resolved')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"><CheckCircle className="w-3.5 h-3.5" /> Resolved</button>}
                    {ticket.status !== 'closed' && <button disabled={isPending} onClick={() => run('closed')} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 border-2 border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 disabled:opacity-50"><X className="w-3.5 h-3.5" /> Close</button>}
                </div>
            </div>
        </div>
    );
};

// ─── Create Lab Modal ─────────────────────────────────────────────────────────
const CreateLabModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [form, setForm] = useState({ labName: '', email: '', password: '', city: '', phone: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const handle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.labName || !form.email || !form.password) { setError('Name, email, and password are required.'); return; }
        startTransition(async () => {
            const r = await createLabAccountAction(form);
            if (r.success) { onSuccess(); onClose(); } else setError(r.error || 'Failed');
        });
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-black text-slate-900">Create Lab Account</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
                <form onSubmit={handle} className="space-y-3">
                    {[['labName', 'Lab / Clinic Name *'], ['email', 'Login Email *']].map(([k, p]) => (
                        <input key={k} type={k === 'email' ? 'email' : 'text'} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder={p} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                    ))}
                    <div className="relative">
                        <input type={showPass ? 'text' : 'password'} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500 pr-10" placeholder="Password *" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                        <input className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-bold text-sm">Cancel</button>
                        <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm disabled:opacity-60">{isPending ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Create Staff Modal ───────────────────────────────────────────────────────
const CreateStaffModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [form, setForm] = useState({ staffName: '', email: '', password: '', hospitalName: '', phone: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const handle = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.staffName || !form.email || !form.password) { setError('Name, email, and password are required.'); return; }
        startTransition(async () => {
            const r = await createStaffAccountAction(form);
            if (r.success) { onSuccess(); onClose(); } else setError(r.error || 'Failed');
        });
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-black text-slate-900">Create Staff Account</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
                <form onSubmit={handle} className="space-y-3">
                    <input type="text" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder="Full Name *" value={form.staffName} onChange={e => setForm({ ...form, staffName: e.target.value })} />
                    <input type="email" className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder="Login Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <div className="relative">
                        <input type={showPass ? 'text' : 'password'} className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500 pr-10" placeholder="Password *" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder="Hospital / Clinic" value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })} />
                        <input className="border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-bold text-sm">Cancel</button>
                        <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm disabled:opacity-60">{isPending ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab = ({ data, go }: { data: AdminData; go: (t: string) => void }) => (
    <div className="space-y-6">
        <div><h2 className="text-2xl font-black text-slate-900">Platform Overview</h2><p className="text-slate-500 text-sm">Live snapshot of NiraivaHealth platform.</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
                { label: 'Total Patients', v: data.stats.patientCount, color: 'text-blue-600 bg-blue-50', icon: '🧑‍⚕️' },
                { label: 'Total Doctors', v: data.stats.doctorCount, color: 'text-teal-600 bg-teal-50', icon: '🩺' },
                { label: 'Lab Reports', v: data.stats.totalLabReports, color: 'text-emerald-600 bg-emerald-50', icon: '🧪' },
                { label: 'Prescriptions', v: data.stats.totalMeds, color: 'text-purple-600 bg-purple-50', icon: '💊' },
                { label: 'Pending Approval', v: data.stats.pendingDoctors, color: 'text-amber-600 bg-amber-50', icon: '⏳' },
                { label: 'Banned Users', v: data.stats.bannedUsers, color: 'text-red-500 bg-red-50', icon: '🚫' },
                { label: 'Open Tickets', v: data.stats.openTickets, color: 'text-blue-600 bg-blue-50', icon: '🎟️' },
                { label: 'Lab Accounts', v: data.stats.labCount, color: 'text-emerald-600 bg-emerald-50', icon: '🏥' },
            ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border-2 border-slate-100 p-4 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${s.color}`}>{s.icon}</div>
                    <p className="text-3xl font-black text-slate-900">{s.v}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
            ))}
        </div>
        <div className="space-y-3">
            {data.stats.pendingDoctors > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-4">
                    <Hourglass className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1"><p className="font-black text-amber-900 text-sm">{data.stats.pendingDoctors} Doctor(s) Waiting Approval</p><p className="text-xs text-amber-700">New registrations need your review before they can access the platform.</p></div>
                    <button onClick={() => go('doctors')} className="text-xs font-black text-amber-700 bg-white border-2 border-amber-200 px-4 py-2 rounded-xl hover:bg-amber-100">Review →</button>
                </div>
            )}
            {data.stats.openTickets > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-4">
                    <TicketCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1"><p className="font-black text-blue-900 text-sm">{data.stats.openTickets} Open Support Ticket(s)</p><p className="text-xs text-blue-700">Users have reported issues needing your attention.</p></div>
                    <button onClick={() => go('tickets')} className="text-xs font-black text-blue-700 bg-white border-2 border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100">View →</button>
                </div>
            )}
            {data.stats.pendingDoctors === 0 && data.stats.openTickets === 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" /><p className="text-emerald-800 font-bold text-sm">All clear! No pending actions required.</p>
                </div>
            )}
        </div>
    </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard({ data }: { data: AdminData }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [showCreateLab, setShowCreateLab] = useState(false);
    const [showCreateStaff, setShowCreateStaff] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [ticketFilter, setTicketFilter] = useState('all');

    const refresh = () => router.refresh();
    const handleLogout = () => startTransition(async () => { await adminLogout(); router.push('/admin'); });

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'doctors', label: 'Doctors', count: data.stats.pendingDoctors, icon: Stethoscope },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'tickets', label: 'Tickets', count: data.stats.openTickets, icon: TicketCheck },
        { id: 'labs', label: 'Lab Accounts', icon: FlaskConical },
        { id: 'staff', label: 'Staff Accounts', icon: ShieldCheck },
    ];

    const filteredTickets = ticketFilter === 'all' ? data.tickets : data.tickets.filter((t: any) => t.status === ticketFilter);

    return (
        <div className="min-h-screen bg-slate-50">
            {showCreateLab && <CreateLabModal onClose={() => setShowCreateLab(false)} onSuccess={refresh} />}
            {showCreateStaff && <CreateStaffModal onClose={() => setShowCreateStaff(false)} onSuccess={refresh} />}

            {/* Header */}
            <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <div><h1 className="text-base font-black text-slate-900 leading-none">NiraivaHealth</h1><p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Admin Panel</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
                        <button onClick={handleLogout} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl">
                            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b-2 border-slate-100 sticky top-16 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
                    <div className="flex gap-1 min-w-max py-1">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap border-2 ${activeTab === tab.id ? 'bg-teal-50 text-teal-700 border-teal-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'}`}>
                                <tab.icon className="w-4 h-4" />{tab.label}
                                {tab.count != null && tab.count > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{tab.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {activeTab === 'overview' && <OverviewTab data={data} go={setActiveTab} />}

                {activeTab === 'doctors' && (
                    <div className="space-y-4">
                        <div><h2 className="text-2xl font-black text-slate-900">Doctors</h2><p className="text-slate-500 text-sm">{data.doctors.length} registered • {data.stats.pendingDoctors} pending</p></div>
                        {data.doctors.length === 0 ? <div className="bg-white rounded-2xl border-2 border-slate-100 p-12 text-center"><Stethoscope className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="font-bold text-slate-400">No doctors registered.</p></div>
                            : data.doctors.map((doc: any) => <DoctorCard key={doc.id} doc={doc} refresh={refresh} />)}
                    </div>
                )}

                {activeTab === 'patients' && (
                    <div className="space-y-4">
                        <div><h2 className="text-2xl font-black text-slate-900">Patients</h2><p className="text-slate-500 text-sm">{data.patients.length} registered</p></div>
                        {data.patients.length === 0 ? <div className="bg-white rounded-2xl border-2 border-slate-100 p-12 text-center"><Users className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="font-bold text-slate-400">No patients registered.</p></div>
                            : data.patients.map((pat: any) => <PatientCard key={pat.id} pat={pat} refresh={refresh} />)}
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className="space-y-4">
                        <div><h2 className="text-2xl font-black text-slate-900">Support Tickets</h2><p className="text-slate-500 text-sm">{data.tickets.length} total • {data.stats.openTickets} open</p></div>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
                                <button key={f} onClick={() => setTicketFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors ${ticketFilter === f ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}>
                                    {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} ({f === 'all' ? data.tickets.length : data.tickets.filter((t: any) => t.status === f).length})
                                </button>
                            ))}
                        </div>
                        {filteredTickets.length === 0 ? <div className="bg-white rounded-2xl border-2 border-slate-100 p-12 text-center"><TicketCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="font-bold text-slate-400">No tickets here.</p></div>
                            : filteredTickets.map((t: any) => <TicketCard key={t.id} ticket={t} refresh={refresh} />)}
                    </div>
                )}

                {activeTab === 'labs' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div><h2 className="text-2xl font-black text-slate-900">Lab Accounts</h2><p className="text-slate-500 text-sm">{data.labs.length} diagnostic lab(s)</p></div>
                            <button onClick={() => setShowCreateLab(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-sm"><Plus className="w-4 h-4" /> Add Lab</button>
                        </div>
                        {data.labs.length === 0 ? (
                            <div className="bg-white rounded-2xl border-2 border-slate-100 p-12 text-center">
                                <FlaskConical className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="font-bold text-slate-500">No lab accounts yet.</p><p className="text-xs text-slate-400 mt-1">Create lab login credentials for diagnostic partners.</p>
                                <button onClick={() => setShowCreateLab(true)} className="mt-4 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm">+ Create First Lab</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.labs.map((lab: any) => <LabAccountRow key={lab.id} lab={lab} refresh={refresh} />)}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div><h2 className="text-2xl font-black text-slate-900">Staff Accounts</h2><p className="text-slate-500 text-sm">{(data.staff ?? []).length} front desk / nursing staff account(s)</p></div>
                            <button onClick={() => setShowCreateStaff(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-sm"><Plus className="w-4 h-4" /> Add Staff</button>
                        </div>
                        {(data.staff ?? []).length === 0 ? (
                            <div className="bg-white rounded-2xl border-2 border-slate-100 p-12 text-center">
                                <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="font-bold text-slate-500">No staff accounts yet.</p><p className="text-xs text-slate-400 mt-1">Create login credentials for front desk and nursing staff.</p>
                                <button onClick={() => setShowCreateStaff(true)} className="mt-4 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm">+ Create First Staff Account</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(data.staff ?? []).map((s: any) => <StaffAccountRow key={s.id} staff={s} refresh={refresh} />)}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// ─── Lab Account Row (own useTransition) ──────────────────────────────────────
function LabAccountRow({ lab, refresh }: { lab: any; refresh: () => void }) {
    const [isPending, startTransition] = useTransition();
    const toggle = (active: boolean) => startTransition(async () => { await toggleLabAccountAction(lab.id, active); refresh(); });

    return (
        <div className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-sm ${lab.isActive ? 'border-slate-100' : 'border-slate-200 opacity-70'}`}>
            <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-emerald-100">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm sm:text-base truncate">{lab.labName}</p>
                    <p className="text-xs text-slate-500 truncate">{lab.email}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        {[lab.city, lab.phone].filter(Boolean).join(' • ') || 'No location'} &bull; Added {new Date(lab.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Badge status={lab.isActive ? 'active' : 'disabled'} />
                    {lab.isActive
                        ? <button disabled={isPending} onClick={() => toggle(false)} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-red-100 disabled:opacity-50"><ShieldOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Disable</button>
                        : <button disabled={isPending} onClick={() => toggle(true)} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"><ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Enable</button>}
                </div>
            </div>
        </div>
    );
}

// ─── Staff Account Row ─────────────────────────────────────────────────────────
function StaffAccountRow({ staff, refresh }: { staff: any; refresh: () => void }) {
    const [isPending, startTransition] = useTransition();
    const toggle = (active: boolean) => startTransition(async () => { await toggleStaffAccountAction(staff.id, active); refresh(); });

    return (
        <div className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-sm ${staff.isActive ? 'border-slate-100' : 'border-slate-200 opacity-70'}`}>
            <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-teal-100">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm sm:text-base truncate">{staff.staffName}</p>
                    <p className="text-xs text-slate-500 truncate">{staff.email}</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        {[staff.hospitalName, staff.phone].filter(Boolean).join(' • ') || 'No hospital assigned'} &bull; Added {new Date(staff.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <Badge status={staff.isActive ? 'active' : 'disabled'} />
                    {staff.isActive
                        ? <button disabled={isPending} onClick={() => toggle(false)} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-red-100 disabled:opacity-50"><ShieldOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Disable</button>
                        : <button disabled={isPending} onClick={() => toggle(true)} className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-xl text-[11px] sm:text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"><ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Enable</button>}
                </div>
            </div>
        </div>
    );
}

