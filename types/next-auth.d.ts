import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            isOnboarded: boolean
            customId?: string
        } & DefaultSession["user"]
    }

    interface User {
        role: string
        isOnboarded: boolean
        customId?: string
    }
}
