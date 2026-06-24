const mongoose = require('mongoose');

// Graph structure: each floor warden is linked to their floor rooms
// Main warden is linked to all floor wardens
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },


  // role: 'student' | 'floor_warden' | 'main_warden' | 'night_warden'
role: { type: String, enum: ['student', 'floor_warden', 'main_warden', 'night_warden'], required: true },

  // For students: which room and floor they live in
  roomNumber: { type: String },
  floor: { type: Number },

  // For floor wardens: which floor they manage (Graph node)
  managedFloor: { type: Number },

  // For floor wardens: reference to main warden above them (Graph edge)
  reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);