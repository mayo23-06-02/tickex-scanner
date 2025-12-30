import { Schema, model, models } from "mongoose";

const TicketSchema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        ticketTypeId: {
            type: Schema.Types.ObjectId,
            ref: "TicketType",
            required: true
        },
        ticketCode: {
            type: String,
            required: true,
            unique: true, // Unique QR content
        },
        status: {
            type: String,
            enum: ["active", "checked_in", "revoked"],
            default: "active",
        },
        attendeeName: {
            type: String, // Optional assignment
        }
    },
    { timestamps: true }
);

const Ticket = models.Ticket || model("Ticket", TicketSchema);

export default Ticket;
