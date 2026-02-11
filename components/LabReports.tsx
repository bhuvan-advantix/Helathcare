'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteLabReport, getReportPdf, analyzeTestResult } from '@/app/actions/labReports';
import DashboardNavbar from '@/components/DashboardNavbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Trash2,
    Calendar,
    Building2,
    User,
    Stethoscope,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Info,
    MapPin,
    FlaskConical,
    Activity,
    Download,
    Loader2
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

interface LabReportsProps {
    user: any;
    reports: any[];
    onDelete?: (id: string) => void;
    defaultExpandedId?: string;
    variant?: 'dashboard' | 'page';
}

export default function LabReports({
    user,
    reports: initialReports,
    onDelete,
    defaultExpandedId,
    variant = 'dashboard'
}: LabReportsProps) {
    const router = useRouter();
    const [reports, setReports] = useState<LabReport[]>(initialReports);
    const [expandedReport, setExpandedReport] = useState<string | null>(defaultExpandedId || null);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<Record<string, string>>({});
    const [loadingAnalysis, setLoadingAnalysis] = useState<Record<string, boolean>>({});
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        setReports(initialReports);
    }, [initialReports]);

    const handleDeleteReport = async (reportId: string) => {
        if (onDelete) {
            onDelete(reportId);
            return;
        }

        const result = await deleteLabReport(reportId);
        if (result.success) {
            setReports(prev => prev.filter(r => r.id !== reportId));
            router.refresh();
        }
    };

    const toggleCategory = (reportId: string, category: string) => {
        const key = `${reportId}-${category}`;
        setExpandedCategories(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleDownload = async (e: React.MouseEvent, reportId: string, fileName: string) => {
        e.stopPropagation();
        try {
            setDownloadingId(reportId);
            const result = await getReportPdf(reportId);

            if (result.success && result.fileData) {
                const link = document.createElement('a');
                link.href = `data:application/pdf;base64,${result.fileData}`;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Failed to download report. Please try again.');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('An error occurred while downloading.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleAnalyze = async (testKey: string, test: TestResult['tests'][0]) => {
        if (activeAnalysis === testKey) {
            setActiveAnalysis(null);
            return;
        }

        setActiveAnalysis(testKey);

        if (!analysisData[testKey] && !loadingAnalysis[testKey]) {
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

    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Lab Reports Yet</h3>
            <p className="text-slate-500 text-center max-w-md">
                Upload your first lab report to start tracking your health metrics
            </p>
        </div>
    );

    const renderContent = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Lab Reports</h2>
                    <p className="text-slate-500 font-medium mt-1">
                        {reports.length} {reports.length === 1 ? 'report' : 'reports'} uploaded
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {reports.map((report) => {
                    const isExpanded = expandedReport === report.id;

                    return (
                        <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden hover:border-teal-200 transition-all shadow-sm"
                        >
                            {/* Report Header */}
                            <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-black text-slate-900 mb-2 truncate">
                                                {report.fileName}
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {report.reportDate && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        <span className="font-semibold text-slate-600">
                                                            {formatDate(report.reportDate)}
                                                        </span>
                                                    </div>
                                                )}
                                                {report.labName && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Building2 className="w-4 h-4 text-slate-400" />
                                                        <span className="font-semibold text-slate-600 truncate">
                                                            {report.labName}
                                                        </span>
                                                    </div>
                                                )}
                                                {report.patientName && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                        <span className="font-semibold text-slate-600 truncate">
                                                            {report.patientName}
                                                        </span>
                                                    </div>
                                                )}
                                                {report.doctorName && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Stethoscope className="w-4 h-4 text-slate-400" />
                                                        <span className="font-semibold text-slate-600 truncate">
                                                            {report.doctorName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-3">
                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {report.pageCount} {report.pageCount === 1 ? 'page' : 'pages'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {formatFileSize(report.fileSize)}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">
                                                    Uploaded: {formatDate(report.uploadedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={(e) => handleDownload(e, report.id, report.fileName)}
                                            disabled={downloadingId === report.id}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                            title="Download PDF"
                                        >
                                            {downloadingId === report.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Download className="w-5 h-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                                            className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors"
                                        >
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteReport(report.id)}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Extracted Data */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 space-y-6">
                                            {/* Metadata Section - Dynamic & Boxed */}
                                            {(() => {
                                                const hasMetadata = !Array.isArray(report.extractedData) && (report.extractedData as any).metadata;
                                                if (!hasMetadata) return null;

                                                const metadata = (report.extractedData as any).metadata;
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                                        {Object.entries(metadata).map(([key, value]) => {
                                                            if (!value || typeof value !== 'object') return null;
                                                            return (
                                                                <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                                                                        {key.toLowerCase().includes('sample') ? <FlaskConical className="w-4 h-4 text-teal-600" /> :
                                                                            key.toLowerCase().includes('location') ? <MapPin className="w-4 h-4 text-teal-600" /> :
                                                                                <Info className="w-4 h-4 text-teal-600" />}
                                                                        <h4 className="font-bold text-slate-700 capitalize">{key} Details</h4>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                                                        {Object.entries(value as object).map(([subKey, subValue]) => (
                                                                            <div key={subKey} className="text-sm">
                                                                                <span className="text-slate-500 block text-xs uppercase tracking-wider font-semibold truncate">{subKey}</span>
                                                                                <span className="text-slate-800 font-medium break-words">{String(subValue)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}

                                            {/* Results Section */}
                                            {(() => {
                                                const categories = Array.isArray(report.extractedData)
                                                    ? report.extractedData
                                                    : (report.extractedData as any).results || [];

                                                if (categories && categories.length > 0) {
                                                    return categories.map((category: TestResult, idx: number) => {
                                                        const categoryKey = `${report.id}-${category.category}`;
                                                        const isCategoryExpanded = expandedCategories[categoryKey] !== false; // Default to expanded

                                                        return (
                                                            <div key={idx} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                                                                <button
                                                                    onClick={() => toggleCategory(report.id, category.category)}
                                                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
                                                                >
                                                                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                                                        {category.category}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-lg">
                                                                            {category.tests.length} {category.tests.length === 1 ? 'test' : 'tests'}
                                                                        </span>
                                                                        {isCategoryExpanded ?
                                                                            <ChevronUp className="w-5 h-5 text-slate-400" /> :
                                                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                                                        }
                                                                    </div>
                                                                </button>

                                                                <AnimatePresence>
                                                                    {isCategoryExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="overflow-hidden bg-white"
                                                                        >
                                                                            <div className="p-0 overflow-x-auto">
                                                                                <table className="min-w-full divide-y divide-slate-200">
                                                                                    <thead className="bg-slate-50/50">
                                                                                        <tr>
                                                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Test Name</th>
                                                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Result</th>
                                                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Reference Value</th>
                                                                                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/6">Unit</th>
                                                                                            <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-100">
                                                                                        {category.tests.map((test, testIdx) => {
                                                                                            const isAbnormal = test.status === 'high' || test.status === 'low';
                                                                                            const testKey = `${report.id}-${category.category}-${test.name}-${testIdx}`;
                                                                                            const isAnalysisOpen = activeAnalysis === testKey;
                                                                                            const isLoading = loadingAnalysis[testKey];

                                                                                            return (
                                                                                                <>
                                                                                                    <tr key={testIdx} className={`transition-colors border-b last:border-0 ${isAbnormal ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                                                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                                                            <div className="flex flex-col">
                                                                                                                <span className="text-sm font-semibold text-slate-700">{test.name}</span>
                                                                                                                {isAbnormal && (
                                                                                                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide mt-0.5">Abnormal</span>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                                                            <span className={`text-base font-bold ${isAbnormal ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                                                                {test.value}
                                                                                                            </span>
                                                                                                        </td>
                                                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                                                            {test.referenceRange || '-'}
                                                                                                        </td>
                                                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">
                                                                                                            {test.unit}
                                                                                                        </td>
                                                                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                                                            <button
                                                                                                                onClick={() => handleAnalyze(testKey, test)}
                                                                                                                disabled={isLoading}
                                                                                                                className={`p-2 rounded-lg transition-all ${isAnalysisOpen
                                                                                                                    ? 'bg-blue-100 text-blue-700 shadow-inner'
                                                                                                                    : 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                                                                                                                    }`}
                                                                                                                title="View Analysis"
                                                                                                            >
                                                                                                                {isLoading ? (
                                                                                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                                                                                ) : (
                                                                                                                    <Activity className="w-4 h-4" />
                                                                                                                )}
                                                                                                            </button>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                    {isAnalysisOpen && (
                                                                                                        <tr className="bg-slate-50/50">
                                                                                                            <td colSpan={5} className="px-0">
                                                                                                                <motion.div
                                                                                                                    initial={{ opacity: 0, height: 0 }}
                                                                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                                                                    className="border-b border-t border-blue-100 bg-blue-50/30"
                                                                                                                >
                                                                                                                    <div className="p-6">
                                                                                                                        <div className="flex flex-col gap-4">
                                                                                                                            <div>
                                                                                                                                <h5 className="text-sm font-bold text-slate-900 mb-4">
                                                                                                                                    Result Analysis
                                                                                                                                </h5>

                                                                                                                                {isLoading ? (
                                                                                                                                    <div className="flex items-center gap-3 text-slate-500 py-6 px-2">
                                                                                                                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                                                                                                                        <span className="text-sm font-medium">Generating AI insights...</span>
                                                                                                                                    </div>
                                                                                                                                ) : (
                                                                                                                                    <div
                                                                                                                                        className="prose prose-sm max-w-none text-slate-600 space-y-4"
                                                                                                                                        dangerouslySetInnerHTML={{ __html: analysisData[testKey] || '' }}
                                                                                                                                    />
                                                                                                                                )}
                                                                                                                            </div>

                                                                                                                            {!isLoading && analysisData[testKey] && (
                                                                                                                                <div className="mt-2 pt-3 border-t border-blue-200/50">
                                                                                                                                    <p className="text-xs text-slate-400 font-medium italic flex items-center gap-1.5">
                                                                                                                                        <Info className="w-3 h-3" />
                                                                                                                                        Disclaimer: This analysis is generated by automated systems and is for educational purposes only. It is not a medical diagnosis. Please consult your doctor for professional advice.
                                                                                                                                    </p>
                                                                                                                                </div>
                                                                                                                            )}
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </motion.div>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    )}
                                                                                                </>
                                                                                            );
                                                                                        })}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    });
                                                } else {
                                                    return (
                                                        <div className="text-center py-8">
                                                            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                            <p className="text-slate-500 font-medium">
                                                                No test results could be extracted from this report
                                                            </p>
                                                            <p className="text-slate-400 text-sm mt-1">
                                                                The PDF may be scanned or in an unsupported format
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );

    const content = reports.length === 0 ? renderEmptyState() : renderContent();

    if (variant === 'page') {
        return (
            <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
                <DashboardNavbar user={user} />
                <main className="flex-grow pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                    {content}
                </main>
                <Footer />
            </div>
        );
    }

    return content;
}
