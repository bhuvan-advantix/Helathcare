"use client";

import { useState, useEffect } from "react";
import { submitPostCheckin } from "@/app/actions/checkin";
import { AlertCircle, Star } from "lucide-react";
import Image from "next/image";
import Footer from "@/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppointmentInfo {
    date: string;
    doctorName?: string | null;
    hospitalName?: string | null;
    time?: string | null;
    patientName?: string;
    customId?: string;
}

interface Props {
    token: string;
    status: "valid" | "already_submitted" | "expired" | "invalid" | "wrong_patient";
    session: { userId: string; name?: string | null } | null;
    appointmentInfo: AppointmentInfo | null;
}

// ─── Constants & Questions ────────────────────────────────────────────────────
type QuestionType = "radio" | "checkbox" | "conditional" | "textarea" | "rating";

interface Question {
    id: string;
    page: number;
    type: QuestionType;
    text: string;
    options?: string[];
    allowOther?: boolean;
    conditionalTriggers?: string[];
    conditionalLabel?: string;
    placeholder?: string;
}

const QUESTIONS: Question[] = [
    // Page 1: General Recovery
    {
        id: "q1", page: 1, type: "radio",
        text: "1. How are you feeling now compared to your last visit?",
        options: ["Much better", "Slightly better", "No change", "Worse"]
    },
    {
        id: "q2", page: 1, type: "radio",
        text: "2. Are your main symptoms still present?",
        options: ["Yes", "No", "Some are gone, some remain"]
    },
    {
        id: "q3", page: 1, type: "checkbox", allowOther: true,
        text: "3. Which symptoms are you still having?",
        options: ["Pain", "Fever", "Cough / cold", "Headache", "Stomach issue", "Skin issue", "Weakness", "None"]
    },
    {
        id: "q4", page: 1, type: "radio",
        text: "4. Have your symptoms reduced?",
        options: ["Completely gone", "Reduced", "Same as before", "Increased"]
    },
    // Page 2: Medications & Advice
    {
        id: "q5", page: 2, type: "radio",
        text: "5. Are you taking the prescribed medicines?",
        options: ["Yes, regularly", "Sometimes missed", "Not taking"]
    },
    {
        id: "q6", page: 2, type: "conditional", 
        conditionalTriggers: ["Yes (mild)", "Yes (serious)"],
        conditionalLabel: "Please describe the side effects:",
        text: "6. Did you face any side effects from medicines?",
        options: ["No", "Yes (mild)", "Yes (serious)"]
    },
    {
        id: "q7", page: 2, type: "radio",
        text: "7. Are you following the doctor's advice? (diet/rest)",
        options: ["Yes", "Partially", "No"]
    },
    {
        id: "q8", page: 2, type: "radio",
        text: "8. Do you still feel pain or discomfort?",
        options: ["No", "Mild", "Moderate", "Severe"]
    },
    // Page 3: New Developments & Follow-up
    {
        id: "q9", page: 3, type: "conditional",
        conditionalTriggers: ["Yes"],
        conditionalLabel: "What new symptoms or issues have started?",
        text: "9. Has anything new started after your visit?",
        options: ["No", "Yes"]
    },
    {
        id: "q10", page: 3, type: "radio",
        text: "10. Do you feel you need another consultation?",
        options: ["Yes", "No", "Not sure"]
    },
    {
        id: "q11", page: 3, type: "radio",
        text: "11. Would you like to book a follow-up appointment?",
        options: ["Yes", "Later", "No"]
    },
    // Page 4: Satisfaction
    {
        id: "q12", page: 4, type: "rating",
        text: "12. Are you satisfied with your treatment so far?"
    },
    {
        id: "q13", page: 4, type: "radio",
        text: "13. How would you rate your overall recovery progress?",
        options: ["0–25%", "25–50%", "50–75%", "75–100%"]
    },
    {
        id: "q14", page: 4, type: "textarea",
        text: "14. Any additional comments?",
        placeholder: "Tell us anything you'd like the doctor to know..."
    },
    {
        id: "q15", page: 4, type: "radio",
        text: "15. Do you want a reminder for follow-up?",
        options: ["Yes", "No"]
    }
];

