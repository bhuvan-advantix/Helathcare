'use client';

import { useState, useTransition } from 'react';
import { labLogin } from '@/app/actions/lab';
import { useRouter } from 'next/navigation';
import { FlaskConical, Eye, EyeOff, Lock, Mail, Stethoscope } from 'lucide-react';

export default function LabLogin() {
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
            const result = await labLogin(email, password);
            if (result.success) router.push('/lab/dashboard');
            else setError(result.error || 'Login failed.');
        });
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48" />

                <div className="relative flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                        <Stethoscope className="w-7 h-7 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">NiraivaHealth</h1>
                        <p className="text-teal-100 text-xs font-bold uppercase tracking-widest">Lab Portal</p>
                    </div>
                </div>

                <div className="relative space-y-8">
                    <div>
                        <h2 className="text-4xl font-black text-white leading-tight">Diagnostic Lab<br />Partner Portal</h2>
                        <p className="text-teal-100 text-lg mt-4 leading-relaxed">Upload patient lab reports securely. Reports are instantly accessible to patients and their doctors.</p>
                    </div>
                    <div className="space-y-3">
                        {['Search patients by NiraivaHealth ID', 'Upload PDF reports directly', 'Reports appear instantly on patient profile', 'Secure & HIPAA-friendly upload'].map(f => (
                            <div key={f} className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                                <p className="text-white font-semibold text-sm">{f}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-teal-100 text-xs font-bold">© 2026 NiraivaHealth. Lab Staff Portal.</p>
            </div>

            {/* Right Login Panel */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
                {/* Mobile Logo */}
                <div className="lg:hidden mb-8 text-center">
                    <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900">NiraivaHealth</h1>
                    <p className="text-teal-600 text-xs font-bold uppercase tracking-widest">Lab Portal</p>
                </div>

                <div className="w-full max-w-md">
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-teal-100">
                        <FlaskConical className="w-9 h-9 text-teal-600" />
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 mb-2">Lab Staff Login</h2>
                    <p className="text-slate-500 font-medium mb-8">Use the credentials provided by your NiraivaHealth admin.</p>

                    <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
                        <div>
                            <label htmlFor="email" className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">Lab Email</label>
                            <div className="relative" suppressHydrationWarning>
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="lab@example.com"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 pl-11 text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors bg-slate-50 focus:bg-white placeholder-slate-300" required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="text-xs font-bold text-slate-600 uppercase tracking-widest block mb-2">Password</label>
                            <div className="relative" suppressHydrationWarning>
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input id="password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 pl-11 pr-12 text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 transition-colors bg-slate-50 focus:bg-white placeholder-slate-300" required />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                                <span className="text-red-500">⚠</span> {error}
                            </div>
                        )}
                        <button type="submit" disabled={isPending}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-teal-100 disabled:opacity-60 text-base mt-2">
                            {isPending ? 'Logging in...' : 'Login to Lab Portal →'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <p className="text-slate-400 text-xs text-center font-medium">
                            🔒 Lab staff portal only. Credentials are provided by your NiraivaHealth administrator.<br />
                            Contact support if you have login issues.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
