import { checkAdminSession } from '@/app/actions/admin';
import { redirect } from 'next/navigation';
import AdminLogin from '@/components/admin/AdminLogin';

export const metadata = {
    title: 'Admin Login | NiraivaHealth',
    description: 'Secure admin access for NiraivaHealth platform management.',
};

export default async function AdminPage() {
    const isAdmin = await checkAdminSession();
    if (isAdmin) redirect('/admin/dashboard');

    return <AdminLogin />;
}
