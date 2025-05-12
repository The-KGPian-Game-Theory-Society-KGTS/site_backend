import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title : {
        type: String,
        required: true,
        unique: true,
    },
    description : {
        type: String,
    },
    date : {
        type : String,
        required : true
    },
    time : {
        type : String,
        required : true
    },
    location : {
        type : String,
        required : true
    },
    registration: {
        type: Boolean,
        default: false
    },
    registeredUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    status : {
        type: String,
        enum: ["Past", "Ongoing", "Upcoming"],
        required: true,
        default: "Upcoming"
    },
    image:{
        type:String,
        required:true
    }
    //Subject to Additions

}, {timestamps:true});

export const Event = mongoose.model("Event",eventSchema);