import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import API from '../api/axios';

// Builds a Gemini prompt from report data
function buildPrompt(report) {
  const unresolved = report.handedOffComplaints?.length > 0
    ? report.handedOffComplaints
        .map(c => `Room ${c.roomNumber} Floor ${c.floor}: ${c.category?.replace('_', ' ')} — ${c.description?.slice(0, 80)}`)
        .join('\n')
    : 'None — all resolved!';

  return `You are a hostel management assistant generating a shift handoff report for the day warden.

Night shift data (10pm to 6am):
- Total complaints received: ${report.stats.totalComplaints}
- Resolved during shift: ${report.stats.resolved}
- In progress: ${report.stats.inProgress}
- Still pending (handed to floor warden): ${report.stats.pending}
- Urgent complaints: ${report.stats.urgent}

Unresolved complaints needing follow-up:
${unresolved}

Write a clear, professional shift handoff report in 4-6 sentences.
- Start with an overall summary of the night.
- Mention what was resolved and what needs follow-up.
- Flag any urgent or critical items specifically.
- End with a one-line handoff note to the day warden.
Keep it factual, concise, and actionable. Do not use bullet points.`;
}

// Smart template fallback — reads real stats, never fails
function generateTemplateSummary(report) {
  const { stats, handedOffComplaints = [] } = report;

  const resolvedList = (report.resolvedComplaintNames || []).join(', ');
  const unresolvedList = handedOffComplaints
    .map(c => `${c.category?.replace('_', ' ')} in Room ${c.roomNumber} (Floor ${c.floor})`)
    .join(', ');

  if (stats.totalComplaints === 0) {
    return `The night shift was uneventful with no complaints received. All hostel systems appear to be functioning normally. The day warden can begin their shift without any pending handoffs.`;
  }

  let s = `During the night shift, ${stats.totalComplaints} complaint${stats.totalComplaints > 1 ? 's were' : ' was'} received across the hostel. `;
  if (stats.resolved > 0) {
    s += `${stats.resolved} issue${stats.resolved > 1 ? 's were' : ' was'} successfully resolved during the shift${resolvedList ? ` (${resolvedList})` : ''}. `;
  }
  if (stats.urgent > 0) {
    s += `${stats.urgent} urgent complaint${stats.urgent > 1 ? 's require' : ' requires'} immediate attention from the day warden. `;
  }
  if (stats.pending > 0) {
    s += `${stats.pending} complaint${stats.pending > 1 ? 's remain' : ' remains'} unresolved and have been handed off to floor wardens${unresolvedList ? `: ${unresolvedList}` : ''}. Day warden to follow up on these immediately.`;
  } else {
    s += `All complaints were resolved during the night shift. Day warden can begin their shift with a clean queue.`;
  }
  return s;
}

