import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const path = req.nextUrl.pathname;
        const token = req.nextauth.token;

        const isAuth = !!token;
        const isOnboarded = token?.isOnboarded;

        // Logic: If logged in but not onboarded, FORCE to /onboarding
        if (isAuth && !isOnboarded && path !== "/onboarding") {
            return NextResponse.redirect(new URL("/onboarding", req.url));
        }

        // Logic: If onboarded and trying to go to /onboarding, send to dashboard
        if (isAuth && isOnboarded && path === "/onboarding") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
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
    matcher: ["/dashboard/:path*", "/onboarding"],
};
