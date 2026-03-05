'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { matchVoiceCommand, stripFillerWords, VoiceCommandAction } from './voiceCommands';
import VoiceToast, { VoiceToastData } from './VoiceToast';

/**
 * VoiceMic — Floating microphone button for voice-command navigation.
 * Renders only for authenticated patients on allowed pages.
 */
export default function VoiceMic() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [toast, setToast] = useState<VoiceToastData | null>(null);

    // Only show on patient-facing pages
    const isAllowed =
        !!session &&
        (pathname?.startsWith('/dashboard') ||
            pathname?.startsWith('/timeline') ||
            pathname?.startsWith('/diagnostic') ||
            pathname?.startsWith('/profile'));

    const showToast = useCallback((data: VoiceToastData) => {
        setToast(data);
    }, []);

    const dismissToast = useCallback(() => {
        setToast(null);
    }, []);

    const executeAction = useCallback(
        (action: VoiceCommandAction) => {
            if (action.type === 'navigate') {
                router.push(action.path);
            } else if (action.type === 'navigate_highlight') {
                router.push(`${action.path}?highlight=${action.highlight}`);
            } else if (action.type === 'navigate_section') {
                router.push(`${action.path}?section=${action.section}`);
            }
        },
        [router]
    );

    const handleResult = useCallback(
        (transcript: string) => {
            // Show what we heard
            showToast({ type: 'heard', message: `🎙️ "${transcript}"` });

            // Try matching the raw transcript first
            let command = matchVoiceCommand(transcript);

            // If no match, try stripping fillers and retry
            if (!command) {
                const stripped = stripFillerWords(transcript);
                if (stripped && stripped !== transcript.toLowerCase().trim()) {
                    command = matchVoiceCommand(stripped);
                }
            }

            if (command) {
                setTimeout(() => {
                    showToast({ type: 'success', message: command!.label, subMessage: 'Navigating...' });
                    setTimeout(() => executeAction(command!.action), 400);
                }, 700);
            } else {
                // Friendly fallback — no harsh error
                setTimeout(() => {
                    showToast({
                        type: 'error',
                        message: '🤔 Didn\'t catch that',
                        subMessage: 'Tap mic and try again',
                    });
                }, 700);
            }
        },
        [showToast, executeAction]
    );

    const handleError = useCallback(
        (error: string) => {
            showToast({ type: 'error', message: error });
        },
        [showToast]
    );

    const { status, isSupported, startListening, stopListening } = useSpeechRecognition({
        onResult: handleResult,
        onError: handleError,
        language: 'en-IN',
    });

    const isListening = status === 'listening';

    const handleMicClick = () => {
        if (!isSupported) {
            showToast({
                type: 'error',
                message: 'Not supported',
                subMessage: 'Please use Chrome or Edge browser.',
            });
            return;
        }
        if (isListening) {
            stopListening();
            setToast(null);
        } else {
            showToast({ type: 'listening', message: '🎙️ Listening...', subMessage: 'Say a command' });
            startListening();
        }
    };

    // Handle ?highlight= and ?section= URL params for scroll/highlight after navigation
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const highlight = params.get('highlight');

        if (highlight) {
            setTimeout(() => {
                const el = document.getElementById(highlight);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('voice-highlight');
                    setTimeout(() => el.classList.remove('voice-highlight'), 3000);
                }
                window.history.replaceState({}, '', window.location.pathname);
            }, 800);
        }
    }, [pathname]);

    if (!isAllowed) return null;

    return (
        <>
            {/* Mic Button */}
            <button
                id="voice-mic-btn"
                onClick={handleMicClick}
                title={isListening ? 'Stop listening' : 'Voice command'}
                aria-label={isListening ? 'Stop voice command' : 'Start voice command'}
                className={`
                    fixed bottom-28 sm:bottom-12 right-4 sm:right-6 z-[9999]
                    w-14 h-14 rounded-full shadow-xl
                    flex items-center justify-center
                    transition-all duration-300 hover:scale-110
                    focus:outline-none focus:ring-4
                    ${isListening
                        ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200 shadow-red-300 animate-pulse-mic'
                        : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-200 shadow-teal-300'
                    }
                `}
            >
                {isListening ? (
                    <MicOff className="w-6 h-6 text-white" />
                ) : (
                    <Mic className="w-6 h-6 text-white" />
                )}

                {/* Ripple rings when listening */}
                {isListening && (
                    <>
                        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                        <span className="absolute -inset-2 rounded-full bg-red-300 animate-ping opacity-20 [animation-delay:0.3s]" />
                    </>
                )}
            </button>

            {/* Toast Feedback */}
            <VoiceToast toast={toast} onDismiss={dismissToast} />
        </>
    );
}
