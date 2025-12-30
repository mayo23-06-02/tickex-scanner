import { Schema, model, models } from "mongoose";

const TicketTypeSchema = new Schema(
    {
        event: {
            type: Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        name: {
            type: String,
            required: true, // e.g., "VIP", "General Admission"
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "SZL",
        },
        quantityTotal: {
            type: Number,
            required: true,
            min: 1,
        },
        quantitySold: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
        },
        ticketDesignUrl: {
            type: String,
            // Custom ticket design image URL (150mm x 80mm)
            // Space reserved for barcode generation
        },
        saleStart: {
            type: Date,
        },
        saleEnd: {
            type: Date,
        },
        limitPerUser: {
            type: Number,
            default: 10000,
        },
        // Advanced Configuration
        perks: [{ type: String }],
        accessRules: {
            gates: { type: String, default: 'All Gates' },
            entryStartTime: { type: String },
            entryEndTime: { type: String },
            ageRestricted: { type: Boolean, default: false },
            idRequired: { type: Boolean, default: false },
        },
        designConfig: {
            backgroundColor: { type: String, default: '#1DB954' },
            textColor: { type: String, default: '#FFFFFF' },
            qrStyle: { type: String, enum: ['square', 'rounded', 'dots'], default: 'square' },
            showLogo: { type: Boolean, default: true },
        },
        transferSettings: {
            allowTransfer: { type: Boolean, default: true },
            requireApproval: { type: Boolean, default: false },
            chargeFee: { type: Boolean, default: false },
            feeAmount: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

const TicketType = models.TicketType || model("TicketType", TicketTypeSchema);

export default TicketType;
