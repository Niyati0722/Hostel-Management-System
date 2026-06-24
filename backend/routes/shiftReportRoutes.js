const express = require('express');
const router = express.Router();
const ShiftReport = require('../models/ShiftReport');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ══════════════════════════════════════════════
//  GET /api/shift-reports — Get all shift reports
//  Accessible by night_warden, floor_warden, main_warden
// ══════════════════════════════════════════════
router.get('/', authMiddleware, requireRole('night_warden', 'floor_warden', 'main_warden'), async (req, res) => {
  try {
    const reports = await ShiftReport.find()
      .populate('handedOffComplaints', 'description category roomNumber floor status')
      .populate('generatedFor', 'name')
      .sort({ createdAt: -1 })
      .limit(30); // last 30 reports
    res.json(reports);
  } catch (err) {
    console.error('Shift reports fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  GET /api/shift-reports/latest — Get the most recent report
// ══════════════════════════════════════════════
router.get('/latest', authMiddleware, requireRole('night_warden', 'floor_warden', 'main_warden'), async (req, res) => {
  try {
    const report = await ShiftReport.findOne()
      .populate('handedOffComplaints', 'description category roomNumber floor status')
      .sort({ createdAt: -1 });
    res.json(report || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;