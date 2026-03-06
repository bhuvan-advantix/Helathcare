import { getStaffSession } from '@/app/actions/staff';
import { redirect } from 'next/navigation';
import StaffLogin from '@/components/staff/StaffLogin';

export const metadata = {
    title: 'Staff Login | NiraivaHealth',
    description: 'Front desk and nursing staff portal for NiraivaHealth.',
};

export default async function StaffPage() {
    const session = await getStaffSession();
    if (session) redirect('/staff/dashboard');
    return <StaffLogin />;
}
