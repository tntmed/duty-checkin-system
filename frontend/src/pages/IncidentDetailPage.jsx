import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getIncident, workflowIncident } from '../services/api'

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  OPEN:        { bg: '#fee2e2', color: '#dc2626', label: 'เปิด' },
  IN_PROGRESS: { bg: '#fef9c3', color: '#ca8a04', label: 'กำลังดำเนินการ' },
  RESOLVED:    { bg: '#dcfce7', color: '#16a34a', label: 'แก้ไขแล้ว' },
  CLOSED:      { bg: '#f3f4f6', color: '#6b7280', label: 'ปิด' },
}

const IMPACT_CONFIG = {
  NONE:     { bg: '#f3f4f6', color: '#6b7280' },
  MINOR:    { bg: '#fef9c3', color: '#ca8a04' },
  MAJOR:    { bg: '#ffedd5', color: '#c2410c' },
  CRITICAL: { bg: '#fee2e2', color: '#dc2626' },
}

// OPEN → IN_PROGRESS → RESOLVED → CLOSED
const NEXT_TRANSITIONS = {
  OPEN:        [{ to: 'IN_PROGRESS', label: '▶ เริ่มดำเนินการ', color: '#ca8a04' }],
  IN_PROGRESS: [
    { to: 'RESOLVED', label: '✓ แก้ไขเสร็จแล้ว', color: '#16a34a' },
    { to: 'OPEN',     label: '↩ เปิดใหม่',        color: '#6b7280' },
  ],
  RESOLVED:    [
    { to: 'CLOSED',      label: '🔒 ปิดเรื่อง',      color: '#374151' },
    { to: 'IN_PROGRESS', label: '↩ เปิดใหม่',        color: '#6b7280' },
  ],
  CLOSED:      [],
}

