import mongoose from "mongoose";

const riddleResponseSchema = new mongoose.Schema({
  riddle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Riddle",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  response: {
    type: String,
    required: true,
    trim: true
  },
  points: {
    type: Number,
    default: 0 // Admin will assign points
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure one response per user per riddle
riddleResponseSchema.index({ riddle: 1, user: 1 }, { unique: true });

export const RiddleResponse = mongoose.model("RiddleResponse", riddleResponseSchema);
