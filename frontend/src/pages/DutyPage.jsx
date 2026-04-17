import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getDuty,
  getChecklistLogs,
  getIncidents,
  checkout,
  submitChecklists,
  createIncident,
  updateIncident,
  uploadDutyFile,
  uploadChecklistFile,
  uploadIncidentFile,
  getIncidentAttachments,
} from '../services/api'
import API from '../services/api'

// ============================================================
// Style constants
// ============================================================
const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  navbar: {
    backgroundColor: '#1a73e8',
    padding: '0 24px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  navTitle: { color: '#ffffff', fontWeight: '700', fontSize: '18px', margin: 0, cursor: 'pointer' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '14px' },
  content: { maxWidth: '960px', margin: '28px auto', padding: '0 16px' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px 28px',
    marginBottom: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 0,
    marginBottom: '18px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  infoItem: {},
  infoLabel: { fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  infoValue: { fontSize: '15px', color: '#111827', fontWeight: '500' },
  btn: {
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    padding: '7px 16px',
    transition: 'opacity 0.15s',
  },
  btnPrimary: { backgroundColor: '#1a73e8', color: '#fff' },
  btnDanger: { backgroundColor: '#dc2626', color: '#fff' },
  btnSuccess: { backgroundColor: '#16a34a', color: '#fff' },
  btnGray: { backgroundColor: '#6b7280', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1.5px solid #d1d5db' },
  checklistItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  checklistText: { flex: '1', fontSize: '14px', color: '#374151', lineHeight: '1.5' },
  remarkInput: {
    width: '100%',
    marginTop: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  statusBtns: { display: 'flex', gap: '6px', flexShrink: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left',
    padding: '9px 12px',
    backgroundColor: '#f8fafc',
    color: '#6b7280',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid #e5e7eb',
  },
  td: { padding: '11px 12px', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' },
  incidentForm: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    marginTop: '16px',
  },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '5px' },
  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1.5px solid #d1d5db',
    borderRadius: '7px',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1.5px solid #d1d5db',
    borderRadius: '7px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  alertSuccess: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  alertError: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  uploadRow: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' },
  fileInput: { fontSize: '13px', color: '#374151' },
  loadingPage: { textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '16px' },
}

// ============================================================
// Helper functions
// ============================================================
function formatDT(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString()
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString()
}

function ChecklistStatusBadge({ status }) {
  const map = {
    OK: { bg: '#dcfce7', color: '#16a34a' },
    NOT_OK: { bg: '#fee2e2', color: '#dc2626' },
    NA: { bg: '#f3f4f6', color: '#6b7280' },
  }
  const c = map[status] || map.NA
  return <span style={{ ...s.badge, backgroundColor: c.bg, color: c.color }}>{status}</span>
}

function ImpactBadge({ impact }) {
  const map = {
    CRITICAL: { bg: '#fee2e2', color: '#dc2626' },
    MAJOR: { bg: '#ffedd5', color: '#ea580c' },
    MINOR: { bg: '#fef9c3', color: '#ca8a04' },
    NONE: { bg: '#f3f4f6', color: '#6b7280' },
  }
  const c = map[impact] || map.NONE
  return <span style={{ ...s.badge, backgroundColor: c.bg, color: c.color }}>{impact}</span>
}

function IncidentStatusBadge({ status }) {
  const map = {
    OPEN: { bg: '#fee2e2', color: '#dc2626' },
    IN_PROGRESS: { bg: '#fef9c3', color: '#ca8a04' },
    RESOLVED: { bg: '#dcfce7', color: '#16a34a' },
  }
  const c = map[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return <span style={{ ...s.badge, backgroundColor: c.bg, color: c.color }}>{status.replace('_', ' ')}</span>
}

// ============================================================
// Main component
// ============================================================
export default function DutyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Core state
  const [duty, setDuty] = useState(null)
  const [checklistLogs, setChecklistLogs] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  // Checklist editing state: map of log.id -> { status, remark }
  const [checklistEdits, setChecklistEdits] = useState({})
  // Track which items are currently auto-saving
  const [autoSaving, setAutoSaving] = useState({}) // logId -> bool

  // Incident form state
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'ROUTINE',
    detail: '',
    impact: 'NONE',
  })
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)

  // Incident status update state: map of incident.id -> new status value
  const [incidentStatusEdits, setIncidentStatusEdits] = useState({})

  // Incident edit modal state
  const [editingIncident, setEditingIncident] = useState(null)
  const [editForm, setEditForm] = useState({ incident_type: 'ROUTINE', detail: '', impact: 'NONE' })
  const [editSaving, setEditSaving] = useState(false)

  // Photo gallery state
  const [incidentAttachments, setIncidentAttachments] = useState({}) // incidentId → []
  const [expandedPhotos, setExpandedPhotos] = useState(new Set())
  const [lightboxUrl, setLightboxUrl] = useState(null)

  // Upload state
  const [dutyUploadFile, setDutyUploadFile] = useState(null)
  const [dutyUploading, setDutyUploading] = useState(false)

  // Per-checklist-item upload
  const [checklistUploadFiles, setChecklistUploadFiles] = useState({}) // logId -> File
  const [checklistUploading, setChecklistUploading] = useState({})

  // Per-incident upload
  const [incidentUploadFiles, setIncidentUploadFiles] = useState({}) // incidentId -> File
  const [incidentUploading, setIncidentUploading] = useState({})

  // Checkout state
  const [checkingOut, setCheckingOut] = useState(false)
  const [savingChecklist, setSavingChecklist] = useState(false)

  // Timeline
  const [timeline, setTimeline] = useState([])

  // Messages
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }
  const showError = (msg) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(''), 6000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dutyRes, clRes, incRes, tlRes] = await Promise.all([
        getDuty(id),
        getChecklistLogs(id),
        getIncidents(id),
        API.get(`/duties/${id}/timeline`).catch(() => ({ data: { events: [] } })),
      ])
      setDuty(dutyRes.data)
      const logs = clRes.data || []
      setChecklistLogs(logs)
      // Initialise edit state from current values
      const edits = {}
      logs.forEach((log) => {
        edits[log.id] = { status: log.status || 'NA', remark: log.remark || '' }
      })
      setChecklistEdits(edits)
      const incList = incRes.data || []
      setIncidents(incList)
      setTimeline(tlRes.data?.events || [])
      // Load attachments for each incident
      const attachMap = {}
      await Promise.all(incList.map(async (inc) => {
        try {
          const r = await getIncidentAttachments(inc.id)
          attachMap[inc.id] = r.data || []
        } catch { attachMap[inc.id] = [] }
      }))
      setIncidentAttachments(attachMap)
    } catch (err) {
      showError('Failed to load duty data.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ============================================================
  // Checkout
  // ============================================================
  const handleCheckout = async () => {
    if (!window.confirm('Are you sure you want to check out?')) return
    setCheckingOut(true)
    try {
      await checkout(id)
      showSuccess('Checked out successfully.')
      loadData()
    } catch (err) {
      showError(err.response?.data?.detail || 'Checkout failed.')
    } finally {
      setCheckingOut(false)
    }
  }

  // ============================================================
  // Checklist
  // ============================================================
  // Auto-save a single checklist item immediately when status is clicked
  const handleChecklistStatusChange = async (log, newStatus) => {
    const logId = log.id
    setChecklistEdits((prev) => ({
      ...prev,
      [logId]: { ...prev[logId], status: newStatus },
    }))

    setAutoSaving((prev) => ({ ...prev, [logId]: true }))
    try {
      await submitChecklists(id, {
        items: [
          {
            template_id: log.template_id,
            status: newStatus,
            remark: checklistEdits[logId]?.remark || null,
          },
        ],
      })
    } catch (err) {
      showError('Auto-save failed for checklist item.')
    } finally {
      setAutoSaving((prev) => ({ ...prev, [logId]: false }))
    }
  }

  const handleChecklistRemarkChange = (logId, remark) => {
    setChecklistEdits((prev) => ({
      ...prev,
      [logId]: { ...prev[logId], remark },
    }))
  }

  const handleSaveAllChecklists = async () => {
    setSavingChecklist(true)
    try {
      const items = checklistLogs.map((log) => ({
        template_id: log.template_id,
        status: checklistEdits[log.id]?.status || 'NA',
        remark: checklistEdits[log.id]?.remark || null,
      }))
      await submitChecklists(id, { items })
      showSuccess('Checklist saved successfully.')
      loadData()
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to save checklist.')
    } finally {
      setSavingChecklist(false)
    }
  }

  // ============================================================
  // Incidents
  // ============================================================
  const handleIncidentFormChange = (e) => {
    const { name, value } = e.target
    setIncidentForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitIncident = async (e) => {
    e.preventDefault()
    if (!incidentForm.detail.trim()) {
      showError('Incident detail is required.')
      return
    }
    setIncidentSubmitting(true)
    try {
      await createIncident(id, incidentForm)
      showSuccess('Incident reported successfully.')
      setIncidentForm({ incident_type: 'ROUTINE', detail: '', impact: 'NONE' })
      setShowIncidentForm(false)
      loadData()
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to create incident.')
    } finally {
      setIncidentSubmitting(false)
    }
  }

  const handleUpdateIncidentStatus = async (incidentId, newStatus) => {
    try {
      await updateIncident(incidentId, { status: newStatus })
      showSuccess('Incident status updated.')
      loadData()
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to update incident.')
    }
  }

  const handleOpenEdit = (inc) => {
    setEditForm({ incident_type: inc.incident_type, detail: inc.detail, impact: inc.impact })
    setEditingIncident(inc)
  }

  const handleSaveEdit = async () => {
    if (!editForm.detail.trim()) { showError('กรุณากรอกรายละเอียด incident'); return }
    setEditSaving(true)
    try {
      await updateIncident(editingIncident.id, editForm)
      showSuccess('แก้ไข incident เรียบร้อยแล้ว')
      setEditingIncident(null)
      loadData()
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to update incident.')
    } finally {
      setEditSaving(false)
    }
  }

  // ============================================================
  // File uploads
  // ============================================================
  const handleDutyUpload = async () => {
    if (!dutyUploadFile) return
    setDutyUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', dutyUploadFile)
      await uploadDutyFile(id, fd)
      showSuccess('File uploaded successfully.')
      setDutyUploadFile(null)
    } catch (err) {
      showError(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setDutyUploading(false)
    }
  }

  const handleChecklistUpload = async (logId) => {
    const file = checklistUploadFiles[logId]
    if (!file) return
    setChecklistUploading((prev) => ({ ...prev, [logId]: true }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      await uploadChecklistFile(id, logId, fd)
      showSuccess('File uploaded to checklist item.')
      setChecklistUploadFiles((prev) => ({ ...prev, [logId]: null }))
    } catch (err) {
      showError(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setChecklistUploading((prev) => ({ ...prev, [logId]: false }))
    }
  }

  const handleIncidentUpload = async (incidentId) => {
    const files = incidentUploadFiles[incidentId]
    if (!files || files.length === 0) return
    setIncidentUploading((prev) => ({ ...prev, [incidentId]: true }))
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        await uploadIncidentFile(incidentId, fd)
      }
      showSuccess(`อัปโหลด ${files.length} รูปเรียบร้อยแล้ว`)
      setIncidentUploadFiles((prev) => ({ ...prev, [incidentId]: null }))
      // Reload attachments for this incident
      const r = await getIncidentAttachments(incidentId)
      setIncidentAttachments((prev) => ({ ...prev, [incidentId]: r.data || [] }))
      setExpandedPhotos((prev) => new Set([...prev, incidentId]))
    } catch (err) {
      showError(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setIncidentUploading((prev) => ({ ...prev, [incidentId]: false }))
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return (
      <div style={s.page}>
        <nav style={s.navbar}>
          <h1 style={s.navTitle} onClick={() => navigate('/checkin')}>ระบบลงเวร ศูนย์สารสนเทศ</h1>
        </nav>
        <div style={s.loadingPage}>Loading duty details...</div>
      </div>
    )
  }

  if (!duty) {
    return (
      <div style={s.page}>
        <nav style={s.navbar}>
          <h1 style={s.navTitle} onClick={() => navigate('/checkin')}>ระบบลงเวร ศูนย์สารสนเทศ</h1>
        </nav>
        <div style={s.loadingPage}>Duty not found. <span style={{ color: '#1a73e8', cursor: 'pointer' }} onClick={() => navigate('/checkin')}>Go back</span></div>
      </div>
    )
  }

  const isCheckedOut = !!duty.checkout_time

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.navbar}>
        <h1 style={s.navTitle} onClick={() => navigate('/checkin')}>
          ระบบลงเวร ศูนย์สารสนเทศ
        </h1>
        <div style={s.navRight}>
          <span>{user?.full_name || user?.employee_code}</span>
          <button
            style={{ ...s.btn, ...s.btnOutline, fontSize: '13px' }}
            onClick={() => navigate('/checkin')}
          >
            Back
          </button>
          <button
            style={{ ...s.btn, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={s.content}>
        {successMsg && <div style={s.alertSuccess}>{successMsg}</div>}
        {errorMsg && <div style={s.alertError}>{errorMsg}</div>}

        {/* ====================================================
            Section 1: Duty Header Info
        ==================================================== */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            <span>Duty #{duty.id} Details</span>
            {isCheckedOut && (
              <span style={{ ...s.badge, backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '13px' }}>
                Checked Out
              </span>
            )}
          </div>

          <div style={s.infoGrid}>
            <div style={s.infoItem}>
              <div style={s.infoLabel}>Date</div>
              <div style={s.infoValue}>{formatDate(duty.duty_date)}</div>
            </div>
            <div style={s.infoItem}>
              <div style={s.infoLabel}>Role</div>
              <div style={s.infoValue}>{duty.role?.name || '-'}</div>
            </div>
            <div style={s.infoItem}>
              <div style={s.infoLabel}>Shift</div>
              <div style={s.infoValue}>
                {duty.shift ? `${duty.shift.name} (${duty.shift.start_time}-${duty.shift.end_time})` : '-'}
              </div>
            </div>
            <div style={s.infoItem}>
              <div style={s.infoLabel}>Status</div>
              <div style={s.infoValue}>
                <span style={{
                  ...s.badge,
                  backgroundColor: duty.attendance_status === 'PRESENT' ? '#dcfce7' : '#fee2e2',
                  color: duty.attendance_status === 'PRESENT' ? '#16a34a' : '#dc2626',
                }}>
                  {duty.attendance_status}
                </span>
              </div>
            </div>
            <div style={s.infoItem}>
              <div style={s.infoLabel}>Check-in Time</div>
              <div style={s.infoValue}>{formatDT(duty.checkin_time)}</div>
            </div>
            <div style={s.infoItem}>
              <div style={s.infoLabel}>Check-out Time</div>
              <div style={s.infoValue}>{formatDT(duty.checkout_time)}</div>
            </div>
            {duty.notes && (
              <div style={{ ...s.infoItem, gridColumn: '1 / -1' }}>
                <div style={s.infoLabel}>Notes</div>
                <div style={s.infoValue}>{duty.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            Section 2: Checklist
        ==================================================== */}
        {(() => {
          const notOkCount = Object.values(checklistEdits).filter((e) => e.status === 'NOT_OK').length
          const naCount = Object.values(checklistEdits).filter((e) => e.status === 'NA').length
          return (
            <>
              {notOkCount > 0 && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: '600',
                  color: '#dc2626',
                  fontSize: '14px',
                }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  {notOkCount} checklist item{notOkCount > 1 ? 's' : ''} marked NOT OK — review required
                </div>
              )}
              {isCheckedOut && naCount > 0 && (
                <div style={{
                  backgroundColor: '#fef9c3',
                  border: '1px solid #fde047',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  marginBottom: '16px',
                  color: '#854d0e',
                  fontSize: '13px',
                }}>
                  ℹ️ {naCount} item{naCount > 1 ? 's' : ''} left as N/A
                </div>
              )}
            </>
          )
        })()}
        <div style={{
          ...s.card,
          ...(Object.values(checklistEdits).some((e) => e.status === 'NOT_OK')
            ? { borderLeft: '4px solid #dc2626' }
            : {}),
        }}>
          <div style={s.cardTitle}>
            <span>Checklist ({checklistLogs.length} items)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {Object.values(autoSaving).some(Boolean) && (
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>
                  saving...
                </span>
              )}
              <button
                style={{ ...s.btn, ...s.btnSuccess, opacity: (isCheckedOut || checklistLogs.length === 0) ? 0.5 : 1, cursor: isCheckedOut ? 'not-allowed' : 'pointer' }}
                onClick={handleSaveAllChecklists}
                disabled={savingChecklist || checklistLogs.length === 0 || isCheckedOut}
                title={isCheckedOut ? 'Duty is checked out — checklist is locked' : 'Save all checklist items'}
              >
                {savingChecklist ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>

          {checklistLogs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              No checklist items for this duty.
            </p>
          ) : (
            checklistLogs.map((log) => {
              const edit = checklistEdits[log.id] || { status: log.status, remark: log.remark || '' }
              return (
                <div key={log.id} style={s.checklistItem}>
                  <div style={s.checklistText}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>
                        #{log.template?.item_order || '?'}
                      </span>
                      {log.template?.is_required === 1 && (
                        <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: '700' }}>*</span>
                      )}
                      <span>{log.template?.item_text || `Item ${log.template_id}`}</span>
                      {autoSaving[log.id] && (
                        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>saving...</span>
                      )}
                    </div>
                    <textarea
                      placeholder="Add remark (optional)..."
                      value={edit.remark}
                      onChange={(e) => handleChecklistRemarkChange(log.id, e.target.value)}
                      style={s.remarkInput}
                      rows={2}
                    />
                  </div>

                  <div style={s.statusBtns}>
                    <ChecklistStatusBadge status={edit.status} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '4px' }}>
                      <button
                        style={{
                          ...s.btn,
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: edit.status === 'OK' ? '#16a34a' : '#e5e7eb',
                          color: edit.status === 'OK' ? '#fff' : '#374151',
                          fontWeight: edit.status === 'OK' ? '700' : '500',
                          opacity: isCheckedOut ? 0.5 : 1,
                          cursor: isCheckedOut ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => !isCheckedOut && handleChecklistStatusChange(log, 'OK')}
                        disabled={isCheckedOut}
                      >
                        OK
                      </button>
                      <button
                        style={{
                          ...s.btn,
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: edit.status === 'NOT_OK' ? '#dc2626' : '#e5e7eb',
                          color: edit.status === 'NOT_OK' ? '#fff' : '#374151',
                          fontWeight: edit.status === 'NOT_OK' ? '700' : '500',
                          opacity: isCheckedOut ? 0.5 : 1,
                          cursor: isCheckedOut ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => !isCheckedOut && handleChecklistStatusChange(log, 'NOT_OK')}
                        disabled={isCheckedOut}
                      >
                        NOT OK
                      </button>
                      <button
                        style={{
                          ...s.btn,
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: edit.status === 'NA' ? '#6b7280' : '#e5e7eb',
                          color: edit.status === 'NA' ? '#fff' : '#374151',
                          fontWeight: edit.status === 'NA' ? '700' : '500',
                          opacity: isCheckedOut ? 0.5 : 1,
                          cursor: isCheckedOut ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => !isCheckedOut && handleChecklistStatusChange(log, 'NA')}
                        disabled={isCheckedOut}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ====================================================
            Section 3: Incidents
        ==================================================== */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            <span>Incidents ({incidents.length})</span>
            {!isCheckedOut && (
              <button
                style={{ ...s.btn, ...s.btnPrimary }}
                onClick={() => setShowIncidentForm((prev) => !prev)}
              >
                {showIncidentForm ? 'Cancel' : '+ Add Incident'}
              </button>
            )}
            {isCheckedOut && (
              <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                Locked after checkout
              </span>
            )}
          </div>

          {/* Incident creation form */}
          {showIncidentForm && (
            <form onSubmit={handleSubmitIncident} style={s.incidentForm}>
              <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: '#1a1a2e' }}>New Incident Report</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.formGroup}>
                  <label style={s.label}>Incident Type</label>
                  <select
                    name="incident_type"
                    value={incidentForm.incident_type}
                    onChange={handleIncidentFormChange}
                    style={s.select}
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="INCIDENT">Incident</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Impact Level</label>
                  <select
                    name="impact"
                    value={incidentForm.impact}
                    onChange={handleIncidentFormChange}
                    style={s.select}
                  >
                    <option value="NONE">None</option>
                    <option value="MINOR">Minor</option>
                    <option value="MAJOR">Major</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Detail <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea
                  name="detail"
                  value={incidentForm.detail}
                  onChange={handleIncidentFormChange}
                  placeholder="Describe the incident in detail..."
                  style={s.textarea}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={incidentSubmitting}
                style={{ ...s.btn, ...s.btnPrimary, padding: '9px 24px' }}
              >
                {incidentSubmitting ? 'Submitting...' : 'Submit Incident'}
              </button>
            </form>
          )}

          {/* Incidents table */}
          {incidents.length === 0 ? (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '20px', marginTop: showIncidentForm ? '16px' : 0 }}>
              No incidents reported for this duty.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: showIncidentForm ? '16px' : 0 }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Type</th>
                    <th style={s.th}>Detail</th>
                    <th style={s.th}>Impact</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Reported At</th>
                    <th style={s.th}>Update Status</th>
                    <th style={s.th}>Upload</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => (
                    <React.Fragment key={inc.id}>
                    <tr>
                      <td style={s.td}>{inc.id}</td>
                      <td style={s.td}>
                        <span style={{
                          ...s.badge,
                          backgroundColor: inc.incident_type === 'INCIDENT' ? '#fee2e2' : inc.incident_type === 'MAINTENANCE' ? '#e0f2fe' : '#f3f4f6',
                          color: inc.incident_type === 'INCIDENT' ? '#dc2626' : inc.incident_type === 'MAINTENANCE' ? '#0369a1' : '#6b7280',
                        }}>
                          {inc.incident_type}
                        </span>
                      </td>
                      <td style={{ ...s.td, maxWidth: '220px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={inc.detail}>
                          {inc.detail}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                          <button
                            style={{ ...s.btn, backgroundColor: '#f59e0b', color: '#fff', fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => handleOpenEdit(inc)}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            style={{ ...s.btn, backgroundColor: '#6366f1', color: '#fff', fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => setExpandedPhotos((prev) => {
                              const s = new Set(prev)
                              s.has(inc.id) ? s.delete(inc.id) : s.add(inc.id)
                              return s
                            })}
                          >
                            🖼 {(incidentAttachments[inc.id] || []).length} รูป
                          </button>
                        </div>
                      </td>
                      <td style={s.td}><ImpactBadge impact={inc.impact} /></td>
                      <td style={s.td}><IncidentStatusBadge status={inc.status} /></td>
                      <td style={s.td} title={formatDT(inc.reported_at)}>
                        {new Date(inc.reported_at).toLocaleString()}
                      </td>
                      <td style={s.td}>
                        <select
                          style={{ ...s.select, width: 'auto', padding: '5px 8px', fontSize: '13px' }}
                          value={incidentStatusEdits[inc.id] || inc.status}
                          onChange={(e) => setIncidentStatusEdits((prev) => ({ ...prev, [inc.id]: e.target.value }))}
                        >
                          <option value="OPEN">Open</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                        <button
                          style={{ ...s.btn, ...s.btnPrimary, fontSize: '12px', padding: '5px 10px', marginLeft: '6px' }}
                          onClick={() => handleUpdateIncidentStatus(inc.id, incidentStatusEdits[inc.id] || inc.status)}
                        >
                          Update
                        </button>
                      </td>
                      <td style={s.td}>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          style={{ ...s.fileInput, display: 'block', marginBottom: '4px' }}
                          onChange={(e) => {
                            const files = Array.from(e.target.files).slice(0, 8)
                            setIncidentUploadFiles((prev) => ({ ...prev, [inc.id]: files }))
                          }}
                        />
                        {incidentUploadFiles[inc.id]?.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>
                            {incidentUploadFiles[inc.id].length} ไฟล์ที่เลือก
                          </div>
                        )}
                        <button
                          style={{ ...s.btn, ...s.btnGray, fontSize: '12px', padding: '4px 10px' }}
                          onClick={() => handleIncidentUpload(inc.id)}
                          disabled={!incidentUploadFiles[inc.id]?.length || incidentUploading[inc.id]}
                        >
                          {incidentUploading[inc.id] ? 'Uploading...' : 'Upload'}
                        </button>
                      </td>
                    </tr>
                    {expandedPhotos.has(inc.id) && (
                      <tr key={`photos-${inc.id}`}>
                        <td colSpan={8} style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          {(incidentAttachments[inc.id] || []).length === 0 ? (
                            <div style={{ color: '#9ca3af', fontSize: '13px', fontStyle: 'italic' }}>ยังไม่มีรูปภาพ</div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {(incidentAttachments[inc.id] || []).map((att) => {
                                const imgUrl = `${import.meta.env.VITE_API_URL || '/api'}/${att.file_path}`
                                return (
                                  <img
                                    key={att.id}
                                    src={imgUrl}
                                    alt={att.file_name}
                                    title={att.file_name}
                                    style={{
                                      width: '90px', height: '90px', objectFit: 'cover',
                                      borderRadius: '8px', cursor: 'pointer',
                                      border: '2px solid #e5e7eb',
                                    }}
                                    onClick={() => setLightboxUrl(imgUrl)}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ====================================================
            Section 4: Activity Timeline
        ==================================================== */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            <span>Activity Timeline ({timeline.length} events)</span>
          </div>
          {timeline.length === 0 ? (
            <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
              No activity recorded yet.
            </p>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: '7px', top: '8px', bottom: '8px',
                width: '2px', backgroundColor: '#e5e7eb',
              }} />
              {timeline.map((event, i) => {
                const dotColor = {
                  success: '#16a34a',
                  danger: '#dc2626',
                  warning: '#ca8a04',
                  info: '#1a73e8',
                }[event.severity] || '#6b7280'

                return (
                  <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: '16px', position: 'relative' }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: '-21px', top: '4px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      backgroundColor: dotColor, border: '2px solid #fff',
                      boxShadow: `0 0 0 2px ${dotColor}40`, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: dotColor }}>
                          {event.label}
                        </span>
                      </div>
                      {event.detail && (
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px', paddingLeft: '2px' }}>
                          {event.detail}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ====================================================
            Section 5: Duty Attachments Upload
        ==================================================== */}
        <div style={s.card}>
          <div style={s.cardTitle}>
            <span>Upload Duty Attachment</span>
          </div>
          <div style={s.uploadRow}>
            <input
              type="file"
              style={s.fileInput}
              onChange={(e) => setDutyUploadFile(e.target.files[0])}
            />
            <button
              style={{ ...s.btn, ...s.btnPrimary }}
              onClick={handleDutyUpload}
              disabled={!dutyUploadFile || dutyUploading}
            >
              {dutyUploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '8px 0 0' }}>
            Attach photos or documents related to this duty. Max file size: 10 MB.
          </p>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, cursor: 'zoom-out',
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            style={{
              position: 'absolute', top: '16px', right: '20px',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: '28px', cursor: 'pointer', borderRadius: '50%',
              width: '40px', height: '40px', lineHeight: '40px', textAlign: 'center',
            }}
            onClick={() => setLightboxUrl(null)}
          >×</button>
        </div>
      )}

      {/* ── Edit Incident Modal ── */}
      {editingIncident && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingIncident(null) }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '14px', padding: '28px',
            width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#1a1a2e' }}>
              แก้ไข Incident #{editingIncident.id}
            </h3>

            <div style={s.formGroup}>
              <label style={s.label}>Incident Type</label>
              <select
                style={s.select}
                value={editForm.incident_type}
                onChange={(e) => setEditForm((p) => ({ ...p, incident_type: e.target.value }))}
              >
                <option value="ROUTINE">Routine</option>
                <option value="INCIDENT">Incident</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Impact Level</label>
              <select
                style={s.select}
                value={editForm.impact}
                onChange={(e) => setEditForm((p) => ({ ...p, impact: e.target.value }))}
              >
                <option value="NONE">None</option>
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Detail <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                style={s.textarea}
                value={editForm.detail}
                onChange={(e) => setEditForm((p) => ({ ...p, detail: e.target.value }))}
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                style={{ ...s.btn, ...s.btnOutline }}
                onClick={() => setEditingIncident(null)}
                disabled={editSaving}
              >
                ยกเลิก
              </button>
              <button
                style={{ ...s.btn, ...s.btnSuccess }}
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
