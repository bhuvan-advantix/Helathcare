'use client';

import { useState, useTransition, useEffect } from 'react';
import { FlaskConical, Search, User, Droplet, MapPin, Upload, CheckCircle, LogOut, AlertCircle, X, FileText, Phone, Syringe, BadgeCheck, CheckCheck, RefreshCw } from 'lucide-react';
import { searchPatientForLab, labLogout, labUploadReport } from '@/app/actions/lab';
import { getLabOrdersForPatient, markLabOrdersPaid } from '@/app/actions/labOrders';
import { useRouter } from 'next/navigation';

interface LabSession { labId: string; labName: string; email: string; }
interface PatientResult {
    patientId: string; name: string | null; customId: string | null;
    gender: string | null; age: number | null; bloodGroup: string | null; city: string | null; phone: string | null;
}

// ─── Lab Orders Panel ────────────────────────────────────────────────────────────────
function LabOrdersPanel({ patientId, labName }: { patientId: string; labName: string }) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const [paidSuccess, setPaidSuccess] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        const r = await getLabOrdersForPatient(patientId);
        if (r.success && r.orders) setOrders(r.orders);
        setLoading(false);
    };

    // load on mount
    useEffect(() => { load(); }, [patientId]);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };

    const handleMarkPaid = () => {
        if (!selected.size) { setError('Select at least one item.'); return; }
        setError('');
        startTransition(async () => {
            const r = await markLabOrdersPaid([...selected], labName);
            if (r.success) {
                setPaidSuccess(true);
                setSelected(new Set());
                await load();
                setTimeout(() => setPaidSuccess(false), 3000);
            } else { setError(r.error || 'Failed'); }
        });
    };

    const pending = orders.filter(o => !o.isPaid);
    const paid = orders.filter(o => o.isPaid);

    return (
        <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">Doctor-Ordered Tests &amp; Injections</h4>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded-full">{pending.length} Pending</span>
                    <button onClick={load} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium py-4 justify-center">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Loading orders...
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium text-center py-4">No tests or injections ordered for this patient yet.</p>
                ) : (
                    <>
                        {/* Pending */}
                        {pending.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Payment</p>
                                {pending.map(o => (
                                    <label key={o.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected.has(o.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:border-blue-200'
                                        }`}>
                                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)}
                                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {o.type === 'injection'
                                                ? <Syringe className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                : <FlaskConical className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-900 text-sm">{o.name}</p>
                                                <p className="text-[10px] text-slate-400">{o.type === 'injection' ? 'Injection' : 'Lab Test'} · {o.doctorName || 'Doctor'}</p>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                                {paidSuccess && (
                                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold">
                                        <BadgeCheck className="w-4 h-4" /> Marked as Paid!
                                    </div>
                                )}
                                <button onClick={handleMarkPaid} disabled={isPending || selected.size === 0}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                                    <BadgeCheck className="w-4 h-4" />
                                    {isPending ? 'Updating...' : `Mark ${selected.size > 0 ? selected.size + ' ' : ''}Selected as Paid`}
                                </button>
                            </div>
                        )}

                        {/* Paid */}
                        {paid.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</p>
                                {paid.map(o => (
                                    <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 opacity-60">
                                        {o.type === 'injection'
                                            ? <Syringe className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                            : <FlaskConical className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-700 text-sm line-through">{o.name}</p>
                                            <p className="text-[10px] text-slate-400">Paid by {o.paidBy}</p>
                                        </div>
                                        <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function LabDashboard({ session }: { session: LabSession }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [patient, setPatient] = useState<PatientResult | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [uploadMessage, setUploadMessage] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setNotFound(false); setPatient(null); setUploadStatus('idle'); setFile(null);
        startTransition(async () => {
            const result = await searchPatientForLab(query.trim());
            if (result) setPatient(result); else setNotFound(true);
        });
    };

    const handleLogout = () => startTransition(async () => { await labLogout(); router.push('/lab'); });

    const handleUpload = async () => {
        if (!file || !patient) return;
        setUploading(true); setUploadStatus('idle'); setUploadMessage('');
        try {
            const sigRes = await fetch('/api/cloudinary-signature', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: `lab-reports/${patient.patientId}` }),
            });
            if (!sigRes.ok) throw new Error('Failed to get upload signature.');
            const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json();
            const fd = new FormData();
            fd.append('file', file); fd.append('signature', signature);
            fd.append('timestamp', timestamp.toString()); fd.append('api_key', apiKey); fd.append('folder', folder);
            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: fd });
            if (!uploadRes.ok) throw new Error('Cloudinary upload failed.');
            const uploadData = await uploadRes.json();
            const saveResult = await labUploadReport({ patientId: patient.patientId, cloudinaryUrl: uploadData.secure_url, fileName: file.name, fileSize: file.size, labName: session.labName });
            if (saveResult.success) {
                setUploadStatus('success');
                setUploadMessage(`✓ Report uploaded for ${patient.name}! It will appear in patient's profile.`);
                setFile(null);
            } else { setUploadStatus('error'); setUploadMessage(saveResult.error || 'Upload failed.'); }
        } catch (err: any) {
            setUploadStatus('error'); setUploadMessage(err.message || 'An error occurred. Please try again.');
        } finally { setUploading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── Header ── */}
            <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-30 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                            <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none truncate">NiraivaHealth</h1>
                            <p className="text-[9px] sm:text-[10px] font-black text-teal-600 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">{session.labName}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} disabled={isPending}
                        className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl transition-colors disabled:opacity-60">
                        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">

                {/* ── Banner ── */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-5 sm:p-6 text-white">
                    <h2 className="text-lg sm:text-xl font-black mb-1">Upload Lab Report</h2>
                    <p className="text-teal-100 text-xs sm:text-sm font-medium leading-relaxed">Search a patient by their NiraivaHealth ID, then upload their PDF lab report.</p>
                </div>

                {/* ── Search ── */}
                <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-4 sm:p-6">
                    <h3 className="font-black text-slate-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0" /> Find Patient
                    </h3>
                    <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
                        <input
                            value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="#Nrivaa007 or just 007"
                            className="flex-1 min-w-0 border-2 border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors bg-slate-50 placeholder-slate-400"
                        />
                        <button type="submit" disabled={isPending || !query.trim()}
                            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-colors text-sm disabled:opacity-60 whitespace-nowrap flex-shrink-0">
                            {isPending ? '…' : 'Search'}
                        </button>
                    </form>
                    {notFound && (
                        <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 text-red-700 text-xs sm:text-sm font-bold">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> No patient found. Check the ID and try again.
                        </div>
                    )}
                </div>

                {/* ── Patient Card ── */}
                {patient && (
                    <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-sm overflow-hidden">
                        {/* Patient Header */}
                        <div className="bg-teal-50 px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-teal-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-teal-100 rounded-xl flex items-center justify-center border-2 border-teal-200 flex-shrink-0">
                                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-slate-900 text-sm sm:text-base truncate">{patient.name || 'Unknown'}</h3>
                                    <p className="text-[11px] sm:text-xs font-bold text-teal-600">{patient.customId}</p>
                                </div>
                            </div>
                            <button onClick={() => { setPatient(null); setQuery(''); setFile(null); setUploadStatus('idle'); }}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors flex-shrink-0">
                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </div>

                        {/* Quick Stats — 2×2 on mobile, 4 columns on sm+ */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-slate-100">
                            {[
                                { label: 'Age', value: patient.age != null ? String(patient.age) : '—', icon: null },
                                { label: 'Gender', value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—', icon: null },
                                { label: 'Blood', value: patient.bloodGroup ?? '—', icon: <Droplet className="w-3 h-3 text-red-400 fill-red-300 inline mr-0.5" /> },
                                { label: 'City', value: patient.city ?? '—', icon: <MapPin className="w-3 h-3 text-slate-400 inline mr-0.5" /> },
                            ].map(s => (
                                <div key={s.label} className="bg-slate-50 rounded-xl p-2.5 sm:p-3 text-center border border-slate-100">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 sm:mb-1">{s.label}</p>
                                    <p className="text-sm sm:text-base font-black text-slate-900 truncate">{s.icon}{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Phone if available */}
                        {patient.phone && (
                            <div className="px-4 sm:px-6 py-2 border-b-2 border-slate-100 flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-bold text-slate-700">{patient.phone}</span>
                            </div>
                        )}

                        {/* Doctor-Ordered Lab Tests & Injections */}
                        <div className="px-4 sm:px-6 py-4 border-b-2 border-slate-100">
                            <LabOrdersPanel patientId={patient.patientId} labName={session.labName} />
                        </div>

                        {/* Upload Section */}
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" /> Upload Lab Report for {patient.name?.split(' ')[0]}
                            </h4>

                            <label className="block cursor-pointer">
                                <input type="file" accept=".pdf" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setUploadStatus('idle'); setUploadMessage(''); }} />
                                <div className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center transition-all ${file ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'}`}>
                                    {file ? (
                                        <div className="flex items-center justify-center gap-2 sm:gap-3 text-teal-700">
                                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                            <div className="text-left min-w-0">
                                                <p className="font-bold text-xs sm:text-sm truncate">{file.name}</p>
                                                <p className="text-[10px] sm:text-xs text-teal-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 mx-auto mb-1.5 sm:mb-2" />
                                            <p className="text-xs sm:text-sm font-bold text-slate-500">Tap to select PDF</p>
                                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">PDF files only</p>
                                        </>
                                    )}
                                </div>
                            </label>

                            {/* Status messages */}
                            {uploadStatus === 'success' && (
                                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2 text-emerald-700 text-xs sm:text-sm font-bold">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {uploadMessage}
                                </div>
                            )}
                            {uploadStatus === 'error' && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2 text-red-700 text-xs sm:text-sm font-bold">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {uploadMessage}
                                </div>
                            )}
                            {uploading && (
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-blue-700 text-xs sm:text-sm font-bold flex items-center gap-2">
                                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    Uploading... please wait
                                </div>
                            )}

                            <button onClick={handleUpload} disabled={!file || uploading}
                                className="w-full py-3 sm:py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm">
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {uploading ? 'Uploading...' : 'Upload Report'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── How-to guide ── */}
                {!patient && !notFound && (
                    <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-4 sm:p-6">
                        <h4 className="font-black text-slate-800 mb-3 sm:mb-4 text-sm sm:text-base">How to upload a report</h4>
                        <div className="space-y-2.5 sm:space-y-3">
                            {[
                                { step: '1', text: 'Ask the patient for their NiraivaHealth ID (e.g. #Nrivaa007)' },
                                { step: '2', text: 'Enter the ID in the search box above and tap Search' },
                                { step: '3', text: 'Verify the patient details (name, age, blood group)' },
                                { step: '4', text: 'Select the PDF lab report file and tap Upload Report' },
                            ].map(s => (
                                <div key={s.step} className="flex items-start gap-2.5 sm:gap-3">
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-white text-[10px] sm:text-xs font-black">{s.step}</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
