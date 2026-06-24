export default function ComplaintCard({ complaint, actions }) {
  const score = complaint.priorityScore || 0;
  const urgencyClass = complaint.isUrgent ? 'urgent' : score > 20 ? 'high' : score > 10 ? 'medium' : 'low';

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '—';

  const categoryIcon = {
    electrical: '⚡', water_plumbing: '🚿', laundry: '👕',
    carpentry: '🔨', cleanliness: '🧹', internet: '📶',
    security: '🔒', other: '📋'
  };

  return (
    <div className={`complaint-card ${urgencyClass}`}>
      <div className="complaint-header">
        <div>
          <div className="complaint-title">
            {categoryIcon[complaint.category] || '📋'} {complaint.subCategory || complaint.category?.replace('_', ' ')}
          </div>
          <div className="complaint-meta">
            Room {complaint.roomNumber} · Floor {complaint.floor} · {formatDate(complaint.createdAt)}
            {complaint.student?.name && ` · ${complaint.student.name}`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <span className={`badge badge-${complaint.status}`}>{complaint.status?.replace('_', ' ')}</span>
          <span className="priority-score">⚡ {score} pts</span>
        </div>
      </div>

      <div className="complaint-desc">{complaint.description}</div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {complaint.isUrgent && <span className="badge badge-urgent">🚨 Urgent</span>}
        {complaint.isRepeat && <span className="badge" style={{ background: '#a29bfe', color: '#6c5ce7' }}>🔁 Repeat</span>}
        {complaint.isDuplicate && <span className="badge" style={{ background: '#dfe6e9', color: '#636e72' }}>🔗 Merged</span>}
        {complaint.slaWarningsentAt && <span className="badge" style={{ background: '#fdcb6e', color: '#e17055' }}>⏰ SLA Risk</span>}
      </div>

      {/* Staff assigned */}
      {complaint.assignedStaff?.name && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          🔧 Assigned to: <strong>{complaint.assignedStaff.name}</strong> ({complaint.assignedStaff.specialization})
        </div>
      )}

      {/* Photo */}
      {complaint.photoUrl && (
        <img
          src={`http://localhost:5000${complaint.photoUrl}`}
          alt="complaint"
          style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
        />
      )}

      {/* Action buttons passed from parent */}
      {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
