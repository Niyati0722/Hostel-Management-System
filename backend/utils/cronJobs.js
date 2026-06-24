const cron = require('node-cron');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

console.log('Cron jobs started...');

// ══════════════════════════════════════════════
//  CRON JOB 1: Auto-escalation (runs every hour)
//  DSA concept: Priority Queue re-evaluation
//  If complaint not resolved in 3 days → escalate to main warden
//  If URGENT → escalate same day (24 hours)
// ══════════════════════════════════════════════
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running escalation check...');

  try {
    const now = new Date();
    const mainWarden = await User.findOne({ role: 'main_warden' });

    if (!mainWarden) {
      console.log('[CRON] No main warden found, skipping escalation');
      return;
    }

    // Find all active (non-resolved, non-escalated) complaints
    const activeComplaints = await Complaint.find({
      status: { $in: ['pending', 'assigned', 'in_progress'] },
      escalatedTo: null
    });

    let escalatedCount = 0;

    for (const complaint of activeComplaints) {
      const hoursOld = (now - complaint.createdAt) / (1000 * 60 * 60);

      // Update priority score with time decay first
      const { calculatePriority } = require('./priorityEngine');
      const { score } = calculatePriority(complaint);
      complaint.priorityScore = score;

      // URGENT complaints → escalate after 24 hours
      if (complaint.isUrgent && hoursOld >= 24) {
        complaint.status = 'escalated';
        complaint.escalatedTo = mainWarden._id;
        complaint.escalatedAt = now;
        complaint.escalationReason = 'Urgent complaint not resolved within 24 hours';
        await complaint.save();
        escalatedCount++;
        console.log(`[CRON] Urgent complaint ${complaint._id} escalated (${Math.round(hoursOld)}h old)`);
        continue;
      }

      // Normal complaints → escalate after 72 hours (3 days)
      if (!complaint.isUrgent && hoursOld >= 72) {
        complaint.status = 'escalated';
        complaint.escalatedTo = mainWarden._id;
        complaint.escalatedAt = now;
        complaint.escalationReason = 'Complaint not resolved within 3 days';
        await complaint.save();
        escalatedCount++;
        console.log(`[CRON] Complaint ${complaint._id} escalated (${Math.round(hoursOld)}h old)`);
        continue;
      }

      // Just update score
      await complaint.save();
    }

    console.log(`[CRON] Escalation check done. Escalated: ${escalatedCount}`);
  } catch (err) {
    console.error('[CRON] Escalation error:', err);
  }
});

// ══════════════════════════════════════════════
//  CRON JOB 2: SLA Warning (runs every hour)
//  DSA concept: Greedy estimation
//  If complaint is 24h old and NOT yet resolved → send warning
//  (So warden gets warned at day 1, not day 3)
// ══════════════════════════════════════════════
cron.schedule('30 * * * *', async () => {
  console.log('[CRON] Running SLA warning check...');

  try {
    const now = new Date();

    const atRiskComplaints = await Complaint.find({
      status: { $in: ['pending', 'assigned'] },
      slaWarningsentAt: null,
      escalatedTo: null
    });

    for (const complaint of atRiskComplaints) {
      const hoursOld = (now - complaint.createdAt) / (1000 * 60 * 60);

      // Warn at 24 hours for normal, 12 hours for urgent
      const warnThreshold = complaint.isUrgent ? 12 : 24;

      if (hoursOld >= warnThreshold) {
        complaint.slaWarningsentAt = now;
        await complaint.save();
        // In a real app: send email/SMS here
        console.log(`[CRON] SLA warning for complaint ${complaint._id} (${Math.round(hoursOld)}h old)`);
      }
    }
  } catch (err) {
    console.error('[CRON] SLA warning error:', err);
  }
});

