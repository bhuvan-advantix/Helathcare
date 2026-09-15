"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Image from "next/image";
import {
    Activity, Check, Plus, Minus, RefreshCw, Copy, CheckCircle2,
    AlertCircle, ChevronDown, ArrowRight, UserPlus,
    CreditCard, Phone, MapPin, ShieldCheck, Droplets, Search, X
} from "lucide-react";
import { registerCampaignPatient, getCampaignLiveStats, CampaignFormData } from "@/app/actions/campaign";

// ── Searchable Single-Select Dropdown ────────────────────────────────────────
function SearchableDropdown({
    label,
    options,
    value,
    onChange,
    placeholder = "Select...",
    icon: Icon,
    required = false,
}: {
    label: string;
    options: { label: string; value: string }[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    icon?: any;
    required?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const query = searchTerm.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query));
    }, [options, searchTerm]);

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-teal-600" />}
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearchTerm("");
                }}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-slate-900 font-bold text-sm shadow-sm hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-left select-none"
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-teal-600" : ""}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl py-2 flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none">
                        <div className="px-2.5 pb-2 border-b border-slate-100 relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-5 top-3" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search options..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-8 pl-8 pr-7 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-5 top-3 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto max-h-48 py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-xs font-bold flex items-center justify-between transition-colors ${
                                            opt.value === value
                                                ? "bg-teal-50 text-teal-800 font-extrabold"
                                                : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        {opt.value === value && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center">
                                    No matching results
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Multi-Select Searchable Dropdown with Chips ──────────────────────────────
function SearchableMultiDropdown({
    label,
    options,
    selectedValues,
    onChange,
    placeholder = "Select options...",
}: {
    label: string;
    options: { label: string; value: string }[];
    selectedValues: string[];
    onChange: (vals: string[]) => void;
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const query = searchTerm.toLowerCase();
        return options.filter(o => o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query));
    }, [options, searchTerm]);

    const toggleOption = (val: string) => {
        if (val.includes("None")) {
            onChange([val]);
            return;
        }
        const filtered = selectedValues.filter(v => !v.includes("None"));
        if (filtered.includes(val)) {
            const next = filtered.filter(v => v !== val);
            onChange(next);
        } else {
            onChange([...filtered, val]);
        }
    };

    const removeTag = (val: string) => {
        onChange(selectedValues.filter(v => v !== val));
    };

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearchTerm("");
                }}
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white flex items-center justify-between shadow-sm hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-left select-none"
            >
                <div className="flex flex-wrap gap-1.5 items-center flex-1 mr-2">
                    {selectedValues.length > 0 ? (
                        selectedValues.map((val) => {
                            const opt = options.find(o => o.value === val);
                            return (
                                <span
                                    key={val}
                                    className="inline-flex items-center gap-1 bg-teal-50 text-teal-900 border border-teal-200 font-extrabold text-[11px] px-2 py-0.5 rounded-lg"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTag(val);
                                    }}
                                >
                                    <span>{opt ? opt.label : val}</span>
                                    <X className="w-3 h-3 text-teal-700 hover:text-teal-950 cursor-pointer" />
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-slate-400 font-normal text-sm">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-teal-600" : ""}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl py-2 flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none">
                        <div className="px-2.5 pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search options..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full h-8 pl-8 pr-7 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 shrink-0 shadow-sm"
                            >
                                Done
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-52 py-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => {
                                    const isSelected = selectedValues.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => toggleOption(opt.value)}
                                            className={`w-full px-4 py-2 text-left text-xs font-bold flex items-center justify-between transition-colors ${
                                                isSelected
                                                    ? "bg-teal-50/70 text-teal-950 font-black"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                        >
                                            <span>{opt.label}</span>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                isSelected ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300 bg-white"
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center">
                                    No matching options
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Multi-Tag Input for Manual Other Diseases ────────────────────────────────
function OtherDiseasesTagInput({
    label,
    tags,
    onChange,
    placeholder = "Type disease & press Enter or +",
}: {
    label: string;
    tags: string[];
    onChange: (newTags: string[]) => void;
    placeholder?: string;
}) {
    const [inputValue, setInputValue] = useState("");

    const handleAdd = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setInputValue("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleRemove = (tagToRemove: string) => {
        onChange(tags.filter(t => t !== tagToRemove));
    };

    return (
        <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                {/* Tags Display */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 px-1 pt-0.5">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1.5 bg-slate-900 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-lg shadow-sm"
                            >
                                <span>{tag}</span>
                                <X
                                    className="w-3 h-3 text-slate-300 hover:text-white cursor-pointer"
                                    onClick={() => handleRemove(tag)}
                                />
                            </span>
                        ))}
                    </div>
                )}

                {/* Input with Add button */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-8 px-2 font-semibold text-slate-900 text-xs focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                        <span>Add</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── State & District Data Map ────────────────────────────────────────────────
const STATE_DISTRICTS: Record<string, string[]> = {
    "Tamil Nadu": [
        "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
        "Tirunelveli", "Erode", "Vellore", "Thanjavur", "Dindigul",
        "Kanchipuram", "Cuddalore", "Tiruppur", "Nagercoil (Kanyakumari)",
        "Karur", "Namakkal", "Theni", "Virudhunagar", "Thoothukudi",
        "Chengalpattu", "Tiruvallur", "Villupuram", "Dharmapuri", "Krishnagiri"
    ],
    "Karnataka": [
        "Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi",
        "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru"
    ],
    "Maharashtra": [
        "Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Chhatrapati Sambhajinagar",
        "Solapur", "Amravati", "Kolhapur", "Navi Mumbai"
    ],
    "Delhi NCR": [
        "Central Delhi", "East Delhi", "New Delhi", "North Delhi",
        "South Delhi", "West Delhi", "Gurugram", "Noida", "Faridabad", "Ghaziabad"
    ],
    "Telangana": [
        "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam"
    ],
    "Kerala": [
        "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha"
    ],
    "Andhra Pradesh": [
        "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati"
    ],
    "Gujarat": [
        "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"
    ],
    "West Bengal": [
        "Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Kharagpur"
    ],
    "Other State": [
        "Central District", "North District", "South District", "East District", "West District"
    ]
};

export default function CampaignPage() {
    const [isPending, startTransition] = useTransition();

    // Form fields
    const [name, setName] = useState("");
    const [aadhaarNumber, setAadhaarNumber] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const [phone, setPhone] = useState("");
    const [age, setAge] = useState<number>(35);
    const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
    const [stateName, setStateName] = useState("Tamil Nadu");
    const [city, setCity] = useState("Chennai");
    const [bloodGroup, setBloodGroup] = useState("O+");
    const [height, setHeight] = useState<number>(165);
    const [weight, setWeight] = useState<number>(65);
    const [bloodPressure, setBloodPressure] = useState("");
    const [bloodSugar, setBloodSugar] = useState("");
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [otherDiseaseTags, setOtherDiseaseTags] = useState<string[]>([]);
    const [selectedBadHabits, setSelectedBadHabits] = useState<string[]>([]);
    const [consentGiven, setConsentGiven] = useState(true);

    // Registration outcome
    const [registrationResult, setRegistrationResult] = useState<{
        patientName: string;
        customId: string;
        plainPassword: string;
    } | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [copiedPassword, setCopiedPassword] = useState(false);

    // Live Stats
    const [stats, setStats] = useState<{
        totalToday: number;
        maleCount: number;
        femaleCount: number;
        otherCount: number;
        bpCount: number;
        diabetesCount: number;
        thyroidCount: number;
        healthyCount: number;
        recentRegistrations: any[];
    }>({
        totalToday: 0,
        maleCount: 0,
        femaleCount: 0,
        otherCount: 0,
        bpCount: 0,
        diabetesCount: 0,
        thyroidCount: 0,
        healthyCount: 0,
        recentRegistrations: [],
    });
    const [statsLoading, setStatsLoading] = useState(true);

    const loadStats = async () => {
        setStatsLoading(true);
        const data = await getCampaignLiveStats();
        setStats(data);
        setStatsLoading(false);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleStateChange = (newState: string) => {
        setStateName(newState);
        const districts = STATE_DISTRICTS[newState] || STATE_DISTRICTS["Other State"];
        setCity(districts[0]);
    };

    const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
        const parts = [];
        for (let i = 0; i < raw.length; i += 4) {
            parts.push(raw.slice(i, i + 4));
        }
        setAadhaarNumber(parts.join(" "));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        if (!name.trim()) {
            setErrorMessage("Please enter patient full name.");
            return;
        }

        if (!consentGiven) {
            setErrorMessage("Please confirm patient consent before submitting.");
            return;
        }

        startTransition(async () => {
            const fullPhone = phone.trim() ? `${countryCode} ${phone.trim()}` : "";
            const combinedOtherDiseases = otherDiseaseTags.join(", ");

            const payload: CampaignFormData = {
                name: name.trim(),
                aadhaarNumber: aadhaarNumber.trim(),
                phone: fullPhone,
                age,
                gender,
                state: stateName,
                city: city.trim() || "Primary Location",
                bloodGroup,
                height: String(height),
                weight: String(weight),
                bloodPressure: bloodPressure.trim(),
                bloodSugar: bloodSugar.trim(),
                chronicConditions: selectedConditions,
                otherConditions: combinedOtherDiseases,
                badHabits: selectedBadHabits,
                consentGiven,
            };

            const res = await registerCampaignPatient(payload);

            if (res.success && res.customId && res.plainPassword) {
                setRegistrationResult({
                    patientName: res.patientName || name,
                    customId: res.customId,
                    plainPassword: res.plainPassword,
                });
                loadStats();
            } else {
                setErrorMessage(res.error || "Registration failed. Please try again.");
            }
        });
    };

    const handleNextPatient = () => {
        setName("");
        setAadhaarNumber("");
        setPhone("");
        setAge(35);
        setGender("Male");
        setBloodPressure("");
        setBloodSugar("");
        setSelectedConditions([]);
        setOtherDiseaseTags([]);
        setSelectedBadHabits([]);
        setConsentGiven(true);
        setRegistrationResult(null);
        setErrorMessage("");
    };

    const handleCopySlip = () => {
        if (!registrationResult) return;
        const slipText = `NIRAIVA HEALTH ACCOUNT SLIP\nName: ${registrationResult.patientName}\nHealth ID: ${registrationResult.customId}\nDefault Password: ${registrationResult.plainPassword}\nLogin Portal: https://niraiva.health/login`;
        navigator.clipboard.writeText(slipText);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 3000);
    };

    // Options Lists
    const genderOptions = [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" },
        { label: "Other", value: "Other" },
    ];

    const stateOptions = Object.keys(STATE_DISTRICTS).map(s => ({ label: s, value: s }));
    const currentDistrictList = STATE_DISTRICTS[stateName] || STATE_DISTRICTS["Other State"];
    const districtOptions = currentDistrictList.map(d => ({ label: d, value: d }));

    const bloodGroupOptions = [
        { label: "O Positive (O+)", value: "O+" },
        { label: "A Positive (A+)", value: "A+" },
        { label: "B Positive (B+)", value: "B+" },
        { label: "AB Positive (AB+)", value: "AB+" },
        { label: "O Negative (O-)", value: "O-" },
        { label: "A Negative (A-)", value: "A-" },
        { label: "B Negative (B-)", value: "B-" },
        { label: "AB Negative (AB-)", value: "AB-" },
        { label: "Unknown / Unchecked", value: "Unknown" },
    ];

    const conditionOptions = [
        { label: "None / Healthy", value: "None / Healthy" },
        { label: "High Blood Pressure (Hypertension)", value: "Hypertension / BP" },
        { label: "Diabetes / Elevated Sugar", value: "Diabetes / Sugar" },
        { label: "Thyroid Condition", value: "Thyroid Issue" },
        { label: "Heart / Cardiovascular Illness", value: "Heart Condition" },
        { label: "Asthma / Respiratory Issues", value: "Asthma / Respiratory" },
        { label: "Kidney / Renal Disorder", value: "Kidney Disorder" },
        { label: "Arthritis / Joint Pain", value: "Arthritis" },
    ];

    const habitOptions = [
        { label: "None / Healthy Lifestyle", value: "None" },
        { label: "Tobacco / Smoking", value: "Tobacco / Smoking" },
        { label: "Regular Alcohol Intake", value: "Alcohol Usage" },
        { label: "High Work/Life Stress", value: "High Stress" },
        { label: "Irregular Diet & Sleep", value: "Irregular Diet & Sleep" },
        { label: "Low Physical Activity (Sedentary)", value: "Sedentary" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 select-none">

            {/* ── Top Brand Header ────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 border border-slate-200">
                            <Image
                                src="/Nrivaa Logo.jpeg"
                                alt="Niraiva Health Logo"
                                fill
                                className="object-cover"
                                sizes="40px"
                                priority
                            />
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-slate-900">
                            Niraiva<span className="text-teal-600">Health</span>
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={loadStats}
                        disabled={statsLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-800 transition-colors border border-teal-200"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${statsLoading ? "animate-spin" : ""}`} />
                        <span>Refresh Sync</span>
                    </button>
                </div>
            </header>

            {/* ── Today's Screening Summary Bar ────────────────────────────── */}
            <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-emerald-50 border-b border-teal-100 py-4 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                            Today&apos;s Screening Summary
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">Live Database Synced</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-white border border-teal-200/80 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today Registered</p>
                            <p className="text-2xl font-black text-teal-700 mt-0.5">{stats.totalToday}</p>
                        </div>
                        <div className="bg-white border border-teal-200/80 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Male Intake</p>
                            <p className="text-2xl font-black text-slate-800 mt-0.5">{stats.maleCount}</p>
                        </div>
                        <div className="bg-white border border-teal-200/80 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Female Intake</p>
                            <p className="text-2xl font-black text-slate-800 mt-0.5">{stats.femaleCount}</p>
                        </div>
                        <div className="bg-white border border-rose-200/80 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Hypertension (BP)</p>
                            <p className="text-2xl font-black text-rose-700 mt-0.5">{stats.bpCount}</p>
                        </div>
                        <div className="bg-white border border-amber-200/80 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Diabetes Cases</p>
                            <p className="text-2xl font-black text-amber-800 mt-0.5">{stats.diabetesCount}</p>
                        </div>
                        <div className="bg-white border border-emerald-200/80 rounded-2xl p-3 text-center shadow-sm">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Routine / Healthy</p>
                            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.healthyCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Form Workspace ───────────────────────────────────────── */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">

                {/* ── Registration Success Slip Card ─────────────────────────── */}
                {registrationResult ? (
                    <div className="bg-white rounded-3xl border border-teal-200 shadow-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-teal-600" />
                        </div>

                        <div className="text-center mb-6">
                            <span className="bg-teal-100 text-teal-800 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                                Patient Saved to Database
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 mt-2">
                                Patient Account Successfully Created
                            </h2>
                        </div>

                        {/* Account Slip Card */}
                        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 mb-6">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                <span className="font-extrabold text-sm text-teal-400 tracking-wide">NIRAIVA HEALTH ACCOUNT SLIP</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                    PATIENT CREDENTIALS
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</p>
                                    <p className="text-lg font-black text-white">{registrationResult.patientName}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <div>
                                        <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Assigned Health ID</p>
                                        <p className="text-2xl font-black text-teal-300 tracking-tight mt-0.5">
                                            {registrationResult.customId}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Default Password</p>
                                        <p className="text-2xl font-black text-amber-300 tracking-tight mt-0.5 font-mono">
                                            {registrationResult.plainPassword}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <button
                                type="button"
                                onClick={handleCopySlip}
                                className="w-full sm:w-1/2 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                {copiedPassword ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                                {copiedPassword ? "Slip Details Copied!" : "Copy Slip Details"}
                            </button>
                            <button
                                type="button"
                                onClick={handleNextPatient}
                                className="w-full sm:w-1/2 h-12 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                Register Next Patient
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Form Card ─────────────────────────────────────────────── */
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-8">
                        
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                Health Screening Patient Registration
                            </h2>
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                                Enter patient demographic details, vitals, and health indicators for automatic account creation.
                            </p>
                        </div>

                        {errorMessage && (
                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* ── SECTION 1: Personal & Demographic Info ────────────── */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider text-teal-700">
                                1. Personal & Demographic Details
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Full legal name"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <CreditCard className="w-3.5 h-3.5 text-teal-600" /> Aadhaar Card Number
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={14}
                                        placeholder="12-digit Aadhaar (e.g. 1234 5678 9012)"
                                        value={aadhaarNumber}
                                        onChange={handleAadhaarChange}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:font-normal placeholder:text-slate-400 font-mono tracking-wider"
                                    />
                                </div>
                            </div>

                            {/* Single Column Mobile Number with Merged Country Code Selector */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-teal-600" /> Mobile Number
                                    </label>
                                    <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                                        <select
                                            value={countryCode}
                                            onChange={e => setCountryCode(e.target.value)}
                                            className="h-12 bg-slate-50 text-slate-800 font-extrabold text-xs px-2.5 border-r border-slate-200 focus:outline-none cursor-pointer"
                                        >
                                            <option value="+91">+91 (IN)</option>
                                            <option value="+1">+1 (US)</option>
                                            <option value="+44">+44 (UK)</option>
                                            <option value="+971">+971 (AE)</option>
                                            <option value="+65">+65 (SG)</option>
                                            <option value="+61">+61 (AU)</option>
                                            <option value="+966">+966 (SA)</option>
                                        </select>
                                        <input
                                            type="tel"
                                            placeholder="10-digit number"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full h-12 px-3 bg-white font-bold text-slate-900 text-sm focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Age (Years)
                                    </label>
                                    <div className="h-12 rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setAge(Math.max(1, age - 1))}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-black text-slate-900">{age} yrs</span>
                                        <button
                                            type="button"
                                            onClick={() => setAge(Math.min(110, age + 1))}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <SearchableDropdown
                                    label="Gender"
                                    options={genderOptions}
                                    value={gender}
                                    onChange={val => setGender(val as any)}
                                    required
                                />
                            </div>

                            {/* State & Dynamic Linked District Searchable Dropdowns */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <SearchableDropdown
                                    label="State"
                                    options={stateOptions}
                                    value={stateName}
                                    onChange={handleStateChange}
                                    icon={MapPin}
                                    placeholder="Search State..."
                                />

                                <SearchableDropdown
                                    label="District / City"
                                    options={districtOptions}
                                    value={city}
                                    onChange={setCity}
                                    placeholder="Search District..."
                                />
                            </div>
                        </div>

                        {/* ── SECTION 2: Health Vitals & Metrics ─────────────────── */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider text-teal-700">
                                2. Health Vitals & Clinical Measurements
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <SearchableDropdown
                                    label="Blood Group"
                                    options={bloodGroupOptions}
                                    value={bloodGroup}
                                    onChange={setBloodGroup}
                                    icon={Droplets}
                                    placeholder="Search Blood Group..."
                                />

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Height (cm)
                                    </label>
                                    <div className="h-12 rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setHeight(Math.max(40, height - 1))}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-black text-slate-900">{height} cm</span>
                                        <button
                                            type="button"
                                            onClick={() => setHeight(Math.min(220, height + 1))}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Weight (kg)
                                    </label>
                                    <div className="h-12 rounded-xl border border-slate-200 bg-white px-3 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setWeight(Math.max(5, weight - 1))}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-black text-slate-900">{weight} kg</span>
                                        <button
                                            type="button"
                                            onClick={() => setWeight(Math.min(250, weight + 1))}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* BP & Sugar Level Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Blood Pressure (Systolic/Diastolic)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 120/80 mmHg (Optional)"
                                        value={bloodPressure}
                                        onChange={e => setBloodPressure(e.target.value)}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Blood Sugar / Fasting Glucose
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 115 mg/dL (Optional)"
                                        value={bloodSugar}
                                        onChange={e => setBloodSugar(e.target.value)}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── SECTION 3: Multi-Select Conditions & Multi-Tag Other Diseases ──── */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider text-teal-700">
                                3. Pre-existing Conditions & Habits
                            </h3>

                            {/* Side-by-side: Multi-Select Dropdown + Multi-Tag Input */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                <SearchableMultiDropdown
                                    label="Known Health Conditions"
                                    options={conditionOptions}
                                    selectedValues={selectedConditions}
                                    onChange={setSelectedConditions}
                                    placeholder="Search & Select Multiple..."
                                />

                                <OtherDiseasesTagInput
                                    label="Other Diseases / Medical Notes"
                                    tags={otherDiseaseTags}
                                    onChange={setOtherDiseaseTags}
                                    placeholder="Type disease & press Enter or Add"
                                />
                            </div>

                            {/* Lifestyle Risk Hazards Multi-Select Dropdown */}
                            <div>
                                <SearchableMultiDropdown
                                    label="Lifestyle Risk Hazards & Habits"
                                    options={habitOptions}
                                    selectedValues={selectedBadHabits}
                                    onChange={setSelectedBadHabits}
                                    placeholder="Search & Select Lifestyle Hazards..."
                                />
                            </div>
                        </div>

                        {/* ── SECTION 4: Consent & Submit ────────────────────────── */}
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={consentGiven}
                                    onChange={e => setConsentGiven(e.target.checked)}
                                    className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                                />
                                <span className="text-xs font-bold text-slate-600 leading-relaxed">
                                    I confirm patient consent to register and create an account on Niraiva Health Platform.
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full h-14 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-base shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                            >
                                {isPending ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Saving Patient to Database...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        <span>REGISTER PATIENT & CREATE ACCOUNT</span>
                                        <ArrowRight className="w-5 h-5 ml-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Today's Registrations Stream ─────────────────────────── */}
                <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Recent Registrations Today
                        </h3>
                        <span className="text-xs font-bold text-slate-400">Database Stream</span>
                    </div>

                    {stats.recentRegistrations.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {stats.recentRegistrations.map((p) => (
                                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-extrabold text-slate-900">{p.name}</p>
                                        <p className="text-[11px] font-semibold text-slate-500">{p.gender} • {p.age} yrs • {p.conditions}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px]">
                                            {p.customId}
                                        </span>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{p.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-xs font-bold text-slate-400">
                            No registrations recorded yet today.
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
