"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [role, setRole] = useState('patient');

    const validateEmail = (value: string) => {
        if (!value) {
            setEmailError('');
            return;
        }
        if (!value.includes('@')) {
            setEmailError('Please include an "@" in the email address.');
            return false;
        }
        // Basic pattern check for completeness
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            setEmailError('Please enter a valid email address.');
            return false;
        }
        setEmailError('');
        return true;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
            {/* Ambient Background Lights */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-400/20 rounded-full blur-[100px] opacity-30"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
                <Link href="/" className="inline-flex items-center gap-2 group mb-6 transition-transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="text-white font-bold text-xl">N</span>
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">Niraiva Health</span>
                </Link>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Create Account
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    Join Niraiva Health today
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
                <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/60 rounded-[2rem] sm:px-12 border border-slate-100">

                    <div className="animate-fade-in-up">
                        <form className="space-y-6" action="#" method="POST" onSubmit={(e) => {
                            e.preventDefault();
                            validateEmail(email);
                        }}>

                            {/* Google Signup Button */}
                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-primary hover:text-white hover:border-primary hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.059 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                    </g>
                                </svg>
                                <span>Sign up with Google</span>
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or sign up with email</span></div>
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">
                                    Email address
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (emailError) validateEmail(e.target.value);
                                        }}
                                        onBlur={(e) => validateEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        placeholder="name@company.com"
                                        className={`block w-full rounded-xl border-0 py-3 px-4 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all ${emailError
                                            ? 'text-red-900 ring-red-300 focus:ring-red-500'
                                            : 'text-slate-900 ring-slate-200 focus:ring-primary'
                                            }`}
                                    />
                                    {emailError && (
                                        <p className="mt-2 text-sm text-red-600 animate-fade-in">
                                            {emailError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                                    Password
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        placeholder="••••••••"
                                        className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Role Selection - Graphical Cards */}
                            <div>
                                <label className="block text-sm font-medium leading-6 text-slate-900 mb-2">
                                    Select Account Type
                                </label>
                                <input type="hidden" name="role" value={role} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setRole('patient')}
                                        className={`cursor-pointer relative flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${role === 'patient'
                                            ? 'border-primary bg-blue-50/50 shadow-md shadow-primary/10'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${role === 'patient' ? 'bg-white' : 'bg-slate-100'}`}>
                                            <Image
                                                src="/healthcare.png"
                                                alt="Patient"
                                                width={28}
                                                height={28}
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                        <span className={`font-semibold text-sm ${role === 'patient' ? 'text-primary' : 'text-slate-600'}`}>Patient</span>
                                        {role === 'patient' && (
                                            <div className="absolute top-3 right-3 text-primary">
                                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        onClick={() => setRole('doctor')}
                                        className={`cursor-pointer relative flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${role === 'doctor'
                                            ? 'border-teal-500 bg-teal-50/50 shadow-md shadow-teal-500/10'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${role === 'doctor' ? 'bg-white' : 'bg-slate-100'}`}>
                                            <Image
                                                src="/doctor.png"
                                                alt="Doctor"
                                                width={28}
                                                height={28}
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                        <span className={`font-semibold text-sm ${role === 'doctor' ? 'text-teal-600' : 'text-slate-600'}`}>Doctor</span>
                                        {role === 'doctor' && (
                                            <div className="absolute top-3 right-3 text-teal-500">
                                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button
                                    type="submit"
                                    className="flex w-full justify-center rounded-xl bg-slate-900 px-3 py-3.5 text-sm font-bold leading-6 text-white shadow-lg shadow-slate-900/20 hover:bg-primary hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <div className="text-center text-sm md:text-base flex flex-col sm:flex-row justify-center items-center gap-1">
                            <span className="text-slate-500 font-bold">Already have an account?</span>
                            <Link href="/login" className="text-primary font-extrabold hover:text-primary/80 hover:underline transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
