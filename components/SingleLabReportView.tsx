'use client';

import { useState, Fragment } from 'react';
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
    CalendarDays
} from 'lucide-react';

interface TestResult {
    category: string;
    tests: {
        name: string;
        value: string;
        unit: string;
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
    extractedData: TestResult[] | { results: TestResult[], metadata: any };
    fileSize: number;
    pageCount: number;
    uploadedAt: Date;
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
        try {
            setDownloading(true);
            const result = await getReportPdf(report.id);

            if (result.success) {
                // Handle Cloudinary URL (new method)
                if (result.cloudinaryUrl) {
                    // Fetch the PDF from Cloudinary
                    const response = await fetch(result.cloudinaryUrl);
                    const blob = await response.blob();

                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = report.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
                // Handle legacy base64 data
                else if (result.fileData) {
                    let base64Data = result.fileData as string;
                    if (base64Data.startsWith('data:application/pdf;base64,')) {
                        base64Data = base64Data.split(',')[1];
                    }
                    base64Data = base64Data.replace(/\s/g, '');

                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    link.download = report.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
                else {
                    alert('Failed to download report. File not found.');
                }
            } else {
                alert('Failed to download report. Please try again.');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('An error occurred while downloading.');
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
                                    <span className="flex items-center gap-1 md:gap-1.5">
                                        <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                        {formatDate(report.reportDate || report.uploadedAt)}
                                    </span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                    <span className="hidden sm:inline">Size: {formatFileSize(report.fileSize)}</span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                    <span className="hidden sm:inline">{report.pageCount} Pages</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="w-full md:w-auto px-4 py-2.5 md:px-6 md:py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-sm shadow-teal-200 text-sm md:text-base"
                        >
                            {downloading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Download className="w-4 h-4 md:w-5 md:h-5" />}
                            <span>Download Original PDF</span>
                        </button>
                    </div>

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Analysis Details Card */}
                        <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 md:mb-3 text-teal-700">
                                <Info className="w-4 h-4 md:w-5 md:h-5" />
                                <h3 className="font-bold text-sm md:text-base">Analysis Details</h3>
                            </div>
                            <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                                <div>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Report type</span>
                                    <span className="font-semibold text-slate-700 text-xs md:text-sm">Medical Lab Report</span>
                                </div>
                                <div className='mt-1.5 md:mt-2'>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Parameters Found</span>
                                    <span className="font-semibold text-slate-700 text-xs md:text-sm">
                                        {(() => {
                                            const categories = Array.isArray(report.extractedData)
                                                ? report.extractedData
                                                : (report.extractedData as any).results || [];
                                            const total = categories.reduce((acc: number, cat: any) => acc + cat.tests.length, 0);
                                            return total > 0 ? `${total} Parameters` : 'N/A';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Lab Info Card */}
                        <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 md:mb-3 text-teal-700">
                                <Building2 className="w-4 h-4 md:w-5 md:h-5" />
                                <h3 className="font-bold text-sm md:text-base">Lab Info Details</h3>
                            </div>
                            <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                                <div>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Lab Name</span>
                                    <span className="font-semibold text-slate-700 truncate block items-center gap-1 text-xs md:text-sm" title={report.labName || 'N/A'}>
                                        {report.labName || 'Not Specified'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Report IDs</span>
                                    <div className="flex flex-col gap-0.5 md:gap-1 mt-1">
                                        <span className="text-[10px] md:text-xs text-slate-500">
                                            SRF: <span className="font-semibold text-slate-700 text-xs md:text-sm">{extractedMetadata.srfId || 'N/A'}</span>
                                        </span>
                                        <span className="text-[10px] md:text-xs text-slate-500">
                                            Ref: <span className="font-semibold text-slate-700 text-xs md:text-sm">{extractedMetadata.refId || 'N/A'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Patient Details Card */}
                        <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 md:mb-3 text-teal-700">
                                <User className="w-4 h-4 md:w-5 md:h-5" />
                                <h3 className="font-bold text-sm md:text-base">Patient Details</h3>
                            </div>
                            <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                                <div>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Name</span>
                                    <span className="font-semibold text-slate-700 truncate block text-xs md:text-sm">
                                        {report.patientName || extractedMetadata.patientName || 'Not Specified'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Age/Sex</span>
                                        <span className="font-semibold text-slate-700 text-xs md:text-sm">
                                            {extractedMetadata.age || '-'} / {extractedMetadata.gender || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Collected</span>
                                        <span className="font-semibold text-slate-700 truncate text-xs md:text-sm">
                                            {extractedMetadata.collectionDate || formatDate(report.reportDate)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Doctor Details Card */}
                        <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 md:mb-3 text-teal-700">
                                <Stethoscope className="w-4 h-4 md:w-5 md:h-5" />
                                <h3 className="font-bold text-sm md:text-base">Doctor Details</h3>
                            </div>
                            <div className="space-y-1 text-xs md:text-sm">
                                <div>
                                    <span className="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Referred By</span>
                                    <span className="font-semibold text-slate-700 truncate block text-xs md:text-sm">
                                        {report.doctorName || 'Not Specified'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="space-y-6">
                        {(() => {
                            const categories = Array.isArray(report.extractedData)
                                ? report.extractedData
                                : (report.extractedData as any).results || [];

                            if (categories && categories.length > 0) {
                                return categories.map((category: TestResult, idx: number) => {
                                    return (
                                        <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                            {/* Static Header - Always Visible */}
                                            <div className="w-full p-3 md:p-5 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
                                                <h4 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight">
                                                    {category.category}
                                                </h4>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg">
                                                        {category.tests.length} tests
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Table - Always Visible */}
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-slate-100 table-fixed border-collapse">
                                                    <thead className="bg-slate-50/30">
                                                        <tr>
                                                            <th scope="col" className="px-2 py-3 md:px-6 md:py-4 text-left text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider w-[35%]">Test Name</th>
                                                            <th scope="col" className="px-2 py-3 md:px-6 md:py-4 text-left text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider w-[25%]">Result</th>
                                                            <th scope="col" className="px-2 py-3 md:px-6 md:py-4 text-left text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider w-[25%]">Ref. Val</th>
                                                            <th scope="col" className="px-2 py-3 md:px-6 md:py-4 text-left text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Unit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {category.tests.map((test, testIdx) => {
                                                            const isAbnormal = test.status === 'high' || test.status === 'low';
                                                            const testKey = `${category.category}-${test.name}-${testIdx}`;
                                                            const isAnalysisOpen = !!activeAnalyses[testKey];
                                                            const isLoading = loadingAnalysis[testKey];

                                                            return (
                                                                <Fragment key={testIdx}>
                                                                    <tr
                                                                        onClick={() => handleAnalyze(testKey, test)}
                                                                        className={`transition-colors cursor-pointer relative border-b border-slate-100
                                                                            ${isAnalysisOpen ? 'bg-white border-b-0' : 'hover:bg-slate-50'}
                                                                            ${isAbnormal ? 'border-l-[6px] border-l-red-500 bg-red-50/10' : ''}
                                                                            ${!isAbnormal && isAnalysisOpen ? 'border-l-[6px] border-l-teal-500' : ''}
                                                                        `}
                                                                    >
                                                                        <td className="px-2 py-3 md:px-6 md:py-5 break-words align-top">
                                                                            <div className="flex items-start gap-1.5 md:gap-3">
                                                                                <ChevronRight
                                                                                    className={`w-3 h-3 md:w-4 md:h-4 mt-0.5 text-slate-400 transition-transform duration-200 ${isAnalysisOpen ? 'rotate-90 text-teal-500' : ''}`}
                                                                                />
                                                                                <div className="flex flex-col">
                                                                                    <span className={`text-[11px] md:text-sm font-bold ${isAbnormal ? 'text-red-700' : 'text-slate-700'}`}>
                                                                                        {test.name}
                                                                                    </span>
                                                                                    {isAbnormal && (
                                                                                        <span className="text-[9px] md:text-[10px] font-bold text-red-500 uppercase tracking-wide mt-0.5 md:mt-1">Abnormal</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-2 py-3 md:px-6 md:py-5 align-top">
                                                                            <span className={`text-xs md:text-lg font-black ${isAbnormal ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                                {test.value}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-2 py-3 md:px-6 md:py-5 align-top text-[10px] md:text-sm font-medium text-slate-500">
                                                                            {test.referenceRange || '-'}
                                                                        </td>
                                                                        <td className="px-2 py-3 md:px-6 md:py-5 align-top text-[10px] md:text-sm font-medium text-slate-500">
                                                                            {test.unit}
                                                                        </td>
                                                                    </tr>
                                                                    {/* Analysis Section - Appears below the row */}
                                                                    {isAnalysisOpen && (
                                                                        <tr className="border-l-[6px] border-l-teal-500 border-b border-slate-100 bg-white">
                                                                            <td colSpan={4} className="p-0">
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, height: 0 }}
                                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                                    className="overflow-hidden"
                                                                                >
                                                                                    <div className="p-4 pl-8 md:p-6 md:pl-12">
                                                                                        <div>
                                                                                            <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                                                                <FlaskConical className="w-4 h-4 text-teal-600" />
                                                                                                Result Analysis
                                                                                            </h5>

                                                                                            {isLoading ? (
                                                                                                <div className="flex items-center gap-3 text-teal-600 py-6">
                                                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                                                    <span className="text-sm font-medium">Generating AI insights...</span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div
                                                                                                    className="prose prose-sm max-w-none text-slate-600"
                                                                                                    dangerouslySetInnerHTML={{ __html: analysisData[testKey] || '' }}
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </Fragment>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                });
                            } else {
                                return (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium text-lg">
                                            No test results could be extracted from this report
                                        </p>
                                        <p className="text-slate-400 mt-1">
                                            The PDF may be scanned or in an unsupported format
                                        </p>
                                    </div>
                                );
                            }
                        })()}

                        {/* Page-level Disclaimer - Bottom of content */}
                        <div className="mt-6 mb-4 text-center">
                            <p className="text-xs text-slate-400 font-medium">
                                DISCLAIMER: Automated analysis may contain inaccuracies. Please verify with the original PDF. Not for medical use.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>
            <Footer />
        </div>
    );
}
