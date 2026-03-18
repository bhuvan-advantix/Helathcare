'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, UserPlus, Stethoscope, LogOut, ChevronRight,
    Activity, Thermometer, Weight, Ruler, Heart, Wind,
    User, Phone, Droplets, Calendar, Pill, CheckCircle2,
    X, RefreshCw, ClipboardList, AlertCircle, Building2, Plus,
    BarChart3, Clock, ArrowRight, Hash, Users, ChevronDown,
    CheckCheck, SkipForward, Trash2, UserCheck, Clipboard,
    FlaskConical, Syringe, BadgeCheck
} from 'lucide-react';
import {
    searchPatientByIdOrName, registerWalkInPatient,
    getPatientForStaff, recordPatientVitals, staffLogout,
    createAppointmentForPatient, getStaffAppointmentStats,
    getAvailableDoctors, getTodayQueue,
    updateQueueTokenStatus, deleteQueueToken
} from '@/app/actions/staff';
import { getLabOrdersForPatient, markLabOrdersPaid } from '@/app/actions/labOrders';

interface StaffData { staffName: string; hospitalName: string | null; }

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
        <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm font-bold text-slate-800">{value}</span>
        </div>
    );
};

const VitalInput = ({ id, label, placeholder, icon: Icon, value, onChange }: {
    id: string; label: string; placeholder: string;
    icon: React.ElementType; value: string; onChange: (v: string) => void;
}) => (
    <div>
        <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
        <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input id={id} type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors" />
        </div>
    </div>
);

const FormField = ({ id, label, type = 'text', placeholder, value, onChange }: any) => (
    <div>
        <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
        <input id={id} type={type} placeholder={placeholder} value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors" />
    </div>
);

