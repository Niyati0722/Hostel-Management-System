const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({

  // Who submitted
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomNumber: { type: String, required: true },
  floor: { type: Number, required: true },

  // What is the issue
  category: {
    type: String,
    enum: ['electrical', 'water_plumbing', 'laundry', 'carpentry', 'cleanliness', 'internet', 'security', 'other'],
    required: true
  },
  subCategory: { type: String }, // e.g. "fan not working", "tap leaking"
  description: { type: String, required: true },
  photoUrl: { type: String },

  // ── PRIORITY ENGINE (DSA: Max-Heap logic) ──
  priorityScore: { type: Number, default: 0 },
  severityBase: { type: Number, default: 0 },   // base score by category
  seasonMultiplier: { type: Number, default: 1 }, // boosted in summer/winter
  isUrgent: { type: Boolean, default: false },    // same-day resolution needed

  // ── STATUS TRACKING ──
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'resolved', 'reopened', 'escalated', 'merged'],
    default: 'pending'
  },

  // ── ASSIGNMENT (Graph traversal result) ──
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // floor warden
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }, // maintenance staff
  escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // main warden

  // ── ESCALATION TRACKING ──
  escalatedAt: { type: Date },
  escalationReason: { type: String },
  slaWarningsentAt: { type: Date }, // when 24h warning was sent

  // ── DUPLICATE DETECTION (Hashing) ──
  // ── DUPLICATE DETECTION (Hashing) ──
  isDuplicate:       { type: Boolean, default: false },
  mergedWith:        { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  isMerged:          { type: Boolean, default: false },
  mergedInto:        { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', default: null },
  mergeReason:       { type: String, default: null },
  mergedComplaints:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],

  // ── REPEAT DETECTION (Sliding Window) ──
  isRepeat: { type: Boolean, default: false },

  // ── DEPENDENCY CHAIN (Graph) ──
  dependsOn: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }, // root issue
  dependentComplaints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' }],

  // ── FEEDBACK LOOP ──
  studentRating: { type: Number, min: 1, max: 5 },
  feedbackComment: { type: String },
  resolvedAt: { type: Date },

}, { timestamps: true });

// Auto-calculate priority score before saving
complaintSchema.pre('save', function (next) {
  if (this.isModified('severityBase') || this.isModified('seasonMultiplier')) {
    const hoursOld = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    this.priorityScore = (this.severityBase * this.seasonMultiplier) + Math.floor(hoursOld);
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);