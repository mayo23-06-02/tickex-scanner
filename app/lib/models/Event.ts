import { Schema, model, models } from "mongoose";

const EventSchema = new Schema(
    {
        title: { type: String, required: true },
        startDate: { type: Date },
        organizerId: { type: Schema.Types.ObjectId, ref: 'User' },
        // Add other fields as necessary based on application needs
        // strictly following provided schemas for other models, 
        // but assuming Event needs to exist for references to work.
    },
    { timestamps: true, strict: false }
);

const Event = models.Event || model("Event", EventSchema);

export default Event;
