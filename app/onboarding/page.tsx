"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOnboarding } from "@/app/actions/onboarding";
import DoctorForm from "./DoctorForm";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    Camera,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Mail,
    MapPin,
    Mars,
    Phone,
    User,
    Venus,
    X
} from "lucide-react";
import clsx from "clsx";

// Professional Avatars List (Simplified for reliability)
const AVATAR_LIST = [
    // Avatars
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Christopher",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Annie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    // Creative
    "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Chloe",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Leo",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Mila",
];

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

function OnboardingContent() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [role, setRole] = useState<"patient" | "doctor" | null>(null);
    const [formStep, setFormStep] = useState(1);
    // Initialize with empty to fallback to initials
    const [selectedAvatar, setSelectedAvatar] = useState<string>("");
    const [imageError, setImageError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isEmergencyCountryDropdownOpen, setIsEmergencyCountryDropdownOpen] = useState(false);
    const [showExistsModal, setShowExistsModal] = useState(false);
    const [isMaritalDropdownOpen, setIsMaritalDropdownOpen] = useState(false);
    const [isRelationDropdownOpen, setIsRelationDropdownOpen] = useState(false);
    const [isBloodGroupDropdownOpen, setIsBloodGroupDropdownOpen] = useState(false);
    const [isLifestyleDropdownOpen, setIsLifestyleDropdownOpen] = useState(false);
    const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Reset image error when avatar changes
    // Reset image error when avatar changes
    useEffect(() => {
        setImageError(false);
    }, [selectedAvatar]);

    // Redirect if already onboarded to prevent re-entering onboarding flow
    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.isOnboarded) {
            router.replace("/dashboard");
        }
    }, [status, session, router]);



    // Common State
    const INITIAL_FORM_DATA = {
        // Common
        title: "",
        name: "",
        email: "",
        phone: "",
        countryCode: "+91",
        gender: "male",
        dob: "",
        age: "",
        address: "",
        city: "",
        state: "",
        languages: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactCountryCode: "+91",
        maritalStatus: "",
        guardianName: "",
        guardianRelation: "",

        // Doctor Specific
        specialization: "",
        degree: "",
        clinicName: "",
        licenseNumber: "",
        experience: "",
        hospitalTiming: "",
        workingDays: "",
        bio: "",

        // Patient Specific
        bloodGroup: "",
        height: "",
        weight: "",
        allergies: "",
        currentMedications: "",
        pastSurgeries: "",
        chronicConditions: "",
        lifestyle: "",
    };

    // Common State
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    // Persist Role & Data: Restore from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem("onboarding_role");
            const savedStep = localStorage.getItem("onboarding_step");
            const savedData = localStorage.getItem("onboarding_data");

            // Check URL param first (Highest Priority)
            const urlStep = searchParams.get("step");

            if (savedRole === "patient" || savedRole === "doctor") {
                setRole(savedRole as "patient" | "doctor");
            }

            // Logic: URL > LocalStorage > Default (1)
            if (urlStep) {
                setFormStep(parseInt(urlStep));
            } else if (savedStep) {
                setFormStep(parseInt(savedStep));
            }

            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    // Merge with initial data to ensure all fields exist (prevent undefined keys for new fields)
                    setFormData({ ...INITIAL_FORM_DATA, ...parsedData });
                } catch (e) {
                    console.error("Failed to parse saved data", e);
                }
            }
            setIsLoaded(true);
        }
    }, [searchParams]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined' && isLoaded && role) {
            localStorage.setItem("onboarding_role", role);
            localStorage.setItem("onboarding_step", formStep.toString());
            localStorage.setItem("onboarding_data", JSON.stringify(formData));
        }
    }, [formStep, formData, role, isLoaded]);

    // Clear role (but keep data) when going back to selection
    const handleChangeRole = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem("onboarding_role");
            // We consciously DO NOT remove step or data here to preserve it
            // as requested: "wherever we leaves it should start from that only"
        }
        setRole(null);
        // We do not reset formStep or formData here to keep the state in memory
    };

    // Handle browser back button to allow returning to role selection or previous step
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            // Check for step in history state
            if (e.state && e.state.step) {
                setFormStep(e.state.step);
            } else if (role) {
                // If no step state but role is selected, it means we went back to root/selection
                handleChangeRole();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [role]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (formRef.current?.checkValidity()) {
            const nextStep = formStep + 1;
            setFormStep(nextStep);

            // Push new state to history
            window.history.pushState({ step: nextStep }, '', `?step=${nextStep}`);

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            formRef.current?.reportValidity();
        }
    };

    const handleBack = () => {
        if (formStep > 1) {
            // Explicitly go to previous step first
            const prevStep = formStep - 1;
            setFormStep(prevStep);

            // Push the new Step 1 state to history so the URL updates and back button logic flows logically
            // We use pushState (or replaceState if you prefer not piling up history) to ensure URL reflects ?step=1
            window.history.pushState({ step: prevStep }, '', `?step=${prevStep}`);

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // If on step 1, go back to role selection
            if (typeof window !== 'undefined') {
                // Remove role to show selection screen but keep data
                localStorage.removeItem("onboarding_role");
                // Also clean URL query param
                window.history.pushState({}, '', '/onboarding');
            }
            setRole(null);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validate form one last time? (already checked via HTML attributes and handleNext)

            // Call Server Action
            // Combine Title + Name if title exists
            const submittedData = {
                ...formData,
                name: formData.title ? `${formData.title} ${formData.name}` : formData.name
            };

            const result = await completeOnboarding(role as "patient" | "doctor", submittedData, selectedAvatar || undefined);

            if (!result.success) {
                // Gracefully handle already onboarded users by redirecting
                if (result.error === "Account already exists and is setup. Please login.") {
                    // Already onboarded, redirect directly to dashboard
                    window.location.href = "/dashboard?welcome=true";
                    return;
                }
                throw new Error(result.error || "Failed to complete onboarding");
            }

            // Update session (force refresh)
            await update({});

            // Clear persistence
            if (typeof window !== 'undefined') {
                localStorage.removeItem("onboarding_role");
                localStorage.removeItem("onboarding_step");
                localStorage.removeItem("onboarding_data");
                // Clear welcome flag to ensure animation shows for this new account
                localStorage.removeItem("hasSeenWelcome_v2");

                // Force hard navigation to ensure session cookie is updated and middleware passes
                window.location.href = "/dashboard?welcome=true";
            }
        } catch (error) {
            console.error("Onboarding error:", error);
            alert(error instanceof Error ? error.message : "Failed to complete registration. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading" || (status === "authenticated" && (session?.user as any)?.isOnboarded)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-600 font-medium">Wait a moment...</p>
                </div>
            </div>
        );
    }

    if (!role) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-5xl w-full">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 font-sans tracking-tight">
                                Welcome to <span className="text-teal-600">Niraiva Health</span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                                Join our advanced digital healthcare ecosystem. Select your role to get started with your personalized experience.
                            </p>
                        </motion.div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 md:gap-12 px-4">
                        {/* Patient Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            whileHover={{ scale: 1.03, translateY: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                // Push state so 'Back' button works properly
                                window.history.pushState({ step: 1 }, '', '/onboarding?step=1');
                                setRole("patient");
                                localStorage.setItem("onboarding_role", "patient");
                            }}
                            className="bg-white rounded-3xl shadow-xl hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-teal-500 transition-all duration-300 group overflow-hidden relative"
                        >
                            <div className="p-8 md:p-10 flex flex-col items-center">
                                <div className="h-48 w-48 mb-8 relative rounded-full bg-teal-50 p-6 overflow-hidden group-hover:bg-teal-100 transition-colors duration-300">
                                    <img
                                        src="/healthcare.png"
                                        alt="Patient"
                                        className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-3 group-hover:text-teal-600 transition-colors">I am a Patient</h2>
                                <p className="text-center text-slate-500 leading-relaxed font-medium">
                                    Book appointments, access medical records, and track your health journey with ease.
                                </p>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                        </motion.div>

                        {/* Doctor Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            whileHover={{ scale: 1.03, translateY: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                // Push state so 'Back' button works properly
                                window.history.pushState({ step: 1 }, '', '/onboarding?step=1');
                                setRole("doctor");
                                localStorage.setItem("onboarding_role", "doctor");
                            }}
                            className="bg-white rounded-3xl shadow-xl hover:shadow-2xl cursor-pointer border-2 border-transparent hover:border-teal-500 transition-all duration-300 group overflow-hidden relative"
                        >
                            <div className="p-8 md:p-10 flex flex-col items-center">
                                <div className="h-48 w-48 mb-8 relative rounded-full bg-teal-50 p-6 overflow-hidden group-hover:bg-teal-100 transition-colors duration-300">
                                    <img
                                        src="/doctor.png"
                                        alt="Doctor"
                                        className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-3 group-hover:text-teal-600 transition-colors">I am a Doctor</h2>
                                <p className="text-center text-slate-500 leading-relaxed font-medium">
                                    Manage your practice, coordinate care, and connect with patients seamlessly.
                                </p>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">

                    <h2 className="text-3xl font-extrabold text-slate-900">
                        {role === "patient" ? "Patient Registration" : "Doctor Registration"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 mb-6 font-medium">
                        {formStep === 1 ? "Personal Details" : (role === "doctor" ? "Professional Information" : "Medical Profile")}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md mx-auto h-2 bg-slate-200 rounded-full overflow-hidden mb-8 relative">
                        <motion.div
                            className="bg-teal-500 h-full rounded-full"
                            initial={{ width: "50%" }}
                            animate={{ width: formStep === 1 ? "50%" : "100%" }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                    </div>
                </div>

                <div className="bg-white shadow-xl rounded-2xl border border-slate-300/60 overflow-hidden">
                    <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-8">

                        {/* Profile Picture Section */}
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowAvatarModal(true)}
                                    className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition-all relative overflow-hidden ring-4 ring-white"
                                >
                                    {!imageError && (selectedAvatar || formData.name) ? (
                                        <img
                                            src={selectedAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.name.split(" ").map((n) => n[0]).join("").substring(0, 2))}`}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={() => setImageError(true)}
                                            key={selectedAvatar || formData.name} // Force re-render on name change
                                        />
                                    ) : (
                                        <User className="w-12 h-12 text-slate-300" />
                                    )}

                                    {/* Edit Overlay */}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-white drop-shadow-md" />
                                    </div>
                                </motion.div>

                                {/* Status Indicator */}
                                {!selectedAvatar && !formData.name && (
                                    <div className="absolute bottom-1 right-1 bg-teal-500 rounded-full p-2 border-2 border-white shadow-sm pointer-events-none">
                                        <span className="sr-only">Add photo</span>
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Doctor Form - All Steps */}
                        {role === 'doctor' && (
                            <DoctorForm
                                step={formStep}
                                formData={formData}
                                handleChange={handleInputChange}
                                setFormData={setFormData}
                            />
                        )}

                        {/* Personal Details Header - Step 1 Only (Patient) */}
                        {role === 'patient' && formStep === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="pt-2 border-t border-slate-100 mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">Personal Information</h3>
                                    <p className="text-sm text-slate-500 mt-1">Please provide your basic contact details.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                                            setFormData({ ...formData, title: title });
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
                                                    onChange={handleInputChange}
                                                    className="pl-10 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>
                                    </div>

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
                                                onChange={handleInputChange}
                                                className="pl-10 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3"
                                                placeholder="you@example.com"
                                            />
                                        </div>
                                    </div>

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
                                                                            setFormData({ ...formData, countryCode: c.code });
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
                                                    setFormData(prev => ({ ...prev, phone: val }));
                                                }}
                                                className="flex-1 min-w-0 block w-full px-4 py-3 border-none focus:ring-0 text-base placeholder-gray-400 outline-none bg-transparent font-medium"
                                                placeholder="9876543210"
                                                maxLength={15}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Gender <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, gender: 'male' })}
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
                                                onClick={() => setFormData({ ...formData, gender: 'female' })}
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
                                                onChange={handleInputChange}
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
                                                    setFormData(prev => ({ ...prev, age: val }));
                                                }}
                                                className="pl-4 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3"
                                                placeholder="Age"
                                                maxLength={3}
                                            />
                                        </div>
                                    </div>

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
                                                                        setFormData({ ...formData, maritalStatus: status.toLowerCase() });
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

                                    {/* Emergency Contact - Patients Only */}
                                    {role === 'patient' && (
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-2">
                                            <div className="md:col-span-2">
                                                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                    Emergency Contact <span className="text-red-500">*</span>
                                                </h4>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                                                <div className="mt-1 relative rounded-lg shadow-sm">
                                                    <input
                                                        type="text"
                                                        name="emergencyContactName"
                                                        required={role === 'patient'}
                                                        value={formData.emergencyContactName}
                                                        onChange={handleInputChange}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="Relative/Friend Name"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                                                <div className="mt-1 flex items-center border border-teal-200 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 bg-white shadow-sm relative">
                                                    <div className="relative border-r border-gray-200 bg-slate-50/50">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEmergencyCountryDropdownOpen(!isEmergencyCountryDropdownOpen)}
                                                            className="h-full pl-3 pr-2 py-3 bg-transparent text-slate-800 flex items-center gap-2 outline-none min-w-[100px] hover:bg-slate-100 transition-colors rounded-l-lg"
                                                        >
                                                            <span className="text-xl leading-none">{COUNTRY_CODES.find(c => c.code === formData.emergencyContactCountryCode)?.flag}</span>
                                                            <span className="text-base font-medium">{formData.emergencyContactCountryCode}</span>
                                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                                        </button>

                                                        <AnimatePresence>
                                                            {isEmergencyCountryDropdownOpen && (
                                                                <>
                                                                    <div className="fixed inset-0 z-40" onClick={() => setIsEmergencyCountryDropdownOpen(false)} />
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
                                                                                    setFormData({ ...formData, emergencyContactCountryCode: c.code });
                                                                                    setIsEmergencyCountryDropdownOpen(false);
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
                                                        name="emergencyContactPhone"
                                                        required={role === 'patient'}
                                                        value={formData.emergencyContactPhone}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                                            setFormData(prev => ({ ...prev, emergencyContactPhone: val }));
                                                        }}
                                                        className="block w-full border-none text-base py-3 px-4 focus:ring-0 rounded-r-lg"
                                                        placeholder="Emergency Phone Number"
                                                        maxLength={15}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Guardian Details for Minors */}
                                    {formData.age && parseInt(formData.age) < 18 && (
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm transition-all duration-300">
                                            <div className="md:col-span-2">
                                                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                                    Guardian Details <span className="text-xs font-normal text-slate-500">(Required for minors)</span> <span className="text-red-500">*</span>
                                                </h4>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Name</label>
                                                <div className="mt-1 relative rounded-lg shadow-sm">
                                                    <input
                                                        type="text"
                                                        name="guardianName"
                                                        required={parseInt(formData.age) < 18}
                                                        value={formData.guardianName}
                                                        onChange={handleInputChange}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="Parent/Guardian Name"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Relation</label>
                                                <div className="relative mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsRelationDropdownOpen(!isRelationDropdownOpen)}
                                                        className="w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group relative z-20"
                                                    >
                                                        <span className={clsx("text-base", !formData.guardianRelation ? "text-gray-500" : "text-slate-900")}>
                                                            {formData.guardianRelation ? formData.guardianRelation.charAt(0).toUpperCase() + formData.guardianRelation.slice(1) : "Select Relation"}
                                                        </span>
                                                        <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isRelationDropdownOpen ? "transform rotate-180" : "")} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {isRelationDropdownOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-30" onClick={() => setIsRelationDropdownOpen(false)} />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: 10 }}
                                                                    className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden"
                                                                >
                                                                    {["Father", "Mother", "Guardian", "Other"].map((relation) => (
                                                                        <button
                                                                            key={relation}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, guardianRelation: relation.toLowerCase() });
                                                                                setIsRelationDropdownOpen(false);
                                                                            }}
                                                                            className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                                        >
                                                                            {relation}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
                                                onChange={handleInputChange}
                                                className="pl-10 block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 leading-relaxed"
                                                placeholder="Street, City, State, Zip Code"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Role Specific Fields - Step 2 Only (Patient) */}
                        {role === 'patient' && formStep === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="pt-2 border-t border-slate-100 mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">
                                        Medical Details
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Help us understand your health profile better.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Physical Vitals */}
                                    <div className="md:col-span-2">
                                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            Physical Vitals
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm) <span className="text-red-500">*</span></label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <input
                                                        type="number"
                                                        name="height"
                                                        required
                                                        min="0"
                                                        value={formData.height}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            // Allow digits and single decimal point, no special chars
                                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                setFormData(prev => ({ ...prev, height: val }));
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Block special chars: -, +, e, E ...
                                                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="e.g. 175"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg) <span className="text-red-500">*</span></label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <input
                                                        type="number"
                                                        name="weight"
                                                        required
                                                        min="0"
                                                        value={formData.weight}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            // Allow digits and single decimal point, no special chars
                                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                setFormData(prev => ({ ...prev, weight: val }));
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Block special chars: -, +, e, E ...
                                                            if (['-', '+', 'e', 'E'].includes(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="e.g. 70"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Specific Medical History */}
                                    <div className="md:col-span-2 pt-4 border-t border-slate-100 mt-2">
                                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            Specific Medical History
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        className="sr-only"
                                                        required
                                                        value={formData.bloodGroup}
                                                        onChange={() => { }}
                                                        tabIndex={-1}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsBloodGroupDropdownOpen(!isBloodGroupDropdownOpen)}
                                                        className="w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group"
                                                    >
                                                        <span className={clsx("text-base", !formData.bloodGroup ? "text-gray-500" : "text-slate-900")}>
                                                            {formData.bloodGroup || "Select Group"}
                                                        </span>
                                                        <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isBloodGroupDropdownOpen ? "transform rotate-180" : "")} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isBloodGroupDropdownOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-30" onClick={() => setIsBloodGroupDropdownOpen(false)} />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: 10 }}
                                                                    className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                                                                >
                                                                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Rh+", "Rh-"].map((bg) => (
                                                                        <button
                                                                            key={bg}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, bloodGroup: bg });
                                                                                setIsBloodGroupDropdownOpen(false);
                                                                            }}
                                                                            className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                                        >
                                                                            {bg}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <input
                                                        type="text"
                                                        name="allergies"
                                                        value={formData.allergies}
                                                        onChange={handleInputChange}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="Peanuts, Penicillin, etc. (Optional)"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <input
                                                        type="text"
                                                        name="currentMedications"
                                                        value={formData.currentMedications}
                                                        onChange={handleInputChange}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="Insulin, Aspirin, etc. (Optional)"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Past Surgeries</label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <input
                                                        type="text"
                                                        name="pastSurgeries"
                                                        value={formData.pastSurgeries}
                                                        onChange={handleInputChange}
                                                        className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                        placeholder="Appendectomy, ACL Repair, etc. (Optional)"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lifestyle */}
                                    <div className="md:col-span-2 pt-4 border-t border-slate-100 mt-2">
                                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            Lifestyle (Optional)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Habits</label>
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsLifestyleDropdownOpen(!isLifestyleDropdownOpen)}
                                                        className="w-full bg-white border border-teal-200 rounded-lg text-left px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 group"
                                                    >
                                                        <span className={clsx("text-base", !formData.lifestyle ? "text-gray-500" : "text-slate-900")}>
                                                            {formData.lifestyle
                                                                ? (["None", "Smoking", "Alcohol", "Smoking & Alcohol"].includes(formData.lifestyle)
                                                                    ? formData.lifestyle
                                                                    : "Others")
                                                                : "Select Lifestyle"}
                                                        </span>
                                                        <ChevronDown className={clsx("w-5 h-5 text-gray-400 transition-transform duration-200", isLifestyleDropdownOpen ? "transform rotate-180" : "")} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {isLifestyleDropdownOpen && (
                                                            <>
                                                                <div className="fixed inset-0 z-30" onClick={() => setIsLifestyleDropdownOpen(false)} />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: 10 }}
                                                                    className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-teal-100 z-40 overflow-hidden"
                                                                >
                                                                    {["None", "Smoking", "Alcohol", "Smoking & Alcohol", "Others"].map((option) => (
                                                                        <button
                                                                            key={option}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (option === "Others") {
                                                                                    setFormData({ ...formData, lifestyle: "Others" });
                                                                                } else {
                                                                                    setFormData({ ...formData, lifestyle: option });
                                                                                }
                                                                                setIsLifestyleDropdownOpen(false);
                                                                            }}
                                                                            className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition-colors border-b border-slate-50 last:border-0 font-medium"
                                                                        >
                                                                            {option}
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Show text input if 'Others' is selected or if current value is not in default list (meaning user typed it) */}
                                                {(formData.lifestyle === "Others" || (formData.lifestyle && !["None", "Smoking", "Alcohol", "Smoking & Alcohol"].includes(formData.lifestyle))) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        className="mt-3"
                                                    >
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Please specify details</label>
                                                        <input
                                                            type="text"
                                                            value={formData.lifestyle === "Others" ? "" : formData.lifestyle}
                                                            onChange={(e) => setFormData({ ...formData, lifestyle: e.target.value })}
                                                            className="block w-full border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base py-3 px-4"
                                                            placeholder="Describe your lifestyle habits..."
                                                            autoFocus
                                                        />
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Closing brace for the patient form grid */}
                                </div>
                            </motion.div>
                        )}

                        <div className="pt-6 flex gap-4">
                            {formStep === 2 && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={handleBack}
                                    className="w-1/3 py-3.5 px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-200"
                                >
                                    Back
                                </motion.button>
                            )}

                            {formStep === 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="w-full flex justify-center py-3.5 px-4 bg-slate-900 hover:bg-teal-600 rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-200 items-center gap-2 group"
                                >
                                    <span>Next Step</span>
                                </button>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                                    whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex-1 flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white transition-all duration-200
                                        ${isSubmitting
                                            ? "bg-slate-800 cursor-not-allowed"
                                            : "bg-slate-900 hover:bg-teal-600 shadow-slate-900/10 hover:shadow-teal-600/20"
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Registering...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center space-x-2">
                                            <span>Complete Registration</span>
                                        </div>
                                    )}
                                </motion.button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Avatar Selection Modal */}
            <AnimatePresence>
                {
                    showAvatarModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowAvatarModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-0 overflow-hidden"
                            >
                                {/* Modal Header */}
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">Choose Your Avatar</h3>
                                        <p className="text-sm text-slate-500">Select a profile picture that represents you</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAvatarModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>

                                {/* Avatar Grid */}
                                <div className="p-6 h-[400px] overflow-y-auto custom-scrollbar">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4"
                                    >
                                        {AVATAR_LIST.map((avatar, index) => (
                                            <motion.div
                                                key={index}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    setSelectedAvatar(avatar);
                                                    setShowAvatarModal(false);
                                                }}
                                                className={clsx(
                                                    "aspect-square cursor-pointer rounded-2xl p-1 border-2 transition-all relative group overflow-hidden bg-slate-50",
                                                    selectedAvatar === avatar
                                                        ? "border-teal-500 ring-2 ring-teal-500 ring-offset-2"
                                                        : "border-transparent hover:border-slate-200 hover:shadow-lg"
                                                )}
                                            >
                                                <img
                                                    src={avatar}
                                                    alt={`Avatar ${index + 1}`}
                                                    className="w-full h-full object-contain"
                                                    loading="lazy"
                                                />
                                                {selectedAvatar === avatar && (
                                                    <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center rounded-xl">
                                                        <div className="bg-teal-500 text-white rounded-full p-1 shadow-sm">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </div>

                                {/* Modal Footer */}
                                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                    <button
                                        onClick={() => {
                                            setSelectedAvatar("");
                                            setShowAvatarModal(false);
                                        }}
                                        className="text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Remove Current Avatar
                                    </button>
                                    <button
                                        onClick={() => setShowAvatarModal(false)}
                                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                                    >
                                        Done
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
            {/* Account Exists Modal */}
            <AnimatePresence>
                {showExistsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative"
                        >
                            <button
                                onClick={() => setShowExistsModal(false)}
                                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-teal-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Account Setup Complete!</h3>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                It looks like your account is already set up and active. You can proceed directly to your dashboard.
                            </p>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="w-full py-3.5 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                            >
                                Go to Dashboard
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default function OnboardingPage() {
    return (
        <Suspense>
            <OnboardingContent />
        </Suspense>
    );
}
