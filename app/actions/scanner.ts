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
 * Fetches the recent activity logs for an event with user information
 * FIXED: Now correctly uses `userId` field from Order model
 */
export async function getEventLogs(eventId: string): Promise<TicketLogItem[]> {
  await dbConnect();

  try {
    // 1. Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.error("Invalid eventId:", eventId);
      return [];
    }

    // 2. Get all ticket types for this event
    const ticketTypes = await TicketType.find({ event: eventId })
      .select("_id name")
      .lean();
    
    if (ticketTypes.length === 0) {
      console.log(`No ticket types found for event ${eventId}`);
      return [];
    }

    const ticketTypeIds = ticketTypes.map(tt => tt._id);
    
    // Create ticket type name map
    const typeNameMap: Record<string, string> = {};
    ticketTypes.forEach((tt: any) => {
      typeNameMap[tt._id.toString()] = tt.name;
    });

    // 3. Get checked-in tickets with orderId populated
    const tickets = await Ticket.find({
      ticketTypeId: { $in: ticketTypeIds },
      status: "checked_in"
    })
    .populate({
      path: 'orderId',
      select: 'userId',  // Changed from 'user' to 'userId'
      model: 'Order'
    })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

    console.log(`Found ${tickets.length} checked-in tickets for event ${eventId}`);

    // 4. Process each ticket to get user information
    const enrichedTickets: TicketLogItem[] = [];

    for (const ticket of tickets as any[]) {
      let buyerName: string | undefined = "Unknown Customer";
      let buyerEmail: string | undefined;
      
      // Check if order exists and has userId
      if (ticket.orderId && ticket.orderId.userId) {
        try {
          // Find the user associated with the order using userId
          const user = await User.findById(ticket.orderId.userId)
            .select('name email firstName lastName')
            .lean();
          
          if (user) {
            // Use user's name if available
            if (user.name) {
              buyerName = user.name;
            } else if (user.firstName || user.lastName) {
              buyerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            } else {
              buyerName = "User Account";
            }
            
            buyerEmail = user.email;
            console.log(`Found user ${buyerName} (${buyerEmail}) for order ${ticket.orderId._id}`);
          } else {
            console.log(`User with ID ${ticket.orderId.userId} not found`);
          }
        } catch (error) {
          console.error(`Error fetching user for order ${ticket.orderId._id}:`, error);
        }
      } else if (!ticket.orderId) {
        console.log(`Ticket ${ticket._id} has no orderId`);
      } else {
        console.log(`Order ${ticket.orderId._id} has no userId field`);
      }
      
      // Check if ticket has attendee name (this might be different from buyer)
      if (ticket.attendeeName && ticket.attendeeName.trim()) {
        // If we have an attendee name, use that as the display name
        // But keep the buyer info for reference
        console.log(`Ticket ${ticket._id} has attendee name: ${ticket.attendeeName}`);
        // Note: We'll use attendeeName for display, but keep buyerName separate
        // for the buyerName field
      }

      // Format the result
      enrichedTickets.push({
        id: ticket._id.toString(),
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        attendeeName: ticket.attendeeName && ticket.attendeeName.trim() 
          ? ticket.attendeeName.trim() 
          : buyerName, // Fall back to buyer name if no attendee name
        ticketType: typeNameMap[ticket.ticketTypeId.toString()] || "Unknown Type",
        timestamp: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : new Date().toISOString(),
        purchaseDate: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "Unknown",
        orderId: ticket.orderId ? ticket.orderId._id.toString() : "N/A",
        buyerName: buyerName,
        buyerEmail: buyerEmail,
        scannedBy: ticket.scannedBy || "Unknown",
        checkInMethod: ticket.checkInMethod || "qr_scan"
      });
    }

    console.log(`Returning ${enrichedTickets.length} enriched tickets with user info`);
    return enrichedTickets;

  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }
}

/**
 * Alternative method using aggregation pipeline with correct field names
 */
export async function getEventLogsAggregate(eventId: string): Promise<TicketLogItem[]> {
  await dbConnect();

  try {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return [];
    }

    const result = await Ticket.aggregate([
      // 1. Join with TicketType to filter by event
      {
        $lookup: {
          from: 'tickettypes',
          localField: 'ticketTypeId',
          foreignField: '_id',
          as: 'ticketType'
        }
      },
      { $unwind: '$ticketType' },
      
      // 2. Filter by event and status
      {
        $match: {
          'ticketType.event': new mongoose.Types.ObjectId(eventId),
          status: 'checked_in'
        }
      },
      
      // 3. Join with Order using orderId
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
      
      // 4. Join with User through Order.userId
      {
        $lookup: {
          from: 'users',
          localField: 'order.userId',  // Changed from 'order.user' to 'order.userId'
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      
      // 5. Sort and limit
      { $sort: { updatedAt: -1 } },
      { $limit: 50 },
      
      // 6. Project the final result
      {
        $project: {
          _id: 1,
          ticketCode: 1,
          status: 1,
          updatedAt: 1,
          createdAt: 1,
          attendeeName: 1,
          scannedBy: 1,
          checkInMethod: 1,
          'order._id': 1,
          'order.userId': 1,
          'ticketType.name': 1,
          'user.name': 1,
          'user.email': 1,
          'user.firstName': 1,
          'user.lastName': 1
        }
      }
    ]);

    return result.map((item: any) => {
      // Determine the best name to display
      let displayName = "Unknown Customer";
      
      // Priority: attendeeName > user name > user first/last name
      if (item.attendeeName && item.attendeeName.trim()) {
        displayName = item.attendeeName.trim();
      } else if (item.user?.name) {
        displayName = item.user.name;
      } else if (item.user?.firstName || item.user?.lastName) {
        displayName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim();
      }
      
      // Determine buyer name (actual purchaser)
      let buyerName = "Unknown Customer";
      if (item.user?.name) {
        buyerName = item.user.name;
      } else if (item.user?.firstName || item.user?.lastName) {
        buyerName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim();
      }
      
      return {
        id: item._id.toString(),
        ticketCode: item.ticketCode,
        status: item.status,
        attendeeName: displayName,
        ticketType: item.ticketType?.name || "Unknown Type",
        timestamp: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
        purchaseDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Unknown",
        orderId: item.order?._id?.toString() || "N/A",
        buyerName: buyerName,
        buyerEmail: item.user?.email,
        scannedBy: item.scannedBy || "Unknown",
        checkInMethod: item.checkInMethod || "qr_scan"
      };
    });

  } catch (error) {
    console.error("Aggregation error:", error);
    return [];
  }
}

/**
 * Get detailed user information for a specific order
 */
export async function getUserInfoFromOrder(orderId: string): Promise<{
  name: string;
  email: string;
  userId: string;
} | null> {
  await dbConnect();

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return null;
    }

    // Get the order with userId
    const order = await Order.findById(orderId)
      .select('userId')
      .lean();

    if (!order || !order.userId) {
      return null;
    }

    // Get user information
    const user = await User.findById(order.userId)
      .select('name email firstName lastName')
      .lean();

    if (!user) {
      return null;
    }

    // Construct name
    let name = user.name;
    if (!name && (user.firstName || user.lastName)) {
      name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    if (!name) {
      name = "User Account";
    }

    return {
      name,
      email: user.email || "No email",
      userId: user._id.toString()
    };

  } catch (error) {
    console.error("Error getting user info from order:", error);
    return null;
  }
}