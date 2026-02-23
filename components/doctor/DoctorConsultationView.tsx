"use client";

import { useState, useRef, useEffect } from 'react';
import {
    Activity, ArrowLeft, Stethoscope, Save, Plus, X, Upload, Calendar, Phone, UserPlus, User, Ruler, FileText, Pill, Trash2, MapPin, Weight, ChevronDown, CheckCircle2, AlertCircle, Loader2, AlertTriangle, Heart, ShieldCheck
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { finishConsultation, appendPatientClinicalContext } from '@/app/actions/consultation';
import { processReportUploadedByDoctor } from '@/app/actions/labReports';
import { getCloudinarySignature } from '@/app/actions/cloudinarySignature';

export default function DoctorConsultationView({
    patient, doctor, healthParams, privateNotes
}: any) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [commonDiagnoses, setCommonDiagnoses] = useState([
        "Fever", "Stomach Ache", "Common Cold", "Influenza", "Headache", "Migraine",
        "Hypertension", "Diabetes Type 2", "Allergic Rhinitis", "Asthma", "Gastritis",
        "Gastroenteritis", "Acid Reflux (GERD)", "Urinary Tract Infection", "Bronchitis",
        "Pneumonia", "Pharyngitis", "Tonsillitis", "Sinusitis", "Otitis Media (Ear Infection)",
        "Conjunctivitis", "Dermatitis", "Eczema", "Anemia", "Hypothyroidism", "Hyperthyroidism",
        "Osteoarthritis", "Rheumatoid Arthritis", "Osteoporosis", "Gout", "Kidney Stones",
        "Gallstones", "Hemorrhoids", "Constipation", "Diarrhea", "Irritable Bowel Syndrome",
        "Insomnia", "Anxiety", "Depression", "Muscle Spasm", "Sprain/Strain",
        "Back Pain (Lumbago)", "Sciatica", "Acne", "Psoriasis", "Chickenpox",
        "Dengue Fever", "Typhoid Fever", "Malaria", "COVID-19"
    ]);

    const commonMedications = [
        "Paracetamol 500mg", "Amoxicillin 500mg", "Ibuprofen 400mg", "Cetirizine 10mg", "Azithromycin 500mg",
        "Pantoprazole 40mg", "Metformin 500mg", "Losartan 50mg", "Amlodipine 5mg", "Atorvastatin 20mg",
        "Omeprazole 20mg", "Ciprofloxacin 500mg", "Dolo 650mg", "Vitamin C 500mg", "Crocine 500mg",
        "Levocetirizine 5mg", "Diclofenac 50mg"
    ];

    const getLatestValue = (paramName: string) => {
        const param = healthParams.find((p: any) => p.parameterName === paramName);
        return param ? param.value : '';
    };

    const age = patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 31557600000) : null;

    // Form States
    const [diagnoses, setDiagnoses] = useState<string[]>([]);
    const [customDiagnosis, setCustomDiagnosis] = useState('');
    const [isDiagDropdownOpen, setIsDiagDropdownOpen] = useState(false);
    const [diagSearch, setDiagSearch] = useState('');

    const handleAddDiagnosis = (diag: string) => {
        const trimmed = diag.trim();
        if (trimmed) {
            if (!diagnoses.includes(trimmed)) {
                setDiagnoses([...diagnoses, trimmed]);
            }
            if (!commonDiagnoses.includes(trimmed)) {
                setCommonDiagnoses([...commonDiagnoses, trimmed]);
            }
        }
        setCustomDiagnosis('');
    };

    const handleRemoveDiagnosis = (diag: string) => {
        setDiagnoses(diagnoses.filter((d) => d !== diag));
    };

    // Medications
    const [medications, setMedications] = useState<Array<{ id: number, name: string, morning: boolean, afternoon: boolean, night: boolean, days: string, beforeFood: boolean, afterFood: boolean, isPrescribed?: boolean }>>([
        { id: Date.now(), name: '', morning: false, afternoon: false, night: false, days: '', beforeFood: false, afterFood: false, isPrescribed: true }
    ]);
    const [activeMedDropdown, setActiveMedDropdown] = useState<number | null>(null);
    const [medSearch, setMedSearch] = useState('');

    // Vitals - strip any status prefix (e.g. 'H ' or 'L ') that may be stored from lab reports
    const cleanValue = (raw: string) => raw.replace(/^[HLhl]\s+/, '').trim();
    const [vitals, setVitals] = useState({
        weight: cleanValue((getLatestValue('Weight') || patient.weight || '').toString().replace(/kg/i, '').trim()),
        height: cleanValue((getLatestValue('Height') || patient.height || '').toString().replace(/cm/i, '').trim()),
        bloodPressure: cleanValue((getLatestValue('Blood Pressure') || '').toString().replace(/mm\s*Hg/i, '').trim()),
        bloodGlucose: cleanValue((getLatestValue('Blood Glucose') || getLatestValue('Blood Sugar') || '').toString().replace(/mg\/dL/i, '').trim()),
        cholesterol: cleanValue((getLatestValue('Total Cholesterol') || getLatestValue('Cholesterol') || '').toString().replace(/mg\/dL/i, '').trim()),
        hba1c: cleanValue((getLatestValue('HbA1c') || '').toString().replace(/%/i, '').trim()),
    });

    // Notes
    const [doctorNote, setDoctorNote] = useState(privateNotes?.[0]?.noteContent || '');
    const [patientNote, setPatientNote] = useState('');

    // Clinical Context — always-visible inline inputs (saved with main consultation submit)
    const [newAllergies, setNewAllergies] = useState('');
    const [newSurgeries, setNewSurgeries] = useState('');
    const [newLifestyle, setNewLifestyle] = useState('');

    // Follow up
    const [followUp, setFollowUp] = useState('');
    const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
    const followUpRef = useRef<HTMLDivElement>(null);
    const FOLLOWUP_OPTIONS = [
        { value: '', label: 'No Follow-up Scheduled' },
        { value: 'In 3 days', label: 'In 3 days' },
        { value: 'In 1 week', label: 'In 1 week' },
        { value: 'In 2 weeks', label: 'In 2 weeks' },
        { value: 'In 1 month', label: 'In 1 month' },
        { value: 'SOS / When needed', label: 'SOS / When needed' },
    ];

    // Lab upload state
    const [isUploadingLab, setIsUploadingLab] = useState(false);
    const [uploadedReports, setUploadedReports] = useState<Array<{ name: string; labName: string | null; date: string; reportId: string }>>([]);
    const [uploadError, setUploadError] = useState('');
    const [labNote, setLabNote] = useState('');
    const labFileRef = useRef<HTMLInputElement>(null);

    // Close followup dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (followUpRef.current && !followUpRef.current.contains(e.target as Node)) {
                setIsFollowUpOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLabUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setUploadError('Only PDF files are supported');
            event.target.value = '';
            return;
        }
        setIsUploadingLab(true);
        setUploadError('');
        try {
            // 1. Get cloudinary signature
            const { signature, timestamp, cloudName, apiKey } = await getCloudinarySignature();
            if (!cloudName || !apiKey) throw new Error('Cloud config missing');

            // 2. Upload to Cloudinary client-side
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey!);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('folder', 'lab_reports');
            formData.append('type', 'upload');
            formData.append('access_mode', 'public');

            const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.error?.message || 'Upload to cloud failed');
            }
            const uploadData = await uploadRes.json();
            const secureUrl = uploadData.secure_url;

            // 3. Process on server: AI extraction + save to patient DB
            // Use the doctor's clinic name as the lab name for display
            const clinicName = doctor?.clinicName || null;
            const result = await processReportUploadedByDoctor(
                secureUrl,
                patient.id,
                file.name,
                file.size,
                clinicName || undefined,
                labNote.trim() || undefined
            );

            if (result.success) {
                const displayName = clinicName || result.labName || 'Clinic';
                setUploadedReports(prev => [
                    ...prev,
                    {
                        name: file.name,
                        labName: displayName,
                        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                        reportId: result.reportId!,
                    }
                ]);
            } else {
                setUploadError(result.error || 'Upload failed');
            }
        } catch (err: any) {
            setUploadError(err.message || 'Unexpected error during upload');
        } finally {
            setIsUploadingLab(false);
            event.target.value = '';
        }
    };


    const handleAddMedication = () => {
        setMedications([...medications, { id: Date.now(), name: '', morning: false, afternoon: false, night: false, days: '', beforeFood: false, afterFood: false, isPrescribed: true }]);
    };

    const handleRemoveMedication = (id: number) => {
        setMedications(medications.filter(m => m.id !== id));
    };

    const updateMedication = (id: number, field: string, value: any) => {
        setMedications(medications.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            // Process medications format
            const formattedMeds = medications.filter(m => m.name.trim() !== '' && m.isPrescribed !== false).map(m => {
                const times = [];
                if (m.morning) times.push('Morning');
                if (m.afternoon) times.push('Afternoon');
                if (m.night) times.push('Night');
                let timeStr = times.length > 0 ? times.join(', ') : 'As needed';
                let foodStr = [];
                if (m.beforeFood) foodStr.push('Before Food');
                if (m.afterFood) foodStr.push('After Food');
                if (foodStr.length > 0) {
                    timeStr += ` (${foodStr.join(' / ')})`;
                }
                return {
                    name: m.name,
                    time: timeStr,
                    days: m.days
                };
            });

            const formattedVitals = [
                { name: 'Blood Pressure', value: vitals.bloodPressure, unit: 'mm Hg' },
                { name: 'Blood Glucose', value: vitals.bloodGlucose, unit: 'mg/dL' },
                { name: 'Weight', value: vitals.weight, unit: 'kg' },
                { name: 'Height', value: vitals.height, unit: 'cm' },
                { name: 'Cholesterol', value: vitals.cholesterol, unit: 'mg/dL' },
                { name: 'HbA1c', value: vitals.hba1c, unit: '%' },
            ].filter(v => v.value.trim() !== '');

            const result = await finishConsultation(patient.id, {
                height: vitals.height,
                weight: vitals.weight,
                vitals: formattedVitals,
                medications: formattedMeds,
                clinicalNotesPrivate: doctorNote,
                patientNote: patientNote,
                diagnosis: diagnoses.join(', '),
                followUp: followUp
            });

            // Append clinical context if doctor filled anything in
            if (newAllergies.trim() || newSurgeries.trim() || newLifestyle.trim()) {
                await appendPatientClinicalContext(patient.id, {
                    allergies: newAllergies.trim() || undefined,
                    pastSurgeries: newSurgeries.trim() || undefined,
                    lifestyle: newLifestyle.trim() || undefined,
                });
            }

            if (result.success) {
                router.push(`/doctor/patient/${patient.id}`);
            } else {
                alert(result.error || "Failed to save consultation");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#F7F9FA] pb-24 font-sans">
            <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">

                {/* Patient Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    {/* Decorative Background for Header */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-transparent rounded-bl-full -mr-20 -mt-20 opacity-60 z-0 pointer-events-none" />

                    <div className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar Column */}
                        <div className="flex-shrink-0">
                            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-slate-100">
                                {patient.image ? (
                                    <Image src={patient.image} alt={patient.name} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-teal-50">
                                        <User className="w-12 h-12 text-teal-600" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-grow w-full space-y-6">
                            {/* Name and Primary Actions */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 leading-tight">{patient.name}</h1>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-800 rounded-lg border border-teal-200 font-bold text-sm">
                                            <span className="opacity-70 text-xs uppercase tracking-widest">ID:</span>
                                            {patient.customId || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 font-bold text-sm capitalize">
                                            <span className="opacity-70 text-xs text-indigo-600 uppercase tracking-widest">Gender:</span>
                                            {patient.gender}
                                        </div>
                                        {patient.bloodGroup && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-800 rounded-lg border border-red-200 font-bold text-sm">
                                                <span className="opacity-70 text-xs text-red-600 uppercase tracking-widest">Blood:</span>
                                                {patient.bloodGroup}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-6 bg-slate-50/80 p-6 rounded-2xl border border-slate-100">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date of Birth</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                        <Calendar className="w-4 h-4 text-teal-600" />
                                        <span>{patient.dateOfBirth || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                        <User className="w-4 h-4 text-teal-600" />
                                        <span>{age ? `${age} yrs` : '--'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                        <Phone className="w-4 h-4 text-teal-600" />
                                        <span>{patient.phoneNumber || patient.contactNumber || '--'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                        <UserPlus className="w-4 h-4 text-teal-600" />
                                        <div className="flex flex-col leading-tight">
                                            <span>{patient.emergencyContactName || '--'}</span>
                                            {patient.emergencyContactPhone && <span className="text-slate-500 text-xs font-bold mt-0.5">{patient.emergencyContactPhone}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marital Status</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm capitalize">
                                        <User className="w-4 h-4 text-teal-600" />
                                        <span>{patient.maritalStatus || '--'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Height</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                        <Ruler className="w-4 h-4 text-teal-600" />
                                        <span>{patient.height || '--'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weight</p>
                                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                        <Weight className="w-4 h-4 text-teal-600" />
                                        <span>{patient.weight || '--'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Address Row */}
                            {patient.address && (
                                <div className="flex items-start gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
                                        <MapPin className="w-5 h-5 text-teal-600" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Address</p>
                                        <p className="text-sm text-slate-900 font-black leading-relaxed">
                                            {patient.address}{patient.city ? `, ${patient.city}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Clinical Context — always-visible inline inputs */}
                <section className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100">
                        <div className="w-9 h-9 bg-white rounded-xl border border-rose-200 flex items-center justify-center shadow-sm flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight">Patient Clinical Context</h2>
                            <p className="text-[11px] font-semibold text-rose-500 mt-0.5">Leave blank if nothing to add — saved with consultation</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                        {/* Allergies */}
                        <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                </div>
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Allergies</p>
                            </div>
                            {/* Existing */}
                            {patient.allergies ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {patient.allergies.split(',').map((a: string) => a.trim()).filter(Boolean).map((allergy: string, i: number) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block flex-shrink-0" />
                                            {allergy}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No known allergies</p>
                            )}
                            {/* Add more */}
                            <input
                                type="text"
                                value={newAllergies}
                                onChange={e => setNewAllergies(e.target.value)}
                                placeholder="Add new (e.g. Latex, Sulfa)"
                                className="w-full text-sm bg-red-50/40 border border-red-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 placeholder:text-slate-400 font-medium"
                            />
                            <p className="text-[10px] text-slate-400">Comma-separated · won&apos;t duplicate existing</p>
                        </div>

                        {/* Past Surgeries */}
                        <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                                    <Heart className="w-3.5 h-3.5 text-purple-500" />
                                </div>
                                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Past Surgeries</p>
                            </div>
                            {patient.pastSurgeries ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {patient.pastSurgeries.split(',').map((s: string) => s.trim()).filter(Boolean).map((surgery: string, i: number) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block flex-shrink-0" />
                                            {surgery}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No surgery history</p>
                            )}
                            <input
                                type="text"
                                value={newSurgeries}
                                onChange={e => setNewSurgeries(e.target.value)}
                                placeholder="Add new (e.g. Appendectomy)"
                                className="w-full text-sm bg-purple-50/40 border border-purple-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 placeholder:text-slate-400 font-medium"
                            />
                            <p className="text-[10px] text-slate-400">Comma-separated · won&apos;t duplicate existing</p>
                        </div>

                        {/* Lifestyle */}
                        <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                </div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lifestyle</p>
                            </div>
                            {patient.lifestyle && (
                                <p className="text-xs font-semibold text-slate-600 leading-relaxed">{patient.lifestyle}</p>
                            )}
                            <textarea
                                value={newLifestyle}
                                onChange={e => setNewLifestyle(e.target.value)}
                                placeholder="Add notes (e.g. Smoker, drinks occasionally)"
                                rows={2}
                                className="w-full text-sm bg-emerald-50/40 border border-emerald-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200 placeholder:text-slate-400 font-medium resize-none"
                            />
                            <p className="text-[10px] text-slate-400">Appended to existing notes</p>
                        </div>
                    </div>
                </section>

                {/* 1. Vitals & Basic Params */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 mb-4">
                        <Activity className="w-5 h-5 text-teal-500" />
                        Update Vitals & Params
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Weight</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={vitals.weight}
                                    onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 font-black rounded-lg pl-3 pr-10 py-2 text-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">kg</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Height</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={vitals.height}
                                    onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 font-black rounded-lg pl-3 pr-10 py-2 text-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">cm</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Blood Pressure</label>
                            <div className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={vitals.bloodPressure}
                                    onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 font-black rounded-lg pl-3 pr-16 py-2 text-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">mm Hg</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Sugar Level</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={vitals.bloodGlucose}
                                    onChange={(e) => setVitals({ ...vitals, bloodGlucose: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 font-black rounded-lg pl-3 pr-16 py-2 text-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">mg/dL</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Cholesterol</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={vitals.cholesterol}
                                    onChange={(e) => setVitals({ ...vitals, cholesterol: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 font-black rounded-lg pl-3 pr-16 py-2 text-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">mg/dL</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">HbA1c</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={vitals.hba1c}
                                    onChange={(e) => setVitals({ ...vitals, hba1c: e.target.value })}
                                    className="w-full bg-white border border-slate-200 text-slate-900 font-black rounded-lg pl-3 pr-8 py-2 text-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Diagnosis Section */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 mb-4">
                        <Activity className="w-5 h-5 text-teal-500" />
                        Clinical Diagnosis
                    </h2>
                    <div className="space-y-4">
                        {diagnoses.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {diagnoses.map((diag, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm">
                                        {diag}
                                        <button onClick={() => handleRemoveDiagnosis(diag)} className="hover:bg-teal-200 p-0.5 rounded-full transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Problems / Diagnosis</label>
                                <div
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center transition-colors hover:border-teal-500"
                                    onClick={() => setIsDiagDropdownOpen(!isDiagDropdownOpen)}
                                >
                                    <span className="text-slate-500">Select a common diagnosis...</span>
                                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDiagDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isDiagDropdownOpen && (
                                    <div className="absolute top-[80px] left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                                            <input
                                                type="text"
                                                placeholder="Search symptoms..."
                                                value={diagSearch}
                                                onChange={(e) => setDiagSearch(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-bold text-slate-900"
                                            />
                                        </div>
                                        <div className="max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                                            {commonDiagnoses
                                                .filter(d => d.toLowerCase().includes(diagSearch.toLowerCase()))
                                                .map((d, i) => {
                                                    const isSelected = diagnoses.includes(d);
                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            disabled={isSelected}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddDiagnosis(d);
                                                                setDiagSearch('');
                                                                // optionally keep open to select multiple: setIsDiagDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${isSelected ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400' : 'hover:bg-teal-50 hover:text-teal-700 text-slate-700'}`}
                                                        >
                                                            {d}
                                                        </button>
                                                    );
                                                })}
                                            {commonDiagnoses.filter(d => d.toLowerCase().includes(diagSearch.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-4 text-center text-sm font-bold text-slate-500">No matches found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Or add new problem</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={customDiagnosis}
                                        onChange={(e) => setCustomDiagnosis(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddDiagnosis(customDiagnosis);
                                            }
                                        }}
                                        placeholder="E.g., Back pain"
                                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleAddDiagnosis(customDiagnosis)}
                                        disabled={!customDiagnosis.trim()}
                                        className="px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors shadow-sm"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Medications Section */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                            <Pill className="w-5 h-5 text-teal-500" />
                            Prescribe Medications
                        </h2>
                        <button
                            onClick={handleAddMedication}
                            className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-sm rounded-lg transition-colors border border-teal-200"
                        >
                            <Plus className="w-4 h-4" /> Add Row
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Desktop Header Row */}
                        <div className="hidden xl:grid grid-cols-[32px_1fr_max-content_max-content_80px_80px_40px] gap-2 px-4 pb-1 items-end">
                            <div></div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Tablet / Medicine</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Dosage Timing</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Food Timing</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Duration</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Total</div>
                            <div></div>
                        </div>

                        {medications.map((med, index) => {
                            const totalTabs = ((med.morning ? 1 : 0) + (med.afternoon ? 1 : 0) + (med.night ? 1 : 0)) * (parseInt(med.days) || 0);
                            const isPrescribed = med.isPrescribed !== false;

                            return (
                                <div key={med.id} className={`flex flex-col xl:grid xl:grid-cols-[32px_1fr_max-content_max-content_80px_80px_40px] gap-4 xl:gap-2 p-4 xl:p-3 bg-slate-50 rounded-xl border items-center transition-all ${isPrescribed ? 'border-slate-200' : 'border-slate-200/50 opacity-60 grayscale'}`}>
                                    {/* Row Selector Checkbox */}
                                    <div className="flex items-center justify-center h-[44px]">
                                        <input
                                            type="checkbox"
                                            checked={isPrescribed}
                                            onChange={(e) => updateMedication(med.id, 'isPrescribed', e.target.checked)}
                                            className="w-5 h-5 text-teal-500 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                            title="Toggle Patient Prescription for this Medicine"
                                        />
                                    </div>

                                    {/* Medicine Selection Custom Dropdown */}
                                    <div className="w-full relative">
                                        <label className="xl:hidden text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tablet / Medicine</label>
                                        <div className="relative">
                                            <div
                                                className={`w-full bg-white border border-slate-200 text-slate-900 font-bold rounded-lg px-4 h-[44px] cursor-pointer flex justify-between items-center transition-colors ${isPrescribed ? 'hover:border-teal-500' : ''}`}
                                                onClick={() => {
                                                    if (!isPrescribed) return;
                                                    setActiveMedDropdown(activeMedDropdown === med.id ? null : med.id);
                                                    setMedSearch('');
                                                }}
                                            >
                                                <span className={med.name ? 'text-slate-900 truncate' : 'text-slate-400 truncate'}>{med.name || 'Select a common medicine...'}</span>
                                                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${activeMedDropdown === med.id ? 'rotate-180' : ''}`} />
                                            </div>

                                            {activeMedDropdown === med.id && isPrescribed && (
                                                <div className="absolute top-[48px] left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                                                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                                                        <input
                                                            type="text"
                                                            placeholder="Search or add custom medicine..."
                                                            value={medSearch}
                                                            onChange={(e) => setMedSearch(e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-bold text-slate-900"
                                                        />
                                                    </div>
                                                    <div className="max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                                                        {medSearch.trim() && !commonMedications.some(d => d.toLowerCase() === medSearch.trim().toLowerCase()) && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateMedication(med.id, 'name', medSearch.trim());
                                                                    setActiveMedDropdown(null);
                                                                    setMedSearch('');
                                                                }}
                                                                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors hover:bg-teal-50 hover:text-teal-700 text-teal-600 border border-teal-100 bg-teal-50/30 mb-1 flex items-center gap-2"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" /> Add "{medSearch.trim()}"
                                                            </button>
                                                        )}
                                                        {commonMedications
                                                            .filter(d => d.toLowerCase().includes(medSearch.toLowerCase()))
                                                            .map((d, i) => {
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateMedication(med.id, 'name', d);
                                                                            setActiveMedDropdown(null);
                                                                            setMedSearch('');
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors hover:bg-teal-50 hover:text-teal-700 text-slate-700`}
                                                                    >
                                                                        {d}
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dosage Toggles */}
                                    <div className="w-full relative">
                                        <label className="xl:hidden text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Dosage Timing</label>
                                        <div className="flex flex-nowrap gap-1 w-full items-center h-[44px]">
                                            <label className={`flex-1 xl:flex-none flex items-center justify-center xl:justify-start gap-1 bg-white border border-slate-200 px-2 h-[44px] rounded-lg transition-colors ${isPrescribed ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'}`}>
                                                <input disabled={!isPrescribed} type="checkbox" checked={med.morning} onChange={(e) => updateMedication(med.id, 'morning', e.target.checked)} className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500" />
                                                <span className="text-sm font-bold text-slate-700">Morn</span>
                                            </label>
                                            <label className={`flex-1 xl:flex-none flex items-center justify-center xl:justify-start gap-1 bg-white border border-slate-200 px-2 h-[44px] rounded-lg transition-colors ${isPrescribed ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'}`}>
                                                <input disabled={!isPrescribed} type="checkbox" checked={med.afternoon} onChange={(e) => updateMedication(med.id, 'afternoon', e.target.checked)} className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500" />
                                                <span className="text-sm font-bold text-slate-700">Aft</span>
                                            </label>
                                            <label className={`flex-1 xl:flex-none flex items-center justify-center xl:justify-start gap-1 bg-white border border-slate-200 px-2 h-[44px] rounded-lg transition-colors ${isPrescribed ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'}`}>
                                                <input disabled={!isPrescribed} type="checkbox" checked={med.night} onChange={(e) => updateMedication(med.id, 'night', e.target.checked)} className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500" />
                                                <span className="text-sm font-bold text-slate-700">Night</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Food Timing Toggles */}
                                    <div className="w-full relative">
                                        <label className="xl:hidden text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Food Timing</label>
                                        <div className="flex flex-nowrap gap-1 w-full items-center h-[44px]">
                                            <label className={`flex-1 xl:flex-none flex items-center justify-center xl:justify-start gap-1 bg-white border border-slate-200 px-2 h-[44px] rounded-lg transition-colors ${isPrescribed ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'}`}>
                                                <input disabled={!isPrescribed} type="checkbox" checked={med.beforeFood} onChange={(e) => updateMedication(med.id, 'beforeFood', e.target.checked)} className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500" />
                                                <span className="text-sm font-bold text-slate-700">Before</span>
                                            </label>
                                            <label className={`flex-1 xl:flex-none flex items-center justify-center xl:justify-start gap-1 bg-white border border-slate-200 px-2 h-[44px] rounded-lg transition-colors ${isPrescribed ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'}`}>
                                                <input disabled={!isPrescribed} type="checkbox" checked={med.afterFood} onChange={(e) => updateMedication(med.id, 'afterFood', e.target.checked)} className="w-4 h-4 text-teal-500 rounded border-slate-300 focus:ring-teal-500" />
                                                <span className="text-sm font-bold text-slate-700">After</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Days Input */}
                                    <div className="w-full relative">
                                        <label className="xl:hidden text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 text-center">Duration</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Days"
                                                disabled={!isPrescribed}
                                                value={med.days}
                                                onChange={(e) => updateMedication(med.id, 'days', e.target.value)}
                                                className="w-full bg-white border border-slate-200 text-slate-900 font-bold rounded-lg px-3 h-[44px] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-center"
                                            />
                                        </div>
                                    </div>

                                    {/* Tabs Calculator */}
                                    <div className="w-full relative">
                                        <label className="xl:hidden text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 text-center">Total</label>
                                        <div className={`w-full flex items-center justify-center rounded-lg h-[44px] border ${isPrescribed ? 'bg-teal-50 border-teal-100' : 'bg-slate-100 border-slate-200'}`}>
                                            <span className={`text-sm font-black ${isPrescribed ? 'text-teal-600' : 'text-slate-400'}`}>
                                                {totalTabs > 0 ? `${totalTabs}` : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Permanent Delete Button */}
                                    <div className="w-full xl:w-auto h-[44px]">
                                        <button
                                            onClick={() => handleRemoveMedication(med.id)}
                                            className="w-full md:w-[40px] h-full flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"
                                            title="Delete Row"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 4. Doctor Notes & Follow up */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Private Doctor Note - NOT visible to patient */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100 flex flex-col">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900 leading-tight">Private Doctor Note</h2>
                                <p className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                    Not visible to patient
                                </p>
                            </div>
                        </div>
                        <textarea
                            value={doctorNote}
                            onChange={(e) => setDoctorNote(e.target.value)}
                            placeholder="Personal clinical notes, observations, differential diagnosis..."
                            className="flex-1 w-full bg-amber-50/40 border border-amber-100 text-slate-900 font-medium rounded-xl p-4 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none min-h-[160px] placeholder:text-slate-400 placeholder:font-normal text-sm"
                        ></textarea>
                    </section>

                    {/* Patient-Visible Advice + Follow Up */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-teal-100 flex flex-col gap-5">

                        {/* Patient Advice Note */}
                        <div className="flex flex-col flex-1">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-9 h-9 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-teal-500" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 leading-tight">Patient Advice Note</h2>
                                    <p className="text-xs font-bold text-teal-600 flex items-center gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"></span>
                                        Visible to patient in their Doctor Notes
                                    </p>
                                </div>
                            </div>
                            <textarea
                                value={patientNote}
                                onChange={(e) => setPatientNote(e.target.value)}
                                placeholder="Medication instructions, lifestyle advice, dietary recommendations..."
                                className="flex-1 w-full bg-teal-50/30 border border-teal-100 text-slate-900 font-medium rounded-xl p-4 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none min-h-[100px] placeholder:text-slate-400 placeholder:font-normal text-sm"
                            ></textarea>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Next Follow Up */}
                        {/* Next Follow Up — custom dropdown */}
                        <div ref={followUpRef}>
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-9 h-9 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 leading-tight">Next Follow Up</h2>
                                    <p className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                                        Creates a pending event in patient&apos;s timeline
                                    </p>
                                </div>
                            </div>

                            {/* Custom dropdown trigger */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsFollowUpOpen(!isFollowUpOpen)}
                                    className="w-full flex items-center justify-between bg-purple-50/40 border border-purple-100 hover:border-purple-300 text-slate-900 font-bold rounded-xl px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300"
                                >
                                    <span className={followUp ? 'text-slate-900' : 'text-slate-400 font-normal'}>
                                        {followUp || 'No Follow-up Scheduled'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isFollowUpOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown list */}
                                {isFollowUpOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                        {FOLLOWUP_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => { setFollowUp(opt.value); setIsFollowUpOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${followUp === opt.value
                                                    ? 'bg-purple-50 text-purple-700'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {followUp && followUp !== '' && (
                                <p className="mt-2 text-xs font-bold text-purple-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                                    A follow-up event will be added to the patient&apos;s timeline
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* 5. Lab Reports Upload UI */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
                    <div className="flex items-start gap-3 mb-5">
                        <div className="w-9 h-9 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Upload className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight">Upload Lab Reports</h2>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">Upload PDF reports — they will appear instantly on the patient&apos;s Diagnostics page with hospital name and date</p>
                        </div>
                    </div>

                    {/* Uploaded reports list */}
                    {uploadedReports.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {uploadedReports.map((r, i) => (
                                <div key={i} className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{r.name}</p>
                                        <p className="text-xs text-slate-500">{r.labName} · {r.date}</p>
                                    </div>
                                    <span className="text-xs font-bold text-teal-600 bg-teal-100/70 px-2 py-0.5 rounded-full">Saved</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error message */}
                    {uploadError && (
                        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-semibold text-red-600">{uploadError}</p>
                        </div>
                    )}

                    {/* Upload trigger */}
                    <div className="flex items-center gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed font-bold text-sm cursor-pointer transition-all ${isUploadingLab
                            ? 'border-teal-200 bg-teal-50 text-teal-400 cursor-not-allowed'
                            : 'border-teal-200 bg-teal-50/50 text-teal-600 hover:bg-teal-100 hover:border-teal-400'
                            }`}>
                            {isUploadingLab ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing PDF with AI...</>
                            ) : (
                                <><Upload className="w-4 h-4" /> Select PDF File</>
                            )}
                            <input
                                ref={labFileRef}
                                type="file"
                                accept=".pdf"
                                disabled={isUploadingLab}
                                onChange={handleLabUpload}
                                className="hidden"
                            />
                        </label>
                        {uploadedReports.length > 0 && (
                            <span className="text-xs font-bold text-teal-600">{uploadedReports.length} report{uploadedReports.length > 1 ? 's' : ''} uploaded</span>
                        )}
                    </div>
                    {/* Lab Note */}
                    <div className="mt-4">
                        <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-widest">
                            Lab Note <span className="text-slate-400 font-normal normal-case tracking-normal">(Optional — visible to patient)</span>
                        </label>
                        <textarea
                            rows={2}
                            value={labNote}
                            onChange={(e) => setLabNote(e.target.value)}
                            placeholder='e.g. "We updated the report — please review it by 28 Feb 2026 and follow the dietary advice."​'
                            className="w-full px-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                        />
                        <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-wider">This note will appear on the patient&apos;s timeline alongside the report upload</p>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold mt-2 tracking-wider">PDF will be AI-processed and stored in patient&apos;s records · Report will appear under patient&apos;s Diagnostics</p>
                </section>

                {/* Submit / Finish */}
                <div className="flex justify-center sm:justify-end pt-4">
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={isSaving}
                        className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-white font-black text-base rounded-2xl transition-all duration-300 shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 sm:hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                    >
                        {/* Shine effect */}
                        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                        {isSaving ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Saving Consultation...</>
                        ) : (
                            <><Save className="w-5 h-5" /> Save &amp; Complete Consultation</>
                        )}
                    </button>
                </div>

            </main>

            {/* ── Save Confirmation Modal ── */}
            {showConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setShowConfirm(false)}
                >
                    <div
                        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm mx-auto overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag handle — mobile only */}
                        <div className="flex justify-center pt-3 pb-0 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        {/* Icon + Message */}
                        <div className="flex flex-col items-center text-center px-6 pt-6 pb-5">
                            <div className="w-14 h-14 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center mb-4">
                                <ShieldCheck className="w-7 h-7 text-teal-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Save Consultation?</h3>
                            <p className="text-sm font-semibold text-slate-500 mt-1.5 leading-relaxed max-w-xs">
                                This will permanently save the consultation for <span className="text-slate-800 font-black">{patient.name}</span>. You can still edit individual records later.
                            </p>
                        </div>

                        {/* Buttons — always side by side */}
                        <div className="px-5 pb-8 sm:pb-6 flex flex-row gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-4 py-3.5 text-sm font-black text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); handleSubmit(); }}
                                disabled={isSaving}
                                className="flex-1 px-4 py-3.5 text-sm font-black text-white bg-gradient-to-r from-teal-600 to-teal-500 active:from-teal-700 active:to-teal-600 rounded-xl shadow-md shadow-teal-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" />
                                Yes, Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
