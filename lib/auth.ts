import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "../db";
import { accounts, sessions, users, verificationTokens } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Please enter your email and password");
                }

                // Find user by email
                const [user] = await db.select()
                    .from(users)
                    .where(eq(users.email, credentials.email))
                    .limit(1);

                if (!user) {
                    throw new Error("No account found with this email. Please sign up first.");
                }

                if (!user.password) {
                    throw new Error("This account uses Google sign-in. Please use 'Continue with Google'.");
                }

                // Verify password
                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Incorrect password. Please try again.");
                }

                return {
                    id: user.id,
                    email: user.email!,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    isOnboarded: user.isOnboarded ?? false,
                    customId: user.customId ?? undefined,
                };
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
