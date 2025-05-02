import mongoose, { VirtualType } from "mongoose";

const blogSchema = new mongoose.Schema({
    title : {
        type: String,
        required: true,
        unique: true,
    },
    author : {
        type: String,
    },
    image:{
        type: String,
        required: true
    },
    date : {
        type : String,
        required : true
    },
    words: {
        type: Number,
    },
    content : {
        type: String,
        required: true,
    },
    link:{
        type: String,
        required: true,
        unique: true
    }
    //Subject to Additions

}, {timestamps:true});

export const Blog = mongoose.model("Blog",blogSchema);