const FormSelect = ({ id, label, value, onChange, options, placeholder = 'Select' }: any) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div ref={ref} className="relative">
            <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
            <button id={id} type="button" onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-colors bg-white ${open ? 'border-teal-500' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>{value || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {options.map((o: string) => (
                        <button key={o} type="button"
                            onClick={() => { onChange(o); setOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors ${value === o ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-700'}`}>
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const PatientResultCard = ({ patient, onSelect }: { patient: any; onSelect: () => void }) => (
    <button onClick={onSelect}
        className="w-full flex items-center gap-4 p-4 bg-white border-2 border-slate-100 hover:border-teal-300 hover:bg-teal-50/30 rounded-2xl transition-all text-left group">
        <div className="w-11 h-11 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {patient.userImage ? <img src={patient.userImage} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-teal-600" />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 text-sm">{patient.userName}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
                {patient.customId}{patient.gender ? ` • ${patient.gender}` : ''}{patient.age ? ` • Age ${patient.age}` : ''}{patient.bloodGroup ? ` • ${patient.bloodGroup}` : ''}
            </p>
            {patient.phoneNumber && <p className="text-xs text-slate-400 mt-0.5">{patient.phoneNumber}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 flex-shrink-0 transition-colors" />
    </button>
);

// ─── Full Onboarding Register Modal ──────────────────────────────────────────
const RegisterModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string, pw: string, email: string, name: string) => void }) => {
    const emptyForm = {
        name: '', email: '', phone: '', gender: '', dateOfBirth: '', age: '',
        bloodGroup: '', maritalStatus: '', address: '', city: '',
        emergencyContactName: '', emergencyContactPhone: '',
        allergies: '', chronicConditions: ''
    };
    const [form, setForm] = useState(emptyForm);
    const [step, setStep] = useState(1); // 1 = required, 2 = medical, 3 = emergency
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

    const handleNext = () => {
        if (step === 1) {
            if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
                setError('Full name, email, and phone number are required.'); return;
            }
        }
        setError('');
        setStep(s => Math.min(s + 1, 3));
    };

    const handleSubmit = () => {
        setError('');
        startTransition(async () => {
            const r = await registerWalkInPatient(form);
            if (r.success && r.customId && r.tempPassword) {
                onSuccess(r.customId, r.tempPassword, r.patientEmail || form.email, form.name);
            } else {
                setError(r.error ?? 'Registration failed. Try again.');
                setStep(1);
            }
        });
    };

    const stepTitles = ['Personal Info', 'Medical Details', 'Emergency & Notes'];
    const genderOpts = ['Male', 'Female', 'Other'];
    const bgOpts = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    const maritalOpts = ['Single', 'Married', 'Divorced', 'Widowed'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Register New Patient</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Step {step} of 3 — {stepTitles[step - 1]}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                </div>

                {/* Step Progress */}
                <div className="px-5 pt-4 shrink-0">
                    <div className="flex gap-1.5">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-teal-600' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    {step === 1 && (
                        <>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required</p>
                            <FormField id="reg-name" label="Full Name" placeholder="Patient full name" value={form.name} onChange={(v: string) => set('name', v)} />
                            <FormField id="reg-email" label="Email Address" type="email" placeholder="patient@email.com" value={form.email} onChange={(v: string) => set('email', v)} />
                            <FormField id="reg-phone" label="Phone Number" type="tel" placeholder="+91 99999 99999" value={form.phone} onChange={(v: string) => set('phone', v)} />

                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Personal Details</p>
                            <div className="grid grid-cols-2 gap-3">
                                <FormSelect id="reg-gender" label="Gender" value={form.gender} onChange={(v: string) => set('gender', v)} options={genderOpts} />
                                <FormSelect id="reg-marital" label="Marital Status" value={form.maritalStatus} onChange={(v: string) => set('maritalStatus', v)} options={maritalOpts} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField id="reg-dob" label="Date of Birth" type="date" placeholder="" value={form.dateOfBirth} onChange={(v: string) => set('dateOfBirth', v)} />
                                <FormField id="reg-age" label="Age" type="number" placeholder="e.g. 35" value={form.age} onChange={(v: string) => set('age', v)} />
                            </div>
                            <FormField id="reg-address" label="Address" placeholder="Street address" value={form.address} onChange={(v: string) => set('address', v)} />
                            <FormField id="reg-city" label="City" placeholder="City / Town" value={form.city} onChange={(v: string) => set('city', v)} />
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Information</p>
                            <FormSelect id="reg-blood" label="Blood Group" value={form.bloodGroup} onChange={(v: string) => set('bloodGroup', v)} options={bgOpts} />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Known Allergies</label>
                                <textarea id="reg-allergies" rows={2} placeholder="e.g. Penicillin, Dust, Latex (comma separated)"
                                    value={form.allergies} onChange={e => set('allergies', e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Chronic Conditions</label>
                                <textarea id="reg-conditions" rows={2} placeholder="e.g. Diabetes, Hypertension (comma separated)"
                                    value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors resize-none" />
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact</p>
                            <FormField id="reg-ec-name" label="Contact Person Name" placeholder="e.g. Ravi Kumar" value={form.emergencyContactName} onChange={(v: string) => set('emergencyContactName', v)} />
                            <FormField id="reg-ec-phone" label="Contact Phone Number" type="tel" placeholder="+91 99999 99999" value={form.emergencyContactPhone} onChange={(v: string) => set('emergencyContactPhone', v)} />

                            <div className="mt-4 bg-teal-50 border border-teal-200 rounded-2xl p-4">
                                <p className="text-xs font-black text-teal-700 mb-2">Registration Summary</p>
                                <div className="space-y-1.5 text-xs text-teal-600 font-medium">
                                    <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> <strong>{form.name}</strong> ({form.gender || 'Gender not specified'})</p>
                                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {form.email}</p>
                                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {form.phone}</p>
                                    {form.address && <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {form.address}{form.city ? `, ${form.city}` : ''}</p>}
                                    {form.bloodGroup && <p className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Blood Group: {form.bloodGroup}</p>}
                                    {form.allergies && <p className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Allergies: {form.allergies}</p>}
                                </div>
                                <p className="text-[10px] text-teal-500 font-bold mt-3">A unique Patient ID and temporary password will be auto-generated and shown after registration.</p>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 text-sm font-bold">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0">
                    <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                        className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
                        {step > 1 ? '← Back' : 'Cancel'}
                    </button>
                    {step < 3 ? (
                        <button type="button" onClick={handleNext}
                            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl transition-colors shadow-lg shadow-teal-200">
                            Next →
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={isPending}
                            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl transition-colors shadow-lg shadow-teal-200 disabled:opacity-60">
                            {isPending ? 'Registering...' : 'Register Patient'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Credentials Modal ────────────────────────────────────────────────────────
const CredentialsModal = ({ customId, password, patientEmail, patientName, onClose }: {
    customId: string; password: string; patientEmail: string; patientName: string; onClose: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-8 text-center">
            <div className="w-14 h-14 bg-teal-50 border-2 border-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-teal-600" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-1">Patient Registered!</h2>
            <p className="text-sm text-slate-500 font-medium mb-5">Share these login credentials with <strong>{patientName}</strong></p>

            <div className="space-y-3 text-left mb-5">
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Login Email</p>
                    <p className="text-sm font-black text-slate-800 font-mono">{patientEmail}</p>
                </div>
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient ID</p>
                    <p className="text-xl font-black text-teal-700 tracking-wider">{customId}</p>
                </div>
                <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Temporary Password</p>
                    <p className="text-xl font-black text-teal-800 tracking-wider font-mono">{password}</p>
                </div>
            </div>

            <p className="text-xs text-slate-400 font-medium mb-5">Patient must change the password after first login. They can log in at the patient portal using their email and the password above.</p>
            <button id="creds-close-btn" onClick={onClose}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-sm transition-colors">
                Done
            </button>
        </div>
    </div>
);

// ─── Create Appointment Modal ─────────────────────────────────────────────────
const AppointmentModal = ({ patient, staffHospital, onClose, onSuccess }: {
    patient: any; staffHospital: string | null; onClose: () => void; onSuccess: () => void;
}) => {
    // Compute today client-side only to avoid SSR hydration mismatch (React error #418)
    const [today, setToday] = useState('');
    const [form, setForm] = useState({
        appointmentDate: '', appointmentTime: '', appointmentType: 'Consultation',
        hospitalName: staffHospital || '', doctorName: '', notes: '',
    });
    useEffect(() => {
        const t = new Date().toISOString().split('T')[0];
        setToday(t);
        setForm(f => ({ ...f, appointmentDate: t }));
    }, []);
    const [availDoctors, setAvailDoctors] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        getAvailableDoctors().then(r => { if (r.success && r.doctors) setAvailDoctors(r.doctors); });
    }, []);

    const selectedDoc = availDoctors.find(d => d.name === form.doctorName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.appointmentDate || !form.hospitalName.trim()) { setError('Date and hospital are required.'); return; }
        if (!form.appointmentTime) { setError('Please select an appointment time.'); return; }
        setError('');
        const typeLabel = form.appointmentType === 'Follow-up' ? 'Follow-up' : form.appointmentType;
        const docPart = form.doctorName ? ` — ${form.doctorName}` : '';
        const title = `${typeLabel}${docPart}`;
        startTransition(async () => {
            const r = await createAppointmentForPatient({
                patientUserId: patient.userId, patientId: patient.id, title,
                appointmentDate: form.appointmentDate, appointmentTime: form.appointmentTime,
                hospitalName: form.hospitalName, doctorName: form.doctorName || undefined,
                notes: form.notes, appointmentType: form.appointmentType,
            });
            if (r.success) onSuccess();
            else setError(r.error ?? 'Failed.');
        });
    };

    const apptTypes = ['Consultation', 'Follow-up', 'Lab Test', 'Vaccination', 'Surgery', 'Emergency'];
    const morningSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const afternoonSlots = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
    const eveningSlots = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];

    // Determine available slots based on doctor's hospitalTiming
    let timeSlots: string[] = [...morningSlots, ...afternoonSlots, ...eveningSlots];
    if (selectedDoc?.hospitalTiming) {
        const t = selectedDoc.hospitalTiming.toLowerCase();
        if (t.includes('morning') && !t.includes('evening')) timeSlots = morningSlots;
        else if (t.includes('evening') && !t.includes('morning')) timeSlots = [...afternoonSlots, ...eveningSlots];
        else if (t.includes('afternoon')) timeSlots = [...afternoonSlots, ...eveningSlots];
    }

    const docOptions = availDoctors.map(d => `${d.name}${d.specialization ? ` (${d.specialization})` : ''}`);
    const fmt12 = (t: string) => { const [h, m] = t.split(':').map(Number); const am = h < 12; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`; };

    // Disable past time slots when today is selected
    const isSlotDisabled = (slot: string): boolean => {
        if (form.appointmentDate !== today) return false;
        const [h, m] = slot.split(':').map(Number);
        const now = new Date();
        const curMins = now.getHours() * 60 + now.getMinutes();
        return h * 60 + m <= curMins;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div><h2 className="text-lg font-black text-slate-900">Schedule Appointment</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">For: <strong>{patient?.name || 'Patient'}</strong></p></div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                    <FormSelect id="appt-type" label="Appointment Type" value={form.appointmentType} onChange={(v: string) => set('appointmentType', v)} options={apptTypes} />
                    <FormField id="appt-date" label="Appointment Date *" type="date" placeholder="" value={form.appointmentDate} onChange={(v: string) => set('appointmentDate', v)} />
                    {/* Doctor Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Doctor</label>
                        <FormSelect id="appt-doctor" label="" value={form.doctorName} onChange={(v: string) => { set('doctorName', v.split(' (')[0]); set('appointmentTime', ''); }} options={docOptions} placeholder="Choose a doctor (optional)" />
                        {selectedDoc && (<p className="text-xs text-teal-600 font-bold mt-1.5 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Timing: {selectedDoc.hospitalTiming || 'Flexible'} {selectedDoc.workingDays ? `• ${selectedDoc.workingDays}` : ''}</p>)}
                    </div>
                    {/* Time Slots */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Appointment Time *</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {timeSlots.map(slot => {
                                const disabled = isSlotDisabled(slot);
                                return (
                                    <button key={slot} type="button"
                                        disabled={disabled}
                                        onClick={() => !disabled && set('appointmentTime', slot)}
                                        className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${disabled ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-100' :
                                            form.appointmentTime === slot ? 'bg-teal-600 text-white border-teal-600' :
                                                'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-600'}`}>
                                        {fmt12(slot)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <FormField id="appt-hospital" label="Hospital / Clinic *" placeholder="e.g. Bhuvan Hospital" value={form.hospitalName} onChange={(v: string) => set('hospitalName', v)} />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notes (Optional)</label>
                        <textarea id="appt-notes" rows={2} placeholder="Special instructions..." value={form.notes} onChange={e => set('notes', e.target.value)}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors resize-none" />
                    </div>
                    {error && <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-red-700 text-sm font-bold">{error}</p></div>}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isPending} className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl shadow-lg shadow-teal-200 disabled:opacity-60">
                            {isPending ? 'Scheduling...' : 'Schedule Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Lab Orders Panel (Staff) ─────────────────────────────────────────────────
const LabOrdersPanel = ({ patientId, staffName }: { patientId: string; staffName: string }) => {
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
        const paidBy = staffName || 'Staff';
        startTransition(async () => {
            const r = await markLabOrdersPaid([...selected], paidBy);
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

    if (loading) return (
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="w-5 h-5 text-blue-500" />
                <h3 className="font-black text-slate-900">Lab Orders</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading lab orders...
            </div>
        </div>
    );

    if (orders.length === 0) return (
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-slate-900">Lab Orders</h3>
            </div>
            <p className="text-sm text-slate-400 font-medium">No lab tests or injections ordered for this patient yet.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-blue-500" />
                    Lab Orders &amp; Injections
                </h3>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {pending.length} Pending
                </span>
            </div>

            {/* Pending items with checkboxes */}
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
                                    <p className="text-[10px] text-slate-400 font-medium">{o.type === 'injection' ? 'Injection' : 'Lab Test'} · Ordered by {o.doctorName || 'Doctor'}</p>
                                </div>
                            </div>
                        </label>
                    ))}

                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                    {paidSuccess && (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-bold">
                            <BadgeCheck className="w-4 h-4" /> Marked as Paid!
                        </div>
                    )}

                    <button onClick={handleMarkPaid} disabled={isPending || selected.size === 0}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                        <BadgeCheck className="w-4 h-4" />
                        {isPending ? 'Updating...' : `Mark ${selected.size > 0 ? selected.size : ''} Selected as Paid`}
                    </button>
                </div>
            )}

            {/* Already paid items */}
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
        </div>
    );
};

// ─── Patient Detail Panel ─────────────────────────────────────────────────────
const PatientDetailPanel = ({ data, onBack, onAppointmentCreated }: { data: any; onBack: () => void; onAppointmentCreated: () => void }) => {
    const [vitals, setVitals] = useState({ bloodPressure: '', temperature: '', weight: '', height: '', pulseRate: '', spO2: '', notes: '', recordedByName: '' });
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const [showApptModal, setShowApptModal] = useState(false);
    const [apptSuccess, setApptSuccess] = useState(false);

    const { patient, user, vitals: pastVitals, medications, appointments, staffHospital } = data;
    const latest = pastVitals?.[0];

    const handleSaveVitals = () => {
        if (!vitals.recordedByName.trim()) { setError('Please enter the staff name recording these vitals.'); return; }
        const hasVital = ['bloodPressure', 'temperature', 'weight', 'height', 'pulseRate', 'spO2'].some(k => (vitals as any)[k].trim() !== '');
        if (!hasVital) { setError('Please enter at least one vital measurement.'); return; }
        setError('');
        startTransition(async () => {
            const r = await recordPatientVitals(patient.id, vitals);
            if (r.success) {
                setSaved(true);
                setVitals({ bloodPressure: '', temperature: '', weight: '', height: '', pulseRate: '', spO2: '', notes: '', recordedByName: '' });
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(r.error ?? 'Failed to save vitals.');
            }
        });
    };

    return (
        <div className="space-y-5">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />Back to Search
            </button>

            {/* Patient Identity */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user?.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-teal-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-black text-slate-900">{user?.name}</h2>
                        <p className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full inline-block mt-1">{user?.customId}</p>
                    </div>
                    <button onClick={() => setShowApptModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-xs font-black rounded-xl hover:bg-teal-700 transition-colors shadow-md shadow-teal-100">
                        <Plus className="w-3.5 h-3.5" /> Book Appt.
                    </button>
                </div>
                <div className="mt-4 bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                    <InfoRow label="Gender" value={patient.gender} />
                    <InfoRow label="Age" value={patient.age ? `${patient.age} years` : null} />
                    <InfoRow label="Blood Group" value={patient.bloodGroup} />
                    <InfoRow label="Phone" value={patient.phoneNumber} />
                    <InfoRow label="Address" value={patient.address ? `${patient.address}${patient.city ? `, ${patient.city}` : ''}` : null} />
                    <InfoRow label="Emergency" value={patient.emergencyContactName ? `${patient.emergencyContactName} — ${patient.emergencyContactPhone || ''}` : null} />
                    <InfoRow label="Allergies" value={patient.allergies} />
                    <InfoRow label="Conditions" value={patient.chronicConditions} />
                </div>
            </div>

            {/* Appointment Success Banner */}
            {apptSuccess && (
                <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <p className="text-blue-700 text-sm font-bold">Appointment scheduled! The patient can see it in their portal.</p>
                </div>
            )}

            {/* Latest Vitals (if any) */}
            {latest && (
                <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Last Recorded Vitals</p>
                    <p className="text-[10px] text-slate-400 font-semibold mb-3">
                        By <span className="font-black text-slate-600">{latest.recordedBy || 'Staff'}</span> on {latest.recordedAt ? new Date(latest.recordedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as any) : ''}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'BP', value: latest.bloodPressure, unit: 'mmHg' },
                            { label: 'Temp', value: latest.temperature, unit: '' },
                            { label: 'Weight', value: latest.weight, unit: '' },
                            { label: 'Height', value: latest.height, unit: '' },
                            { label: 'Pulse', value: latest.pulseRate, unit: 'bpm' },
                            { label: 'SpO2', value: latest.spO2, unit: '' },
                        ].filter(v => v.value).map(v => (
                            <div key={v.label} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.label}</p>
                                <p className="text-base font-black text-slate-900 mt-0.5">{v.value} <span className="text-xs font-medium text-slate-400">{v.unit}</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Record New Vitals */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />Record Vitals
                </h3>
                {/* Recorder Name — Mandatory */}
                <div className="mb-4 p-3 bg-teal-50 border-2 border-teal-200 rounded-xl">
                    <label className="block text-xs font-bold text-teal-700 uppercase tracking-wide mb-1.5">Recorded By (Staff Name) *</label>
                    <input type="text" placeholder="Enter your name" value={vitals.recordedByName}
                        onChange={e => setVitals(s => ({ ...s, recordedByName: e.target.value }))}
                        className="w-full border-2 border-teal-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-600 bg-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <VitalInput id="v-bp" label="Blood Pressure" placeholder="e.g. 120/80" icon={Heart} value={vitals.bloodPressure} onChange={v => setVitals(s => ({ ...s, bloodPressure: v }))} />
                    <VitalInput id="v-temp" label="Temperature" placeholder="e.g. 98.6°F" icon={Thermometer} value={vitals.temperature} onChange={v => setVitals(s => ({ ...s, temperature: v }))} />
                    <VitalInput id="v-weight" label="Weight" placeholder="e.g. 65 kg" icon={Weight} value={vitals.weight} onChange={v => setVitals(s => ({ ...s, weight: v }))} />
                    <VitalInput id="v-height" label="Height" placeholder="e.g. 170 cm" icon={Ruler} value={vitals.height} onChange={v => setVitals(s => ({ ...s, height: v }))} />
                    <VitalInput id="v-pulse" label="Pulse Rate" placeholder="e.g. 72 bpm" icon={Activity} value={vitals.pulseRate} onChange={v => setVitals(s => ({ ...s, pulseRate: v }))} />
                    <VitalInput id="v-spo2" label="SpO2" placeholder="e.g. 98%" icon={Wind} value={vitals.spO2} onChange={v => setVitals(s => ({ ...s, spO2: v }))} />
                </div>
                <div className="mt-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Notes (Optional)</label>
                    <textarea id="v-notes" placeholder="Any observations or notes..." value={vitals.notes}
                        onChange={e => setVitals(s => ({ ...s, notes: e.target.value }))} rows={2}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors resize-none" />
                </div>
                {error && <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 mt-3"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-red-700 text-sm font-bold">{error}</p></div>}
                {saved && <div className="flex items-center gap-2 bg-teal-50 border-2 border-teal-200 rounded-xl px-4 py-3 mt-3"><CheckCircle2 className="w-4 h-4 text-teal-600" /><p className="text-teal-700 text-sm font-bold">Vitals saved successfully</p></div>}
                <button id="save-vitals-btn" onClick={handleSaveVitals} disabled={isPending}
                    className="w-full mt-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl transition-colors shadow-lg shadow-teal-200 disabled:opacity-60">
                    {isPending ? 'Saving...' : 'Save Vitals'}
                </button>
            </div>

            {/* Active Medications */}
            {medications && medications.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Pill className="w-5 h-5 text-violet-500" />Active Medications</h3>
                    <div className="space-y-2">
                        {medications.map((med: any) => (
                            <div key={med.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-violet-100"><Pill className="w-4 h-4 text-violet-600" /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 text-sm">{med.name}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {[med.dosage, med.frequency].filter(Boolean).join(' • ')}
                                        {med.addedBy && <span className="text-teal-600"> — {med.addedBy}</span>}
                                    </p>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 whitespace-nowrap">{med.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Appointments */}
            {appointments && appointments.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-slate-100 p-5">
                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" />Appointments</h3>
                    <div className="space-y-2">
                        {appointments.map((appt: any) => {
                            // Extract hospital from description
                            const hospitalMatch = (appt.description || '').match(/Hospital:\s*(.+)/);
                            const hospital = hospitalMatch ? hospitalMatch[1].trim() : null;
                            return (
                                <div key={appt.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-100"><Calendar className="w-4 h-4 text-blue-600" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-900 text-sm">{appt.title}</p>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            {new Date(appt.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                        {hospital && <p className="text-[10px] text-teal-600 font-bold mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> {hospital}</p>}
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${appt.status === 'completed' ? 'bg-teal-50 text-teal-700 border-teal-100' : appt.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                        {appt.status || 'Pending'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {showApptModal && (
                <AppointmentModal
                    patient={{ ...patient, name: user?.name, userId: patient.userId }}
                    staffHospital={staffHospital}
                    onClose={() => setShowApptModal(false)}
                    onSuccess={() => {
                        setShowApptModal(false);
                        setApptSuccess(true);
                        onAppointmentCreated();
                        setTimeout(() => setApptSuccess(false), 5000);
                    }}
                />
            )}

            {/* Lab Orders & Injections — staff only */}
            <LabOrdersPanel patientId={patient.id} staffName={vitals.recordedByName || 'Staff'} />

        </div>
    );
};

// ─── Stats Card ───────────────────────────────────────────────────────────────
const StatsCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
    <div className={`rounded-xl p-3 border ${color}`}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">{label}</p>
        <p className="text-2xl font-black mt-1">{value}</p>
    </div>
);

// ─── Token Queue Page (auto from today's appointments) ────────────────────────
const QueuePage = ({ staff }: { staff: StaffData }) => {
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayLabel, setTodayLabel] = useState('');
    const [isPending, startTransition] = useTransition();

    // Resolve date client-side only to avoid hydration mismatch
    useEffect(() => {
        setTodayLabel(new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
        refresh();
    }, []);

    const refresh = async () => {
        setLoading(true);
        const r = await getTodayQueue();
        if (r.success && r.queue) setQueue(r.queue);
        setLoading(false);
    };

    // Call In → DONE directly (no in_progress step)
    const markDone = (id: string) => startTransition(async () => {
        await updateQueueTokenStatus(id, 'done');
        await refresh();
    });

    const handleDelete = (id: string) => startTransition(async () => {
        await deleteQueueToken(id);
        await refresh();
    });

    const waiting = queue.filter(t => t.status === 'waiting');
    const done = queue.filter(t => t.status === 'done');
    const nextToken = waiting[0];

    const fmt12 = (t: string | null) => {
        if (!t) return '';
        const m = /^(\d{1,2}):(\d{2})$/.exec(t);
        if (!m) return t;
        let h = parseInt(m[1]); const min = m[2];
        const am = h < 12; if (h === 0) h = 12; else if (h > 12) h -= 12;
        return `${h}:${min} ${am ? 'AM' : 'PM'}`;
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Token Queue</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5" suppressHydrationWarning>
                        Auto-generated from today’s appointments{todayLabel ? ` — ${todayLabel}` : ''}
                    </p>
                </div>
                <button onClick={refresh} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-600 border-2 border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Stats — 2 states only: Waiting + Done */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-amber-800">{waiting.length}</p>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mt-1">Waiting</p>
                </div>
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-700">{done.length}</p>
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">Done</p>
                </div>
            </div>

            {/* Next Patient Banner — clicks Call In = marked Done immediately */}
            {nextToken && (
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg shadow-teal-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-200 mb-2">Next Patient — Click to Mark Done</p>
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-3xl font-black">Token #{nextToken.tokenNumber}</p>
                            <p className="text-xl font-bold mt-0.5 truncate">{nextToken.patientName}</p>
                            {nextToken.customId && <p className="text-sm text-teal-200 font-bold">{nextToken.customId}</p>}
                            <div className="flex gap-3 mt-1 flex-wrap">
                                {nextToken.appointmentTime && <span className="text-sm text-teal-100 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmt12(nextToken.appointmentTime)}</span>}
                                {nextToken.doctor && <span className="text-sm text-teal-100">{nextToken.doctor}</span>}
                                {nextToken.type && <span className="text-sm text-teal-100">{nextToken.type}</span>}
                            </div>
                        </div>
                        <button onClick={() => markDone(nextToken.id)}
                            className="flex flex-col items-center gap-1.5 px-5 py-3.5 bg-white text-teal-700 font-black text-sm rounded-2xl flex-shrink-0 shadow-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                            <CheckCheck className="w-5 h-5" />
                            <span>Done</span>
                        </button>
                    </div>
                </div>
            )}

            {!nextToken && !loading && queue.length > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
                    <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-black text-emerald-800">All patients done!</p>
                    <p className="text-sm text-emerald-600 mt-1">Great work today — {done.length} patient{done.length !== 1 ? 's' : ''} seen.</p>
                </div>
            )}

            {/* Full list */}
            {loading ? (
                <div className="text-center py-10">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold">Loading queue...</p>
                </div>
            ) : queue.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-black text-slate-500">No appointments today</p>
                    <p className="text-xs text-slate-400 mt-1">Book appointments via Patient Lookup → Book Appt.</p>
                </div>
            ) : (
                <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            All Tokens — {queue.length} patient{queue.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {[...waiting, ...done].map(token => (
                        <div key={token.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${token.status === 'done' ? 'opacity-45 bg-white' : 'bg-white hover:bg-slate-50/50'
                                }`}>
                            {/* Token badge */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black ${token.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'
                                }`}>
                                {token.tokenNumber}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-black text-slate-900 text-sm">{token.patientName}</p>
                                    {token.customId && (
                                        <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100">
                                            {token.customId}
                                        </span>
                                    )}
                                    {token.status === 'done' && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5">
                                            <CheckCheck className="w-2.5 h-2.5" /> Done
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-3 mt-0.5">
                                    {token.appointmentTime && (
                                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                            <Clock className="w-3 h-3" />{fmt12(token.appointmentTime)}
                                        </span>
                                    )}
                                    {token.doctor && <span className="text-xs text-slate-400">{token.doctor}</span>}
                                    {token.type && <span className="text-xs text-slate-400">{token.type}</span>}
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {token.status === 'waiting' && (
                                    <button onClick={() => markDone(token.id)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-black bg-teal-600 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                                        <CheckCheck className="w-3.5 h-3.5" /> Done
                                    </button>
                                )}
                                {token.status !== 'done' && (
                                    <button onClick={() => handleDelete(token.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="No-show (remove)">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// ─── Appointments Page ────────────────────────────────────────────────────────
const AppointmentsPage = ({ loadStats, stats, loadingStats }: { loadStats: () => void; stats: any; loadingStats: boolean }) => {
    const [filter, setFilter] = useState<'today' | 'upcoming' | 'past' | 'all'>('today');

    // Auto-load if not already loaded
    useEffect(() => { if (!stats && !loadingStats) loadStats(); }, []);

    const fmt12 = (t: string | null) => {
        if (!t) return '';
        const m = /^(\d{1,2}):(\d{2})$/.exec(t);
        if (!m) return t;
        let h = parseInt(m[1]); const min = m[2];
        const am = h < 12; if (h === 0) h = 12; else if (h > 12) h -= 12;
        return `${h}:${min} ${am ? 'AM' : 'PM'}`;
    };
    const fmtDate = (d: string) => {
        if (!d) return '';
        try { return new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return d; }
    };

    const todayStr = stats?.todayStr ?? '';
    const all: any[] = stats?.allAppointments ?? [];
    const todayList = all.filter(a => a.dateOnly === todayStr);
    const upcomingList = all.filter(a => a.dateOnly > todayStr);
    const pastList = all.filter(a => a.dateOnly < todayStr);

    const filteredList =
        filter === 'today' ? todayList :
            filter === 'upcoming' ? upcomingList :
                filter === 'past' ? pastList : all;

    const filterTabs = [
        { id: 'today', label: 'Today', count: todayList.length, color: 'teal' },
        { id: 'upcoming', label: 'Upcoming', count: upcomingList.length, color: 'blue' },
        { id: 'past', label: 'Past', count: pastList.length, color: 'slate' },
        { id: 'all', label: 'All', count: all.length, color: 'slate' },
    ] as const;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900">Appointments</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">{todayStr ? fmtDate(todayStr) : 'Loading...'}</p>
                </div>
                <button onClick={loadStats} className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-600 border-2 border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Summary Cards */}
            {stats && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-teal-800">{stats.todayTotal}</p>
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-0.5">Today</p>
                    </div>
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-amber-800">{stats.todayFollowUps}</p>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-0.5">Follow-ups</p>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-black text-blue-800">{stats.todayNew}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">New</p>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {filterTabs.map(tab => (
                    <button key={tab.id} onClick={() => setFilter(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${filter === tab.id
                            ? tab.id === 'today' ? 'bg-teal-600 text-white border-teal-600'
                                : tab.id === 'upcoming' ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}>
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* List */}
            {loadingStats ? (
                <div className="bg-white rounded-2xl border-2 border-slate-100 p-10 text-center">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400">Loading appointments...</p>
                </div>
            ) : !stats ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-slate-400 text-sm">Click refresh to load</p>
                    <button onClick={loadStats} className="mt-4 px-5 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl">Load</button>
                </div>
            ) : filteredList.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-slate-400 text-sm">No {filter === 'all' ? '' : filter} appointments</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
                    {filteredList.map((a, idx) => {
                        const isToday = a.dateOnly === todayStr;
                        return (
                            <div key={a.id} className={`flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 transition-colors ${isToday ? 'bg-teal-50/40 hover:bg-teal-50/70' : 'hover:bg-slate-50/60'}`}>
                                {/* Time */}
                                <div className={`w-16 flex-shrink-0 text-center rounded-xl py-1.5 ${isToday ? 'bg-teal-100' : 'bg-slate-50'}`}>
                                    <p className={`text-sm font-black leading-tight ${isToday ? 'text-teal-800' : 'text-slate-600'}`}>
                                        {a.appointmentTime ? fmt12(a.appointmentTime) : '—'}
                                    </p>
                                    {isToday && <p className="text-[9px] font-black text-teal-500 uppercase">Today</p>}
                                </div>
                                {/* Patient */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-black text-slate-900 text-sm">{a.patientName}</p>
                                        {a.customId && <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100">{a.customId}</span>}
                                    </div>
                                    <div className="flex items-center flex-wrap gap-x-2 mt-0.5">
                                        <span className="text-xs text-slate-500">{a.appointmentType || 'Consultation'}</span>
                                        {a.doctorName && <span className="text-xs text-teal-600 font-bold">· {a.doctorName}</span>}
                                    </div>
                                </div>
                                {/* Date + Status */}
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-[10px] text-slate-400 font-medium">{fmtDate(a.dateOnly)}</p>
                                    <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${a.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        a.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-100' :
                                            'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                        {a.status === 'completed' ? 'Done' : a.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function StaffDashboard({ staff }: { staff: StaffData }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'search' | 'register' | 'stats' | 'queue'>('search');
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [creds, setCreds] = useState<{ customId: string; password: string; patientEmail: string; patientName: string } | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        const r = await searchPatientByIdOrName(query);
        setSearchResults(r.patients ?? []);
        setSearching(false);
    };

    const handleSelectPatient = (patient: any) => {
        startTransition(async () => {
            const r = await getPatientForStaff(patient.id);
            if (r.success && r.data) setSelectedPatient(r.data);
        });
    };

    const handleLogout = () => startTransition(async () => {
        await staffLogout();
        router.push('/staff');
    });

    const loadStats = async () => {
        setLoadingStats(true);
        const r = await getStaffAppointmentStats();
        if (r.success) setStats(r.data);
        setLoadingStats(false);
    };

    const tabs = [
        { id: 'search', label: 'Patient Lookup', icon: Search },
        { id: 'register', label: 'Register Walk-in', icon: UserPlus },
        { id: 'queue', label: 'Token Queue', icon: Hash },
        { id: 'stats', label: 'Appointments', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-[#F7F9FA]">
            <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm"><Stethoscope className="w-5 h-5 text-white" /></div>
                        <div>
                            <p className="text-sm font-black text-slate-900 leading-none">{staff.staffName}</p>
                            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{staff.hospitalName ?? 'Staff Portal'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.refresh()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
                        <button id="staff-logout-btn" onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl">
                            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b-2 border-slate-100 sticky top-16 z-20">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex gap-1 py-1">
                        {tabs.map(tab => (
                            <button key={tab.id} id={`tab-${tab.id}`}
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    setSelectedPatient(null); setSearchResults(null); setQuery('');
                                    if (tab.id === 'stats') loadStats();
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all border-2 ${activeTab === tab.id ? 'bg-teal-50 text-teal-700 border-teal-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent'}`}>
                                <tab.icon className="w-4 h-4" />{tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-6">

                {/* ── Patient Lookup ── */}
                {activeTab === 'search' && (
                    <div className="space-y-5">
                        {!selectedPatient ? (
                            <>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">Patient Lookup</h2>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">Search by name, patient ID, email, or phone number</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1" suppressHydrationWarning>
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input id="patient-search" type="text" placeholder="Name, ID, email, or phone..."
                                            suppressHydrationWarning
                                            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                            className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 transition-colors" />
                                    </div>
                                    <button id="search-btn" onClick={handleSearch} disabled={searching || !query.trim()}
                                        className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-2xl transition-colors shadow-lg shadow-teal-200 disabled:opacity-50">
                                        {searching ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                                {searchResults !== null && (
                                    <div className="space-y-2">
                                        {searchResults.length === 0 ? (
                                            <div className="bg-white border-2 border-slate-100 rounded-2xl p-8 text-center">
                                                <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                                <p className="font-bold text-slate-400 text-sm">No patients found</p>
                                                <p className="text-xs text-slate-400 mt-1">Try a different search term, or register as new walk-in</p>
                                                <button onClick={() => setActiveTab('register')} className="mt-4 px-5 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl">Register New Patient</button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-xs font-bold text-slate-400">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
                                                {searchResults.map(p => (
                                                    <PatientResultCard key={p.id} patient={p} onSelect={() => handleSelectPatient(p)} />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}
                                {searchResults === null && (
                                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                                        <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="font-bold text-slate-400 text-sm">Search for a patient to view details</p>
                                        <p className="text-xs text-slate-400 mt-1">Enter name, ID, email, or phone number above</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <PatientDetailPanel
                                data={selectedPatient}
                                onBack={() => setSelectedPatient(null)}
                                onAppointmentCreated={() => {
                                    // Refresh patient data to show new appointment
                                    startTransition(async () => {
                                        const r = await getPatientForStaff(selectedPatient.patient.id);
                                        if (r.success && r.data) setSelectedPatient(r.data);
                                    });
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ── Register Walk-in ── */}
                {activeTab === 'register' && (
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Register Walk-in Patient</h2>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">Complete A-to-Z onboarding — Patient ID and temporary password will be auto-generated</p>
                        </div>
                        <div className="bg-white border-2 border-dashed border-teal-200 rounded-2xl p-8 text-center">
                            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-teal-100">
                                <UserPlus className="w-7 h-7 text-teal-600" />
                            </div>
                            <p className="font-black text-slate-800 text-base mb-1">Full Patient Registration</p>
                            <p className="text-sm text-slate-500 font-medium mb-2">Collect all patient details, emergency contacts, allergies & medical history. A login ID and password will be generated at the end.</p>
                            <div className="flex flex-wrap justify-center gap-2 mb-5 text-xs font-bold">
                                {['Personal Info', 'Medical Details', 'Emergency Contact'].map((s, i) => (
                                    <span key={s} className="bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full">
                                        Step {i + 1}: {s}
                                    </span>
                                ))}
                            </div>
                            <button id="open-register-btn" onClick={() => setShowRegister(true)}
                                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-sm rounded-xl transition-colors shadow-lg shadow-teal-200">
                                Start Registration
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Token Queue ── */}
                {activeTab === 'queue' && <QueuePage staff={staff} />}

                {/* ── Appointments ── */}
                {activeTab === 'stats' && (
                    <AppointmentsPage loadStats={loadStats} stats={stats} loadingStats={loadingStats} />
                )}
            </main>

            {/* Modals */}
            {showRegister && (
                <RegisterModal
                    onClose={() => setShowRegister(false)}
                    onSuccess={(id, pw, email, name) => {
                        setShowRegister(false);
                        setCreds({ customId: id, password: pw, patientEmail: email, patientName: name });
                    }}
                />
            )}
            {creds && (
                <CredentialsModal
                    customId={creds.customId}
                    password={creds.password}
                    patientEmail={creds.patientEmail}
                    patientName={creds.patientName}
                    onClose={() => setCreds(null)}
                />
            )}
        </div>
    );
}
