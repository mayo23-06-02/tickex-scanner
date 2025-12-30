import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a name"],
            maxlength: [60, "Name cannot be more than 60 characters"],
        },
        email: {
            type: String,
            required: [true, "Please provide an email"],
            unique: true,
            maxlength: [100, "Email cannot be more than 100 characters"],
        },
        password: {
            type: String,
            required: [true, "Please provide a password"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },
        image: {
            type: String,
        },
        stripeAccountId: {
            type: String,
            default: null
        },
        otp: {
            code: String,
            expiresAt: Date
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

const User = models.User || model("User", UserSchema);

export default User;
