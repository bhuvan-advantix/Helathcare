"use client";

import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 py-8 font-sans mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                            <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center group-hover:bg-teal-500 transition-colors duration-300">
                                <span className="text-teal-600 font-bold text-lg group-hover:text-white transition-colors">N</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800">
                                Niraiva<span className="text-teal-600">Health</span>
                            </span>
                        </Link>
                    </div>
                    <div className="text-slate-500 text-sm font-medium absolute left-1/2 -translate-x-1/2 hidden md:block">
                        © {new Date().getFullYear()} Niraiva Health Inc.
                    </div>
                    <div className="text-slate-500 text-sm font-medium md:hidden order-last">
                        © {new Date().getFullYear()} Niraiva Health Inc.
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <nav className="flex items-center gap-6 text-sm font-medium text-slate-500">
                            <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy</Link>
                            <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms</Link>
                        </nav>
                    </div>
                </div>
            </div>
        </footer>
    );
}
