"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, Variants } from "framer-motion";

// --- Components ---

function Navbar() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                const currentScrollY = window.scrollY;

                if (currentScrollY > lastScrollY && currentScrollY > 100) {
                    // Scrolling down & passed top threshold -> Hide
                    setIsVisible(false);
                } else {
                    // Scrolling up or at top -> Show
                    setIsVisible(true);
                }

                setLastScrollY(currentScrollY);
            }
        };

        window.addEventListener('scroll', controlNavbar);

        return () => {
            window.removeEventListener('scroll', controlNavbar);
        };
    }, [lastScrollY]);

    return (
        <nav
            className={`fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0 flex items-center gap-2 group cursor-pointer">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                            <span className="text-primary font-bold text-xl group-hover:text-white transition-colors">N</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-800">
                            Niraiva<span className="text-primary">Health</span>
                        </span>
                    </Link>


                    {/* Login Button */}
                    <div className="flex items-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-teal-600 hover:text-white transition-all shadow-sm hover:shadow-md"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

function Hero() {
    return (
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-[#F7F9FA]">
            {/* Background decoration */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-white to-transparent pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 font-medium text-sm mb-8 animate-fade-in-up hover:border-primary/50 transition-colors cursor-default">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    The New Standard in Healthcare Management
                </div>

                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                    Modern Healthcare <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-400 to-teal-600 animate-gradient bg-300%">
                        Connected & Intelligent
                    </span>
                </h1>

                <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Niraiva Health unifies patients, doctors, and hospitals on a single, secure platform. Experience seamless medical workflows and advanced patient analytics.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 px-4">
                    <Link
                        href="/signup"
                        className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-primary transition-all shadow-xl hover:shadow-primary/30 hover:-translate-y-1"
                    >
                        Create Free Account
                    </Link>
                    <a
                        href="#features"
                        className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all hover:border-slate-300 flex items-center justify-center gap-2"
                    >
                        Learn More
                    </a>
                </div>

                <div className="relative mx-auto max-w-6xl rounded-2xl shadow-2xl border border-slate-200/60 bg-white/50 backdrop-blur-sm p-3 animate-fade-in-up delay-200">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-3xl blur-md opacity-40 -z-10"></div>
                    <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-[3/2] shadow-inner">
                        <Image
                            src="/Landing-Page.jpg"
                            alt="Niraiva Health Dashboard Interface"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function Stats() {
    const stats = [
        { label: "Active Patients", value: "50K+", color: "text-primary" },
        { label: "Medical Records", value: "2M+", color: "text-accent" },
        { label: "Hospital Uptime", value: "99.99%", color: "text-blue-500" },
        { label: "Doctor Rating", value: "4.9/5", color: "text-purple-500" },
    ];

    return (
        <section className="py-12 bg-white border-y border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100/0 md:divide-slate-100">
                    {stats.map((stat, index) => (
                        <div key={index} className="p-4 transform hover:scale-105 transition-transform duration-300">
                            <div className={`text-4xl md:text-5xl font-bold mb-2 ${stat.color}`}>
                                {stat.value}
                            </div>
                            <div className="text-slate-500 font-medium uppercase tracking-wide text-xs md:text-sm">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Features() {
    const features = [
        {
            title: "AI Report Scanning",
            description: "Automatically analyze medical reports to highlight abnormalities and detect health trends instantly with our advanced AI.",
            icon: (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
            )
        },
        {
            title: "Smart Report Storage",
            description: "Upload and organize all your medical documents in one secure place. Never lose a prescription or lab report again.",
            icon: (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            )
        },
        {
            title: "Health Timeline",
            description: "Visualize your entire medical history in a chronological timeline. Doctors can understand your case in seconds.",
            icon: (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            title: "Multi-Hospital Access",
            description: "Seamlessly share your records with any hospital or specialist on the Niraiva network with just one click.",
            icon: (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
            )
        },
        {
            title: "Doctor Workspace",
            description: "A specialized dashboard for doctors to write prescriptions, order tests, and review patient analytics efficiently.",
            icon: (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
            )
        },
        {
            title: "Secure Access Control",
            description: "You are in control. Grant or revoke access to your health data at any time. Security and privacy are our top priority.",
            icon: (
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
            )
        }
    ];

    return (
        <section id="features" className="py-24 bg-white scroll-mt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
                        Everything you need to manage your health
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Comprehensive tools for patients, doctors, and hospitals to ensure better care and smoother operations.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <div key={idx} className="p-8 rounded-[2rem] border border-slate-100 bg-white hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group cursor-default">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-sm">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-sm md:text-base">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function HowItWorks() {
    const steps = [
        {
            title: "Create Your ID",
            description: "Get your unique Niraiva Health ID in minutes with our secure sign-up process. Linking your medical history has never been easier.",
            icon: (
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
            )
        },
        {
            title: "Connect & Consult",
            description: "Instantly share records with doctors. Seamlessly book in-person appointments and get expert advice with real-time health data access.",
            icon: (
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            title: "Track & Recover",
            description: "Receive AI-powered health insights, medication reminders, and recovery plans directly on your dashboard.",
            icon: (
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        }
    ];

    return (
        <section id="how-it-works" className="py-24 bg-[#F7F9FA]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        How Niraiva Works
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Everything you need to manage your health journey, simplified.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-12">
                    {steps.map((step, index) => (
                        <div key={index} className="flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border border-slate-100 group-hover:-translate-y-2 transition-transform duration-300">
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-primary transition-colors">
                                {index + 1}. {step.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Testimonials() {
    const testimonials = [
        {
            name: "Dr. Sarah Chen",
            role: "Cardiologist",
            image: "SC",
            content: "Niraiva has completely transformed how I track patient history. The instant access to previous reports saves me at least 10 minutes per consultation."
        },
        {
            name: "James Wilson",
            role: "Patient",
            image: "JW",
            content: "Finally, I don't have to carry a heavy file of reports everywhere. My entire medical history is on my phone, and sharing it with new doctors is effortless."
        },
        {
            name: "City General Hospital",
            role: "Admin Team",
            image: "CH",
            content: "The multi-hospital support is a game changer. We can securely coordinate with other facilities without the usual bureaucratic delays."
        }
    ];

    return (
        <section id="testimonials" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        Trusted by Healthcare Professionals
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((item, index) => (
                        <div key={index} className="p-8 bg-[#F7F9FA] rounded-[2rem] hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {item.image}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{item.name}</h4>
                                    <p className="text-sm text-slate-500">{item.role}</p>
                                </div>
                            </div>
                            <p className="text-slate-600 leading-relaxed italic">
                                "{item.content}"
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 p-3 rounded-full bg-slate-900 text-white shadow-lg transition-all duration-300 hover:bg-primary hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                }`}
            aria-label="Back to top"
        >
            <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
            </svg>
        </button>
    );
}

