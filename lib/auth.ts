import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "../db";
import { accounts, sessions, users, verificationTokens } from "../db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }) as any,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user, trigger, session, account }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.isOnboarded = user.isOnboarded;
                token.customId = user.customId;
            }
            // Support updating session from client
            if (trigger === "update" && session) {
                // Fetch fresh user data from database
                const [updatedUser] = await db.select()
                    .from(users)
                    .where(eq(users.id, token.id as string))
                    .limit(1);

                if (updatedUser) {
                    token.role = updatedUser.role;
                    token.isOnboarded = updatedUser.isOnboarded;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.isOnboarded = token.isOnboarded as boolean;
                session.user.customId = token.customId as string;
            }
            return session;
        },
    },
};
