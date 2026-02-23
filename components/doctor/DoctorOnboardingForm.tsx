"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Cake, Phone, MapPin, Building, Award, Stethoscope, Clock, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

export default function DoctorOnboardingForm({ user }: { user: any }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        dateOfBirth: '',
        age: '',
        gender: 'Male',
        phoneNumber: '',
        address: '',
        city: '',
        maritalStatus: 'Single',
        specialization: '',
        clinicName: '',
        licenseNumber: '',
        experienceYears: '',
        degree: '',
        hospitalTiming: '',
        workingDays: '',
        bio: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateStep = (currentStep: number) => {
        if (currentStep === 1) {
            return formData.age && formData.phoneNumber && formData.address && formData.city;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(step + 1);
        } else {
            alert("Please fill in all required fields.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.specialization || !formData.licenseNumber) {
            alert("Please provide your specialization and license number.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Import action dynamically just in case
            const { onboardDoctor } = await import('@/app/actions/doctor-onboarding');
            const result = await onboardDoctor(formData);

            if (result.success) {
                // Refresh session to update isOnboarded flag
                router.refresh();
                router.push('/doctor/dashboard');
            } else {
                alert("Failed to save profile: " + result.error);
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-teal-600 p-8 text-center text-white">
                <h1 className="text-3xl font-black mb-2">Welcome, Dr. {user.name}</h1>
                <p className="text-teal-100 font-medium">Let's complete your professional profile to get started.</p>

                <div className="flex justify-center mt-8 gap-4">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white font-bold' : 'text-teal-200'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'bg-white text-teal-600 border-white' : 'border-teal-400'}`}>1</div>
                        <span>Personal</span>
                    </div>
                    <div className={`w-12 h-0.5 self-center ${step >= 2 ? 'bg-white' : 'bg-teal-400'}`}></div>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white font-bold' : 'text-teal-200'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'bg-white text-teal-600 border-white' : 'border-teal-400'}`}>2</div>
                        <span>Professional</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 md:p-12">
                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Personal Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Age <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Cake className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="number"
                                        name="age"
                                        value={formData.age}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="Your Age"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium appearance-none bg-white"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="Contact Number"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="City of Practice"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Clinic Address <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium resize-none h-24"
                                        placeholder="Full Address"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2"
                            >
                                Next Step <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Professional Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Specialization <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        name="specialization"
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="e.g. Cardiologist"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">License Number <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        name="licenseNumber"
                                        value={formData.licenseNumber}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="Medical License No."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Experience (Years)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="number"
                                        name="experienceYears"
                                        value={formData.experienceYears}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="Years of Experience"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Clinic Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        name="clinicName"
                                        value={formData.clinicName}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium"
                                        placeholder="Hospital or Clinic Name"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Bio / Description</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-medium resize-none h-24"
                                    placeholder="Tell us briefly about yourself..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                Complete Setup
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
