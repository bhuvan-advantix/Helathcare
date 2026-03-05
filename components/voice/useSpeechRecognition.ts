'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error';

interface UseSpeechRecognitionOptions {
    onResult: (transcript: string) => void;
    onError?: (error: string) => void;
    language?: string;
    continuous?: boolean;
}

interface UseSpeechRecognitionReturn {
    status: SpeechStatus;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    transcript: string;
}

/**
 * Custom hook wrapping the Web Speech API (SpeechRecognition).
 * Works in Chrome and Edge. Falls back gracefully in unsupported browsers.
 */
export function useSpeechRecognition({
    onResult,
    onError,
    language = 'en-IN',
    continuous = false,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
    const [status, setStatus] = useState<SpeechStatus>('idle');
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Check browser support
        const SpeechRecognition =
            (typeof window !== 'undefined' &&
                ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
        setIsSupported(!!SpeechRecognition);
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition =
            (typeof window !== 'undefined' &&
                ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

        if (!SpeechRecognition) {
            onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            setStatus('error');
            return;
        }

        // Stop any existing instance
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = language;
        recognition.continuous = continuous;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setStatus('listening');
            setTranscript('');
        };

        recognition.onresult = (event: any) => {
            setStatus('processing');
            const result = event.results[event.results.length - 1];
            if (result.isFinal) {
                const spoken = result[0].transcript;
                setTranscript(spoken);
                onResult(spoken);
            }
        };

        recognition.onerror = (event: any) => {
            const msg =
                event.error === 'not-allowed'
                    ? 'Microphone access denied. Please allow mic access and try again.'
                    : event.error === 'no-speech'
                        ? 'No speech detected. Please try again.'
                        : `Speech error: ${event.error}`;
            onError?.(msg);
            setStatus('error');
        };

        recognition.onend = () => {
            if (status !== 'error') {
                setStatus('idle');
            }
        };

        try {
            recognition.start();
        } catch (e) {
            onError?.('Could not start microphone. Please check permissions.');
            setStatus('error');
        }
    }, [language, continuous, onResult, onError, status]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setStatus('idle');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    return { status, isSupported, startListening, stopListening, transcript };
}
