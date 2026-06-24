import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../api/axios';

export default function MergedGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/duplicates/groups');
      setGroups(data);
    } catch {
      toast.error('Failed to load merged groups');
    }
    setLoading(false);
  };

  const handleUnmerge = async (childId) => {
    try {
      await API.post(`/duplicates/unmerge/${childId}`);
      toast.success('Complaint unmerged — restored to pending');
      fetchGroups();
    } catch {
      toast.error('Unmerge failed');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        Loading merged groups...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        🔗 No merged complaint groups yet.<br />
        <span style={{ fontSize: '13px' }}>When students submit duplicate complaints, they appear here.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px', background: '#e8f4fd', border: '1px solid #2980b9' }}>
        <strong>🔗 Merged Complaint Groups</strong> — Each group is a floor-wide issue reported by multiple students.
        Priority is boosted automatically. <span style={{ fontSize: '12px', color: '#555' }}>DSA: Jaccard Similarity + Sliding Window</span>
      </div>

      {groups.map((group, i) => (
        <div key={group.parent._id} className="card" style={{ marginBottom: '16px' }}>

          {/* Parent complaint header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            marginBottom: '12px', flexWrap: 'wrap', gap: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  background: '#667eea', color: '#fff', borderRadius: '4px',
                  padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                }}>
                  PARENT
                </span>
                <span style={{
                  background: '#e8f4fd', color: '#2980b9', borderRadius: '4px',
                  padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                }}>
                  {group.mergedCount} merged in
                </span>
                <span style={{
                  background: '#ffeaa7', color: '#856404', borderRadius: '4px',
                  padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                }}>
                  Priority +{group.mergedCount * 3} pts
                </span>
              </div>
              <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a2e' }}>
                Room {group.parent.room} · Floor {group.parent.floor}
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>
                {group.parent.description}
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                {group.parent.category?.replace('_', ' ')} · Status: {group.parent.status} · {new Date(group.parent.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Merged children */}
          {group.mergedComplaints?.length > 0 && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '8px' }}>
                MERGED COMPLAINTS ({group.mergedComplaints.length})
              </p>
              {group.mergedComplaints.map(child => (
                <div key={child._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px',
                  marginBottom: '8px', borderLeft: '3px solid #95a5a6', flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ fontWeight: '600', color: '#444' }}>
                      Room {child.roomNumber} · Floor {child.floor}
                    </div>
                    <div style={{ color: '#666', marginTop: '2px' }}>{child.description}</div>
                    {child.mergeReason && (
                      <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                        Reason: {child.mergeReason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnmerge(child._id)}
                    style={{
                      background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c',
                      borderRadius: '6px', padding: '4px 10px', fontSize: '12px',
                      cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    Unmerge
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
