/**
 * Debug script to check database collections and relationships
 * Run this to verify your data structure
 */

import dbConnect from './app/lib/db';
import Ticket from './app/lib/models/Ticket';
import Order from './app/lib/models/Order';
import User from './app/lib/models/User';
import TicketType from './app/lib/models/TicketType';
import Event from './app/lib/models/Event';

async function debugDatabase() {
    await dbConnect();
    
    
    // 1. Check Events
    const events = await Event.find({}).limit(5);
    events.forEach(e => console.log(`  - ${e.title || e.name} (${e._id})`));
    
    // 2. Check Ticket Types
    const ticketTypes = await TicketType.find({}).limit(5);
    ticketTypes.forEach(tt => console.log(`  - ${tt.name} for event ${tt.event}`));
    
    // 3. Check Tickets
    const tickets = await Ticket.find({}).limit(5);
   
    
    // 4. Check Orders
    const orders = await Order.find({}).limit(5);
    
    
    // 5. Check Users
    const users = await User.find({}).limit(5);
    console.log(`\n👤 Users: ${users.length} found`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    
    // 6. Check a specific ticket with full population
    console.log('\n=== DETAILED TICKET CHECK ===');
    const sampleTicket = await Ticket.findOne({ status: 'checked_in' });
    if (sampleTicket) {
        console.log(`\nTicket: ${sampleTicket.ticketCode}`);
        console.log(`AttendeName: ${sampleTicket.attendeeName || 'NULL'}`);
        console.log(`OrderID: ${sampleTicket.orderId || 'NULL'}`);
        
        if (sampleTicket.orderId) {
            const order = await Order.findById(sampleTicket.orderId).populate('user');
            if (order) {
                console.log(`\nOrder found: ${order._id}`);
                console.log(`Order user: ${order.user ? (order.user as any).name : 'NULL'}`);
            } else {
                console.log(`\n❌ Order ${sampleTicket.orderId} NOT FOUND`);
            }
        }
    }
    
    console.log('\n=== END REPORT ===\n');
    process.exit(0);
}

debugDatabase().catch(console.error);
