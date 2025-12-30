import { Schema, model, models } from "mongoose";

const OrderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "SZL",
        },
        status: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        paymentIntentId: {
            type: String, // Stripe Payment Intent ID
        },
        tickets: [
            {
                ticketTypeId: {
                    type: Schema.Types.ObjectId,
                    ref: "TicketType",
                },
                quantity: Number,
                price: Number,
            }
        ]
    },
    { timestamps: true }
);

const Order = models.Order || model("Order", OrderSchema);

export default Order;
