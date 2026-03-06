"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Award,
    Briefcase,
    Building,
    Calendar,
    ChevronDown,
    Clock,
    Globe,
    Languages,
    Mail,
    Map,
    MapPin,
    Mars,
    User,
    Venus,
    Check
} from "lucide-react";
import clsx from "clsx";

// Major Country Codes with Flags
const COUNTRY_CODES = [
    { code: "+1", country: "USA", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+62", country: "Indonesia", flag: "🇮🇩" },
    { code: "+63", country: "Philippines", flag: "🇵🇭" },
    { code: "+82", country: "S. Korea", flag: "🇰🇷" },
    { code: "+55", country: "Brazil", flag: "🇧🇷" },
    { code: "+7", country: "Russia", flag: "🇷🇺" },
    { code: "+27", country: "S. Africa", flag: "🇿🇦" },
    { code: "+39", country: "Italy", flag: "🇮🇹" },
    { code: "+34", country: "Spain", flag: "🇪🇸" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱" },
    { code: "+41", country: "Switzerland", flag: "🇨🇭" },
    { code: "+46", country: "Sweden", flag: "🇸🇪" },
];

const LANGUAGES_LIST = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "French", "Spanish", "German"];

const STATES_AND_CITIES: Record<string, string[]> = {
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Tirunelveli", "Erode", "Vellore"],
    "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Kannur"],
    "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli", "Belgaum", "Gulbarga"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Solapur"],
    "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"]
};

// Fallback for other states if needed, or just strict list
const STATES = Object.keys(STATES_AND_CITIES).sort();

interface DoctorFormProps {
    step: number;
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function DoctorForm({ step, formData, handleChange, setFormData }: DoctorFormProps) {
    const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isMaritalDropdownOpen, setIsMaritalDropdownOpen] = useState(false);

