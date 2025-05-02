import mongoose, { VirtualType } from "mongoose";

const eventSchema = new mongoose.Schema({
    title : {
        type: String,
        required: true,
        unique: true,
    },
    description : {
        type: String,
    },
    time : {
        type : String,
        required : true
    },
    registration: {
        type: Boolean,
        default: false
    },
    registeredUsers: [
        {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    ],
    status : {
        type: String,
        enums: ["Past", "Ongoing", "Upcoming"],
        required: true,
        default: "Past"
    },
    image:{
        type:String,
        required:true
    }
    //Subject to Additions

}, {timestamps:true});

export const Event = mongoose.model("Event",eventSchema);