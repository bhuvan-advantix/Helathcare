import { getLabSession } from '@/app/actions/lab';
import { redirect } from 'next/navigation';
import LabLogin from '@/components/lab/LabLogin';

export const metadata = {
    title: 'Lab Portal | NiraivaHealth',
    description: 'Lab Diagnostics Portal – Upload patient reports securely.',
};

export default async function LabPage() {
    const session = await getLabSession();
    if (session) redirect('/lab/dashboard');

    return <LabLogin />;
}
