const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ══════════════════════════════════════════════
//  GET /api/analytics/heatmap
//  Returns complaint count per room → frontend colors rooms red/yellow/green
//  DSA: 2D matrix representation of hostel floor
// ══════════════════════════════════════════════
router.get('/heatmap', authMiddleware, requireRole('floor_warden', 'main_warden'), async (req, res) => {
  try {
    const complaints = await Complaint.aggregate([
      { $match: { status: { $in: ['pending', 'assigned', 'in_progress'] } } },
      { $group: { _id: '$roomNumber', count: { $sum: 1 }, floor: { $first: '$floor' } } },
      { $sort: { count: -1 } }
    ]);

    // Map to heatmap format: { room, floor, count, level: 'red'|'yellow'|'green' }
    const heatmap = complaints.map(c => ({
      room: c._id,
      floor: c.floor,
      count: c.count,
      level: c.count >= 3 ? 'red' : c.count === 2 ? 'yellow' : 'green'
    }));

    res.json(heatmap);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  GET /api/analytics/summary — Dashboard stats
// ══════════════════════════════════════════════
router.get('/summary', authMiddleware, requireRole('floor_warden', 'main_warden'), async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'pending' });
    const resolved = await Complaint.countDocuments({ status: 'resolved' });
    const escalated = await Complaint.countDocuments({ status: 'escalated' });
    const urgent = await Complaint.countDocuments({ isUrgent: true, status: { $ne: 'resolved' } });
    const slaAtRisk = await Complaint.countDocuments({
      slaWarningsentAt: { $ne: null },
      status: { $nin: ['resolved', 'escalated'] }
    });

    // Category breakdown
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ total, pending, resolved, escalated, urgent, slaAtRisk, byCategory });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/repeat — Chronic issues (repeat complaints)
router.get('/repeat', authMiddleware, requireRole('main_warden'), async (req, res) => {
  try {
    const chronic = await Complaint.find({ isRepeat: true })
      .populate('student', 'name roomNumber')
      .sort({ priorityScore: -1 })
      .limit(20);
    res.json(chronic);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;