// ── Styles ─────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  navbar: {
    backgroundColor: '#1a73e8', padding: '0 24px', height: '60px',
    display: 'flex', alignItems: 'center', gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)',
    color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
  },
  navTitle: { color: '#fff', fontWeight: '700', fontSize: '17px', margin: 0 },
  navSub:   { color: 'rgba(255,255,255,0.7)', fontSize: '13px' },

  content: { maxWidth: '860px', margin: '28px auto', padding: '0 20px' },

  card: {
    backgroundColor: '#fff', borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '20px', overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 22px', borderBottom: '1px solid #f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  cardBody:  { padding: '22px' },

  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: '700' },

  metaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' },
  metaItem: {},
  metaLabel: { fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' },
  metaValue: { fontSize: '14px', color: '#111827', fontWeight: '500' },

  detailText: {
    fontSize: '14px', color: '#374151', lineHeight: '1.6',
    backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px 16px',
    border: '1px solid #e5e7eb', marginBottom: '16px',
  },

  sectionLabel: { fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'block' },

  select: {
    width: '100%', padding: '9px 12px', fontSize: '14px',
    border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none',
    backgroundColor: '#fff', color: '#111827', cursor: 'pointer',
  },
  textarea: {
    width: '100%', padding: '10px 12px', fontSize: '14px',
    border: '1.5px solid #d1d5db', borderRadius: '8px', outline: 'none',
    resize: 'vertical', minHeight: '90px', color: '#111827',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },

  transitionRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  transitionBtn: (color) => ({
    padding: '9px 20px', borderRadius: '8px', border: `1.5px solid ${color}`,
    color, backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    transition: 'background-color 0.15s',
  }),
  saveBtn: {
    padding: '9px 22px', borderRadius: '8px', border: 'none',
    backgroundColor: '#1a73e8', color: '#fff',
    cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  },

  error: { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
  success: { backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
  loading: { textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '16px' },
}

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString()
}

export default function IncidentDetailPage() {
  const { incidentId } = useParams()
  const navigate = useNavigate()

  const [incident, setIncident] = useState(null)
  const [assignToExternal, setAssignToExternal] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    getIncident(incidentId)
      .then((incRes) => {
        const inc = incRes.data
        setIncident(inc)
        setAssignToExternal(inc.assigned_to_external || '')
        setResolutionNote(inc.resolution_note || '')
      })
      .catch(() => setError('Failed to load incident.'))
      .finally(() => setLoading(false))
  }, [incidentId])

  const applyWorkflow = async (newStatus) => {
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const payload = {}
      if (newStatus) payload.status = newStatus
      if (assignToExternal.trim()) payload.assigned_to_external = assignToExternal.trim()
      if (resolutionNote.trim()) payload.resolution_note = resolutionNote.trim()

      const res = await workflowIncident(incidentId, payload)
      setIncident(res.data)
      const statusTh = { OPEN: 'เปิด', IN_PROGRESS: 'กำลังดำเนินการ', RESOLVED: 'แก้ไขแล้ว', CLOSED: 'ปิด' }
      setSuccessMsg(`อัปเดตสถานะเป็น: ${statusTh[res.data.status] || res.data.status}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDetails = async () => {
    await applyWorkflow(null)
    setSuccessMsg('บันทึกข้อมูลเรียบร้อย')
  }

  if (loading) return (
    <div style={s.page}>
      <nav style={s.navbar}><h1 style={s.navTitle}>Loading...</h1></nav>
      <div style={s.loading}>Loading incident...</div>
    </div>
  )

  if (!incident) return (
    <div style={s.page}>
      <nav style={s.navbar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <h1 style={s.navTitle}>Incident not found</h1>
      </nav>
      <div style={{ ...s.loading, color: '#dc2626' }}>ไม่พบ Incident #{incidentId}</div>
    </div>
  )

  const statusCfg = STATUS_CONFIG[incident.status] || STATUS_CONFIG.OPEN
  const impactCfg = IMPACT_CONFIG[incident.impact] || IMPACT_CONFIG.NONE
  const transitions = NEXT_TRANSITIONS[incident.status] || []

  return (
    <div style={s.page}>
      <nav style={s.navbar}>
        <button style={s.backBtn} onClick={() => navigate(`/duty/${incident.duty_id}`)}>← Back to Duty</button>
        <h1 style={s.navTitle}>Incident #{incident.id}</h1>
        <span style={s.navSub}>{incident.incident_type}</span>
      </nav>

      <div style={s.content}>
        {error && <div style={s.error}>{error}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}

        {/* ── Overview card ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>ภาพรวม Incident</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ ...s.badge, backgroundColor: impactCfg.bg, color: impactCfg.color }}>{incident.impact}</span>
              <span style={{ ...s.badge, backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
            </div>
          </div>
          <div style={s.cardBody}>
            <div style={s.metaGrid}>
              <div style={s.metaItem}>
                <div style={s.metaLabel}>ประเภท</div>
                <div style={s.metaValue}>{incident.incident_type}</div>
              </div>
              <div style={s.metaItem}>
                <div style={s.metaLabel}>เวร</div>
                <div style={s.metaValue}>
                  <span
                    style={{ color: '#1a73e8', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigate(`/duty/${incident.duty_id}`)}
                  >
                    เวร #{incident.duty_id}
                  </span>
                </div>
              </div>
              <div style={s.metaItem}>
                <div style={s.metaLabel}>เวลารายงาน</div>
                <div style={s.metaValue}>{fmt(incident.reported_at)}</div>
              </div>
              <div style={s.metaItem}>
                <div style={s.metaLabel}>เวลาแก้ไข</div>
                <div style={s.metaValue}>{fmt(incident.resolved_at)}</div>
              </div>
              <div style={{ ...s.metaItem, gridColumn: '1 / -1' }}>
                <div style={s.metaLabel}>มอบหมายให้ (Outsource)</div>
                <div style={s.metaValue}>{incident.assigned_to_external || '— ยังไม่ได้มอบหมาย'}</div>
              </div>
            </div>

            <div style={s.metaLabel}>รายละเอียด</div>
            <div style={s.detailText}>{incident.detail}</div>

            {incident.resolution_note && (
              <>
                <div style={s.metaLabel}>หมายเหตุการแก้ไข</div>
                <div style={{ ...s.detailText, borderLeft: '3px solid #16a34a' }}>{incident.resolution_note}</div>
              </>
            )}
          </div>
        </div>

        {/* ── Workflow card ── */}
        {incident.status !== 'CLOSED' && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>การดำเนินการ</h3>
            </div>
            <div style={s.cardBody}>
              {/* Assign to outsource */}
              <label style={s.sectionLabel}>มอบหมายให้ (Outsource / บริษัทภายนอก)</label>
              <input
                type="text"
                style={{ ...s.select, marginBottom: '14px' }}
                placeholder="เช่น บริษัท ABC จำกัด, ช่าง กฟน."
                value={assignToExternal}
                onChange={(e) => setAssignToExternal(e.target.value)}
              />

              {/* Resolution note */}
              <label style={s.sectionLabel}>หมายเหตุการแก้ไข</label>
              <textarea
                style={{ ...s.textarea, marginBottom: '18px' }}
                placeholder="อธิบายวิธีการแก้ไข..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />

              {/* Status transition buttons */}
              <div style={s.transitionRow}>
                <button
                  style={s.saveBtn}
                  onClick={handleSaveDetails}
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>

                {transitions.map((t) => (
                  <button
                    key={t.to}
                    style={s.transitionBtn(t.color)}
                    onClick={() => applyWorkflow(t.to)}
                    disabled={saving}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = t.color; e.currentTarget.style.color = '#fff' }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = t.color }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {incident.status === 'CLOSED' && (
          <div style={{ ...s.card, border: '1.5px solid #e5e7eb' }}>
            <div style={{ ...s.cardBody, color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
              🔒 Incident นี้ถูกปิดแล้ว ไม่สามารถดำเนินการเพิ่มเติมได้
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
