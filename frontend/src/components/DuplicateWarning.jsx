import API from '../api/axios';

export default function DuplicateWarning({ duplicateData, onMerge, onSubmitAnyway, onDismiss }) {
  const { similarComplaints, mergeReason, similarityScore } = duplicateData;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '24px',
        maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>🔗</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>
              Similar Complaint Found
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
              {Math.round((similarityScore || 0) * 100)}% match — DSA: Jaccard Similarity
            </p>
          </div>
        </div>

        {/* Reason */}
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107',
          borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#856404'
        }}>
          ⚠️ {mergeReason}
        </div>

        {/* Similar complaints list */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '8px' }}>
            Existing complaint(s) on your floor:
          </p>
          {similarComplaints?.map((c, i) => (
            <div key={c._id || i} style={{
              background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px',
              marginBottom: '8px', fontSize: '13px', borderLeft: '3px solid #667eea'
            }}>
              <div style={{ fontWeight: '600', color: '#1a1a2e', marginBottom: '2px' }}>
                Room {c.room} · Floor {c.floor}
              </div>
              <div style={{ color: '#555' }}>{c.description}</div>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
                {new Date(c.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => onMerge(similarComplaints[0]._id, mergeReason)}
            style={{
              background: '#667eea', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '12px', fontWeight: '600',
              fontSize: '14px', cursor: 'pointer'
            }}
          >
            🔗 Merge with existing complaint
            <div style={{ fontSize: '11px', fontWeight: '400', opacity: 0.85, marginTop: '2px' }}>
              Warden sees this as a floor-wide issue — higher priority
            </div>
          </button>

          <button
            onClick={onSubmitAnyway}
            style={{
              background: '#f8f9fa', color: '#444', border: '1px solid #ddd',
              borderRadius: '8px', padding: '10px', fontWeight: '500',
              fontSize: '13px', cursor: 'pointer'
            }}
          >
            Submit as separate complaint anyway
          </button>

          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', color: '#888', border: 'none',
              fontSize: '13px', cursor: 'pointer', padding: '4px'
            }}
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