// ══════════════════════════════════════════════
//  CRON JOB 3: Night mode check (runs at 10pm and 6am)
//  Critical complaints between 10pm–6am bypass floor warden
//  and go directly to main warden
// ══════════════════════════════════════════════
cron.schedule('0 22,6 * * *', async () => {
  const hour = new Date().getHours();
  const isNightTime = hour >= 22 || hour < 6;

  if (!isNightTime) return;

  console.log('[CRON] Night mode escalation check...');

  try {
    const mainWarden = await User.findOne({ role: 'main_warden' });
    if (!mainWarden) return;

    // Find urgent complaints still pending at night
    const nightComplaints = await Complaint.find({
      status: 'pending',
      isUrgent: true,
      escalatedTo: null
    });

    for (const complaint of nightComplaints) {
      complaint.status = 'escalated';
      complaint.escalatedTo = mainWarden._id;
      complaint.escalatedAt = new Date();
      complaint.escalationReason = 'Night mode: urgent complaint bypassed floor warden';
      await complaint.save();
      console.log(`[CRON] Night mode escalation for complaint ${complaint._id}`);
    }
  } catch (err) {
    console.error('[CRON] Night mode error:', err);
  }
});
// ══════════════════════════════════════════════
//  CRON JOB 4: Night shift handoff (runs at 6:05am daily)
//  Reassigns unresolved night complaints to their floor warden
//  DSA: Graph re-traversal — reassign edges at shift boundary
// ══════════════════════════════════════════════
cron.schedule('5 6 * * *', async () => {
  console.log('[CRON] Running night shift handoff...');

  try {
    // Find complaints submitted between 10pm yesterday and 6am today
    const now = new Date();
    const sixAM = new Date(now);
    sixAM.setHours(6, 0, 0, 0);
    const tenPMYesterday = new Date(sixAM - 8 * 60 * 60 * 1000); // 8 hours before 6am = 10pm

    const unresolvedNightComplaints = await Complaint.find({
      createdAt: { $gte: tenPMYesterday, $lte: sixAM },
      status: { $in: ['pending', 'assigned', 'in_progress'] },
    }).populate('student', 'floor');

    let handedOffCount = 0;
    const handedOffIds = [];

    for (const complaint of unresolvedNightComplaints) {
      // Find the floor warden for this complaint's floor
      const floorWarden = await User.findOne({
        role: 'floor_warden',
        managedFloor: complaint.floor
      });

      if (floorWarden) {
        complaint.assignedTo = floorWarden._id;
        complaint.status = 'assigned';
        await complaint.save();
        handedOffIds.push(complaint._id);
        handedOffCount++;
        console.log(`[CRON] Handed off complaint ${complaint._id} to floor warden for floor ${complaint.floor}`);
      }
    }

    console.log(`[CRON] Night handoff done. ${handedOffCount} complaints handed to floor wardens.`);

    // Store handoff ids for the AI report generator (Job 5)
    global._nightHandoffIds = handedOffIds;
    global._nightHandoffComplaints = unresolvedNightComplaints;

  } catch (err) {
    console.error('[CRON] Night handoff error:', err);
  }
});

// ══════════════════════════════════════════════
//  CRON JOB 5: AI Shift Report Generator (runs at 6:10am daily)
//  Reads last night's complaint data → calls Claude API → saves report
//  Runs 5 minutes after handoff so data is fresh
// ══════════════════════════════════════════════


