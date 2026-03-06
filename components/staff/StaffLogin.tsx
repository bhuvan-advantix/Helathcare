'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffLogin } from '@/app/actions/staff';
import { Eye, EyeOff, Stethoscope, Lock, Mail } from 'lucide-react';

export default function StaffLogin() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
        setLoading(true);
        const result = await staffLogin(form.email, form.password);
        setLoading(false);
        if (result.success) {
            router.push('/staff/dashboard');
        } else {
            setError(result.error ?? 'Login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center px-4">
            <div className="w-full max-w-md">

                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-200">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Portal</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">NiraivaHealth — Front Desk & Nurse Access</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
                    <h2 className="text-lg font-black text-slate-800 mb-6">Sign in to your account</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    id="staff-email"
                                    type="email"
                                    placeholder="you@hospital.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-800 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    id="staff-password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="w-full pl-11 pr-11 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-800 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
                                <p className="text-red-700 text-sm font-bold">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="staff-login-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-sm transition-colors shadow-lg shadow-teal-200 disabled:opacity-60 disabled:pointer-events-none mt-2"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-400 font-medium mt-6">
                    Staff credentials are provided by your hospital administrator.
                </p>
            </div>
        </div>
    );
}
