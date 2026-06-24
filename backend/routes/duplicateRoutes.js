const express = require('express');
const router  = express.Router();
const Complaint = require('../models/Complaint');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { findDuplicates, mergeComplaints, unmergeComplaint } = require('../utils/duplicateEngine');

// ─── POST /api/duplicates/check ─────────────────────────────────────────────
// Call this BEFORE saving a new complaint to warn the student.
// Body: { description, category, floor, room }
// Returns: { isDuplicate, parentId, similarComplaints, mergeReason }
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { description, category, floor, room } = req.body;

    if (!description || !floor) {
      return res.status(400).json({ message: 'description and floor are required' });
    }

    const result = await findDuplicates({ description, category, floor, room });
    res.json(result);
  } catch (err) {
    console.error('Duplicate check error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── POST /api/duplicates/merge ─────────────────────────────────────────────
// Student or warden confirms the merge.
// Body: { childId, parentId, mergeReason }
router.post('/merge', authMiddleware, async (req, res) => {
  try {
    const { childId, parentId, mergeReason } = req.body;
    if (!childId || !parentId) {
      return res.status(400).json({ message: 'childId and parentId are required' });
    }
    const result = await mergeComplaints(childId, parentId, mergeReason);
    res.json({
      message: 'Complaints merged successfully',
      child:  result.child,
      parent: result.parent,
    });
  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── POST /api/duplicates/unmerge/:childId ──────────────────────────────────
// Warden can reverse a merge if it was wrong.
router.post('/unmerge/:childId', authMiddleware, requireRole('floor_warden', 'main_warden'), async (req, res) => {
  try {
    const result = await unmergeComplaint(req.params.childId);
    res.json({
      message: 'Complaint unmerged successfully',
      child:   result.child,
    });
  } catch (err) {
    console.error('Unmerge error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/duplicates/groups ─────────────────────────────────────────────
// Warden sees all merged groups in one view.
router.get('/groups', authMiddleware, requireRole('floor_warden', 'main_warden'), async (req, res) => {
  try {
    // Find all parent complaints that have at least one merged child
    const parents = await Complaint.find({
      mergedComplaints: { $exists: true, $not: { $size: 0 } },
    })
      .populate('mergedComplaints', 'roomNumber description status createdAt floor')
      .sort({ priorityScore: -1 })
      .lean();

    const groups = parents.map(p => ({
      parent: {
        _id:          p._id,
        room:         p.roomNumber,
        floor:        p.floor,
        description:  p.description,
        category:     p.category,
        status:       p.status,
        priorityScore:p.priorityScore,
        createdAt:    p.createdAt,
      },
      mergedCount:   p.mergedComplaints.length,
      mergedChildren:p.mergedComplaints,
    }));

    res.json(groups);
  } catch (err) {
    console.error('Groups error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/duplicates/stats ───────────────────────────────────────────────
// Quick stats for the analytics dashboard.
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalMerged, totalGroups] = await Promise.all([
      Complaint.countDocuments({ isMerged: true }),
      Complaint.countDocuments({
        mergedComplaints: { $exists: true, $not: { $size: 0 } },
      }),
    ]);
    res.json({ totalMerged, totalGroups });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;