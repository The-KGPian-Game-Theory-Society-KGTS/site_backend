import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    trim: true,
    maxLength: [50, "Team name cannot exceed 50 characters"]
  },
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  teamMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true
  },
  isComplete: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound index to ensure unique team names per event
teamSchema.index({ teamName: 1, event: 1 }, { unique: true });

// Virtual to get team size
teamSchema.virtual('currentSize').get(function() {
  return this.teamMembers.length + 1; // +1 for team leader
});

// Method to check if team is full
teamSchema.methods.isFull = function(maxSize) {
  return this.currentSize >= maxSize;
};

// Method to add member
teamSchema.methods.addMember = function(userId) {
  if (!this.teamMembers.includes(userId)) {
    this.teamMembers.push(userId);
  }
};

// Method to remove member
teamSchema.methods.removeMember = function(userId) {
  this.teamMembers = this.teamMembers.filter(member => !member.equals(userId));
};

export const Team = mongoose.model("Team", teamSchema);
