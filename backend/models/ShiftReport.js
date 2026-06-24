const mongoose = require('mongoose');

const shiftReportSchema = new mongoose.Schema({
  // Which shift this report covers
  shiftType: {
    type: String,
    enum: ['night', 'day'],
    required: true
  },

  // Time window this report covers
  shiftStart: { type: Date, required: true },
  shiftEnd:   { type: Date, required: true },

  // AI generated summary
  summary: { type: String, required: true },

  // Raw stats used to generate the report (for transparency)
  stats: {
    totalComplaints:    { type: Number, default: 0 },
    resolved:           { type: Number, default: 0 },
    inProgress:         { type: Number, default: 0 },
    pending:            { type: Number, default: 0 },
    urgent:             { type: Number, default: 0 },
    handedOffToWarden:  { type: Number, default: 0 },
  },

  // Which complaints were unresolved and handed off
  handedOffComplaints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],

  // Who generated this (night_warden id if available)
  generatedFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

module.exports = mongoose.model('ShiftReport', shiftReportSchema);