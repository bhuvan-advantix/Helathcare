'use server';

import { db } from '@/db';
import { supportTickets } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Generate a unique 5-digit ticket number
 * Format: TKT + 5 random digits (e.g., TKT12345)
 */
function generateTicketNumber(): string {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // Generates 5-digit number
    return `TKT${randomNum}`;
}

/**
 * Create a new support ticket in the database
 */
export async function createSupportTicket(data: {
    userName: string;
    userEmail: string;
    selectedPage: string;
    message: string;
    userId?: string;
}) {
    try {
        // Generate unique ticket number
        let ticketNumber = generateTicketNumber();

        // Ensure ticket number is unique (very rare collision, but let's be safe)
        let attempts = 0;
        while (attempts < 10) {
            const existing = await db
                .select()
                .from(supportTickets)
                .where(eq(supportTickets.ticketNumber, ticketNumber))
                .limit(1);

            if (existing.length === 0) break;

            ticketNumber = generateTicketNumber();
            attempts++;
        }

        // Insert ticket into database
        const [ticket] = await db.insert(supportTickets).values({
            ticketNumber,
            userName: data.userName,
            userEmail: data.userEmail,
            selectedPage: data.selectedPage,
            message: data.message,
            userId: data.userId || null,
            status: 'open',
            priority: 'medium',
        }).returning();

        return {
            success: true,
            ticket,
            ticketNumber,
        };
    } catch (error) {
        console.error('Failed to create support ticket:', error);
        return {
            success: false,
            error: 'Failed to create support ticket',
        };
    }
}

/**
 * Get all support tickets (for admin dashboard)
 */
export async function getAllSupportTickets() {
    try {
        const tickets = await db
            .select()
            .from(supportTickets)
            .orderBy(desc(supportTickets.createdAt));

        return {
            success: true,
            tickets,
        };
    } catch (error) {
        console.error('Failed to fetch support tickets:', error);
        return {
            success: false,
            error: 'Failed to fetch support tickets',
            tickets: [],
        };
    }
}

/**
 * Get a specific ticket by ticket number
 */
export async function getTicketByNumber(ticketNumber: string) {
    try {
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(eq(supportTickets.ticketNumber, ticketNumber))
            .limit(1);

        return {
            success: true,
            ticket,
        };
    } catch (error) {
        console.error('Failed to fetch ticket:', error);
        return {
            success: false,
            error: 'Failed to fetch ticket',
        };
    }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
    ticketNumber: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
) {
    try {
        const [ticket] = await db
            .update(supportTickets)
            .set({
                status,
                updatedAt: new Date(),
                resolvedAt: status === 'resolved' || status === 'closed' ? new Date() : null,
            })
            .where(eq(supportTickets.ticketNumber, ticketNumber))
            .returning();

        return {
            success: true,
            ticket,
        };
    } catch (error) {
        console.error('Failed to update ticket status:', error);
        return {
            success: false,
            error: 'Failed to update ticket status',
        };
    }
}
