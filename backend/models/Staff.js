const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },

  // What type of work they do
  specialization: {
    type: String,
    enum: ['electrician', 'plumber', 'carpenter', 'cleaner', 'laundry', 'general'],
    required: true
  },

  // ── LOAD BALANCER: how many active jobs they have ──
  activeComplaints: { type: Number, default: 0 },
  maxCapacity: { type: Number, default: 5 }, // max complaints at once

  isAvailable: { type: Boolean, default: true },

  // ── PERFORMANCE SCORING (for leaderboard) ──
  totalResolved: { type: Number, default: 0 },
  totalEscalated: { type: Number, default: 0 }, // complaints escalated from them
  avgResolutionHours: { type: Number, default: 0 },
  performanceScore: { type: Number, default: 100 },

}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);