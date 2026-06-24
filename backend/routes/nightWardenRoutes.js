const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ══════════════════════════════════════════════
//  GET /api/night-complaints — Night warden sees all complaints from 10pm–6am
// ══════════════════════════════════════════════
router.get('/', authMiddleware, requireRole('night_warden'), async (req, res) => {
  try {
    // Build time window: complaints submitted between 10pm and 6am
    // We look back across the last 24 hours and filter by hour
    const now = new Date();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const complaints = await Complaint.find({
      createdAt: { $gte: oneDayAgo },
    })
      .populate('student', 'name roomNumber floor')
      .populate('assignedTo', 'name managedFloor')
      .populate('assignedStaff', 'name specialization')
      .sort({ priorityScore: -1, createdAt: -1 })
      .lean();

    // Filter: only complaints submitted between 10pm (22) and 6am (6)
    const nightComplaints = complaints.filter(c => {
      const hour = new Date(c.createdAt).getHours();
      return hour >= 22 || hour < 6;
    });

    res.json(nightComplaints);
  } catch (err) {
    console.error('Night complaints error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  PATCH /api/night-complaints/:id/status — Night warden updates status
// ══════════════════════════════════════════════
router.patch('/:id/status', authMiddleware, requireRole('night_warden'), async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    complaint.status = status;
    if (status === 'resolved') complaint.resolvedAt = new Date();
    await complaint.save();
    res.json({ message: 'Status updated', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;