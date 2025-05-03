import mongoose, { VirtualType } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


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
    ],
    isAdmin: {
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String
    }

    //Subject to Additions

}, {timestamps:true});


userSchema.pre("save" , async function(next) {

    if(this.isModified("password"))
    {
        this.password = await bcrypt.hash(this.password)
    }
    next()
})


userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken = async function(){
    return await jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    }, process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}


userSchema.methods.generateRefreshToken = async function(){
    return await jwt.sign({
        _id: this._id
    }, process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}


export const User = mongoose.model("User",userSchema);