function Footer() {
    return (
        <footer className="bg-white border-t border-slate-200 py-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative">

                    {/* Left: Logo */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                                <span className="text-primary font-bold text-lg group-hover:text-white transition-colors">N</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800">
                                Niraiva<span className="text-primary">Health</span>
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
                            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
                        </nav>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// Inline ScrollReveal Logic
interface ScrollRevealProps {
    children: ReactNode;
    width?: "fit-content" | "100%";
    direction?: "up" | "down" | "left" | "right";
}

const ScrollReveal = ({ children, width = "fit-content", direction = "up" }: ScrollRevealProps) => {
    const variants: Variants = {
        hidden: {
            opacity: 0,
            x: direction === "left" ? -50 : direction === "right" ? 50 : 0,
            y: direction === "up" ? 50 : direction === "down" ? -50 : 0,
        },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut",
            }
        },
    };

    return (
        <div style={{ width, overflow: "hidden" }}>
            <motion.div
                variants={variants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
            >
                {children}
            </motion.div>
        </div>
    );
};

// --- Main Page Component ---

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#F7F9FA]">
            <Navbar />

            <div className="pt-0">
                <Hero />
            </div>

            <ScrollReveal width="100%" direction="up">
                <Stats />
            </ScrollReveal>

            <ScrollReveal width="100%" direction="left">
                <Features />
            </ScrollReveal>

            <ScrollReveal width="100%" direction="right">
                <HowItWorks />
            </ScrollReveal>

            <ScrollReveal width="100%" direction="up">
                <Testimonials />
            </ScrollReveal>

            <ScrollReveal width="100%" direction="up">
                <section className="py-20 bg-gradient-to-r from-accent to-primary w-full shadow-lg">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                            Ready to Take Control of Your Health?
                        </h2>
                        <p className="text-slate-700 text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join thousands of users who are already managing their healthcare smarter with Niraiva. Secure, intelligent, and built for everyone.
                        </p>
                        <div className="flex justify-center flex-col sm:flex-row gap-4">
                            <Link
                                href="/signup"
                                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-white hover:text-slate-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ring-1 ring-slate-900/5"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </section>
            </ScrollReveal>

            <Footer />
            <BackToTop />
        </main>
    );
}
