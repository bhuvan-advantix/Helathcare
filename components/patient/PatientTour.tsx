'use client';

import { useState, useEffect } from 'react';
import Joyride, { Step, TooltipRenderProps, CallBackProps, STATUS } from 'react-joyride';
import { usePathname } from 'next/navigation';
import { Check, ChevronRight, X } from 'lucide-react';

const CustomTooltip = ({
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
}: TooltipRenderProps) => {
    return (
        <div
            {...tooltipProps}
            className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-slate-100 max-w-[340px] w-full relative z-[10000]"
        >
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-black shadow-sm">
                        {index + 1}
                    </span>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">
                        Platform Tour
                    </span>
                </div>
                <button
                    {...skipProps}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="text-slate-600 text-[15px] font-medium leading-relaxed mb-7 pb-2">
                {step.content}
            </div>

            <div className="flex items-center justify-between pt-5 border-t-2 border-slate-50 mt-2">
                <button
                    {...skipProps}
                    className="text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                >
                    Skip Tour
                </button>
                <div className="flex gap-2">
                    {!isLastStep ? (
                        <button
                            {...primaryProps}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-1.5 transition-all shadow-xl shadow-teal-200"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            {...closeProps}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-1.5 transition-all shadow-xl shadow-slate-200"
                        >
                            Finish <Check className="w-4 h-4 text-emerald-400" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function PatientTour() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [validSteps, setValidSteps] = useState<Step[]>([]);

    useEffect(() => {
        setIsMounted(true);
        setRun(false);
        setStepIndex(0);

        // Add a delay so elements fully render on the page first, then filter valid steps
        const timer = setTimeout(() => {
            const availableSteps = steps.filter(step => {
                return document.querySelector(step.target as string) !== null;
            });

            if (availableSteps.length > 0) {
                setValidSteps(availableSteps);
                setRun(true);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [pathname]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, type, index, action } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (type === 'step:after' || type === 'error:target_not_found') {
            setStepIndex(index + (action === 'prev' ? -1 : 1));
        } else if (finishedStatuses.includes(status)) {
            setRun(false);
        }
    };

    const steps: Step[] = [
        // --- DASHBOARD / SIDEBAR ELEMENTS ---
        {
            target: '.tour-ai-chatbot',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Meet Your Assistant</strong>
                    Need quick help or health advice? Chat with our AI assistant anywhere on the platform. Try using the Mic feature to speak your queries!
                </div>
            ),
            placement: 'top-start',
            disableBeacon: true,
        },

        // --- MAIN DASHBOARD (`/dashboard`) ---
        {
            target: '.tour-health-card',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Universal ID Card</strong>
                    Your digital health identity resides here. It logs your Blood Type, Age, and Emergency info. Flip the card for full details.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '.tour-health-parameters',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Live Vitals Tracker</strong>
                    Keep a close eye on your latest vitals. Values in <span className="text-emerald-500 font-bold bg-emerald-50 px-1 rounded">Green</span> are normal, while <span className="text-red-500 font-bold bg-red-50 px-1 rounded">Red</span> flags require attention.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '.tour-doctor-notes',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Clinical Notes</strong>
                    Review the medical notes and directions left by your doctor after a recent consultation right here on your dashboard.
                </div>
            ),
            placement: 'top',
            disableBeacon: true,
        },
        {
            target: '.tour-current-medications',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Active Prescriptions</strong>
                    Track your current medications, frequency, and underlying chronic conditions in this panel.
                </div>
            ),
            placement: 'top',
            disableBeacon: true,
        },

        // --- HEALTH PARAMETERS HISTORY (`/dashboard/health`) ---
        {
            target: '.tour-history-charts',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Health History Trends</strong>
                    Monitor how your vitals are trending over weeks and months through interactive medical charts and historical logs.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },

        // --- LAB REPORTS (`/dashboard/lab-reports` AND INDIVIDUAL REPORTS) ---
        {
            target: '.tour-upload-report',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Secure Uploads</strong>
                    Consolidate your medical history. Upload old PDF lab reports from any hospital into our system with one click.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '.tour-download-report',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">View Original Record</strong>
                    You can always retrieve and securely download the original PDF report you or your healthcare provider uploaded.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '.tour-ai-parameter-row',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">✨ AI-Powered Analysis</strong>
                    The magic happens here! Click this parameter row (or any other) to receive an easy-to-understand, AI-generated explanation of your results.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },

        // --- TIMELINE & DIAGNOSTIC (`/timeline` & `/diagnostic`) ---
        {
            target: '.tour-timeline-feed',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Medical Timeline</strong>
                    Scroll comprehensively through a chronological history of your past appointments, completed treatments, and holistic care pathways.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },

        // --- PROFILE PAGE (`/profile`) ---
        {
            target: '.tour-profile-settings',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Profile Management</strong>
                    Keep your personal details up to date, manage your system password, and verify your health profile details.
                </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
        },

        // --- HELP AND SUPPORT (`/support`) ---
        {
            target: '.tour-help-support',
            content: (
                <div>
                    <strong className="block text-slate-900 mb-2 text-lg font-black tracking-tight">Help Center</strong>
                    Having trouble navigating or need administrative assistance? Open support tickets or securely view FAQs here.
                </div>
            ),
            placement: 'top',
            disableBeacon: true,
        }
    ];

    if (!isMounted) return null;

    return (
        <Joyride
            steps={validSteps}
            stepIndex={stepIndex}
            run={run}
            continuous={true}
            showSkipButton={true}
            showProgress={true}
            callback={handleJoyrideCallback}
            tooltipComponent={CustomTooltip}
            styles={{
                options: {
                    zIndex: 10000,
                    arrowColor: '#ffffff',
                    overlayColor: 'rgba(15, 23, 42, 0.4)', // Slate-900 with slate backdrop
                },
            }}
        />
    );
}