    // New Dropdown States
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isWorkingDaysDropdownOpen, setIsWorkingDaysDropdownOpen] = useState(false);

    const dateInputRef = useRef<HTMLInputElement>(null);

    // Helper for multi-select languages
    const toggleLanguage = (lang: string) => {
        const currentLangs = formData.languages ? formData.languages.split(", ").filter(Boolean) : [];
        let newLangs;
        if (currentLangs.includes(lang)) {
            newLangs = currentLangs.filter((l: string) => l !== lang);
        } else {
            newLangs = [...currentLangs, lang];
        }
        setFormData((prev: any) => ({ ...prev, languages: newLangs.join(", ") }));
    };

    // Helper for working days
    const toggleDay = (day: string) => {
        const currentDays = formData.workingDays ? formData.workingDays.split(", ").filter(Boolean) : [];
        let newDays;
        if (currentDays.includes(day)) {
            newDays = currentDays.filter((d: string) => d !== day);
        } else {
            const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            newDays = [...currentDays, day].sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
        }
        setFormData((prev: any) => ({ ...prev, workingDays: newDays.join(", ") }));
    };

    return (
        <div className="space-y-6">
            {/* Step 1: Personal Details */}
            {step === 1 && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="pt-2 border-t border-slate-100 mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Personal Information (Doctor)</h3>
                        <p className="text-sm text-slate-500 mt-1">Please provide your basic contact details.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name with Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                            <div className="mt-1 flex items-center border border-teal-200 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 bg-white shadow-sm relative">

                                {/* Title Dropdown */}
                                <div className="relative border-r border-gray-200 bg-slate-50/50">
                                    <button
                                        type="button"
                                        onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
                                        className="h-full pl-3 pr-2 py-3 bg-transparent text-slate-800 flex items-center gap-2 outline-none min-w-[80px] hover:bg-slate-100 transition-colors rounded-l-lg"
                                    >
                                        <span className={clsx("text-base font-medium", !formData.title ? "text-gray-500" : "text-slate-900")}>
                                            {formData.title || "Title"}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    </button>

                                    <AnimatePresence>
                                        {isTitleDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsTitleDropdownOpen(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full left-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1"
                                                >
                                                    {["Dr.", "Mr.", "Ms.", "Mrs.", "Prof."].map((title) => (
                                                        <button
                                                            key={title}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData((prev: any) => ({ ...prev, title: title }));
                                                                setIsTitleDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                        >
                                                            {title}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email Address <span className="text-red-500">*</span></label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                            <div className="mt-1 flex items-center border border-teal-200 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 bg-white shadow-sm relative">
                                <div className="relative border-r border-gray-200 bg-slate-50/50">
                                    <button
                                        type="button"
                                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                        className="h-full pl-3 pr-2 py-3 bg-transparent text-slate-800 flex items-center gap-2 outline-none min-w-[100px] hover:bg-slate-100 transition-colors"
                                    >
                                        <span className="text-xl leading-none">{COUNTRY_CODES.find(c => c.code === formData.countryCode)?.flag}</span>
                                        <span className="text-base font-medium">{formData.countryCode}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                    </button>

                                    <AnimatePresence>
                                        {isCountryDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsCountryDropdownOpen(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto z-50 custom-scrollbar"
                                                >
                                                    {COUNTRY_CODES.map((c) => (
                                                        <button
                                                            key={c.code}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData((prev: any) => ({ ...prev, countryCode: c.code }));
                                                                setIsCountryDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-teal-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0 group"
                                                        >
                                                            <span className="text-xl">{c.flag}</span>
                                                            <span className="text-slate-600 font-medium w-12 group-hover:text-teal-700 transition-colors">{c.code}</span>
                                                            <span className="text-slate-900 text-sm truncate group-hover:text-teal-900 font-medium transition-colors">{c.country}</span>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData((prev: any) => ({ ...prev, phone: val }));
                                    }}
                                    className="flex-1 min-w-0 block w-full px-4 py-3 border-none focus:ring-0 text-base placeholder-gray-400 outline-none bg-transparent font-medium"
                                    placeholder="9876543210"
                                    maxLength={15}
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Gender <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'male' }))}
                                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-all ${formData.gender === 'male'
                                        ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500'
                                        : 'border-gray-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Mars className="w-4 h-4" />
                                    <span>Male</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'female' }))}
                                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-all ${formData.gender === 'female'
                                        ? 'bg-pink-50 border-pink-500 text-pink-700 ring-1 ring-pink-500'
                                        : 'border-gray-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Venus className="w-4 h-4" />
                                    <span>Female</span>
                                </button>
                            </div>
                        </div>

                        {/* DOB - Half Width */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                            <div className="relative rounded-lg shadow-sm group">
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    name="dob"
                                    required
                                    max={new Date().toISOString().split("T")[0]}
                                    value={formData.dob}
                                    onChange={handleChange}
                                    className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 pl-4 pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                                    placeholder="Select Date of Birth"
                                />
                                <div
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                                    onClick={() => dateInputRef.current?.showPicker()}
                                >
                                    <Calendar className="h-5 w-5 text-gray-400 group-hover:text-teal-500 transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* Age - Half Width */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Age <span className="text-red-500">*</span></label>
                            <div className="relative rounded-lg shadow-sm">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="age"
                                    required
                                    value={formData.age}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData((prev: any) => ({ ...prev, age: val }));
                                    }}
                                    className="pl-4 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3"
                                    placeholder="Age"
                                    maxLength={3}
                                />
                            </div>
                        </div>

                        {/* Marital Status */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Marital Status <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsMaritalDropdownOpen(!isMaritalDropdownOpen)}
                                    className="w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group"
                                >
                                    <span className={clsx("text-base", !formData.maritalStatus ? "text-gray-500" : "text-slate-900")}>
                                        {formData.maritalStatus ? formData.maritalStatus.charAt(0).toUpperCase() + formData.maritalStatus.slice(1) : "Select Status"}
                                    </span>
                                    <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isMaritalDropdownOpen ? "transform rotate-180" : "")} />
                                </button>

                                <AnimatePresence>
                                    {isMaritalDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsMaritalDropdownOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden"
                                            >
                                                {["Single", "Married", "Divorced", "Widowed"].map((status) => (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev: any) => ({ ...prev, maritalStatus: status.toLowerCase() }));
                                                            setIsMaritalDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Languages Spoken (Multi-select) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Languages Spoken <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                                    className="w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Languages className="w-5 h-5 text-gray-400" />
                                        <span className={clsx("text-base truncate", !formData.languages ? "text-gray-500" : "text-slate-900")}>
                                            {formData.languages || "Select Languages"}
                                        </span>
                                    </div>
                                    <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isLanguageDropdownOpen ? "transform rotate-180" : "")} />
                                </button>

                                <AnimatePresence>
                                    {isLanguageDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsLanguageDropdownOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                                            >
                                                {LANGUAGES_LIST.map((lang) => {
                                                    const isSelected = formData.languages?.includes(lang);
                                                    return (
                                                        <button
                                                            key={lang}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Keep open for multi-select
                                                                toggleLanguage(lang);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium flex justify-between items-center"
                                                        >
                                                            <span>{lang}</span>
                                                            {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                                                        </button>
                                                    )
                                                })}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* State & City (Row) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                                    className="w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <Map className="w-5 h-5 text-gray-400" />
                                        <span className={clsx("text-base truncate", !formData.state ? "text-gray-500" : "text-slate-900")}>
                                            {formData.state || "Select State"}
                                        </span>
                                    </div>
                                    <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isStateDropdownOpen ? "transform rotate-180" : "")} />
                                </button>

                                <AnimatePresence>
                                    {isStateDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsStateDropdownOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                                            >
                                                {STATES.map((state) => (
                                                    <button
                                                        key={state}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev: any) => ({ ...prev, state: state, city: "" })); // Reset city when state changes
                                                            setIsStateDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                    >
                                                        {state}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (formData.state) setIsCityDropdownOpen(!isCityDropdownOpen);
                                    }}
                                    className={clsx(
                                        "w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group",
                                        !formData.state && "opacity-50 cursor-not-allowed bg-slate-50"
                                    )}
                                    disabled={!formData.state}
                                >
                                    <div className="flex items-center gap-2">
                                        <Building className="w-4 h-4 text-gray-400" />
                                        <span className={clsx("text-base truncate", !formData.city ? "text-gray-500" : "text-slate-900")}>
                                            {formData.city || "Select City"}
                                        </span>
                                    </div>
                                    <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isCityDropdownOpen ? "transform rotate-180" : "")} />
                                </button>

                                <AnimatePresence>
                                    {isCityDropdownOpen && formData.state && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsCityDropdownOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                                            >
                                                {(STATES_AND_CITIES[formData.state] || []).map((city) => (
                                                    <button
                                                        key={city}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev: any) => ({ ...prev, city: city }));
                                                            setIsCityDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                    >
                                                        {city}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
                            <div className="relative rounded-lg shadow-sm">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                </div>
                                <textarea
                                    name="address"
                                    rows={3}
                                    required
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 leading-relaxed"
                                    placeholder="Street Address, Area"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step 2: Professional Details */}
            {step === 2 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="pt-2 border-t border-slate-100 mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Professional Details</h3>
                        <p className="text-sm text-slate-500 mt-1">Tell us about your practice and experience.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Clinic / Hospital Name <span className="text-red-500">*</span></label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="clinicName"
                                    required
                                    value={formData.clinicName ?? ""}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm py-3"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Specialization <span className="text-red-500">*</span></label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Award className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="specialization"
                                    required
                                    value={formData.specialization ?? ""}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm py-3"
                                    placeholder="e.g. Cardiologist, General"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Experience (Years) <span className="text-red-500">*</span></label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    name="experience"
                                    required
                                    value={formData.experience ?? ""}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm py-3"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Degree / Qualification <span className="text-red-500">*</span></label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Award className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="degree"
                                    required
                                    value={formData.degree ?? ""}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-teal-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm py-3"
                                    placeholder="e.g. MBBS, MD"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Timings <span className="text-red-500">*</span></label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="hospitalTiming"
                                    required
                                    value={formData.hospitalTiming ?? ""}
                                    onChange={handleChange}
                                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 sm:text-sm py-2"
                                    placeholder="e.g. 9:00 AM - 5:00 PM"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Clinic / Hospital Open Days <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsWorkingDaysDropdownOpen(!isWorkingDaysDropdownOpen)}
                                    className={clsx(
                                        "w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group",
                                        !formData.workingDays && "text-gray-500"
                                    )}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <span className={clsx("text-base truncate", !formData.workingDays ? "text-gray-500" : "text-slate-900")}>
                                            {formData.workingDays || "Select Open Days"}
                                        </span>
                                    </div>
                                    <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isWorkingDaysDropdownOpen ? "transform rotate-180" : "")} />
                                </button>
                                {/* Hidden input for validation */}
                                <input
                                    type="text"
                                    name="workingDays"
                                    value={formData.workingDays ?? ""}
                                    required
                                    className="opacity-0 absolute w-0 h-0"
                                    onChange={() => { }} // dummy handler
                                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("Please select working days")}
                                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                                />

                                <AnimatePresence>
                                    {isWorkingDaysDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="relative mt-1 w-full bg-white rounded-xl shadow-inner border border-teal-100 overflow-hidden"
                                        >
                                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                                                const isSelected = formData.workingDays?.includes(day);
                                                return (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleDay(day);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 transition-colors border-b border-slate-50 last:border-0 font-medium flex items-center group/item"
                                                    >
                                                        <div className={clsx(
                                                            "w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 mr-3",
                                                            isSelected
                                                                ? "bg-teal-600 border-teal-600 shadow-sm"
                                                                : "border-gray-300 bg-white group-hover/item:border-teal-400"
                                                        )}>
                                                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                                        </div>
                                                        <span className={clsx("transition-colors", isSelected ? "text-teal-700 font-semibold" : "text-slate-600")}>
                                                            {day}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
