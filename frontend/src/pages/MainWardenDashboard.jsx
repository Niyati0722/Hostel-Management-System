import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Navbar from '../components/Navbar';
import ComplaintCard from '../components/ComplaintCard';
import API from '../api/axios';
import MergedGroups from '../components/MergedGroups';   // ← NEW

const COLORS = ['#e74c3c', '#e67e22', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#2c3e50'];

export default function MainWardenDashboard() {
  const [tab, setTab] = useState('escalated');
  const [escalated, setEscalated] = useState([]);
  const [all, setAll] = useState([]);
  const [summary, setSummary] = useState({});
  const [heatmap, setHeatmap] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', specialization: 'electrician', maxCapacity: 5 });
  const [repeat, setRepeat] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [e, a, s, h, st, r] = await Promise.all([
        API.get('/complaints/escalated'),
        API.get('/complaints/all'),
        API.get('/analytics/summary'),
        API.get('/analytics/heatmap'),
        API.get('/staff/leaderboard'),
        API.get('/analytics/repeat'),
      ]);
      setEscalated(e.data);
      setAll(a.data);
      setSummary(s.data);
      setHeatmap(h.data);
      setStaff(st.data);
      setRepeat(r.data);
    } catch { toast.error('Failed to load data'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/complaints/${id}/status`, { status });
      toast.success(`Updated to ${status}`);
      fetchAll();
    } catch { toast.error('Failed to update'); }
  };

  const addStaff = async () => {
    if (!newStaff.name) return toast.error('Staff name required');
    try {
      await API.post('/staff', newStaff);
      toast.success('Staff member added!');
      setNewStaff({ name: '', phone: '', specialization: 'electrician', maxCapacity: 5 });
      fetchAll();
    } catch { toast.error('Failed to add staff'); }
  };

  const rankLabel = (i) => {
    if (i === 0) return { label: '🥇', cls: 'gold' };
    if (i === 1) return { label: '🥈', cls: 'silver' };
    if (i === 2) return { label: '🥉', cls: 'bronze' };
    return { label: `#${i + 1}`, cls: '' };
  };

  return (
    <div>
      <Navbar title="Main Warden Dashboard" />
      <div className="container">

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card stat-blue">
            <div className="number">{summary.total || 0}</div>
            <div className="label">Total</div>
          </div>
          <div className="stat-card stat-orange">
            <div className="number">{summary.pending || 0}</div>
            <div className="label">Pending</div>
          </div>
          <div className="stat-card stat-red">
            <div className="number">{escalated.length}</div>
            <div className="label">Escalated</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="number">{summary.urgent || 0}</div>
            <div className="label">Urgent</div>
          </div>
          <div className="stat-card stat-green">
            <div className="number">{summary.resolved || 0}</div>
            <div className="label">Resolved</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #e67e22' }}>
            <div className="number" style={{ color: '#e67e22' }}>{summary.slaAtRisk || 0}</div>
            <div className="label">SLA at Risk</div>
          </div>
        </div>

        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          <button className={`tab ${tab === 'escalated' ? 'active' : ''}`} onClick={() => setTab('escalated')}>
            🚨 Escalated ({escalated.length})
          </button>
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Complaints</button>
          <button className={`tab ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>Analytics</button>
          <button className={`tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>Staff</button>
          <button className={`tab ${tab === 'chronic' ? 'active' : ''}`} onClick={() => setTab('chronic')}>Chronic Issues</button>
          <button className={`tab ${tab === 'merged' ? 'active' : ''}`} onClick={() => setTab('merged')}>🔗 Merged Groups</button>  {/* ← NEW */}
        </div>

        {/* ── ESCALATED ── */}
        {tab === 'escalated' && (
          <div>
            {escalated.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                ✅ No escalated complaints right now!
              </div>
            ) : (
              escalated.map(c => (
                <ComplaintCard key={c._id} complaint={c} actions={<>
                  <button className="btn btn-warning btn-sm" onClick={() => updateStatus(c._id, 'in_progress')}>
                    Take Action
                  </button>
                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(c._id, 'resolved')}>
                    ✅ Resolve
                  </button>
                </>} />
              ))
            )}
          </div>
        )}

        {/* ── ALL ── */}
        {tab === 'all' && (
          <div>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
              Sorted by priority score (highest first) — DSA: Max-Heap
            </p>
            {all.map(c => (
              <ComplaintCard key={c._id} complaint={c} actions={
                !['resolved'].includes(c.status) ? (
                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(c._id, 'resolved')}>
                    ✅ Resolve
                  </button>
                ) : null
              } />
            ))}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div>
            {/* Category chart */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>📊 Complaints by Category</h3>
              {summary.byCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.byCategory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {summary.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#888' }}>No data yet</p>}
            </div>

            {/* Heatmap */}
            <div className="card">
              <h3 style={{ marginBottom: '8px' }}>🗺️ Room Heatmap</h3>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                🔴 Critical (3+) &nbsp; 🟡 Warning (2) &nbsp; 🟢 Normal (1)
              </p>
              {heatmap.length === 0 ? (
                <p style={{ color: '#888' }}>All rooms clear ✅</p>
              ) : (
                <div className="heatmap-grid">
                  {heatmap.map(h => (
                    <div key={h.room} className={`heatmap-room heat-${h.level}`}>
                      <div style={{ fontSize: '11px' }}>Fl. {h.floor}</div>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>{h.room}</div>
                      <div style={{ fontSize: '11px' }}>{h.count} issue{h.count > 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STAFF ── */}
        {tab === 'staff' && (
          <div>
            {/* Add staff form */}
            <div className="card">
              <h3 style={{ marginBottom: '14px' }}>➕ Add Maintenance Staff</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Name</label>
                  <input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Staff name" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="form-group">
                  <label>Specialization</label>
                  <select value={newStaff.specialization} onChange={e => setNewStaff({ ...newStaff, specialization: e.target.value })}>
                    <option value="electrician">⚡ Electrician</option>
                    <option value="plumber">🚿 Plumber</option>
                    <option value="carpenter">🔨 Carpenter</option>
                    <option value="cleaner">🧹 Cleaner</option>
                    <option value="laundry">👕 Laundry</option>
                    <option value="general">🔧 General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Capacity</label>
                  <input type="number" value={newStaff.maxCapacity} onChange={e => setNewStaff({ ...newStaff, maxCapacity: parseInt(e.target.value) })} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={addStaff}>Add Staff Member</button>
            </div>

            {/* Leaderboard */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>🏆 Staff Leaderboard</h3>
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
          </div>
        )}

        {/* ── CHRONIC ISSUES ── */}
        {tab === 'chronic' && (
          <div>
            <div className="card" style={{ marginBottom: '16px', background: '#fff3cd', border: '1px solid #ffc107' }}>
              <strong>⚠️ Chronic Issues</strong> — Rooms with repeated complaints of the same type within 7 days. These need structural fixes, not just one-time repairs.
            </div>
            {repeat.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                No chronic issues detected ✅
              </div>
            ) : (
              repeat.map(c => (
                <ComplaintCard key={c._id} complaint={c} actions={
                  <button className="btn btn-danger btn-sm" onClick={() => updateStatus(c._id, 'resolved')}>
                    Force Resolve
                  </button>
                } />
              ))
            )}
          </div>
        )}

        {/* ── MERGED GROUPS ── */}
        {tab === 'merged' && <MergedGroups />}   {/* ← NEW */}

      </div>
    </div>
  );
}
