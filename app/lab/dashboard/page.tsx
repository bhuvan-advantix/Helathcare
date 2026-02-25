import { getLabSession } from '@/app/actions/lab';
import { redirect } from 'next/navigation';
import LabDashboard from '@/components/lab/LabDashboard';

export const metadata = {
    title: 'Lab Dashboard | NiraivaHealth',
};

export default async function LabDashboardPage() {
    const session = await getLabSession();
    if (!session) redirect('/lab');

    return <LabDashboard session={session} />;
}
