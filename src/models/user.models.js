// models/user.models.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is Required'],
    },
    registeredEvents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event"
    }],
    isAdmin: {
        type: Boolean,
        default: false,
    },
    phoneNumber: {
        type: String,
        match: [/^[0-9]{10}$/, "Please enter a valid Phone number"]
    },
    collegeName: {
        type: String,
    },
    kgpMail: {
        type: String,
        match: [/^[a-zA-Z0-9._%+-]+@kgpian\.iitkgp\.ac\.in$/, "Please enter a valid IIT Kgp institute email ID"]
    },
    kgpMailVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    riddlePoints: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method to check if password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.userName,
            isAdmin: this.isAdmin
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model("User", userSchema);
