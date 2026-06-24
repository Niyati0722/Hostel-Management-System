// ══════════════════════════════════════════════
//  PRIORITY ENGINE — DSA: Max-Heap / Priority Queue
//  Every complaint gets a dynamic score.
//  Warden dashboard is always sorted by this score (highest first).
// ══════════════════════════════════════════════

// Base severity scores by category
const SEVERITY_MAP = {
  security: 10,
  water_plumbing: 9,
  electrical: 8,
  laundry: 5,
  internet: 5,
  cleanliness: 4,
  carpentry: 4,
  other: 3
};

// Sub-category urgency overrides
const URGENT_SUBCATEGORIES = [
  'tap leaking high flow',
  'no water supply',
  'power outage',
  'short circuit',
  'flood',
  'security breach',
  'fire hazard'
];

// Seasonal multipliers — which month boosts which category
const getSeasonMultiplier = (category) => {
  const month = new Date().getMonth(); // 0=Jan, 11=Dec

  // Summer: April–June (months 3–5)
  const isSummer = month >= 3 && month <= 5;
  // Monsoon: July–September (months 6–8)
  const isMonsoon = month >= 6 && month <= 8;
  // Winter: November–February (months 10–1)
  const isWinter = month >= 10 || month <= 1;

  if (isSummer && category === 'electrical') return 2.0;    // fan/AC critical in summer
  if (isSummer && category === 'water_plumbing') return 1.8; // water critical in summer
  if (isMonsoon && category === 'water_plumbing') return 2.0; // leaks critical in monsoon
  if (isWinter && category === 'electrical') return 1.5;    // geyser critical in winter
  if (isWinter && category === 'water_plumbing') return 1.6; // hot water in winter

  return 1.0; // no boost off-season
};

// Time decay: every hour unresolved adds +1 point
const getTimeDecay = (createdAt) => {
  const hoursOld = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60);
  return Math.floor(hoursOld);
};

// Repeat penalty: if same room + category complained 3x in 7 days
const getRepeatPenalty = (isRepeat) => isRepeat ? 1.5 : 1.0;

// ── MAIN FUNCTION: Calculate priority score ──
const calculatePriority = (complaint) => {
  const base = SEVERITY_MAP[complaint.category] || 3;
  const season = getSeasonMultiplier(complaint.category);
  const time = getTimeDecay(complaint.createdAt || Date.now());
  const repeat = getRepeatPenalty(complaint.isRepeat);

  const score = Math.round((base * season * repeat) + time);

  const isUrgent = URGENT_SUBCATEGORIES.some(u =>
    complaint.subCategory?.toLowerCase().includes(u) ||
    complaint.description?.toLowerCase().includes(u)
  );

  return { score, isUrgent, base, season };
};

// ── GRAPH: Find correct floor warden for a room ──
// Room number format: "204" = floor 2, room 04
// Returns the warden who manages that floor
const findFloorWarden = async (floor) => {
  const User = require('../models/User');
  const warden = await User.findOne({ role: 'floor_warden', managedFloor: floor });
  return warden;
};
// ── NIGHT WARDEN: Find active night warden ──
// Returns night warden if current time is between 10pm and 6am
const findNightWarden = async () => {
  const User = require('../models/User');
  const hour = new Date().getHours(); // 0–23
  const isNightTime = hour >= 22 || hour < 6;
  if (!isNightTime) return null;
  const warden = await User.findOne({ role: 'night_warden' });
  return warden;
};
// ── DUPLICATE DETECTION: Hash-based check ──
// If same floor + same category + submitted within 2 hours → duplicate
const checkDuplicate = async (newComplaint) => {
  const Complaint = require('../models/Complaint');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const existing = await Complaint.findOne({
    floor: newComplaint.floor,
    category: newComplaint.category,
    status: { $in: ['pending', 'assigned', 'in_progress'] },
    createdAt: { $gte: twoHoursAgo },
    isDuplicate: false
  });

  return existing || null;
};

// ── SLIDING WINDOW: Detect repeat complaints ──
// Same room + same category, 3+ times in last 7 days
const checkRepeat = async (roomNumber, category) => {
  const Complaint = require('../models/Complaint');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const count = await Complaint.countDocuments({
    roomNumber,
    category,
    createdAt: { $gte: sevenDaysAgo }
  });

  return count >= 2; // 3rd complaint in 7 days = chronic issue
};

// ── GREEDY STAFF ASSIGNMENT: Load balancing ──
// Assign to available staff with lowest active complaint count
const findBestStaff = async (category) => {
  const Staff = require('../models/Staff');

  const specializationMap = {
    electrical: 'electrician',
    water_plumbing: 'plumber',
    laundry: 'laundry',
    carpentry: 'carpenter',
    cleanliness: 'cleaner',
    internet: 'general',
    security: 'general',
    other: 'general'
  };

  const needed = specializationMap[category] || 'general';

  // Greedy: pick available staff with least active complaints
  const staff = await Staff.findOne({
    specialization: needed,
    isAvailable: true,
    $expr: { $lt: ['$activeComplaints', '$maxCapacity'] }
  }).sort({ activeComplaints: 1 }); // lowest load first

  return staff;
};

module.exports = {
  calculatePriority,
  findFloorWarden,
  findNightWarden,
  checkDuplicate,
  checkRepeat,
  findBestStaff
};