import { getStaffSession } from '@/app/actions/staff';
import { redirect } from 'next/navigation';
import StaffDashboard from '@/components/staff/StaffDashboard';

export const metadata = {
    title: 'Staff Dashboard | NiraivaHealth',
    description: 'Staff portal for patient check-in, vitals recording, and doctor orders.',
};

export default async function StaffDashboardPage() {
    const session = await getStaffSession();
    if (!session) redirect('/staff');

    return (
        <StaffDashboard
            staff={{
                staffName: session.staffName,
                hospitalName: session.hospitalName,
            }}
        />
    );
}
