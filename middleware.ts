import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token;
        const url = req.nextUrl.clone();
        const path = url.pathname;
        const userId = (token?.id || token?.sub) as string | undefined;
        let role = typeof token?.role === 'string' ? token.role : undefined;
        let isOnboarded = Boolean(token?.isOnboarded);

        // ─── Check if user is banned (live DB check) ──────────────
        if (userId) {
            try {
                const [user] = await db.select({
                    role: users.role,
                    isOnboarded: users.isOnboarded,
                    isBanned: users.isBanned,
                })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1);

                // A stale JWT must not keep the app bouncing between login and
                // a protected page after the database account has changed.
                if (!user) {
                    const signOutUrl = new URL('/api/auth/signout', req.url);
                    signOutUrl.searchParams.set('callbackUrl', '/login');
                    return NextResponse.redirect(signOutUrl);
                }

                if (user?.isBanned) {
                    // Redirect to a banned page or sign-out
                    const signOutUrl = new URL('/api/auth/signout', req.url);
                    signOutUrl.searchParams.set('callbackUrl', '/login?banned=true');
                    return NextResponse.redirect(signOutUrl);
                }

                // Always route from current database state rather than a role
                // captured in an older session token.
                role = user.role || role;
                isOnboarded = user.isOnboarded ?? isOnboarded;
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