const TOTAL_PAGES = 4;

// ─── Simple Navbar specifically for Forms ─────────────────────────────────────
function FormNavbar() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (typeof window !== 'undefined') {
                const currentScrollY = window.scrollY;
                if (currentScrollY > lastScrollY && currentScrollY > 50) {
                    setIsVisible(false); // scrolling down
                } else {
                    setIsVisible(true);  // scrolling up
                }
                setLastScrollY(currentScrollY);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    return (
        <div 
            className={`w-full bg-white border-b border-slate-200 fixed top-0 z-50 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
        >
            <div className="w-full px-4 sm:px-8 h-16 flex items-center">
                <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
                        <Image
                            src="/Nrivaa Logo.jpeg"
                            alt="Niraiva Logo"
                            fill
                            className="object-cover"
                            sizes="32px"
                        />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-800">
                        Niraiva<span className="text-teal-600">Health</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Status Screen Component ──────────────────────────────────────────────────
function StatusScreen({ type }: { type: string }) {
    const config: any = {
        already_submitted: { title: "Already Submitted", message: "You have already completed this form. Your doctor will review your updates." },
        expired: { title: "Link Expired", message: "This link has expired. You can still book an appointment directly." },
        invalid: { title: "Invalid Link", message: "This link is invalid or has already been used." },
        wrong_patient: { title: "Access Denied", message: "Please log in with the correct account." },
        success: { title: "Submitted successfully", message: "Thank you for completing your recovery check-in. Your doctor can now review your progress!" },
    };
    const c = config[type] || config.invalid;
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
            <FormNavbar />
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-lg w-full p-8 md:p-12 text-center border-t-8 border-t-teal-600">
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-800 mb-4">{c.title}</h1>
                    <p className="text-slate-600 mb-8">{c.message}</p>
                    <a 
                        href="/dashboard" 
                        className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-2.5 rounded-md transition-colors"
                    >
                        Return to Dashboard
                    </a>
                </div>
            </div>
            <Footer />
        </div>
    );
}

// ─── Main Form Component ──────────────────────────────────────────────────────
export default function PostCheckinForm({ token, status, session, appointmentInfo }: Props) {
    const [page, setPage] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    
    // Form Values
    const [values, setValues] = useState<Record<string, string | string[] | number>>({});
    const [otherText, setOtherText] = useState<Record<string, string>>({});
    const [conditionalText, setConditionalText] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Early Returns for token statuses
    if (submitted) return <StatusScreen type="success" />;
    if (status !== "valid") return <StatusScreen type={status} />;

    // --- Answer Handlers ---
    const handleRadioChange = (qId: string, val: string | number) => {
        setValues(prev => ({ ...prev, [qId]: val }));
    };

    const handleCheckboxChange = (qId: string, val: string) => {
        setValues(prev => {
            const current = (prev[qId] as string[]) || [];
            let updated;
            if (current.includes(val)) {
                updated = current.filter(item => item !== val);
            } else {
                updated = [...current, val];
            }
            return { ...prev, [qId]: updated };
        });
    };

    const handleNext = () => {
        setPage(p => p + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleBack = () => {
        setPage(p => Math.max(1, p - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleClearSelection = (qId: string) => {
        setValues(prev => {
            const newValues = { ...prev };
            delete newValues[qId];
            return newValues;
        });
    }

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);

        // Format answers for JSON storage
        const formattedAnswers = QUESTIONS.map(q => {
            let finalAnswer: any = values[q.id];
            
            if ((q.type === 'radio' || q.type === 'conditional') && finalAnswer === '__other__') {
                finalAnswer = `Other: ${otherText[q.id] || ''}`;
            } else if (q.type === 'checkbox') {
                const checks = (finalAnswer as string[]) || [];
                finalAnswer = checks.map(c => c === '__other__' ? `Other: ${otherText[q.id] || ''}` : c);
            } else if (q.type === 'conditional') {
                if (q.conditionalTriggers?.includes(finalAnswer as string)) {
                    finalAnswer = `${finalAnswer} - ${conditionalText[q.id] || ''}`;
                }
            } else if (q.type === 'rating') {
                finalAnswer = finalAnswer ? `${finalAnswer} Stars` : "";
            }

            return {
                id: q.id,
                question: q.text,
                answer: finalAnswer || "",
            };
        });

        const payload = {
            responses: formattedAnswers,
            submittedAt: new Date().toISOString(),
        };

        const result = await submitPostCheckin(token, payload);
        if (result.success) {
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            setSubmitError(result.error || "An error occurred during submission.");
            setSubmitting(false);
        }
    };

    // --- Render ---
    const pageQuestions = QUESTIONS.filter(q => q.page === page);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col pt-16">
            <FormNavbar />
            
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 w-full">
                {page === 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-t-8 border-t-teal-600 p-6 sm:p-8 mb-6">
                        <h1 className="text-2xl sm:text-3xl font-medium text-slate-800 mb-4">Post-Visit Recovery Check-In</h1>
                        {appointmentInfo && (
                            <div className="text-[15px] sm:text-base text-slate-600 leading-relaxed space-y-2">
                                <p>Following up on your appointment with {appointmentInfo.doctorName || "Doctor"} from {appointmentInfo.date}.</p>
                                <p>Please fill out this form to help us understand your recovery progress after your visit.</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    {pageQuestions.map(q => {
                        return (
                            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 transition-shadow hover:shadow-md">
                                <div className="text-base sm:text-lg text-slate-800 font-medium mb-5">
                                    {q.text}
                                </div>

                                {/* Options (Radio behaving as Tickbox) */}
                                {q.type === 'radio' && (
                                    <div className="space-y-4">
                                        {q.options?.map(opt => (
                                            <label key={opt} className="flex items-start gap-4 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={values[q.id] === opt} 
                                                    onChange={() => handleRadioChange(q.id, opt)}
                                                    className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                />
                                                <span className="text-[15px] text-slate-700 leading-relaxed group-hover:text-slate-900">{opt}</span>
                                            </label>
                                        ))}
                                        {q.allowOther && (
                                            <label className="flex items-start sm:items-center gap-4 cursor-pointer group flex-col sm:flex-row">
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={values[q.id] === '__other__'} 
                                                        onChange={() => handleRadioChange(q.id, '__other__')}
                                                        className="mt-1 sm:mt-0 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                    />
                                                    <span className="text-[15px] text-slate-700">Other:</span>
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={otherText[q.id] || ''}
                                                    onChange={(e) => {
                                                        setOtherText(prev => ({ ...prev, [q.id]: e.target.value }));
                                                        if (values[q.id] !== '__other__') handleRadioChange(q.id, '__other__');
                                                    }}
                                                    className="w-full sm:flex-1 border-0 border-b border-slate-300 focus:ring-0 focus:border-teal-600 bg-transparent px-2 py-1 text-[15px]"
                                                    placeholder={values[q.id] === '__other__' ? "Please type..." : ""}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}

                                {/* Conditional Radio Options (Also behaving as tickbox) */}
                                {q.type === 'conditional' && (
                                    <div className="space-y-4">
                                        {q.options?.map(opt => (
                                            <label key={opt} className="flex items-start gap-4 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={values[q.id] === opt} 
                                                    onChange={() => handleRadioChange(q.id, opt)}
                                                    className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                />
                                                <span className="text-[15px] text-slate-700 leading-relaxed group-hover:text-slate-900">{opt}</span>
                                            </label>
                                        ))}
                                        {q.conditionalTriggers?.includes(values[q.id] as string) && (
                                            <div className="ml-9 mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                <div className="text-sm font-medium text-slate-700 mb-3">{q.conditionalLabel}</div>
                                                <input 
                                                    type="text"
                                                    value={conditionalText[q.id] || ''}
                                                    onChange={(e) => setConditionalText(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                    className="w-full border-0 border-b border-slate-300 focus:ring-0 focus:border-teal-600 bg-transparent px-0 py-2 text-[15px]"
                                                    placeholder="Your answer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Checkbox Options */}
                                {q.type === 'checkbox' && (
                                    <div className="space-y-4">
                                        {q.options?.map(opt => {
                                            const isChecked = ((values[q.id] as string[]) || []).includes(opt);
                                            return (
                                                <label key={opt} className="flex items-start gap-4 cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked} 
                                                        onChange={() => handleCheckboxChange(q.id, opt)}
                                                        className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                    />
                                                    <span className="text-[15px] text-slate-700 leading-relaxed group-hover:text-slate-900">{opt}</span>
                                                </label>
                                            );
                                        })}
                                        {q.allowOther && (
                                            <label className="flex items-start sm:items-center gap-4 cursor-pointer group flex-col sm:flex-row">
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={((values[q.id] as string[]) || []).includes('__other__')} 
                                                        onChange={() => handleCheckboxChange(q.id, '__other__')}
                                                        className="mt-1 sm:mt-0 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                                                    />
                                                    <span className="text-[15px] text-slate-700">Other:</span>
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={otherText[q.id] || ''}
                                                    onChange={(e) => {
                                                        setOtherText(prev => ({ ...prev, [q.id]: e.target.value }));
                                                        const arr = (values[q.id] as string[]) || [];
                                                        if (!arr.includes('__other__')) handleCheckboxChange(q.id, '__other__');
                                                    }}
                                                    className="w-full sm:flex-1 border-0 border-b border-slate-300 focus:ring-0 focus:border-teal-600 bg-transparent px-2 py-1 text-[15px]"
                                                    placeholder={((values[q.id] as string[]) || []).includes('__other__') ? "Please type..." : ""}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}

                                {/* Rating Component */}
                                {q.type === 'rating' && (
                                    <div className="flex gap-2 sm:gap-4 mt-4">
                                        {[1, 2, 3, 4, 5].map(star => {
                                            const currentRating = (values[q.id] as number) || 0;
                                            return (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => handleRadioChange(q.id, star)}
                                                    className={`p-2 transition-colors duration-200 ${
                                                        currentRating >= star ? 'text-teal-500' : 'text-slate-200 hover:text-teal-200'
                                                    }`}
                                                >
                                                    <Star className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Textarea */}
                                {q.type === 'textarea' && (
                                    <div className="mt-2">
                                        <textarea
                                            value={(values[q.id] as string) || ''}
                                            onChange={(e) => handleRadioChange(q.id, e.target.value)}
                                            placeholder={q.placeholder || "Your answer"}
                                            className="w-full border-0 border-b border-slate-300 focus:ring-0 focus:border-teal-600 bg-transparent px-0 py-2 text-[15px] min-h-[60px] resize-y"
                                        />
                                    </div>
                                )}

                                {/* Clear selection specifically for single-choice to mimic forms */}
                                {(q.type === 'radio' || q.type === 'conditional' || q.type === 'rating') && values[q.id] && (
                                    <div className="flex justify-end mt-4">
                                        <button 
                                            onClick={() => handleClearSelection(q.id)}
                                            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Clear selection
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Controls */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 mt-8">
                    {page > 1 ? (
                        <button 
                            onClick={handleBack} 
                            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-md font-medium transition-colors w-full sm:w-auto"
                        >
                            Back
                        </button>
                    ) : (
                        <div className="hidden sm:block" /> // Spacer
                    )}

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                        <span className="text-sm font-medium text-slate-500">Page {page} of {TOTAL_PAGES}</span>
                        {page < TOTAL_PAGES ? (
                            <button 
                                onClick={handleNext} 
                                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-md font-medium transition-colors shadow-sm w-1/2 sm:w-auto text-center"
                            >
                                Next
                            </button>
                        ) : (
                            <button 
                                disabled={submitting} 
                                onClick={handleSubmit} 
                                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-md font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed w-1/2 sm:w-auto text-center"
                            >
                                {submitting ? "Submitting..." : "Submit"}
                            </button>
                        )}
                    </div>
                </div>

                {submitError && (
                    <div className="mt-6 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{submitError}</p>
                    </div>
                )}
                
                {/* Form Footer Text */}
                <div className="mt-12 text-center text-xs text-slate-500 pb-8">
                    Information is securely encrypted. Never submit passwords through Health Assessment forms.
                </div>
            </div>
            <Footer />
        </div>
    );
}
