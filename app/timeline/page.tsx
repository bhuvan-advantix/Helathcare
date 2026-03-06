import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path if needed
import { redirect } from "next/navigation";
import { db, ensureLabReportsSchema } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import HealthTimeline from '@/components/HealthTimeline';

export default async function TimelinePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const userId = session.user.id;

    // Fetch User details
    const [userData] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!userData) {
        redirect("/login");
    }

    if (!userData.isOnboarded) {
        redirect("/onboarding");
    }

    const userProp = {
        id: userData.id,
        name: userData.name || "User",
        customId: userData.customId || "Pending",
        email: userData.email,
        image: userData.image || null,
    };

    return <HealthTimeline user={userProp} />;
}