export default function ShiftReportPanel() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  // aiSummaries: { [reportId]: { text, source } }  source: 'gemini' | 'template' | 'generating'
  const [aiSummaries, setAiSummaries] = useState({});

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/shift-reports');
      setReports(data);
    } catch {
      toast.error('Failed to load shift reports');
    }
    setLoading(false);
  };

  const handleGenerateAI = async (report) => {
    // Mark as generating
    setAiSummaries(prev => ({
      ...prev,
      [report._id]: { text: '', source: 'generating' }
    }));

    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Try Gemini first
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: buildPrompt(report) }] }]
            })
          }
        );
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          setAiSummaries(prev => ({
            ...prev,
            [report._id]: { text, source: 'gemini' }
          }));
          toast.success('AI report generated!');
          return;
        }
      } catch {
        // Gemini failed — fall through to template
      }
    }

    // Fallback: template-based summary from real data
    const text = generateTemplateSummary(report);
    setAiSummaries(prev => ({
      ...prev,
      [report._id]: { text, source: 'template' }
    }));
    toast(geminiKey ? 'Gemini unavailable — used smart summary instead' : 'Add VITE_GEMINI_API_KEY to .env for AI reports. Showing smart summary.', { icon: '⚠️' });
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        Loading shift reports...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        📋 No shift reports yet.<br />
        <span style={{ fontSize: '13px' }}>
          Reports are auto-generated at 6:10am every day after the night shift ends.
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{
        marginBottom: '16px', background: '#f0f4ff', border: '1px solid #c7d2fe'
      }}>
        <strong>🤖 AI Shift Reports</strong> — Auto-saved at 6:10am every day.
        Click <strong>Generate AI Summary</strong> on any report to get a live Gemini-powered analysis.
        Falls back to smart summary if Gemini is unavailable.
      </div>

      {reports.map((report, i) => {
        const ai = aiSummaries[report._id];
        const isGenerating = ai?.source === 'generating';

        return (
          <div key={report._id} className="card" style={{ marginBottom: '14px' }}>

            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    background: '#1a1a2e', color: '#a29bfe',
                    borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                  }}>
                    🌙 NIGHT SHIFT
                  </span>
                  {i === 0 && (
                    <span style={{
                      background: '#d4edda', color: '#155724',
                      borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                    }}>
                      LATEST
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#555' }}>
                  {new Date(report.shiftStart).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short'
                  })} &nbsp;·&nbsp;
                  {new Date(report.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(report.shiftEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Quick stats */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                {[
                  { label: 'Total', val: report.stats.totalComplaints, color: '#1a1a2e' },
                  { label: 'Resolved', val: report.stats.resolved, color: '#27ae60' },
                  { label: 'Handed off', val: report.stats.pending, color: '#e74c3c' },
                  { label: 'Urgent', val: report.stats.urgent, color: '#e67e22' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color }}>{val}</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-saved summary (always shown) */}
            <div style={{
              background: '#f8f9fa', borderRadius: '8px',
              padding: '14px', margin: '14px 0',
              fontSize: '14px', lineHeight: '1.7', color: '#333',
              borderLeft: '3px solid #adb5bd'
            }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: '600' }}>
                📋 AUTO-SAVED SUMMARY
              </div>
              {report.summary}
            </div>

            {/* AI-generated summary (on demand) */}
            {ai && !isGenerating && (
              <div style={{
                background: ai.source === 'gemini' ? '#f0f4ff' : '#fff8e1',
                borderRadius: '8px', padding: '14px', margin: '0 0 14px 0',
                fontSize: '14px', lineHeight: '1.7', color: '#333',
                borderLeft: `3px solid ${ai.source === 'gemini' ? '#667eea' : '#ffc107'}`
              }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: '600' }}>
                  {ai.source === 'gemini' ? '🤖 GEMINI AI SUMMARY' : '⚡ SMART SUMMARY (fallback)'}
                </div>
                {ai.text}
              </div>
            )}

            {/* Generate button */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleGenerateAI(report)}
                disabled={isGenerating}
                style={{
                  background: isGenerating ? '#adb5bd' : '#667eea',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '7px 14px', fontSize: '13px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer', fontWeight: '600'
                }}
              >
                {isGenerating ? '⏳ Generating...' : ai ? '🔄 Regenerate AI Summary' : '🤖 Generate AI Summary'}
              </button>

              {/* Handed off toggle */}
              {report.handedOffComplaints?.length > 0 && (
                <button
                  onClick={() => setExpanded(expanded === report._id ? null : report._id)}
                  style={{
                    background: 'none', border: '1px solid #ddd', borderRadius: '6px',
                    padding: '7px 12px', fontSize: '12px', cursor: 'pointer', color: '#555'
                  }}
                >
                  {expanded === report._id ? '▲ Hide' : '▼ Show'} {report.handedOffComplaints.length} handed-off complaint(s)
                </button>
              )}
            </div>

            {/* Handed-off complaints detail */}
            {expanded === report._id && report.handedOffComplaints?.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {report.handedOffComplaints.map(c => (
                  <div key={c._id} style={{
                    background: '#fff3cd', borderRadius: '6px',
                    padding: '8px 12px', marginBottom: '6px',
                    fontSize: '13px', borderLeft: '3px solid #ffc107'
                  }}>
                    <div style={{ fontWeight: '600' }}>
                      Room {c.roomNumber} · Floor {c.floor} · {c.category?.replace('_', ' ')}
                    </div>
                    <div style={{ color: '#666', marginTop: '2px' }}>{c.description}</div>
                    <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>Status: {c.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
