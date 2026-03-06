import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const url = req.nextUrl.clone();
        const role = token?.role;
        const isOnboarded = token?.isOnboarded;
        const path = url.pathname;
        const userId = (token?.id || token?.sub) as string | undefined;

        // ─── Check if user is banned (live DB check) ──────────────
        if (userId) {
            try {
                const [user] = await db.select({ isBanned: users.isBanned })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1);

                if (user?.isBanned) {
                    // Redirect to a banned page or sign-out
                    const signOutUrl = new URL('/api/auth/signout', req.url);
                    signOutUrl.searchParams.set('callbackUrl', '/login?banned=true');
                    return NextResponse.redirect(signOutUrl);
                }
            } catch (_) {
                // DB check failed - allow through (don't block on DB errors)
            }
        }

        // ─── Role-based routing ───────────────────────────────────
        if (role === 'doctor') {
            if (path.startsWith('/dashboard')) {
                return NextResponse.redirect(new URL('/doctor/dashboard', req.url));
            }
            if (!isOnboarded && !path.startsWith('/doctor/onboarding')) {
                return NextResponse.redirect(new URL('/doctor/onboarding', req.url));
            }
            if (isOnboarded && path.startsWith('/doctor/onboarding')) {
                return NextResponse.redirect(new URL('/doctor/dashboard', req.url));
            }
        } else if (role === 'patient') {
            if (path.startsWith('/doctor')) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
            if (!isOnboarded && !path.startsWith('/onboarding')) {
                return NextResponse.redirect(new URL('/onboarding', req.url));
            }
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
