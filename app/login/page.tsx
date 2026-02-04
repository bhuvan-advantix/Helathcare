"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [selectedRole, setSelectedRole] = useState<null | 'patient' | 'doctor'>(null);
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">

            {/* Ambient Background Lights */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] opacity-30"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-400/20 rounded-full blur-[100px] opacity-30"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2 group mb-6 transition-transform hover:scale-105">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="text-white font-bold text-xl">N</span>
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">Niraiva Health</span>
                </Link>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {selectedRole ? (selectedRole === 'patient' ? 'Patient Portal' : 'Doctor Portal') : 'Welcome Back'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    {selectedRole
                        ? "Securely access your healthcare dashboard"
                        : "Select your role to continue"
                    }
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
                <div className="bg-white py-12 px-6 shadow-2xl shadow-slate-200/60 rounded-[2rem] sm:px-12 border border-slate-100">

                    {!selectedRole ? (
                        <div className="space-y-4">
                            {/* Role Selection Phase */}
                            <button
                                onClick={() => setSelectedRole('patient')}
                                className="w-full group relative p-5 bg-white rounded-2xl border border-slate-200 hover:border-primary/50 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left flex items-center gap-5 hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    <svg className="w-7 h-7 text-primary group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">I am a Patient</h3>
                                    <p className="text-xs text-slate-500 mt-1">Access records, appointments & more</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 text-primary">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            <button
                                onClick={() => setSelectedRole('doctor')}
                                className="w-full group relative p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-400/50 shadow-sm hover:shadow-lg hover:shadow-teal-400/5 transition-all duration-300 text-left flex items-center gap-5 hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-all duration-300">
                                    <svg className="w-7 h-7 text-teal-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-teal-600 transition-colors">I am a Doctor</h3>
                                    <p className="text-xs text-slate-500 mt-1">Manage practice & patients</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 text-teal-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in-up">
                            {/* Login Form Phase */}
                            <form className="space-y-6" action="#" method="POST" onSubmit={(e) => e.preventDefault()}>

                                {/* Google Login Button */}
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group relative overflow-hidden"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.059 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                        </g>
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or continue with email</span></div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">
                                        Email address
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            placeholder="name@company.com"
                                            className="block w-full rounded-xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                                        Password
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            placeholder="••••••••"
                                            className="block w-full rounded-xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
                                            Remember me
                                        </label>
                                    </div>

                                    <div className="text-sm">
                                        <a href="#" className="font-semibold text-primary hover:text-primary/80">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        type="submit"
                                        className="flex w-full justify-center rounded-xl bg-slate-900 px-3 py-3.5 text-sm font-bold leading-6 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-slate-900/30 transition-all hover:-translate-y-0.5"
                                    >
                                        Sign in to Account
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRole(null)}
                                        className="text-xs text-slate-500 hover:text-primary underline transition-colors text-center"
                                    >
                                        ← Select a different role
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="text-center text-sm">
                            <span className="text-slate-500">Don't have an account? </span>
                            <Link href="/signup" className="text-primary font-bold hover:text-primary/80 transition-colors">
                                Sign up for free
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
