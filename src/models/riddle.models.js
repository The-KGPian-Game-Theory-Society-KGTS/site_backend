import mongoose from "mongoose";

const riddleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: [100, "Title cannot exceed 100 characters"]
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  openingTime: {
    type: Date,
    required: true
  },
  closingTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.openingTime;
      },
      message: "Closing time must be after opening time"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  showLeaderboard: {
    type: Boolean,
    default: false // Admin controls when to show leaderboard
  },
  totalResponses: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Virtual to check if riddle is currently open
riddleSchema.virtual('isOpen').get(function() {
  const now = new Date();
  return now >= this.openingTime && now <= this.closingTime && this.isActive;
});

// Virtual to check if riddle is closed
riddleSchema.virtual('isClosed').get(function() {
  const now = new Date();
  return now > this.closingTime || !this.isActive;
});

export const Riddle = mongoose.model("Riddle", riddleSchema);
