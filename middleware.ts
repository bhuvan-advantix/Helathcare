import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const url = req.nextUrl.clone();
        const role = token?.role;
        const isOnboarded = token?.isOnboarded;
        const path = url.pathname;

        // Redirect logic based on role
        if (role === 'doctor') {
            // Doctors cannot access patient dashboard
            if (path.startsWith('/dashboard')) {
                return NextResponse.redirect(new URL('/doctor/dashboard', req.url));
            }
            // Doctor Onboarding Check
            if (!isOnboarded && !path.startsWith('/doctor/onboarding')) {
                return NextResponse.redirect(new URL('/doctor/onboarding', req.url));
            }
            // If Onboarded, prevent access to onboarding page
            if (isOnboarded && path.startsWith('/doctor/onboarding')) {
                return NextResponse.redirect(new URL('/doctor/dashboard', req.url));
            }
        } else if (role === 'patient') {
            // Patients cannot access doctor pages
            if (path.startsWith('/doctor')) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
            // Patient Onboarding Check (assuming /onboarding is for patients)
            if (!isOnboarded && !path.startsWith('/onboarding')) {
                return NextResponse.redirect(new URL('/onboarding', req.url));
            }
            // If Onboarded, prevent access to onboarding page
            if (isOnboarded && path.startsWith('/onboarding')) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/doctor/:path*", "/onboarding/:path*"],
};
