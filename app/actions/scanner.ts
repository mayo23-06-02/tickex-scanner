'use server'

import { ScanResponse, EventSummary, TicketLogItem } from "../lib/definitions";
import dbConnect from "../lib/db";
import Ticket from "../lib/models/Ticket";
import TicketType from "../lib/models/TicketType";
import Event from "../lib/models/Event"; 
import Order from "../lib/models/Order";
import User from "../lib/models/User";
import mongoose from "mongoose";

// Ensure models are registered
import "../lib/models/User"; 

/**
 * Fetches events for the current organizer
 */
export async function getScannerEvents(): Promise<EventSummary[]> {
  await dbConnect();
  
  try {
    // 1. Fetch upcoming events (sorted by date)
    const events = await Event.find({}).sort({ startDate: 1 }).limit(20).lean();

    // 2. Calculate Stats for each event
    // Note: In high-scale production, this should be a cached aggregation or separate stats collection.
    const eventsWithStats = await Promise.all(events.map(async (event: any) => {
        // Find all TicketTypes for this event
        const ticketTypes = await TicketType.find({ event: event._id }).select('_id');
        const ticketTypeIds = ticketTypes.map(tt => tt._id);

        // Count total tickets
        const totalTickets = await Ticket.countDocuments({
            ticketTypeId: { $in: ticketTypeIds }
        });

        // Count checked-in tickets
        const checkedInTickets = await Ticket.countDocuments({
            ticketTypeId: { $in: ticketTypeIds },
            status: 'checked_in'
        });

        return {
            id: event._id.toString(),
            name: event.title || event.name || "Unnamed Event",
            date: event.startDate ? new Date(event.startDate).toISOString() : "",
            stats: { 
                checkedIn: checkedInTickets, 
                total: totalTickets 
            }
        };
    }));

    return eventsWithStats;
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
}

/**
 * Verifies and checks in a ticket
 */
export async function verifyTicket(
  scannedCode: string, 
  targetEventId: string, 
  organizerId: string
): Promise<ScanResponse> {
  await dbConnect();

  try {
    // 1. Find Ticket and populate TicketType with specific fields
    const ticket = await Ticket.findOne({ ticketCode: scannedCode }).populate({
        path: 'ticketTypeId',
        select: 'event name accessRules' // Only fetch what we need
    });

    // 2. Existence Check
    if (!ticket) {
      return { success: false, error: "NOT_FOUND" };
    }

    const ticketType = ticket.ticketTypeId;

    // 3. Security / Event Scope Check
    // Ensure ticket belongs to the event we are scanning for
    if (ticketType.event.toString() !== targetEventId) {
       // "This ticket is for a different event"
      return { success: false, error: "WRONG_EVENT" };
    }

    // 4. Status Check
    if (ticket.status === "checked_in") {
      return { 
        success: false, 
        error: "ALREADY_USED", 
        details: { checkInTime: ticket.updatedAt.toISOString() } 
      };
    }

    if (ticket.status === "revoked") {
      return { success: false, error: "REVOKED" };
    }

    // 5. Commit Check-In (Atomic Operation)
    ticket.status = "checked_in";
    await ticket.save();

    // 6. Return Success
    return { 
      success: true, 
      ticket: { 
        name: ticket.attendeeName || "Unknown Guest", 
        type: ticketType.name, 
        id: ticket._id.toString() 
      } 
    };

  } catch (error) {
    console.error("Verify Ticket Error:", error);
    return {
        success: false,
        error: "NOT_FOUND", // Fallback error
        details: error
    };
  }
}

/**
 * Fetches the recent activity logs for an event
 * Simple approach: Ticket → Order → User
 */
export async function getEventLogs(eventId: string): Promise<TicketLogItem[]> {
  await dbConnect();

  try {
    // 1. Get all ticket types for this event
    const ticketTypes = await TicketType.find({ event: eventId }).select("_id name").lean();
    const ticketTypeIds = ticketTypes.map(tt => tt._id);
    
    if (ticketTypeIds.length === 0) {
      return [];
    }

    // Create ticket type name map
    const typeNameMap: Record<string, string> = {};
    ticketTypes.forEach((tt: any) => {
      typeNameMap[tt._id.toString()] = tt.name;
    });

    // 2. Get checked-in tickets
    const tickets = await Ticket.find({
      ticketTypeId: { $in: ticketTypeIds },
      status: "checked_in"
    })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

    console.log(`Found ${tickets.length} tickets`);

    // 3. Process each ticket
    const enrichedTickets: TicketLogItem[] = [];

    for (const ticket of tickets as any[]) {
      let buyerName: string | undefined;
      let buyerEmail: string | undefined;
      let displayName = "Unknown Customer";

      // Step 1: Get the order using orderId
      if (ticket.orderId) {
        const order = await Order.findById(ticket.orderId).lean();
        
        if (order) {
          console.log(`Found order ${ticket.orderId}`);
          
          // Step 2: Get the user using order.userId (not order.user)
          if (order.userId) {
            const user = await User.findById(order.userId).select('name email firstName lastName').lean();
            
            if (user) {
              // Construct name from available fields
              if (user.name) {
                buyerName = user.name;
              } else if (user.firstName || user.lastName) {
                buyerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              } else {
                buyerName = "User Account";
              }
              buyerEmail = user.email;
              console.log(`Found user: ${buyerName} (${buyerEmail})`);
            } else {
              console.log(`User ${order.userId} not found`);
            }
          } else {
            console.log(`Order has no userId field`);
          }
        } else {
          console.log(`Order ${ticket.orderId} not found`);
        }
      }

      // Determine display name
      if (ticket.attendeeName && ticket.attendeeName.trim()) {
        displayName = ticket.attendeeName.trim();
      } else if (buyerName && buyerName.trim()) {
        displayName = buyerName.trim();
      }

      enrichedTickets.push({
        id: ticket._id.toString(),
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        attendeeName: displayName,
        ticketType: typeNameMap[ticket.ticketTypeId.toString()] || "Unknown Type",
        timestamp: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : new Date().toISOString(),
        purchaseDate: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "Unknown",
        orderId: ticket.orderId ? ticket.orderId.toString() : "N/A",
        buyerName,
        buyerEmail
      });
    }

    console.log(`Returning ${enrichedTickets.length} enriched tickets`);
    return enrichedTickets;

  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }
}

/**
 * Export event logs as CSV
 */
export async function exportEventLogs(eventId: string): Promise<string> {
  await dbConnect();

  try {
    const logs = await getEventLogs(eventId);
    
    if (logs.length === 0) {
      return "";
    }

    // Create CSV header
    const headers = [
      'Ticket ID',
      'Ticket Code',
      'Attendee Name',
      'Ticket Type',
      'Status',
      'Check-in Time',
      'Purchase Date',
      'Order ID',
      'Buyer Name',
      'Buyer Email'
    ];

    // Create CSV rows
    const rows = logs.map(log => [
      log.id,
      log.ticketCode,
      log.attendeeName,
      log.ticketType,
      log.status,
      log.timestamp,
      log.purchaseDate,
      log.orderId,
      log.buyerName || '',
      log.buyerEmail || ''
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;

  } catch (error) {
    console.error("Failed to export logs:", error);
    return "";
  }
}

/**
 * Get event statistics (for real-time updates)
 */
export async function getEventStats(eventId: string): Promise<{
  checkedIn: number;
  total: number;
  lastCheckIn: string | null;
}> {
  await dbConnect();

  try {
    // 1. Get all ticket types for this event
    const ticketTypes = await TicketType.find({ event: eventId }).select('_id');
    const ticketTypeIds = ticketTypes.map(tt => tt._id);

    // Count total tickets
    const totalTickets = await Ticket.countDocuments({
      ticketTypeId: { $in: ticketTypeIds }
    });

    // Count checked-in tickets
    const checkedInTickets = await Ticket.countDocuments({
      ticketTypeId: { $in: ticketTypeIds },
      status: 'checked_in'
    });

    // Get last check-in time
    const lastCheckedTicket = await Ticket.findOne({
      ticketTypeId: { $in: ticketTypeIds },
      status: 'checked_in'
    })
    .sort({ updatedAt: -1 })
    .select('updatedAt')
    .lean();

    return {
      checkedIn: checkedInTickets,
      total: totalTickets,
      lastCheckIn: lastCheckedTicket?.updatedAt?.toISOString() || null
    };

  } catch (error) {
    console.error("Failed to get event stats:", error);
    return { checkedIn: 0, total: 0, lastCheckIn: null };
  }
}