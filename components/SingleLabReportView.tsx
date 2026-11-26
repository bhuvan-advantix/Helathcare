'use client';

import { useState, Fragment } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { getReportPdf, analyzeTestResult } from '@/app/actions/labReports';
import DashboardNavbar from '@/components/DashboardNavbar';
import Footer from '@/components/Footer';
import {
    FileText,
    Calendar,
    Building2,
    User,
    Stethoscope,
    AlertCircle,
    Info,
    FlaskConical,
    Download,
    Loader2,
    ChevronRight,
    MapPin,
    CalendarDays,
    Sparkles,
    Brain,
    ChevronDown
} from 'lucide-react';

interface TestResult {
    category: string;
    tests: {
        name: string;
        value: string;
        unit: string;
        sourceLabel?: string;
        referenceRange?: string;
        status?: 'normal' | 'high' | 'low';
    }[];
}

interface LabReport {
    id: string;
    fileName: string;
    reportDate: string | null;
    labName: string | null;
    patientName: string | null;
    doctorName: string | null;
    cloudinaryUrl?: string;
    extractedData: TestResult[] | { results: TestResult[], metadata: any };
    fileSize: number;
    pageCount: number;
    uploadedAt: Date;
    fileData?: string | null;
}

interface SingleLabReportViewProps {
    user: any;
    report: LabReport;
}

