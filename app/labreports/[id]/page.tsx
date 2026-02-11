import { getLabReport } from '@/app/actions/labReports';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SingleLabReportView from '@/components/SingleLabReportView';

export default async function LabReportPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const { id } = await params;
    const reportResult = await getLabReport(id);

    if (!reportResult.success || !reportResult.report) {
        redirect("/dashboard");
    }

    const report = reportResult.report;

    return <SingleLabReportView user={session.user} report={report as any} />;
}
