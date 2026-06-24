const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  calculatePriority,
  findFloorWarden,
  checkDuplicate,
  checkRepeat,
  findBestStaff
} = require('../utils/priorityEngine');

// ── FILE UPLOAD SETUP ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// ══════════════════════════════════════════════
//  POST /api/complaints — Submit a new complaint
//  DSA: Priority scoring + Graph assignment + Duplicate + Repeat check
// ══════════════════════════════════════════════
router.post('/', authMiddleware, requireRole('student'), upload.single('photo'), async (req, res) => {
  try {
    const { category, subCategory, description, roomNumber, floor } = req.body;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Build complaint object
    const complaintData = {
      student: req.user.id,
      roomNumber,
      floor: parseInt(floor),
      category,
      subCategory,
      description,
      photoUrl,
      createdAt: new Date()
    };

    // 1. Priority Engine: calculate score
    const { score, isUrgent, base, season } = calculatePriority(complaintData);
    complaintData.priorityScore = score;
    complaintData.isUrgent = isUrgent;
    complaintData.severityBase = base;
    complaintData.seasonMultiplier = season;

    // 2. Sliding Window: check if it's a repeat complaint
    const isRepeat = await checkRepeat(roomNumber, category);
    complaintData.isRepeat = isRepeat;
    if (isRepeat) {
      complaintData.priorityScore = Math.round(score * 1.5); // penalty boost
    }

    // 3. Graph Traversal: find correct floor warden
    const floorWarden = await findFloorWarden(parseInt(floor));
    if (floorWarden) {
      complaintData.assignedTo = floorWarden._id;
      complaintData.status = 'assigned';
    }

    // 4. Greedy: find best available staff
    const staff = await findBestStaff(category);
    if (staff) {
      complaintData.assignedStaff = staff._id;
      await Staff.findByIdAndUpdate(staff._id, { $inc: { activeComplaints: 1 } });
    }

    // 5. Duplicate Detection: merge if same floor + category within 2 hours
    const duplicate = await checkDuplicate(complaintData);
    if (duplicate) {
      complaintData.isDuplicate = true;
      complaintData.mergedWith = duplicate._id;
      // Add this complaint to the parent's dependent list
      await Complaint.findByIdAndUpdate(duplicate._id, {
        $push: { dependentComplaints: 'pending_save' }
      });
    }

    const complaint = new Complaint(complaintData);
    await complaint.save();

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint,
      alerts: {
        isUrgent,
        isRepeat,
        isDuplicate: !!duplicate,
        priorityScore: complaint.priorityScore
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ══════════════════════════════════════════════
//  GET /api/complaints/my — Student's own complaints
// ══════════════════════════════════════════════
router.get('/my', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user.id })
      .populate('assignedTo', 'name')
      .populate('assignedStaff', 'name specialization')
      .sort({ priorityScore: -1, createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  GET /api/complaints/floor — Floor warden sees their floor's complaints
//  Returns sorted by priority score (Max-Heap behavior)
// ══════════════════════════════════════════════
router.get('/floor', authMiddleware, requireRole('floor_warden'), async (req, res) => {
  try {
    const warden = await User.findById(req.user.id);

    const complaints = await Complaint.find({
      floor: warden.managedFloor,
      status: { $in: ['pending', 'assigned', 'in_progress'] }
    })
      .populate('student', 'name roomNumber')
      .populate('assignedStaff', 'name specialization')
      .sort({ priorityScore: -1 }); // highest priority first — priority queue!

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  GET /api/complaints/escalated — Main warden sees all escalated
// ══════════════════════════════════════════════
router.get('/escalated', authMiddleware, requireRole('main_warden'), async (req, res) => {
  try {
    const complaints = await Complaint.find({
      escalatedTo: req.user.id
    })
      .populate('student', 'name roomNumber floor')
      .populate('assignedTo', 'name managedFloor')
      .sort({ priorityScore: -1 });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  GET /api/complaints/all — Main warden sees everything
// ══════════════════════════════════════════════
router.get('/all', authMiddleware, requireRole('main_warden'), async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('student', 'name roomNumber floor')
      .populate('assignedTo', 'name managedFloor')
      .populate('assignedStaff', 'name specialization')
      .sort({ priorityScore: -1, createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  PATCH /api/complaints/:id/status — Update status
// ══════════════════════════════════════════════
router.patch('/:id/status', authMiddleware, requireRole('floor_warden', 'main_warden','night_warden'), async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    complaint.status = status;

    if (status === 'resolved') {
      complaint.resolvedAt = new Date();
      // Free up staff slot
      if (complaint.assignedStaff) {
        await Staff.findByIdAndUpdate(complaint.assignedStaff, {
          $inc: { activeComplaints: -1, totalResolved: 1 }
        });
      }

      // Dependency chain: auto-resolve dependent complaints
      if (complaint.dependentComplaints.length > 0) {
        await Complaint.updateMany(
          { _id: { $in: complaint.dependentComplaints } },
          { status: 'resolved', resolvedAt: new Date() }
        );
      }
    }

    await complaint.save();
    res.json({ message: 'Status updated', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════
//  PATCH /api/complaints/:id/feedback — Student rates resolution
//  Feedback loop: rating ≤ 2 reopens the complaint
// ══════════════════════════════════════════════
router.patch('/:id/feedback', authMiddleware, requireRole('student'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) return res.status(404).json({ message: 'Not found' });
    if (complaint.student.toString() !== req.user.id) return res.status(403).json({ message: 'Not your complaint' });

    complaint.studentRating = rating;
    complaint.feedbackComment = comment;

    // Feedback loop: bad rating → reopen at high priority
    if (rating <= 2) {
      complaint.status = 'reopened';
      complaint.priorityScore += 15; // jump to top of queue
      complaint.resolvedAt = null;

      // Free staff slot was already decremented, undo that
      if (complaint.assignedStaff) {
        await Staff.findByIdAndUpdate(complaint.assignedStaff, {
          $inc: { activeComplaints: 1, totalResolved: -1 }
        });
      }
    }

    await complaint.save();
    res.json({ message: rating <= 2 ? 'Complaint reopened due to poor rating' : 'Thank you for your feedback', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;