cron.schedule('10 6 * * *', async () => {
  console.log('[CRON] Generating AI shift report...');

  try {
    const ShiftReport = require('../models/ShiftReport');

    // Build time window: 10pm yesterday to 6am today
    const now = new Date();
    const shiftEnd = new Date(now);
    shiftEnd.setHours(6, 0, 0, 0);
    const shiftStart = new Date(shiftEnd - 8 * 60 * 60 * 1000);

    // Fetch all complaints from last night
    const nightComplaints = await Complaint.find({
      createdAt: { $gte: shiftStart, $lte: shiftEnd },
    })
      .populate('assignedTo', 'name')
      .populate('assignedStaff', 'name specialization')
      .lean();

    // Build stats
    const stats = {
      totalComplaints:   nightComplaints.length,
      resolved:          nightComplaints.filter(c => c.status === 'resolved').length,
      inProgress:        nightComplaints.filter(c => c.status === 'in_progress').length,
      pending:           nightComplaints.filter(c => ['pending', 'assigned'].includes(c.status)).length,
      urgent:            nightComplaints.filter(c => c.isUrgent).length,
      handedOffToWarden: global._nightHandoffIds?.length || 0,
    };

    // Build staff performance summary
    const staffMap = {};
    for (const c of nightComplaints) {
      if (c.assignedStaff?.name) {
        const name = c.assignedStaff.name;
        if (!staffMap[name]) staffMap[name] = { total: 0, resolved: 0 };
        staffMap[name].total++;
        if (c.status === 'resolved') staffMap[name].resolved++;
      }
    }
    const staffSummary = Object.entries(staffMap)
      .map(([name, s]) => `${name} handled ${s.total} complaint(s), resolved ${s.resolved}`)
      .join('. ');

    // Build category breakdown
    const categoryMap = {};
    for (const c of nightComplaints) {
      categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
    }

    // Build lists for summary
    const unresolvedList = nightComplaints
      .filter(c => ['pending', 'assigned', 'in_progress'].includes(c.status))
      .map(c => `${c.category.replace('_', ' ')} in Room ${c.roomNumber} (Floor ${c.floor})`)
      .join(', ');

    const resolvedList = nightComplaints
      .filter(c => c.status === 'resolved')
      .map(c => `${c.category.replace('_', ' ')} in Room ${c.roomNumber}`)
      .join(', ');

    const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

    // Template-based report generator (no API needed — reads real DB data)
    let summary = '';
    if (stats.totalComplaints === 0) {
      summary = `The night shift from ${shiftStart.toLocaleTimeString()} to ${shiftEnd.toLocaleTimeString()} was uneventful with no complaints received. All hostel systems appear to be functioning normally. The day warden can begin their shift without any pending handoffs.`;
    } else {
      summary = `During the night shift, ${stats.totalComplaints} complaint${stats.totalComplaints > 1 ? 's were' : ' was'} received across the hostel. `;
      if (stats.resolved > 0) {
        summary += `${stats.resolved} issue${stats.resolved > 1 ? 's were' : ' was'} successfully resolved during the shift${resolvedList ? ` (${resolvedList})` : ''}. `;
      }
      if (stats.urgent > 0) {
        summary += `${stats.urgent} urgent complaint${stats.urgent > 1 ? 's require' : ' requires'} immediate attention from the day warden. `;
      }
      if (topCategory) {
        summary += `The most reported issue type was ${topCategory[0].replace('_', ' ')} with ${topCategory[1]} complaint${topCategory[1] > 1 ? 's' : ''}. `;
      }
      if (stats.pending > 0) {
        summary += `${stats.pending} complaint${stats.pending > 1 ? 's remain' : ' remains'} unresolved and ${stats.pending > 1 ? 'have' : 'has'} been handed off to the respective floor wardens${unresolvedList ? `: ${unresolvedList}` : ''}. Day warden to follow up on these immediately.`;
      } else {
        summary += `All complaints were resolved during the night shift. Day warden can begin shift with a clean queue.`;
      }
      if (staffSummary) {
        summary += ` Staff activity: ${staffSummary}.`;
      }
    }

    // Find night warden
    const nightWarden = await User.findOne({ role: 'night_warden' });

    // Save report to DB
    const report = new ShiftReport({
      shiftType: 'night',
      shiftStart,
      shiftEnd,
      summary,
      stats,
      handedOffComplaints: global._nightHandoffIds || [],
      generatedFor: nightWarden?._id || null,
    });

    await report.save();
    console.log('[CRON] AI shift report saved successfully.');
    console.log('[CRON] Report preview:', summary.slice(0, 100) + '...');

    // Clear globals
    global._nightHandoffIds = [];
    global._nightHandoffComplaints = [];

  } catch (err) {
    console.error('[CRON] AI shift report error:', err);
  }
});
module.exports = {};