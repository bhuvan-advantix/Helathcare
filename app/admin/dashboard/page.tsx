import { checkAdminSession, getAdminStats } from '@/app/actions/admin';
import { getAllStaffAccounts } from '@/app/actions/staff';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata = {
    title: 'Admin Dashboard | NiraivaHealth',
};

export default async function AdminDashboardPage() {
    const isAdmin = await checkAdminSession();
    if (!isAdmin) redirect('/admin');

    const [data, staff] = await Promise.all([
        getAdminStats(),
        getAllStaffAccounts(),
    ]);
    if (!data) redirect('/admin');

    return <AdminDashboard data={{ ...data, staff, stats: { ...data.stats, staffCount: staff.length } }} />;
}
