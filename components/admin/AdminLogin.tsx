'use client';

import { useState, useTransition } from 'react';
import { adminLogin } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, Stethoscope } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        startTransition(async () => {
            const result = await adminLogin(email, password);
            if (result.success) router.push('/admin/dashboard');
            else setError(result.error || 'Login failed.');
        });
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 flex-col justify-between p-12 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48" />

                {/* Logo */}
                <div className="relative">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                            <Stethoscope className="w-7 h-7 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">NiraivaHealth</h1>
                            <p className="text-teal-100 text-xs font-bold uppercase tracking-widest">Admin Portal</p>
                        </div>
                    </div>
                </div>

                {/* Center content */}
                <div className="relative space-y-8">
                    <div>
                        <h2 className="text-4xl font-black text-white leading-tight">
                            Manage Your<br />Healthcare Platform
                        </h2>
                        <p className="text-teal-100 text-lg mt-4 leading-relaxed">
                            Monitor patients, approve doctors, handle support tickets, and manage lab accounts — all in one place.
                        </p>
                    </div>

                    {/* Feature bullets */}
                    <div className="space-y-3">
                        {[
                            'Doctor approval & verification',
                            'Patient & doctor management',
                            'Support ticket resolution',
                            'Lab diagnostics portal control',
                        ].map(f => (
                            <div key={f} className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                                <p className="text-white font-semibold text-sm">{f}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative">
                    <p className="text-teal-100 text-xs font-bold">© 2026 NiraivaHealth. All rights reserved.</p>
                </div>
            </div>

            {/* Right Login Panel */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
                {/* Mobile Logo */}
                <div className="lg:hidden mb-8 text-center">
                    <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900">NiraivaHealth</h1>
                    <p className="text-teal-600 text-xs font-bold uppercase tracking-widest">Admin Portal</p>
                </div>

                <div className="w-full max-w-md">
                    {/* Shield icon */}
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-teal-100">
                        <ShieldCheck className="w-9 h-9 text-teal-600" />
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 mb-2">Secure Admin Access</h2>
                    <p className="text-slate-500 font-medium mb-8">Authorised personnel only. Your session is encrypted.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@niraiva.com"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 pl-11 text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors bg-slate-50 focus:bg-white placeholder-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 pl-11 pr-12 text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors bg-slate-50 focus:bg-white placeholder-slate-300"
                                    required
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                                <span className="text-red-500">⚠</span> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-teal-200 disabled:opacity-60 disabled:cursor-not-allowed text-base mt-2"
                        >
                            {isPending ? 'Authenticating...' : 'Login to Admin Panel →'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-slate-400 text-xs text-center font-medium">
                            🔒 This portal is for authorised NiraivaHealth administrators only.<br />
                            Unauthorised access attempts are logged.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
