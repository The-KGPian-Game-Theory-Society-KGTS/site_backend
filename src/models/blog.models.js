import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
    },
    author: {
        type: String,
    },
    image: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true,
    },
    externalLink: {
        type: String,
        required: true,
        unique: true
    }
    //Subject to Additions

}, { timestamps: true });

export const Blog = mongoose.model("Blog", blogSchema);