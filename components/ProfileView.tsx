"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MapPin, User, Camera, Edit2, Calendar, X, Save, Loader2, Bell, Lock, Shield, Eye, Moon, Globe, ChevronRight, LogOut, Smartphone, Trash2, Settings, ChevronLeft, ChevronDown, AlertTriangle, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { updateProfile, deleteAccount } from '@/app/actions/profile';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from "next-auth/react";

interface ProfileViewProps {
    user: any;
    patient: any;
}

const AVATAR_LIST = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Christopher",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Annie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Chloe",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Leo",
    "https://api.dicebear.com/7.x/notionists/svg?seed=Mila",
];

export default function ProfileView({ user, patient }: ProfileViewProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAvatarSelection, setShowAvatarSelection] = useState(false);

    // Sign Out & Delete Modal States
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteRandomString, setDeleteRandomString] = useState('');
    const [deleteInputString, setDeleteInputString] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const generateRandomString = (length: number) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    };

    const calculateAge = (dobString: string) => {
        if (!dobString) return '';
        const today = new Date();
        const birthDate = new Date(dobString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age.toString();
    };

    // Initial State derived from props
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        image: user?.image || '',
        phone: patient?.phoneNumber || '',
        address: patient?.address || '',
        city: patient?.city || '',
        dob: patient?.dateOfBirth || '',
        age: patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : (patient?.age || ''),
        gender: patient?.gender || '',
        height: patient?.height || '',
        weight: patient?.weight || '',
        bloodGroup: patient?.bloodGroup || '',
        emergencyContactName: patient?.emergencyContactName || '',
        emergencyContactPhone: patient?.emergencyContactPhone || '',
    });

    // Reset form data when props change (only if not editing)
    useEffect(() => {
        if (!isEditing) {
            setFormData({
                name: user?.name || '',
                email: user?.email || '',
                image: user?.image || '',
                phone: patient?.phoneNumber || '',
                address: patient?.address || '',
                city: patient?.city || '',
                dob: patient?.dateOfBirth || '',
                age: patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : (patient?.age || ''),
                gender: patient?.gender || '',
                height: patient?.height || '',
                weight: patient?.weight || '',
                bloodGroup: patient?.bloodGroup || '',
                emergencyContactName: patient?.emergencyContactName || '',
                emergencyContactPhone: patient?.emergencyContactPhone || '',
            });
        }
    }, [user, patient, isEditing]);

    // Warn before unloading if editing
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isEditing) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isEditing]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: string } }) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'dob') {
                newData.age = calculateAge(value);
            }
            return newData;
        });
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const result = await updateProfile(user.id, formData);
            if (result.success) {
                setIsEditing(false);
                setShowAvatarSelection(false);
                router.refresh();
            } else {
                alert("Failed to update profile via server action.");
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("An error occurred while saving.");
        } finally {
            setIsLoading(false);
        }
    };

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<() => void>(() => { });

    const handleCancel = () => {
        if (isEditing) {
            setConfirmAction(() => () => {
                setIsEditing(false);
                setShowAvatarSelection(false);
                setFormData({
                    name: user?.name || '',
                    email: user?.email || '',
                    image: user?.image || '',
                    phone: patient?.phoneNumber || '',
                    address: patient?.address || '',
                    city: patient?.city || '',
                    dob: patient?.dateOfBirth || '',
                    age: patient?.age || '',
                    gender: patient?.gender || '',
                    height: patient?.height || '',
                    weight: patient?.weight || '',
                    bloodGroup: patient?.bloodGroup || '',
                    emergencyContactName: patient?.emergencyContactName || '',
                    emergencyContactPhone: patient?.emergencyContactPhone || '',
                });
            });
            setShowConfirmModal(true);
        } else {
            setIsEditing(false);
        }
    };

    const handleDeleteClick = () => {
        const randomStr = generateRandomString(10);
        setDeleteRandomString(randomStr);
        setDeleteInputString('');
        setIsCopied(false);
        setShowDeleteAccountModal(true);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(deleteRandomString);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const confirmDeleteAccount = async () => {
        if (deleteInputString === deleteRandomString) {
            setIsLoading(true);
            try {
                const result = await deleteAccount(user.id);
                if (result.success) {
                    await signOut({ callbackUrl: '/' });
                } else {
                    alert("Failed to delete account. Please try again.");
                }
            } catch (error) {
                console.error("Error deleting account:", error);
                alert("An error occurred.");
            } finally {
                setIsLoading(false);
                setShowDeleteAccountModal(false);
            }
        }
    };

    const confirmSignOut = async () => {
        await signOut({ callbackUrl: '/' });
    };

    // Custom Select Component
    const CustomSelect = ({ name, value, options, onChange, className, label }: any) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleSelect = (option: string) => {
            onChange({ target: { name, value: option } });
            setIsOpen(false);
        };

        return (
            <div className="relative w-full" ref={containerRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`cursor-pointer flex items-center gap-2 group ${className} ${!className?.includes('justify-') ? 'justify-between' : ''}`}
                >
                    <span className={`truncate ${!value ? "text-slate-400" : "font-medium text-slate-900"}`}>{value || label}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-teal-500' : 'group-hover:text-slate-600'}`} />
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-teal-500/0 group-hover:bg-teal-500/50 transition-colors"></div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className={`absolute top-full mt-2 min-w-[120px] bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto ${className?.includes('justify-center') ? 'left-1/2 -translate-x-1/2 text-center' : 'left-0'}`}
                        >
                            {options.map((opt: string) => (
                                <div
                                    key={opt}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-4 py-2.5 text-sm font-medium cursor-pointer hover:bg-slate-50 transition-colors ${value === opt ? 'text-teal-600 bg-teal-50' : 'text-slate-600'}`}
                                >
                                    {opt}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // Editable Field Component
    const EditableField = ({
        name,
        value,
        placeholder,
        type = "text",
        className = "",
        viewClassName = "",
        options = [],
        label = "",
        disabled = false
    }: any) => {
        if (isEditing) {
            if (options.length > 0) {
                return (
                    <CustomSelect
                        name={name}
                        value={value}
                        options={options}
                        onChange={handleInputChange}
                        className={className}
                        label={label}
                    />
                );
            }
            return (
                <div className="relative group w-full">
                    <input
                        type={type}
                        name={name}
                        value={value === 0 ? '' : value}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`w-full bg-transparent border-none p-0 text-slate-900 focus:ring-0 outline-none placeholder:text-slate-300 ${disabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
                    />
                    {!disabled && <div className="absolute inset-x-0 bottom-0 h-[1px] bg-teal-500/0 group-hover:bg-teal-500/50 transition-colors"></div>}
                </div>
            );
        }
        return <span className={viewClassName}>{value || <span className="text-slate-300 italic">Empty</span>}</span>;
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto space-y-6"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                            My <span className="text-teal-600">Profile</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Manage your personal information and health identity</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-200 flex items-center gap-2 disabled:opacity-70"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Profile Card */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-10"></div>

                    <div className="relative flex flex-col md:flex-row items-start gap-8 pt-4">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4 mx-auto md:mx-0">
                            <div className="relative group flex-shrink-0">
                                <div className={`w-32 h-32 rounded-3xl bg-white p-1.5 shadow-xl transition-all duration-300 ring-1 ring-slate-100 ${!isEditing && 'rotate-3 group-hover:rotate-0'}`}>
                                    <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-50 border border-slate-100">
                                        {formData.image ? (
                                            <Image
                                                src={formData.image}
                                                alt="Profile"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <User className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={() => setShowAvatarSelection(!showAvatarSelection)}
                                        className="absolute -bottom-2 -right-2 p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-teal-600 transition-colors border-2 border-white"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 w-full space-y-8">
                            {/* Header Info */}
                            <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-slate-100 pb-6">
                                <div>
                                    <EditableField
                                        name="name"
                                        value={formData.name}
                                        placeholder="Your Name"
                                        className="text-2xl font-black text-slate-900"
                                        viewClassName="text-2xl font-black text-slate-900"
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-slate-400 font-medium text-sm">Patient ID:</span>
                                        <div className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md font-bold text-xs uppercase tracking-wider">
                                            {user?.customId || "Pending"}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[80px]">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Age</span>
                                        <EditableField
                                            name="age"
                                            value={formData.age}
                                            className="text-center w-12"
                                            viewClassName="text-lg font-black text-slate-800"
                                            disabled={true}
                                        />
                                    </div>
                                    <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[80px]">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Blood</span>
                                        <div className="flex items-center justify-center gap-1">
                                            {!isEditing && <span className="text-red-500 text-xs">●</span>}
                                            <EditableField
                                                name="bloodGroup"
                                                value={formData.bloodGroup}
                                                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                                                label="Blood"
                                                className="justify-center w-16"
                                                viewClassName="text-lg font-black text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                {/* Contact Details */}
                                <div className="space-y-6">
                                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        Contact Details
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Email Address</span>
                                                <EditableField
                                                    name="email"
                                                    value={formData.email}
                                                    type="email"
                                                    className="font-bold"
                                                    viewClassName="text-slate-700 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone Number</span>
                                                <EditableField
                                                    name="phone"
                                                    value={formData.phone}
                                                    type="tel"
                                                    className="font-bold"
                                                    viewClassName="text-slate-700 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Address</span>
                                                <EditableField
                                                    name="address"
                                                    value={formData.address}
                                                    className="font-bold"
                                                    viewClassName="text-slate-700 font-medium leading-relaxed"
                                                />
                                                <div className="mt-1">
                                                    <EditableField
                                                        name="city"
                                                        value={formData.city}
                                                        placeholder="City"
                                                        className="font-medium text-sm"
                                                        viewClassName="text-slate-500 font-medium text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Info */}
                                <div className="space-y-6">
                                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Personal Info
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Birth Date</span>
                                            <EditableField
                                                name="dob"
                                                type="date"
                                                value={formData.dob}
                                                className="text-sm font-bold"
                                                viewClassName="text-slate-700 font-bold text-sm flex items-center gap-2"
                                            />
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Gender</span>
                                            <EditableField
                                                name="gender"
                                                value={formData.gender}
                                                options={["Male", "Female", "Other"]}
                                                label="Select"
                                                className="font-bold"
                                                viewClassName="text-slate-700 font-bold"
                                            />
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Height</span>
                                            <div className="flex items-baseline gap-1">
                                                <EditableField
                                                    name="height"
                                                    value={formData.height}
                                                    className="font-bold"
                                                    viewClassName="text-slate-700 font-bold text-lg"
                                                />
                                                <span className="text-xs text-slate-400 font-bold">cm</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Weight</span>
                                            <div className="flex items-baseline gap-1">
                                                <EditableField
                                                    name="weight"
                                                    value={formData.weight}
                                                    className="font-bold"
                                                    viewClassName="text-slate-700 font-bold text-lg"
                                                />
                                                <span className="text-xs text-slate-400 font-bold">kg</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="p-5 border border-red-100 bg-red-50/30 rounded-2xl">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Emergency Contact</span>
                                            {isEditing && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">EDITABLE</span>}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <EditableField
                                                    name="emergencyContactName"
                                                    value={formData.emergencyContactName}
                                                    placeholder="Contact Name"
                                                    className="font-bold text-slate-800"
                                                    viewClassName="text-lg font-bold text-slate-800 block"
                                                />
                                                <EditableField
                                                    name="emergencyContactPhone"
                                                    value={formData.emergencyContactPhone}
                                                    placeholder="Phone Number"
                                                    className="mt-1 text-sm font-medium"
                                                    viewClassName="text-sm font-medium text-slate-500 mt-1 block"
                                                />
                                            </div>
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-red-500">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Settings / Danger Zone */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Account Application
                    </h2>

                    <div className="space-y-4">
                        <button
                            onClick={() => setShowSignOutModal(true)}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:text-slate-700">
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-slate-900">Sign Out</span>
                                    <span className="text-sm text-slate-500">Log out of your account on this device</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500" />
                        </button>

                        <button
                            onClick={handleDeleteClick}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50/10 hover:bg-red-50 transition group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-red-100 rounded-lg text-red-500">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-red-600">Delete Account</span>
                                    <span className="text-sm text-red-400">Permanently remove all your data</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-400" />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Avatar Selection Modal */}
            <AnimatePresence>
                {showAvatarSelection && isEditing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
                        onClick={() => setShowAvatarSelection(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">Choose an Avatar</h3>
                                    <button onClick={() => setShowAvatarSelection(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                                    {AVATAR_LIST.map((avatar, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, image: avatar }));
                                                setShowAvatarSelection(false);
                                            }}
                                            className={`relative aspect-square rounded-full cursor-pointer border-2 transition-all p-1 ${formData.image === avatar ? 'border-teal-500 scale-110 bg-teal-50' : 'border-transparent hover:scale-105 hover:bg-slate-50'}`}
                                        >
                                            <div className="w-full h-full rounded-full overflow-hidden relative">
                                                <Image src={avatar} alt={`Avatar ${index}`} fill className="object-cover" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div >
                )
                }
            </AnimatePresence>

            {/* Sign Out Confirmation Modal */}
            <AnimatePresence>
                {showSignOutModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
                        onClick={() => setShowSignOutModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 text-center space-y-4">
                                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto">
                                    <LogOut className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Sign Out</h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Are you sure you want to sign out of your account?
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowSignOutModal(false)}
                                        className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSignOut}
                                        className="flex-1 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Account Confirmation Modal */}
            <AnimatePresence>
                {showDeleteAccountModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
                        onClick={() => setShowDeleteAccountModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 text-center space-y-5">
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
                                    <AlertTriangle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Delete Account</h3>
                                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                        This action is <span className="font-bold text-red-500">irreversible</span>. All your data will be permanently removed.
                                        To confirm, please type the following text below:
                                    </p>
                                    <div className="mt-4 p-3 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
                                        <span className="font-mono text-lg font-bold text-slate-800 tracking-widest pl-2">
                                            {deleteRandomString}
                                        </span>
                                        <button
                                            onClick={handleCopy}
                                            className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            {isCopied ? <Check className="w-5 h-5 text-teal-500" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={deleteInputString}
                                        onChange={(e) => setDeleteInputString(e.target.value)}
                                        placeholder="Type the text here"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium text-center focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    />

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setShowDeleteAccountModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDeleteAccount}
                                            disabled={deleteInputString !== deleteRandomString || isLoading}
                                            className="flex-1 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            Delete Forever
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {
                    showConfirmModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                            >
                                <div className="p-6 text-center space-y-4">
                                    <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Unsaved Changes</h3>
                                        <p className="text-slate-500 text-sm mt-1">
                                            You have unsaved changes. Are you sure you want to discard them?
                                        </p>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setShowConfirmModal(false)}
                                            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                        >
                                            Keep Editing
                                        </button>
                                        <button
                                            onClick={() => {
                                                confirmAction();
                                                setShowConfirmModal(false);
                                            }}
                                            className="flex-1 px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </>
    );
}
