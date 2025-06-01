import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  registration: {
    type: Boolean,
    default: false
  },
  // Solo registrations
  registeredUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  status: {
    type: String,
    enum: ["Past", "Ongoing", "Upcoming"],
    required: true,
    default: "Upcoming"
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: null
  },
  // Team registration fields
  teamRegistration: {
    type: Boolean,
    default: false
  },
  minTeamSize: {
    type: Number,
    default: 1
  },
  maxTeamSize: {
    type: Number,
    default: 1
  },
  // Teams registered for this event
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  }],
  // Registration limits
  maxParticipants: {
    type: Number,
    default: null // null means unlimited
  },
  maxTeams: {
    type: Number,
    default: null // null means unlimited
  }
}, { timestamps: true });

// Virtual to get total participants count
eventSchema.virtual('totalParticipants').get(function() {
  const soloCount = this.registeredUsers.length;
  const teamCount = this.teams.reduce((acc, team) => {
    return acc + (team.currentSize || 0);
  }, 0);
  return soloCount + teamCount;
});

export const Event = mongoose.model("Event", eventSchema);
