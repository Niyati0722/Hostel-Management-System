const Complaint = require('../models/Complaint');

const CATEGORY_BUCKETS = {
  electrical:  ['fan', 'light', 'bulb', 'tube', 'socket', 'switch', 'fuse',
                'power', 'electricity', 'wiring', 'short circuit', 'ac',
                'air conditioner', 'electrical', 'mcb', 'circuit'],
  plumbing:    ['water', 'tap', 'pipe', 'drain', 'leak', 'leakage', 'flush',
                'toilet', 'geyser', 'shower', 'blockage', 'overflow',
                'plumbing', 'sewage', 'washroom', 'bathroom'],
  carpentry:   ['door', 'window', 'latch', 'lock', 'bed', 'cupboard',
                'furniture', 'shelf', 'broken', 'hinge', 'wardrobe',
                'carpentry', 'almirah', 'table', 'chair'],
  cleanliness: ['clean', 'dirt', 'garbage', 'pest', 'cockroach', 'rat',
                'insect', 'dust', 'sweep', 'mop', 'hygiene', 'smell', 'odour'],
  internet:    ['wifi', 'internet', 'network', 'router', 'lan', 'broadband',
                'connection', 'signal'],
  laundry:     ['washing machine', 'dryer', 'laundry', 'clothes', 'washer'],
};

function normaliseText(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferBucket(description, category) {
  if (category) {
    const cat = category.toLowerCase();
    for (const bucket of Object.keys(CATEGORY_BUCKETS)) {
      if (cat.includes(bucket)) return bucket;
    }
  }
  const desc = normaliseText(description);
  for (const [bucket, keywords] of Object.entries(CATEGORY_BUCKETS)) {
    if (keywords.some(kw => desc.includes(kw))) return bucket;
  }
  return 'general';
}

function jaccardSimilarity(a, b) {
  const setA = new Set(normaliseText(a).split(' ').filter(w => w.length > 2));
  const setB = new Set(normaliseText(b).split(' ').filter(w => w.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

async function findDuplicates(newComplaint, options = {}) {
  const WINDOW_HOURS   = options.windowHours  || 2;
  const SIMILARITY_THR = options.similarityThr || 0.25;

  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

  const newBucket = inferBucket(newComplaint.description, newComplaint.category);
  const newFloor  = parseInt(newComplaint.floor, 10);

  const candidates = await Complaint.find({
    status:    { $nin: ['resolved', 'merged'] },
    floor:     newFloor,
    createdAt: { $gte: windowStart },
    ...(newComplaint._id ? { _id: { $ne: newComplaint._id } } : {}),
  }).lean();

  if (!candidates.length) {
    return { isDuplicate: false, similarComplaints: [], mergeReason: null };
  }

  const matches = [];

  for (const c of candidates) {
    const candidateBucket = inferBucket(c.description, c.category);
    if (candidateBucket !== newBucket) continue;

    const similarity = jaccardSimilarity(newComplaint.description, c.description);
    const highConfidence = ['plumbing', 'electrical'].includes(newBucket);

    if (similarity >= SIMILARITY_THR || highConfidence) {
      matches.push({
        complaint:  c,
        similarity: Math.round(similarity * 100),
        bucket:     candidateBucket,
      });
    }
  }

  if (!matches.length) {
    return { isDuplicate: false, similarComplaints: [], mergeReason: null };
  }

  matches.sort((a, b) => b.similarity - a.similarity);
  const parent = matches[0];

  const mergeReason = buildMergeReason(newBucket, newFloor, matches);

  return {
    isDuplicate:       true,
    parentId:          parent.complaint._id,
    parentComplaint:   parent.complaint,
    similarComplaints: matches.map(m => ({
      _id:         m.complaint._id,
      room:        m.complaint.roomNumber,
      description: m.complaint.description,
      similarity:  m.similarity,
      status:      m.complaint.status,
      createdAt:   m.complaint.createdAt,
    })),
    mergeReason,
    bucket: newBucket,
  };
}

function buildMergeReason(bucket, floor, matches) {
  const rooms = [...new Set(matches.map(m => m.complaint.roomNumber))];
  const categoryLabel = {
    electrical:  'electrical issue',
    plumbing:    'plumbing issue',
    carpentry:   'carpentry issue',
    cleanliness: 'cleanliness issue',
    internet:    'internet issue',
    laundry:     'laundry issue',
    general:     'issue',
  }[bucket] || 'issue';

  if (rooms.length === 1) {
    return `Similar ${categoryLabel} already reported from Room ${rooms[0]} on Floor ${floor} within the last 2 hours.`;
  }
  return `Similar ${categoryLabel} reported from ${rooms.length} rooms (${rooms.slice(0, 3).join(', ')}${rooms.length > 3 ? '...' : ''}) on Floor ${floor} — likely a floor-wide problem.`;
}

async function mergeComplaints(childId, parentId, mergeReason) {
  const [child, parent] = await Promise.all([
    Complaint.findById(childId),
    Complaint.findById(parentId),
  ]);

  if (!child || !parent) throw new Error('Complaint not found');

  child.isMerged    = true;
  child.mergedInto  = parentId;
  child.mergeReason = mergeReason;
  child.status      = 'merged';
  child.isDuplicate = true;
  child.mergedWith  = parentId;
  await child.save();

  if (!parent.mergedComplaints) parent.mergedComplaints = [];
  if (!parent.mergedComplaints.map(String).includes(String(childId))) {
    parent.mergedComplaints.push(childId);
  }
  parent.priorityScore = (parent.priorityScore || 0) + 3;
  await parent.save();

  return { child, parent };
}

async function unmergeComplaint(childId) {
  const child = await Complaint.findById(childId);
  if (!child || !child.isMerged) throw new Error('Complaint is not merged');

  const parentId = child.mergedInto;
  const parent   = await Complaint.findById(parentId);

  child.isMerged    = false;
  child.mergedInto  = null;
  child.mergeReason = null;
  child.isDuplicate = false;
  child.mergedWith  = null;
  child.status      = 'pending';
  await child.save();

  if (parent) {
    parent.mergedComplaints = (parent.mergedComplaints || [])
      .filter(id => String(id) !== String(childId));
    await parent.save();
  }

  return { child, parent };
}

module.exports = { findDuplicates, mergeComplaints, unmergeComplaint, inferBucket };