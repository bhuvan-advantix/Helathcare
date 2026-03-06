'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Mic, X } from 'lucide-react';

export type ToastType = 'heard' | 'success' | 'error' | 'listening';

export interface VoiceToastData {
    type: ToastType;
    message: string;
    subMessage?: string;
}

interface VoiceToastProps {
    toast: VoiceToastData | null;
    onDismiss: () => void;
}

const TOAST_COLORS: Record<ToastType, string> = {
    heard: 'bg-slate-800 border-slate-700',
    success: 'bg-teal-700 border-teal-600',
    error: 'bg-red-700 border-red-600',
    listening: 'bg-indigo-700 border-indigo-600',
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
    heard: <Mic className="w-4 h-4 text-white" />,
    success: <CheckCircle2 className="w-4 h-4 text-white" />,
    error: <AlertCircle className="w-4 h-4 text-white" />,
    listening: <Mic className="w-4 h-4 text-white animate-pulse" />,
};

const AUTO_DISMISS_MS: Record<ToastType, number> = {
    heard: 2500,
    success: 2500,
    error: 4000,
    listening: 0, // no auto-dismiss while listening
};

export default function VoiceToast({ toast, onDismiss }: VoiceToastProps) {
    useEffect(() => {
        if (!toast) return;
        const delay = AUTO_DISMISS_MS[toast.type];
        if (!delay) return;
        const timer = setTimeout(onDismiss, delay);
        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    key={toast.message}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`fixed bottom-36 sm:bottom-44 right-4 sm:right-6 z-[9999] flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-2xl text-white max-w-[280px] ${TOAST_COLORS[toast.type]}`}
                >
                    <div className="mt-0.5 shrink-0">
                        {TOAST_ICONS[toast.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight truncate">{toast.message}</p>
                        {toast.subMessage && (
                            <p className="text-xs text-white/70 mt-0.5 leading-tight">{toast.subMessage}</p>
                        )}
                    </div>
                    <button
                        onClick={onDismiss}
                        className="shrink-0 p-0.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-white/70" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
