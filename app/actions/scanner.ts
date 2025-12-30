'use server'

import { ScanResponse, EventSummary, TicketLogItem } from "../lib/definitions";
import dbConnect from "../lib/db";
import Ticket from "../lib/models/Ticket";
import TicketType from "../lib/models/TicketType";
import Event from "../lib/models/Event"; 
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


import Order from "../lib/models/Order";
// Ensure models are registered
import "../lib/models/User"; 

/**
 * Fetches the recent activity logs for an event (recently checked-in tickets)
 */
export async function getEventLogs(eventId: string): Promise<TicketLogItem[]> {
  await dbConnect();

  try {
    // 1. Get all ticket types for this event
    const ticketTypes = await TicketType.find({ event: eventId }).select("_id name");
    const ticketTypeIds = ticketTypes.map(tt => tt._id);
    
    // Map for quick name lookup
    const typeNameMap = ticketTypes.reduce((acc: any, curr: any) => {
        acc[curr._id.toString()] = curr.name;
        return acc;
    }, {} as Record<string, string>);

    // 2. Fetch the last 50 checked-in tickets
    const tickets = await Ticket.find({
      ticketTypeId: { $in: ticketTypeIds },
      status: "checked_in"
    })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

    console.log(`Found ${tickets.length} checked-in tickets for event ${eventId}`);

    // 3. Enrich with Order/User info
    const enrichedTickets = await Promise.all(tickets.map(async (t: any) => {
        let buyerName = null;
        let buyerEmail = null;
        let displayName = "Unknown Customer";

        // Try to get buyer info from order
        if (t.orderId) {
            try {
                const order = await Order.findById(t.orderId).populate('user', 'name email').lean();
                
                if (order && order.user) {
                    const user = order.user as any;
                    buyerName = user.name || null;
                    buyerEmail = user.email || null;
                    console.log(`Order ${t.orderId}: Buyer = ${buyerName} (${buyerEmail})`);
                } else {
                    console.log(`Order ${t.orderId}: No user found or not populated`);
                }
            } catch (err) {
                console.error(`Error fetching order ${t.orderId}:`, err);
            }
        } else {
            console.log(`Ticket ${t.ticketCode}: No orderId`);
        }

        // Determine display name priority: attendeeName > buyerName > "Unknown Customer"
        if (t.attendeeName && t.attendeeName.trim() !== "") {
            displayName = t.attendeeName;
        } else if (buyerName && buyerName.trim() !== "") {
            displayName = buyerName;
        }

        console.log(`Ticket ${t.ticketCode}: Final display name = "${displayName}"`);

        return {
            id: t._id.toString(),
            ticketCode: t.ticketCode,
            status: t.status,
            attendeeName: displayName,
            ticketType: typeNameMap[t.ticketTypeId.toString()] || "Unknown Type",
            timestamp: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
            purchaseDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Unknown",
            orderId: t.orderId ? t.orderId.toString() : "N/A",
            buyerName: buyerName || "Unknown",
            buyerEmail: buyerEmail || "Unknown"
        };
    }));

    return enrichedTickets;

  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }
}

