import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ComplaintCard from '../components/ComplaintCard';
import API from '../api/axios';
import ShiftReportPanel from '../components/ShiftReportPanel';
import MergedGroups from '../components/MergedGroups';

const CATEGORIES = [
  { value: 'electrical', label: '⚡ Electrical', subs: ['Fan not working', 'Light fuse blown', 'Power socket dead', 'Short circuit', 'AC not working', 'Geyser not working'] },
  { value: 'water_plumbing', label: '🚿 Water & Plumbing', subs: ['Tap leaking high flow', 'No water supply', 'Drain blocked', 'Toilet flush broken', 'Geyser leaking'] },
  { value: 'laundry', label: '👕 Laundry', subs: ['Washing machine broken', 'Dryer not working', 'No water in laundry'] },
  { value: 'carpentry', label: '🔨 Carpentry', subs: ['Broken door', 'Window latch broken', 'Bed broken', 'Cupboard broken', 'Furniture damaged'] },
  { value: 'cleanliness', label: '🧹 Cleanliness', subs: ['Room not cleaned', 'Garbage not collected', 'Pest issue'] },
  { value: 'internet', label: '📶 Internet', subs: ['WiFi not working', 'No signal in room'] },
  { value: 'security', label: '🔒 Security', subs: ['Door lock broken', 'Security breach', 'Suspicious activity'] },
  { value: 'other', label: '📋 Other', subs: ['Other issue'] },
];

export default function FloorWardenDashboard() {
  const [tab, setTab] = useState('complaints');
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState({});
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [c, s, sum, h] = await Promise.all([
        API.get('/complaints/floor'),
        API.get('/staff/leaderboard'),
        API.get('/analytics/summary'),
        API.get('/analytics/heatmap'),
      ]);
      setComplaints(c.data);
      setStaff(s.data);
      setSummary(sum.data);
      setHeatmap(h.data);
    } catch { toast.error('Failed to load data'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/complaints/${id}/status`, { status });
      toast.success(`Marked as ${status}`);
      fetchAll();
    } catch { toast.error('Failed to update'); }
  };

  const rankLabel = (i) => {
    if (i === 0) return { label: '🥇', cls: 'gold' };
    if (i === 1) return { label: '🥈', cls: 'silver' };
    if (i === 2) return { label: '🥉', cls: 'bronze' };
    return { label: `#${i + 1}`, cls: '' };
  };

  return (
    <div>
      <Navbar title="Floor Warden Dashboard" />
      <div className="container">

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card stat-orange">
            <div className="number">{summary.pending || 0}</div>
            <div className="label">Pending</div>
          </div>
          <div className="stat-card stat-blue">
            <div className="number">{complaints.length}</div>
            <div className="label">Active on Floor</div>
          </div>
          <div className="stat-card stat-red">
            <div className="number">{summary.urgent || 0}</div>
            <div className="label">Urgent</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="number">{summary.slaAtRisk || 0}</div>
            <div className="label">SLA at Risk</div>
          </div>
          <div className="stat-card stat-green">
            <div className="number">{summary.resolved || 0}</div>
            <div className="label">Resolved</div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'complaints' ? 'active' : ''}`} onClick={() => setTab('complaints')}>
            Complaints ({complaints.length})
          </button>
          <button className={`tab ${tab === 'heatmap' ? 'active' : ''}`} onClick={() => setTab('heatmap')}>Heatmap</button>
          <button className={`tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>Staff Board</button>
          <button className={`tab ${tab === 'merged' ? 'active' : ''}`} onClick={() => setTab('merged')}>🔗 Merged Groups</button>
          <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
  📋 Shift Reports
</button>
        </div>

        {/* ── COMPLAINTS TAB ── */}
        {tab === 'complaints' && (
          <div>
            {complaints.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                ✅ No active complaints on your floor!
              </div>
            ) : (
              complaints.map(c => (
                <ComplaintCard key={c._id} complaint={c} actions={<>
                  {c.status === 'assigned' && (
                    <button className="btn btn-warning btn-sm" onClick={() => updateStatus(c._id, 'in_progress')}>
                      Mark In Progress
                    </button>
                  )}
                  {(c.status === 'assigned' || c.status === 'in_progress') && (
                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(c._id, 'resolved')}>
                      ✅ Mark Resolved
                    </button>
                  )}
                  {c.status === 'reopened' && (
                    <button className="btn btn-warning btn-sm" onClick={() => updateStatus(c._id, 'in_progress')}>
                      Re-assign
                    </button>
                  )}
                  {c.mergedComplaints && c.mergedComplaints.length > 0 && (
                    <span style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '20px',
                      background: '#E6F1FB', color: '#185FA5', fontWeight: '500',
                    }}>
                      🔗 {c.mergedComplaints.length} merged in
                    </span>
                  )}
                </>} />
              ))
            )}
          </div>
        )}

        {/* ── HEATMAP TAB ── */}
        {tab === 'heatmap' && (
          <div className="card">
            <h3 style={{ marginBottom: '8px' }}>🗺️ Room Complaint Heatmap</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
              🔴 3+ complaints &nbsp;🟡 2 complaints &nbsp;🟢 1 complaint
            </p>
            {heatmap.length === 0 ? (
              <p style={{ color: '#888' }}>No active complaints — all rooms green! ✅</p>
            ) : (
              <div className="heatmap-grid">
                {heatmap.map(h => (
                  <div key={h.room} className={`heatmap-room heat-${h.level}`}>
                    <div>Room</div>
                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{h.room}</div>
                    <div>{h.count} issue{h.count > 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STAFF LEADERBOARD TAB ── */}
        {tab === 'staff' && (
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>🏆 Staff Performance Leaderboard</h3>
            {staff.length === 0 ? (
              <p style={{ color: '#888' }}>No staff added yet.</p>
            ) : (
              staff.map((s, i) => {
                const { label, cls } = rankLabel(i);
                return (
                  <div key={s._id} className="leaderboard-row">
                    <div className={`rank ${cls}`}>{label}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{s.name}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{s.specialization}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px' }}>
                      <div>✅ {s.totalResolved} resolved</div>
                      <div style={{ color: '#888' }}>🔄 {s.activeComplaints} active</div>
                      <div style={{ color: '#667eea', fontWeight: '700' }}>⭐ {s.performanceScore} pts</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── MERGED GROUPS TAB ── */}
        {tab === 'merged' && <MergedGroups />}
        {tab === 'reports' && <ShiftReportPanel />}
      </div>
    </div>
  );
}
