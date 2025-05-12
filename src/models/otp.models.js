import mongoose from "mongoose";
import bcrypt from "bcrypt";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    otp: {
        type: String,
        required: true
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

export const OTP = mongoose.model("OTP", otpSchema); 