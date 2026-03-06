"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, HelpCircle, ChevronDown, Send, User, AtSign, Check, Loader2, CheckCircle, XCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';

export default function HelpSupportView() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [selectedPage, setSelectedPage] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        user_name: '',
        user_email: '',
        selected_page: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const faqs = [
        {
            question: "How do I update my medical profile?",
            answer: "Go to the Profile & Settings tab in your dashboard, click 'Edit Profile', and update your information securely. All changes are encrypted and stored following FHIR standards."
        },
        {
            question: "Is my data secure and compliant with healthcare standards?",
            answer: "Yes! We follow FHIR (Fast Healthcare Interoperability Resources) standards and are fully compliant with ADHA (Australian Digital Health Agency) guidelines. Your data is protected with end-to-end encryption, complying with HIPAA and GDPR standards to ensure maximum privacy and security."
        },
        {
            question: "What is FHIR and how does it protect my health data?",
            answer: "FHIR is a global standard for exchanging healthcare information electronically. We use FHIR to ensure your medical records are structured, secure, and can be safely shared with authorized healthcare providers. This means your data is always accurate, accessible, and protected."
        },
        {
            question: "How does NiraivalHealth ensure data privacy?",
            answer: "We implement multiple layers of security: 256-bit AES encryption for data at rest, TLS 1.3 for data in transit, regular security audits, ADHA compliance, and strict access controls. Your health information is never shared without your explicit consent."
        },
        {
            question: "Can I export my medical records?",
            answer: "Absolutely! You can download your complete medical history in FHIR-compliant format from the Lab Reports section. This ensures your records can be easily shared with any healthcare provider worldwide."
        },
        {
            question: "How can I book an appointment?",
            answer: "Navigate to the Timeline section to view and schedule appointments with your healthcare providers. You can also contact your doctor directly through our secure messaging portal."
        },
        {
            question: "What if I forget my password?",
            answer: "Click on 'Forgot Password' at the login screen. You will receive a secure reset link on your registered email. For additional security, we use multi-factor authentication to protect your account."
        },
        {
            question: "How do I view my diagnostic reports?",
            answer: "All your diagnostic reports, lab results, and imaging studies are available in the Diagnostic section. Reports are automatically organized by date and type for easy access."
        },
        {
            question: "Is my health data backed up?",
            answer: "Yes, we maintain secure, encrypted backups of all health data across multiple geographic locations. This ensures your information is never lost and remains accessible even in case of technical issues."
        },
        {
            question: "Who can access my medical information?",
            answer: "Only you and healthcare providers you explicitly authorize can access your medical information. We maintain detailed audit logs of all access attempts, and you can review who has viewed your records at any time."
        }
    ];

    const pageOptions = [
        "Dashboard",
        "Timeline",
        "Diagnostic",
        "Profile & Settings",
        "Lab Reports"
    ];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validation
        if (!formData.user_name || !formData.user_email || !formData.selected_page || !formData.message) {
            setSubmitStatus('error');
            setStatusMessage('Please fill in all fields');
            setTimeout(() => setSubmitStatus('idle'), 3000);
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            // Step 1: Create ticket in database FIRST
            console.log('📝 Creating support ticket in database...');

            const { createSupportTicket } = await import('@/app/actions/support');
            const ticketResult = await createSupportTicket({
                userName: formData.user_name,
                userEmail: formData.user_email,
                selectedPage: formData.selected_page,
                message: formData.message,
            });

            if (!ticketResult.success || !ticketResult.ticketNumber) {
                throw new Error('Failed to create support ticket');
            }

            const ticketNumber = ticketResult.ticketNumber;
            console.log('✅ Ticket created:', ticketNumber);

            // Step 2: Send emails with ticket number
            // Get EmailJS credentials from environment variables
            const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
            const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
            const templateAutoReply = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_AUTO_REPLY;
            const templateTeamNotification = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_TEAM_NOTIFICATION;
            const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

            // Validate environment variables
            if (!serviceId || !publicKey || !templateAutoReply || !templateTeamNotification || !supportEmail) {
                throw new Error('EmailJS configuration is missing. Please check environment variables.');
            }

            // Initialize EmailJS (doing it here ensures it's ready)
            emailjs.init(publicKey);

            console.log('📧 Starting email send process...');

            // Create a temporary form element for EmailJS
            const form = document.createElement('form');

            // Add all form fields as hidden inputs INCLUDING ticket number
            const fields = {
                ticket_number: ticketNumber, // ← IMPORTANT: Include ticket number
                to_name: formData.user_name,
                to_email: formData.user_email,
                from_name: formData.user_name,
                user_name: formData.user_name,
                from_email: formData.user_email,
                user_email: formData.user_email,
                email: formData.user_email,
                reply_to: formData.user_email,
                admin_email: supportEmail,
                selected_page: formData.selected_page,
                message: formData.message,
                submission_time: new Date().toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                })
            };

            Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            console.log('📤 Sending user auto-reply email with ticket number...');

            // Send auto-reply to user
            try {
                const userResponse = await emailjs.sendForm(
                    serviceId,
                    templateAutoReply,
                    form
                );
                console.log('✅ User email sent successfully!', userResponse);
            } catch (userError: any) {
                console.error('❌ User email failed:', userError);
                console.error('Error type:', typeof userError);
                console.error('Error keys:', Object.keys(userError || {}));
                console.error('Error string:', String(userError));

                // EmailJSResponseStatus has specific properties
                if (userError?.status) {
                    console.error('HTTP Status:', userError.status);
                }
                if (userError?.text) {
                    console.error('Error Text:', userError.text);
                }
                if (userError?.message) {
                    console.error('Error Message:', userError.message);
                }

                // Log all properties
                console.error('All error properties:', JSON.stringify(userError, null, 2));

                // Don't throw - ticket is already saved, email is secondary
                console.warn('⚠️ User email failed, but ticket was created:', ticketNumber);
            }

            console.log('📤 Sending team notification email with ticket number...');

            // Send notification to support team
            try {
                const teamResponse = await emailjs.sendForm(
                    serviceId,
                    templateTeamNotification,
                    form
                );
                console.log('✅ Team notification sent successfully!', teamResponse);
            } catch (teamError: any) {
                console.error('❌ Team email failed:', teamError);
                console.error('Error type:', typeof teamError);
                console.error('Error keys:', Object.keys(teamError || {}));
                console.error('Error string:', String(teamError));

                // User email was sent, so this is less critical
                console.warn('⚠️ Team notification failed, but ticket was created:', ticketNumber);
            }

            // Success!
            console.log('🎉 Support ticket created and emails sent!');
            setSubmitStatus('success');
            setStatusMessage(`Your support ticket has been created! Ticket Number: ${ticketNumber}. Check your email for confirmation.`);

            // Reset form
            setFormData({
                user_name: '',
                user_email: '',
                selected_page: '',
                message: ''
            });
            setSelectedPage('');

            // Clear success message after 8 seconds (longer to read ticket number)
            setTimeout(() => setSubmitStatus('idle'), 8000);

        } catch (error: any) {
            console.error('💥 Support ticket creation failed:', error);
            console.error('Error type:', typeof error);
            console.error('Error constructor:', error?.constructor?.name);
            console.error('Error message:', error?.message);
            console.error('Error toString:', error?.toString());

            setSubmitStatus('error');
            const errorMessage = error?.message || 'Failed to create support ticket. Please try again or contact us directly.';
            setStatusMessage(errorMessage);
            setTimeout(() => setSubmitStatus('idle'), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handlePageSelect = (page: string) => {
        setSelectedPage(page);
        setFormData({
            ...formData,
            selected_page: page
        });
        setIsDropdownOpen(false);
    };

    if (!isMounted) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto space-y-8 md:space-y-12"
        >
            {/* Header */}
            <div className="text-center px-4">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2 md:mb-3">
                    Help & <span className="text-teal-600">Support</span>
                </h1>
                <p className="text-slate-500 font-medium text-base md:text-lg lg:text-xl">We're here to help you live healthier.</p>
            </div>

            {/* Main Content: Form (Left) + Contact Cards (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 px-4">
                {/* Left: Contact Form - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 lg:p-12 border border-slate-100 shadow-xl relative overflow-hidden h-full">
                        <div className="absolute top-0 right-0 w-32 h-32 md:w-40 md:h-40 bg-teal-500 rounded-full blur-3xl opacity-10 -mr-12 -mt-12 md:-mr-16 md:-mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-blue-500 rounded-full blur-3xl opacity-10 -ml-8 -mb-8 md:-ml-12 md:-mb-12 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                                <div className="p-2 md:p-3 bg-teal-50 rounded-xl md:rounded-2xl">
                                    <Send className="w-5 h-5 md:w-7 md:h-7 text-teal-600" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900">Send us a message</h2>
                            </div>


                            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                                {/* Name Field */}
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3">Your Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="user_name"
                                            value={formData.user_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter your full name"
                                            disabled={isSubmitting}
                                            className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-3 md:py-4 bg-slate-50 border-2 border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none font-semibold text-slate-700 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3">Email Address</label>
                                    <div className="relative">
                                        <AtSign className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            name="user_email"
                                            value={formData.user_email}
                                            onChange={handleInputChange}
                                            placeholder="your.email@example.com"
                                            disabled={isSubmitting}
                                            className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-3 md:py-4 bg-slate-50 border-2 border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none font-semibold text-slate-700 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Custom Page Dropdown */}
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3">Which page is the issue?</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => !isSubmitting && setIsDropdownOpen(!isDropdownOpen)}
                                            disabled={isSubmitting}
                                            className="w-full px-4 md:px-6 py-3 md:py-4 bg-slate-50 border-2 border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none font-semibold text-slate-700 text-sm md:text-base text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className={selectedPage ? 'text-slate-900' : 'text-slate-400'}>
                                                {selectedPage || 'Select a page...'}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl md:rounded-2xl shadow-xl overflow-hidden"
                                                >
                                                    {pageOptions.map((page) => (
                                                        <button
                                                            key={page}
                                                            type="button"
                                                            onClick={() => handlePageSelect(page)}
                                                            className={`w-full px-4 md:px-6 py-2.5 md:py-3.5 text-left text-sm md:text-base font-semibold transition-colors flex items-center justify-between group ${selectedPage === page
                                                                ? 'bg-teal-50 text-teal-700'
                                                                : 'text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <span>{page}</span>
                                                            {selectedPage === page && (
                                                                <Check className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Message Field */}
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3">Message</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        rows={4}
                                        placeholder="Describe your issue in detail..."
                                        disabled={isSubmitting}
                                        className="w-full px-4 md:px-6 py-3 md:py-4 bg-slate-50 border-2 border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all outline-none font-medium text-slate-700 resize-none text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 md:py-5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-black text-base md:text-lg rounded-xl md:rounded-2xl hover:from-teal-700 hover:to-teal-600 transition-all shadow-xl shadow-teal-200 flex items-center justify-center gap-2 md:gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Send Message</span>
                                            <Send className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Success/Error Modal Popup */}
                            <AnimatePresence>
                                {submitStatus !== 'idle' && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                                        onClick={() => setSubmitStatus('idle')}
                                    >
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                            transition={{ type: "spring", duration: 0.5 }}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`relative w-full max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden ${submitStatus === 'success'
                                                ? 'bg-gradient-to-br from-teal-50 via-white to-teal-50'
                                                : 'bg-gradient-to-br from-red-50 via-white to-red-50'
                                                }`}
                                        >
                                            {/* Decorative circles */}
                                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${submitStatus === 'success' ? 'bg-teal-400' : 'bg-red-400'
                                                }`}></div>
                                            <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${submitStatus === 'success' ? 'bg-teal-400' : 'bg-red-400'
                                                }`}></div>

                                            <div className="relative p-6 md:p-8">
                                                {/* Icon */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                                    className={`w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full flex items-center justify-center ${submitStatus === 'success'
                                                        ? 'bg-teal-100'
                                                        : 'bg-red-100'
                                                        }`}
                                                >
                                                    {submitStatus === 'success' ? (
                                                        <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
                                                    ) : (
                                                        <XCircle className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                                                    )}
                                                </motion.div>

                                                {/* Title */}
                                                <motion.h3
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.3 }}
                                                    className={`text-xl md:text-2xl font-black text-center mb-3 ${submitStatus === 'success' ? 'text-teal-900' : 'text-red-900'
                                                        }`}
                                                >
                                                    {submitStatus === 'success' ? 'Message Sent!' : 'Oops! Something went wrong'}
                                                </motion.h3>

                                                {/* Message */}
                                                <motion.p
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.4 }}
                                                    className="text-sm md:text-base text-slate-600 text-center mb-6 leading-relaxed font-medium"
                                                >
                                                    {statusMessage}
                                                </motion.p>

                                                {/* Close Button */}
                                                <motion.button
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.5 }}
                                                    onClick={() => setSubmitStatus('idle')}
                                                    className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-base transition-all shadow-lg ${submitStatus === 'success'
                                                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200'
                                                        : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                                                        }`}
                                                >
                                                    Got it!
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Right: Contact Cards - Takes 1 column, stacked vertically */}
                <div className="space-y-4 md:space-y-6">
                    {/* Call Support */}
                    <div className="bg-gradient-to-br from-teal-50 to-white p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 border-teal-100 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-teal-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-teal-200">
                            <Phone className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <h3 className="font-black text-slate-900 text-lg md:text-xl mb-1 md:mb-2">Call Support</h3>
                        <p className="text-slate-600 text-xs md:text-sm font-medium mb-3 md:mb-4">Talk to a human directly.</p>
                        <p className="text-teal-600 font-black text-lg md:text-xl">+1 (800) 123-4567</p>
                    </div>

                    {/* Email Us */}
                    <div className="bg-gradient-to-br from-blue-50 to-white p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                            <Mail className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <h3 className="font-black text-slate-900 text-lg md:text-xl mb-1 md:mb-2">Email Us</h3>
                        <p className="text-slate-600 text-xs md:text-sm font-medium mb-3 md:mb-4">Response within 24 hours.</p>
                        <p className="text-blue-600 font-black text-base md:text-xl break-all">support@niraiva.com</p>
                    </div>
                </div>
            </div>

            {/* FAQ Section - Full Width at Bottom */}
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 lg:p-12 border border-slate-100 shadow-xl mx-4">
                <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                    <div className="p-2 md:p-3 bg-teal-50 rounded-xl md:rounded-2xl">
                        <HelpCircle className="w-5 h-5 md:w-7 md:h-7 text-teal-600" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
                </div>

                {/* Single Column FAQ */}
                <div className="space-y-3 md:space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`rounded-xl md:rounded-2xl border-2 transition-all duration-300 overflow-hidden ${activeIndex === index ? 'bg-teal-50 border-teal-300 shadow-lg shadow-teal-100' : 'bg-slate-50 border-slate-200 hover:border-teal-200 hover:shadow-md'}`}
                        >
                            <button
                                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                                className="w-full flex justify-between items-center p-4 md:p-6 text-left focus:outline-none"
                            >
                                <span className={`font-bold text-sm md:text-base lg:text-lg pr-2 ${activeIndex === index ? 'text-teal-900' : 'text-slate-800'}`}>
                                    {faq.question}
                                </span>
                                <ChevronDown
                                    className={`w-5 h-5 md:w-6 md:h-6 flex-shrink-0 transition-transform duration-300 ${activeIndex === index ? 'rotate-180 text-teal-600' : 'text-slate-400'}`}
                                />
                            </button>
                            <AnimatePresence>
                                {activeIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="px-4 md:px-6 pb-4 md:pb-6 text-slate-600 font-medium text-xs md:text-sm lg:text-base leading-relaxed border-t-2 border-teal-200 pt-3 md:pt-4">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
