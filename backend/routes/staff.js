const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', authMiddleware, requireRole('floor_warden', 'main_warden'), async (req, res) => {
  try {
    const staff = await Staff.find().sort({ performanceScore: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, requireRole('main_warden'), async (req, res) => {
  try {
    const { name, phone, specialization, maxCapacity } = req.body;
    const staff = new Staff({ name, phone, specialization, maxCapacity });
    await staff.save();
    res.status(201).json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/leaderboard', authMiddleware, requireRole('floor_warden', 'main_warden'), async (req, res) => {
  try {
    const staff = await Staff.find()
      .sort({ performanceScore: -1, totalResolved: -1 })
      .select('name specialization totalResolved avgResolutionHours performanceScore activeComplaints');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;