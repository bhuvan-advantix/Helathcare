import { checkAdminSession, getAdminStats } from '@/app/actions/admin';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata = {
    title: 'Admin Dashboard | NiraivaHealth',
};

export default async function AdminDashboardPage() {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) redirect('/admin');

    const data = await getAdminStats();
    if (!data) redirect('/admin');

    return <AdminDashboard data={data} />;
}
