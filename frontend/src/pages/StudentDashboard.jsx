import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ComplaintCard from '../components/ComplaintCard';
import API from '../api/axios';
import DuplicateWarning from '../components/DuplicateWarning';

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

export default function StudentDashboard() {
  const [tab, setTab] = useState('submit');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: '', subCategory: '', description: '', roomNumber: '', floor: '' });
  const [photo, setPhoto] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [duplicateData, setDuplicateData] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Pre-fill room from user profile
  useEffect(() => {
    setForm(f => ({ ...f, roomNumber: user.roomNumber || '', floor: user.floor || '' }));
    if (tab === 'track') fetchComplaints();
  }, [tab]);

  const fetchComplaints = async () => {
    try {
      const { data } = await API.get('/complaints/my');
      setComplaints(data);
    } catch { toast.error('Failed to load complaints'); }
  };

  const submitComplaint = async (formToSubmit, photoToSubmit) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formToSubmit).forEach(([k, v]) => fd.append(k, v));
      if (photoToSubmit) fd.append('photo', photoToSubmit);

      const { data } = await API.post('/complaints', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Complaint submitted!');
      if (data.alerts.isUrgent) toast('🚨 Marked as URGENT — will escalate in 24h', { icon: '⚠️' });
      if (data.alerts.isRepeat) toast('🔁 Repeat issue detected — priority boosted!', { icon: '📢' });
      if (data.alerts.isDuplicate) toast('🔗 Similar complaint exists — merged with it', { icon: 'ℹ️' });
      toast(`Priority Score: ${data.alerts.priorityScore} pts`, { icon: '⚡' });

      setForm({ category: '', subCategory: '', description: '', roomNumber: user.roomNumber || '', floor: user.floor || '' });
      setPhoto(null);
      setPendingFormData(null);
      setPendingPhoto(null);
      setDuplicateData(null);
      setTab('track');
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.roomNumber || !form.floor) {
      return toast.error('Please fill all required fields');
    }

    setCheckingDuplicate(true);
    try {
      const { data } = await API.post('/duplicates/check', {
        description: form.description,
        category:    form.category,
        floor:       form.floor,
        room:        form.roomNumber,
      });

      if (data.isDuplicate) {
        setPendingFormData(form);
        setPendingPhoto(photo);
        setDuplicateData(data);
        setCheckingDuplicate(false);
        return;
      }
    } catch (err) {
      console.warn('Duplicate check failed silently:', err);
    }
    setCheckingDuplicate(false);
    await submitComplaint(form, photo);
  };

  const handleMerge = async (parentId, mergeReason) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(pendingFormData).forEach(([k, v]) => fd.append(k, v));
      if (pendingPhoto) fd.append('photo', pendingPhoto);

      const { data } = await API.post('/complaints', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await API.post('/duplicates/merge', {
        childId:     data.complaint._id,
        parentId,
        mergeReason,
      });

      toast.success('Merged with existing complaint — warden notified of floor-wide issue!');
      setForm({ category: '', subCategory: '', description: '', roomNumber: user.roomNumber || '', floor: user.floor || '' });
      setPhoto(null);
      setPendingFormData(null);
      setPendingPhoto(null);
      setDuplicateData(null);
      setTab('track');
      fetchComplaints();
    } catch (err) {
      toast.error('Merge failed');
    }
    setLoading(false);
  };
  const submitFeedback = async (complaintId, rating) => {
    try {
      const { data } = await API.patch(`/complaints/${complaintId}/feedback`, { rating, comment: '' });
      toast.success(data.message);
      fetchComplaints();
    } catch { toast.error('Failed to submit feedback'); }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === form.category);

  return (
    <div>
      <Navbar title="Student Dashboard" />
      <div className="container">
        <div className="tabs">
          <button className={`tab ${tab === 'submit' ? 'active' : ''}`} onClick={() => setTab('submit')}>Submit Complaint</button>
          <button className={`tab ${tab === 'track' ? 'active' : ''}`} onClick={() => setTab('track')}>My Complaints</button>
        </div>

        {/* ── SUBMIT TAB ── */}
        {tab === 'submit' && (
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>📝 New Complaint</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Room Number *</label>
                <input value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} placeholder="e.g. 204" />
              </div>
              <div className="form-group">
                <label>Floor *</label>
                <input type="number" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="e.g. 2" />
              </div>
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subCategory: '' })}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {selectedCategory && (
              <div className="form-group">
                <label>Specific Issue *</label>
                <select value={form.subCategory} onChange={e => setForm({ ...form, subCategory: e.target.value })}>
                  <option value="">Select issue</option>
                  {selectedCategory.subs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the problem in detail..." />
            </div>

            <div className="form-group">
              <label>Photo (optional)</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#666' }}>
              💡 <strong>Priority is auto-calculated</strong> based on issue type, current season, and urgency. Critical issues like water leaks and power outages are escalated same day.
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading || checkingDuplicate}>
              {checkingDuplicate ? 'Checking for duplicates...' : loading ? 'Submitting...' : '🚀 Submit Complaint'}
            </button>

            {duplicateData && (
              <DuplicateWarning
                duplicateData={duplicateData}
                onMerge={handleMerge}
                onSubmitAnyway={() => {
                  setDuplicateData(null);
                  submitComplaint(pendingFormData, pendingPhoto);
                }}
                onDismiss={() => {
                  setDuplicateData(null);
                  setPendingFormData(null);
                  setPendingPhoto(null);
                }}
              />
            )}
          </div>
        )}

        {/* ── TRACK TAB ── */}
        {tab === 'track' && (
          <div>
            {complaints.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                No complaints yet. Submit one above!
              </div>
            ) : (
              complaints.map(c => (
                <ComplaintCard key={c._id} complaint={c} actions={
                  c.status === 'resolved' && !c.studentRating ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Rate the resolution:</div>
                      <div className="stars">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span
                            key={star}
                            className={`star ${(feedback[c._id] || 0) >= star ? 'active' : ''}`}
                            onClick={() => setFeedback({ ...feedback, [c._id]: star })}
                          >★</span>
                        ))}
                      </div>
                      {feedback[c._id] && (
                        <button className="btn btn-primary btn-sm" onClick={() => submitFeedback(c._id, feedback[c._id])}>
                          Submit Rating
                        </button>
                      )}
                    </div>
                  ) : c.studentRating ? (
                    <div style={{ fontSize: '13px', color: '#888' }}>
                      You rated: {'★'.repeat(c.studentRating)}{'☆'.repeat(5 - c.studentRating)}
                    </div>
                  ) : null
                } />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
