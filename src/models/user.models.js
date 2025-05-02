import mongoose, { VirtualType } from "mongoose";

const userSchema = new mongoose.Schema({
    username : {
        type: String,
        required: true,
        unique: true
    },
    email : {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim:true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    fullName: {
        type: String,
        required: true,
        trim:true,
    },
    password: {
        type: String,
        required: [true,'Password is Required'],
    },
    registeredEvents: [
        {
            type: Schema.Types.ObjectId,
            ref: "Event"
        }
    ]

    //Subject to Additions

}, {timestamps:true});

export const User = mongoose.model("User",userSchema);