// models/otp.models.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const otpSchema = new mongoose.Schema({
    identifier: { // email for both email verification and password reset
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['email_verification', 'password_reset', 'kgp_mail_verification'],
        required: true,
        default: 'email_verification'
    },
    userId: { // Optional: link to user for additional security
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // OTP expires after 10 minutes
    }
});

// Hash OTP before saving
otpSchema.pre("save", async function(next) {
    if (this.isModified("otp")) {
        this.otp = await bcrypt.hash(this.otp, 10);
    }
    next();
});

// Method to verify OTP
otpSchema.methods.verifyOTP = async function(otp) {
    return await bcrypt.compare(otp, this.otp);
};

// Compound index for better performance
otpSchema.index({ identifier: 1, type: 1 });

export const OTP = mongoose.model("OTP", otpSchema);
