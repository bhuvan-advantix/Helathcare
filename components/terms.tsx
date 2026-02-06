"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Lock, FileText, AlertCircle, HelpCircle } from 'lucide-react';

export default function Terms() {
    const [activeSection, setActiveSection] = useState('introduction');

    const sections = [
        { id: 'introduction', label: '1. Introduction', icon: <FileText className="w-4 h-4" /> },
        { id: 'medical-disclaimer', label: '2. Medical Disclaimer', icon: <AlertCircle className="w-4 h-4" /> },
        { id: 'privacy-security', label: '3. Data Privacy & Security', icon: <Lock className="w-4 h-4" /> },
        { id: 'user-responsibilities', label: '4. User Responsibilities', icon: <Shield className="w-4 h-4" /> },
        { id: 'contact', label: '5. Contact Us', icon: <HelpCircle className="w-4 h-4" /> },
    ];

    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                const currentScrollY = window.scrollY;

                if (currentScrollY > lastScrollY && currentScrollY > 100) {
                    setIsVisible(false);
                } else {
                    setIsVisible(true);
                }
                setLastScrollY(currentScrollY);
            }
        };

        window.addEventListener('scroll', controlNavbar);
        return () => window.removeEventListener('scroll', controlNavbar);
    }, [lastScrollY]);

    // Scroll Spy for Table of Contents
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -60% 0px', // Activate when section is near top
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        sections.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navbar */}
            <nav className={`fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                        <div className="w-9 h-9 bg-teal-500/10 rounded-xl flex items-center justify-center group-hover:bg-teal-500 transition-colors duration-300">
                            <span className="text-teal-600 font-bold text-xl group-hover:text-white transition-colors">N</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-800">
                            Niraiva<span className="text-teal-600">Health</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors hidden md:block">
                            Back to Home
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-teal-600 hover:text-white transition-all shadow-sm hover:shadow-md"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-16 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        {/* Left: Text */}
                        <div className="lg:w-1/2 order-2 lg:order-1">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight text-slate-900 leading-tight">
                                    Terms & <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">Conditions</span>
                                </h1>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                                    Please read these terms carefully before using our services. By accessing Niraiva Health, you agree to be bound by these terms to ensure a safe experience.
                                </p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-500">
                                    <AlertCircle className="w-4 h-4" />
                                    Last Updated: February 6, 2026
                                </div>
                            </motion.div>
                        </div>

                        {/* Right: Image */}
                        <div className="lg:w-1/2 w-full order-1 lg:order-2">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="relative h-[300px] md:h-[450px] w-full rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100"
                            >
                                <Image
                                    src="/Landing-Page.jpg"
                                    alt="Terms and Conditions Protection"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                {/* Soft overlay gradient for image better integration */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-teal-900/10 to-transparent pointer-events-none" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                    {/* Sidebar Navigation */}
                    <aside className="lg:w-1/4 w-full relative">
                        <div className="sticky top-20 z-30 bg-slate-50/95 backdrop-blur-sm lg:bg-transparent py-4 lg:py-0 -mx-4 px-4 lg:mx-0 lg:px-0 border-b lg:border-0 border-slate-200 lg:top-24 space-y-0 lg:space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-visible gap-3 lg:gap-1 scrollbar-hide">
                            <p className="hidden lg:block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">
                                Table of Contents
                            </p>
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`flex-shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 text-sm rounded-full lg:rounded-xl transition-all duration-200 whitespace-nowrap ${activeSection === section.id
                                        ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200 font-bold'
                                        : 'bg-white lg:bg-transparent border lg:border-0 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 font-medium'
                                        }`}
                                >
                                    {section.icon}
                                    {section.label}
                                    {activeSection === section.id && (
                                        <ChevronRight className="ml-auto w-4 h-4 text-teal-500 hidden lg:block" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Content Area */}
                    <div className="lg:w-3/4 space-y-16">

                        {/* 1. Introduction */}
                        <section id="introduction" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-600 font-bold text-lg">01</span>
                                <h2 className="text-2xl font-bold text-slate-900">Introduction</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p>
                                    Welcome to Niraiva Health. By accessing or using our platform, website, and services, you agree to comply with and be bound by these Terms and Conditions. These terms constitute a legally binding agreement between you ("User", "Patient", or "Provider") and Niraiva Health Inc. ("Company", "we", "us", or "our").
                                </p>
                                <p>
                                    Niraiva Health is a state-of-the-art digital health ecosystem designed to securely streamline the management and exchange of strictly confidential medical records. We are dedicated to maintaining the highest standards of data integrity, privacy, and operational excellence. By creating an account, you acknowledge that you have read, understood, and agreed to these terms, as well as our Privacy Policy and Community Guidelines.
                                </p>
                                <p>
                                    We reserve the right to modify these terms at any time to reflect changes in our services, technology, or legal obligations. Continued use of the platform after such modifications constitutes your acceptance of the new terms.
                                </p>
                            </div>
                        </section>

                        {/* 2. Medical Disclaimer */}
                        <section id="medical-disclaimer" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 font-bold text-lg">02</span>
                                <h2 className="text-2xl font-bold text-slate-900">Medical Disclaimer</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-r-xl mb-6">
                                    <p className="font-bold text-amber-900 mb-2">CRITICAL NOTICE: Not a Substitute for Professional Care</p>
                                    <p className="text-amber-800 text-base m-0">
                                        Niraiva Health is a technology platform, not a medical provider. The insights, AI-generated summaries, and data visualizations provided are for informational purposes only.
                                    </p>
                                </div>
                                <p>
                                    WE DO NOT PROVIDE MEDICAL ADVICE. All content, including text, graphics, images, and information, contained on or available through this web site is for general information purposes only.
                                </p>
                                <ul className="list-disc pl-5 mt-4 space-y-2 marker:text-amber-500">
                                    <li><strong>No Doctor-Patient Relationship:</strong> Use of this platform does not create a doctor-patient relationship between you and Niraiva Health.</li>
                                    <li><strong>Professional Judgment:</strong> Healthcare providers using this platform are expected to exercise their own independent professional judgment in diagnosing and treating patients.</li>
                                    <li><strong>Emergency Situations:</strong> If you think you may have a medical emergency, call your doctor or emergency services immediately. Do not rely on Niraiva Health for urgent medical needs.</li>
                                </ul>
                            </div>
                        </section>

                        {/* 3. Data Privacy & Security */}
                        <section id="privacy-security" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">03</span>
                                <h2 className="text-2xl font-bold text-slate-900">Data Privacy & Security</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-8">
                                    Safeguarding your privacy is the core pillar of our architecture. We strictly adhere to global data protection regulations and employ military-grade encryption standards to ensure your Protected Health Information (PHI) remains strictly confidential, secure, and immutable.
                                </p>

                                <div className="space-y-8">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">End-to-End Encryption</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                All sensitive data is encrypted using <strong>AES-256 (Advanced Encryption Standard)</strong> at rest and transferred securely via <strong>TLS 1.3 (Transport Layer Security)</strong>. This means that even in the unlikely event of a data breach, your medical records would remain completely unreadable and secure.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Strict Access Controls</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                We implement a Zero Trust security model. Access to your personal health data is strictly permission-based. Only you can grant access to doctors or hospitals via a secure, time-bound handshake protocols. We maintain comprehensive audit logs of every access attempt.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Compliance & Confidentiality</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                Our infrastructure is designed to be <strong>HIPAA</strong> and <strong>GDPR</strong> compliant. We do not sell, rent, or trade your personal health information to third parties. Your data confidentiality is paramount and legally protected.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. User Responsibilities */}
                        <section id="user-responsibilities" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-600 font-bold text-lg">04</span>
                                <h2 className="text-2xl font-bold text-slate-900">User Responsibilities</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p>
                                    To maintain the integrity and security of the Niraiva Health ecosystem, all users must adhere to strict guidelines. By using our platform, you explicitly agree to the following responsibilities:
                                </p>
                                <ul className="list-disc pl-5 mt-4 space-y-4 marker:text-teal-500">
                                    <li>
                                        <strong>Accuracy of Information:</strong> You certify that all information you provide, including personal details, medical history, and professional credentials, is accurate, current, and complete. Falsifying medical records is a serious violation of our terms.
                                    </li>
                                    <li>
                                        <strong>Account Security:</strong> You are solely responsible for safeguarding your login credentials. You must use a strong, unique password and immediately notify us of any unauthorized access or suspected security breaches.
                                    </li>
                                    <li>
                                        <strong>Lawful Use:</strong> You agree to use the platform exclusively for lawful purposes. Any attempt to exploit, reverse engineer, or compromise the security of the platform will result in immediate termination of access and potential legal action.
                                    </li>
                                    <li>
                                        <strong>Respectful Conduct:</strong> You agree to treat all healthcare professionals and staff with respect. Harassment, abuse, or inappropriate behavior towards doctors or other users is strictly prohibited.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* 5. Contact Us */}
                        <section id="contact" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold text-lg">05</span>
                                <h2 className="text-2xl font-bold text-slate-900">Contact Us</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-8">
                                    We value your feedback and are here to assist you. If you have any inquiries regarding these Terms, Data Privacy concerns, or need to report a security issue, please reach out to our dedicated teams.
                                </p>

                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="flex gap-4 items-start p-6 rounded-2xl border border-slate-100 hover:shadow-lg hover:border-teal-200 hover:-translate-y-1 transition-all duration-300 bg-white group cursor-pointer">
                                        <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                            <HelpCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 m-0 group-hover:text-teal-700 transition-colors">General Support</h3>
                                            <p className="text-sm text-slate-500 mb-2">For account, usage, and general queries</p>
                                            <a href="mailto:support@niraiva.com" className="text-lg text-teal-600 font-bold hover:underline">support@niraiva.com</a>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start p-6 rounded-2xl border border-slate-100 hover:shadow-lg hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 bg-white group cursor-pointer">
                                        <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 m-0 group-hover:text-purple-700 transition-colors">Security & Privacy</h3>
                                            <p className="text-sm text-slate-500 mb-2">For compliance and security reporting</p>
                                            <a href="mailto:security@niraiva.com" className="text-lg text-purple-600 font-bold hover:underline">security@niraiva.com</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 py-8 font-sans mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">

                        {/* Left: Logo */}
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

                        {/* Center: Copyright */}
                        <div className="text-slate-500 text-sm font-medium absolute left-1/2 -translate-x-1/2 hidden md:block">
                            © {new Date().getFullYear()} Niraiva Health Inc.
                        </div>
                        {/* Mobile Copyright (visible only on small screens) */}
                        <div className="text-slate-500 text-sm font-medium md:hidden order-last">
                            © {new Date().getFullYear()} Niraiva Health Inc.
                        </div>

                        {/* Right: Links */}
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <nav className="flex items-center gap-6 text-sm font-medium text-slate-500">
                                <Link href="/privacy" className="hover:text-teal-600 transition-colors">Privacy</Link>
                                <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms</Link>
                            </nav>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
