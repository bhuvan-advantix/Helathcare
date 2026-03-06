
"use client";

import React, { useEffect } from 'react';
import PatientDashboard from '@/components/PatientDashboard';

export default function PreviewPage() {
    const dummyData = {
        user: {
            name: "Preview User",
            image: null,
            customId: "#PREVIEW123"
        },
        patient: {
            allergies: null,
            currentMedications: null,
            chronicConditions: null
        }
    };

    useEffect(() => {
        // Add welcome parameter to trigger the new user animation
        // Clear localStorage to ensure animation shows every time on preview
        localStorage.removeItem('hasSeenWelcome_v2');

        // Add the welcome parameter to the URL if not present
        if (!window.location.search.includes('welcome=true')) {
            window.history.replaceState({}, '', window.location.pathname + '?welcome=true');
        }
    }, []);

    return <PatientDashboard data={dummyData} />;
}
