import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ComplaintCard from '../components/ComplaintCard';
import API from '../api/axios';
import ShiftReportPanel from '../components/ShiftReportPanel';

export default function NightWardenDashboard() {
  const [tab, setTab] = useState('complaints');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/night-complaints');
      setComplaints(data);
    } catch {
      toast.error('Failed to load complaints');
    }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/night-complaints/${id}/status`, { status });
      toast.success(`Updated to ${status}`);
      fetchComplaints();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const hour = currentTime.getHours();
  const isNightTime = hour >= 22 || hour < 6;

  const pending    = complaints.filter(c => c.status === 'pending' || c.status === 'assigned');
  const inProgress = complaints.filter(c => c.status === 'in_progress');
  const resolved   = complaints.filter(c => c.status === 'resolved');

  return (
    <div>
      <Navbar title="Night Warden Dashboard" />
      <div className="container">

        {/* Night shift status banner */}
        <div style={{
          background: isNightTime ? '#1a1a2e' : '#fff3cd',
          color: isNightTime ? '#a29bfe' : '#856404',
          border: `1px solid ${isNightTime ? '#6c5ce7' : '#ffc107'}`,
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <strong>{isNightTime ? '🌙 Night Shift Active' : '☀️ Day Hours'}</strong>
            <div style={{ fontSize: '13px', marginTop: '2px' }}>
              {isNightTime
                ? 'Complaints from 10pm–6am are routed directly to you'
                : 'Night shift starts at 10:00 PM — you are in view-only mode'}
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'monospace' }}>
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card stat-red">
            <div className="number">{pending.length}</div>
            <div className="label">Pending</div>
          </div>
          <div className="stat-card stat-orange">
            <div className="number">{inProgress.length}</div>
            <div className="label">In Progress</div>
          </div>
          <div className="stat-card stat-green">
            <div className="number">{resolved.length}</div>
            <div className="label">Resolved Tonight</div>
          </div>
          <div className="stat-card stat-blue">
            <div className="number">{complaints.length}</div>
            <div className="label">Total (10pm–6am)</div>
          </div>
        </div>

        {/* DSA note */}
        <div style={{
          background: '#f0f4ff', border: '1px solid #c7d2fe',
          borderRadius: '8px', padding: '10px 14px',
          fontSize: '12px', color: '#4c5580', marginBottom: '16px'
        }}>
          ⚡ <strong>DSA: Time-aware graph routing</strong> — complaints submitted between 10pm and 6am bypass floor warden assignment and route directly to night warden. Sorted by priority score (Max-Heap).
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'complaints' ? 'active' : ''}`} onClick={() => setTab('complaints')}>
            🌙 Night Complaints ({complaints.length})
          </button>
          <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
            📋 Shift Reports
          </button>
        </div>

        {/* ── COMPLAINTS TAB ── */}
        {tab === 'complaints' && (
          <>
            {loading ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                Loading night complaints...
              </div>
            ) : complaints.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                🌙 No complaints submitted during night hours yet.
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div>
                    <h4 style={{ color: '#e74c3c', marginBottom: '10px' }}>🔴 Needs Attention ({pending.length})</h4>
                    {pending.map(c => (
                      <ComplaintCard key={c._id} complaint={c} actions={<>
                        <button className="btn btn-warning btn-sm" onClick={() => updateStatus(c._id, 'in_progress')}>
                          Take Action
                        </button>
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(c._id, 'resolved')}>
                          ✅ Resolve
                        </button>
                      </>} />
                    ))}
                  </div>
                )}

                {inProgress.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ color: '#e67e22', marginBottom: '10px' }}>🟡 In Progress ({inProgress.length})</h4>
                    {inProgress.map(c => (
                      <ComplaintCard key={c._id} complaint={c} actions={
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(c._id, 'resolved')}>
                          ✅ Resolve
                        </button>
                      } />
                    ))}
                  </div>
                )}

                {resolved.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ color: '#27ae60', marginBottom: '10px' }}>✅ Resolved Tonight ({resolved.length})</h4>
                    {resolved.map(c => (
                      <ComplaintCard key={c._id} complaint={c} actions={null} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── SHIFT REPORTS TAB ── */}
        {tab === 'reports' && <ShiftReportPanel />}

      </div>
    </div>
  );
}
