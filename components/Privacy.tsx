"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Lock, FileText, AlertCircle, Eye, Database, UserCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import DashboardNavbar from '@/components/DashboardNavbar';

export default function Privacy() {
    const { data: session, status } = useSession();
    const [activeSection, setActiveSection] = useState('introduction');

    const sections = [
        { id: 'introduction', label: '1. Introduction', icon: <FileText className="w-4 h-4" /> },
        { id: 'data-collection', label: '2. Data We Collect', icon: <Database className="w-4 h-4" /> },
        { id: 'data-usage', label: '3. How We Use Your Data', icon: <Eye className="w-4 h-4" /> },
        { id: 'data-protection', label: '4. Data Protection', icon: <Lock className="w-4 h-4" /> },
        { id: 'your-rights', label: '5. Your Rights', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'contact', label: '6. Contact Us', icon: <Shield className="w-4 h-4" /> },
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
            rootMargin: '-20% 0px -60% 0px',
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
            {/* Conditional Navbar */}
            {session ? (
                <DashboardNavbar user={session.user} />
            ) : (
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
            )}

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
                                    Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">Policy</span>
                                </h1>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                                    Your privacy is our priority. Learn how we collect, use, and protect your personal health information with the highest standards of security and confidentiality.
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
                                    src="/privacy.png"
                                    alt="Privacy and Healthcare Protection"
                                    fill
                                    className="object-cover"
                                    priority
                                />
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
                                    At Niraiva Health, we understand that your health information is deeply personal and sensitive. This Privacy Policy outlines our commitment to protecting your Protected Health Information (PHI) and explains how we collect, use, store, and safeguard your data in compliance with applicable privacy laws including HIPAA (Health Insurance Portability and Accountability Act) and GDPR (General Data Protection Regulation).
                                </p>
                                <p>
                                    By using our platform, you entrust us with your most sensitive information. We take this responsibility seriously and have implemented comprehensive security measures and privacy practices to ensure your data remains confidential, secure, and under your control at all times.
                                </p>
                                <p>
                                    This policy applies to all users of the Niraiva Health platform, including patients, healthcare providers, and hospital administrators. We encourage you to read this policy carefully to understand your rights and our obligations.
                                </p>
                            </div>
                        </section>

                        {/* 2. Data We Collect */}
                        <section id="data-collection" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">02</span>
                                <h2 className="text-2xl font-bold text-slate-900">Data We Collect</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-6">
                                    We collect various types of information to provide you with secure and efficient healthcare management services:
                                </p>

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <UserCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Personal Information</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                Name, date of birth, gender, contact information (email, phone number, address), emergency contact details, and government-issued identification numbers for verification purposes.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Medical Information</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                Medical history, diagnoses, treatment records, prescriptions, lab results, imaging reports, allergies, immunization records, and any other health-related information you or your healthcare provider uploads to the platform.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Database className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Technical Data</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                IP address, browser type, device information, operating system, access times, and pages viewed. This data helps us improve our services and ensure platform security.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. How We Use Your Data */}
                        <section id="data-usage" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold text-lg">03</span>
                                <h2 className="text-2xl font-bold text-slate-900">How We Use Your Data</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-6">
                                    Your data is used exclusively for legitimate healthcare purposes and platform operations. We never sell your personal health information to third parties.
                                </p>

                                <ul className="list-disc pl-5 mt-4 space-y-3 marker:text-teal-500">
                                    <li>
                                        <strong>Healthcare Delivery:</strong> Facilitating communication between you and your healthcare providers, enabling secure sharing of medical records, and supporting continuity of care across different healthcare facilities.
                                    </li>
                                    <li>
                                        <strong>Platform Operations:</strong> Managing your account, processing authentication requests, providing customer support, and maintaining the functionality and security of our services.
                                    </li>
                                    <li>
                                        <strong>Analytics & Improvement:</strong> Analyzing aggregated, de-identified data to improve our services, develop new features, and enhance user experience. Individual users are never identifiable in these analyses.
                                    </li>
                                    <li>
                                        <strong>Legal Compliance:</strong> Meeting our legal obligations, responding to lawful requests from authorities, and protecting the rights and safety of our users and the public.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* 4. Data Protection */}
                        <section id="data-protection" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 font-bold text-lg">04</span>
                                <h2 className="text-2xl font-bold text-slate-900">Data Protection & Security</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-8">
                                    We employ industry-leading security measures to protect your data from unauthorized access, disclosure, alteration, or destruction. Our multi-layered security approach includes:
                                </p>

                                <div className="space-y-8">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Military-Grade Encryption</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                All data is encrypted using <strong>AES-256 encryption</strong> at rest and <strong>TLS 1.3</strong> in transit. This ensures that even if data is intercepted, it remains completely unreadable without the proper decryption keys.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Access Controls</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                We implement role-based access controls (RBAC) and the principle of least privilege. Healthcare providers can only access patient records with explicit patient consent, and all access is logged and auditable.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Eye className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Continuous Monitoring</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                Our security team monitors the platform 24/7 for suspicious activity, potential breaches, and security vulnerabilities. We conduct regular security audits and penetration testing to identify and address potential risks.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                                            <Database className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 mt-0">Data Backup & Recovery</h3>
                                            <p className="text-base text-slate-600 m-0">
                                                We maintain secure, encrypted backups of all data to ensure business continuity and data recovery in case of system failures or disasters. Backups are stored in geographically distributed data centers.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 5. Your Rights */}
                        <section id="your-rights" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold text-lg">05</span>
                                <h2 className="text-2xl font-bold text-slate-900">Your Privacy Rights</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-6">
                                    You have complete control over your personal health information. Under applicable privacy laws, you have the following rights:
                                </p>

                                <ul className="list-disc pl-5 mt-4 space-y-4 marker:text-teal-500">
                                    <li>
                                        <strong>Right to Access:</strong> You can request a copy of all personal and medical information we hold about you at any time. We will provide this information in a commonly used electronic format.
                                    </li>
                                    <li>
                                        <strong>Right to Rectification:</strong> If you believe any information we hold is inaccurate or incomplete, you have the right to request corrections or updates.
                                    </li>
                                    <li>
                                        <strong>Right to Erasure:</strong> You can request deletion of your account and associated data, subject to legal retention requirements for medical records.
                                    </li>
                                    <li>
                                        <strong>Right to Restrict Processing:</strong> You can request that we limit how we use your data in certain circumstances, such as while we verify the accuracy of information.
                                    </li>
                                    <li>
                                        <strong>Right to Data Portability:</strong> You can request to receive your data in a structured, machine-readable format to transfer to another service provider.
                                    </li>
                                    <li>
                                        <strong>Right to Withdraw Consent:</strong> You can revoke access permissions granted to healthcare providers at any time through your account settings.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* 6. Contact Us */}
                        <section id="contact" className="scroll-mt-32">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold text-lg">06</span>
                                <h2 className="text-2xl font-bold text-slate-900">Contact Us</h2>
                            </div>
                            <div className="prose prose-lg text-slate-600 leading-relaxed max-w-none">
                                <p className="mb-8">
                                    If you have any questions about this Privacy Policy, wish to exercise your privacy rights, or need to report a privacy concern, please contact our dedicated Privacy Team.
                                </p>

                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="flex gap-4 items-start p-6 rounded-2xl border border-slate-100 hover:shadow-lg hover:border-teal-200 hover:-translate-y-1 transition-all duration-300 bg-white group cursor-pointer">
                                        <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 m-0 group-hover:text-teal-700 transition-colors">Privacy Officer</h3>
                                            <p className="text-sm text-slate-500 mb-2">For privacy inquiries and data requests</p>
                                            <a href="mailto:privacy@niraiva.com" className="text-lg text-teal-600 font-bold hover:underline">privacy@niraiva.com</a>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start p-6 rounded-2xl border border-slate-100 hover:shadow-lg hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 bg-white group cursor-pointer">
                                        <div className="mt-1 flex-shrink-0 w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Lock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 m-0 group-hover:text-purple-700 transition-colors">Data Protection</h3>
                                            <p className="text-sm text-slate-500 mb-2">For security concerns and breach reporting</p>
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