export default function SingleLabReportView({ user, report }: SingleLabReportViewProps) {
    const [activeAnalyses, setActiveAnalyses] = useState<Record<string, boolean>>({});
    const [analysisData, setAnalysisData] = useState<Record<string, string>>({});
    const [loadingAnalysis, setLoadingAnalysis] = useState<Record<string, boolean>>({});
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            if (report.cloudinaryUrl) {
                window.open(report.cloudinaryUrl, '_blank');
            } else if (report.fileData) {
                window.open(report.fileData, '_blank');
            } else {
                window.print();
            }
        } catch (err) {
            console.error('Download error:', err);
            window.print();
        } finally {
            setDownloading(false);
        }
    };

    const handleAnalyze = async (testKey: string, test: TestResult['tests'][0]) => {
        const isCurrentlyOpen = activeAnalyses[testKey];

        setActiveAnalyses(prev => ({
            ...prev,
            [testKey]: !isCurrentlyOpen
        }));

        if (!isCurrentlyOpen && !analysisData[testKey] && !loadingAnalysis[testKey]) {
            setLoadingAnalysis(prev => ({ ...prev, [testKey]: true }));
            try {
                const result = await analyzeTestResult(
                    test.name,
                    test.value,
                    test.unit,
                    test.referenceRange
                );

                if (result.success && result.analysis) {
                    setAnalysisData(prev => ({ ...prev, [testKey]: result.analysis }));
                } else {
                    setAnalysisData(prev => ({
                        ...prev,
                        [testKey]: '<div class="p-4 bg-red-50 text-red-600 rounded-lg">Failed to generate analysis. Please try again later.</div>'
                    }));
                }
            } catch (error) {
                console.error('Analysis error:', error);
                setAnalysisData(prev => ({
                    ...prev,
                    [testKey]: '<div class="p-4 bg-red-50 text-red-600 rounded-lg">An error occurred while connecting to the analysis service.</div>'
                }));
            } finally {
                setLoadingAnalysis(prev => ({ ...prev, [testKey]: false }));
            }
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (date: Date | string | null) => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const extractedMetadata = (report.extractedData as any)?.metadata || {};
    const isImagingObservation = extractedMetadata.documentType === 'imaging-observation';
    const observationResults = ((report.extractedData as any)?.results || []) as TestResult[];
    const observedValue = (sourceLabel: string) => {
        const observation = observationResults.flatMap(group => group.tests || []).find(item => item.sourceLabel === sourceLabel);
        return observation ? `${observation.value}${observation.unit ? ` ${observation.unit}` : ''}` : 'Not legible';
    };

    return (
        <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
            <DashboardNavbar user={user} />
            <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Header Card */}
                    <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-teal-100">
                                <FileText className="w-5 h-5 md:w-7 md:h-7 text-teal-600" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-xl font-black text-slate-900 mb-1 md:mb-2 line-clamp-1">
                                    {report.fileName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-500 font-medium">
                                    {isImagingObservation ? (
                                        <>
                                            <span className="flex items-center gap-1 md:gap-1.5">
                                                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                                Record added: {formatDate(report.uploadedAt)}
                                            </span>
                                        </>
                                    ) : <span className="flex items-center gap-1 md:gap-1.5">
                                        <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                        {formatDate(report.reportDate || report.uploadedAt)}
                                    </span>}
                                    {!isImagingObservation && <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                        <span className="hidden sm:inline">Size: {formatFileSize(report.fileSize)}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                        <span className="hidden sm:inline">{report.pageCount} Pages</span>
                                    </>}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-sm shadow-teal-200 text-sm md:text-base"
                        >
                            {downloading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Download className="w-4 h-4 md:w-5 md:h-5" />}
                            <span>{report.cloudinaryUrl ? 'Download Original PDF' : 'Print Structured Report'}</span>
                        </button>
                    </div>

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 md:mb-3 text-teal-700">
                                <Info className="w-4 h-4 md:w-5 md:h-5" />
                                <h3 className="font-bold text-sm md:text-base">Record Details</h3>
                            </div>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                                <div>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Report type</span>
                                    <span className="font-semibold text-slate-700 text-xs md:text-sm">{isImagingObservation ? 'Obstetric ultrasound observation record' : 'Medical Lab Report'}</span>
                                </div>
                                {isImagingObservation && (
                                    <div>
                                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Source</span>
                                        <span className="font-semibold text-slate-700 text-xs md:text-sm">Photograph of ultrasound console</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Test Results Table */}
                    {isImagingObservation && (
                        <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-7 shadow-sm space-y-6">
                            <div className="border-b border-slate-100 pb-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black text-teal-700 uppercase tracking-[0.18em]">Imaging observation record</p>
                                        <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1">Obstetric Ultrasound</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                                    The following console values are transcribed from the supplied photograph. The displayed estimated due date is recorded as shown and has not been independently recalculated.
                                </p>
                            </div>

                            {observationResults.map((group, groupIndex) => (
                                <div key={`${group.category}-${groupIndex}`}>
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">{group.category}</h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 font-black">Console label</th>
                                                    <th className="px-4 py-3 font-black">Displayed value</th>
                                                    <th className="px-4 py-3 font-black">Interpretation</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.tests.map((item, itemIndex) => (
                                                    <tr key={`${item.name}-${itemIndex}`} className="border-t border-slate-100">
                                                        <td className="px-4 py-3 font-bold text-slate-800">{(item as any).sourceLabel || item.name}</td>
                                                        <td className="px-4 py-3 font-black text-teal-700">{item.value}{item.unit ? ` ${item.unit}` : ''}</td>
                                                        <td className="px-4 py-3 text-slate-600">{item.name}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Image-based impression</h3>
                                    <p className="text-sm text-slate-700 leading-relaxed mt-2">
                                        The console displays GS as {observedValue('GS')}, gestational age as {observedValue('GA')}, and EDD as {observedValue('EDD')}. These values are transcribed from the screen; this still image does not provide enough information to independently confirm the dating or assess findings that are not shown.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4">
                                    <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">Dating note</h3>
                                    <p className="text-sm text-amber-950 leading-relaxed mt-2">
                                        The console displays EDD as {observedValue('EDD')}. This is a device-displayed estimate, not a reference interval. ACOG states that mean sac diameter is not recommended for estimating the due date, so the console value is transcribed without independent recalculation.
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 leading-relaxed">
                                <p><span className="font-bold text-slate-700">Source and scope:</span> Single photographed ultrasound monitor frame. {extractedMetadata.imageRetained ? 'The source image is retained with this record.' : 'The source image file is not retained with this record.'} This record transcribes visible screen values and is not a facility-issued diagnostic report or a signed interpretation.</p>
                                <a className="inline-block mt-2 font-semibold text-teal-700 underline underline-offset-2" href="https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date" target="_blank" rel="noreferrer">ACOG: Methods for Estimating the Due Date</a>
                            </div>
                        </section>
                    )}

                    {report.fileData?.startsWith('data:image/') && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h2 className="text-sm font-black text-slate-900">Source image</h2>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">
                                    Retained
                                </span>
                            </div>
                            <Image
                                src={report.fileData}
                                alt="Retained source imaging document"
                                width={1200}
                                height={800}
                                unoptimized
                                className="max-h-[520px] w-full rounded-xl border border-slate-200 object-contain bg-slate-950"
                            />
                        </div>
                    )}

                    {!isImagingObservation && <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900 mb-4">Extracted Parameters</h2>
                        {(() => {
                            const rawData = report.extractedData;
                            const rawResults: any[] = Array.isArray(rawData) ? rawData : (rawData?.results || []);

                            // Normalize into category buckets safely
                            const categories: { category: string; tests: any[] }[] = [];

                            if (rawResults.length > 0) {
                                const isCategorized = rawResults.some(r => Array.isArray(r?.tests));
                                if (isCategorized) {
                                    rawResults.forEach(r => {
                                        if (Array.isArray(r?.tests)) {
                                            categories.push({
                                                category: r.category || 'General Parameters',
                                                tests: r.tests
                                            });
                                        } else if (r?.name || r?.parameterName || r?.testName) {
                                            const testObj = {
                                                name: r.name || r.parameterName || r.testName || 'Parameter',
                                                value: r.value || '--',
                                                unit: r.unit || '',
                                                referenceRange: r.referenceRange || r.reference || '',
                                                status: r.status || 'normal'
                                            };
                                            let genCat = categories.find(c => c.category === 'General Parameters');
                                            if (!genCat) {
                                                genCat = { category: 'General Parameters', tests: [] };
                                                categories.push(genCat);
                                            }
                                            genCat.tests.push(testObj);
                                        }
                                    });
                                } else {
                                    const flatTests = rawResults.map(r => ({
                                        name: r.name || r.parameterName || r.testName || 'Parameter',
                                        value: r.value || '--',
                                        unit: r.unit || '',
                                        referenceRange: r.referenceRange || r.reference || '',
                                        status: r.status || 'normal'
                                    }));
                                    categories.push({
                                        category: 'Laboratory Test Parameters',
                                        tests: flatTests
                                    });
                                }
                            }

                            if (categories.length > 0) {
                                return categories.map((cat, idx) => (
                                    <div key={idx} className="mb-6 last:mb-0">
                                        <h3 className="text-sm font-bold text-teal-800 bg-teal-50 px-3 py-2 rounded-lg mb-3">
                                            {cat.category}
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs md:text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                                                        <th className="py-2 px-3">Test Name</th>
                                                        <th className="py-2 px-3">Result</th>
                                                        <th className="py-2 px-3">Unit</th>
                                                        <th className="py-2 px-3">Reference interval</th>
                                                        <th className="py-2 px-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(cat.tests || []).map((test, tidx) => (
                                                        <tr key={tidx} className="border-b border-slate-100 hover:bg-slate-50">
                                                            <td className="py-2.5 px-3 font-semibold text-slate-900">{test.name}</td>
                                                            <td className="py-2.5 px-3 font-bold text-teal-600">{test.value}</td>
                                                            <td className="py-2.5 px-3 text-slate-500">{test.unit}</td>
                                                            <td className="py-2.5 px-3 text-slate-500">{test.referenceRange || 'Not stated in source'}</td>
                                                            <td className="py-2.5 px-3">
                                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${test.status === 'high'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                                                                    : test.status === 'low'
                                                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                                        : test.status === 'review'
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                    }`}>
                                                                    {test.status || 'normal'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ));
                            } else {
                                return (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium text-lg">
                                            No test results could be extracted from this report
                                        </p>
                                    </div>
                                );
                            }
                        })()}

                    </div>}
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
