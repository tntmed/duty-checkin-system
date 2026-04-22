import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useIsMobile } from '../hooks/useIsMobile'
import API, { confirmAttendance, deleteDuty } from '../services/api'

// ============================================================
// Constants
// ============================================================
const AUTO_REFRESH_MS = 30_000

const ATTENDANCE_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'PRESENT', label: 'มาปกติ' },
  { value: 'LATE', label: 'มาสาย' },
  { value: 'ABSENT', label: 'ขาด' },
  { value: 'EXCUSED', label: 'ลา' },
]

// ============================================================
// Styles
// ============================================================
const s = {
  page: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  navbar: (isMobile) => ({
    backgroundColor: '#1a73e8', padding: isMobile ? '0 14px' : '0 24px', height: '56px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100,
  }),
  navLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  navTitle: { color: '#fff', fontWeight: '700', fontSize: '18px', margin: 0, cursor: 'pointer' },
  navTag: {
    backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff',
    padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '14px' },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)',
    color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
  },

  content: (isMobile) => ({ maxWidth: '1280px', margin: isMobile ? '14px auto' : '24px auto', padding: isMobile ? '0 12px' : '0 20px' }),

  topBar: (isMobile) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '10px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }),
  pageTitle: { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  dateMeta: { fontSize: '13px', color: '#6b7280' },
  topBarRight: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },

  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#fff', border: '1.5px solid #d1d5db', color: '#374151',
    padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
  },
  autoTag: {
    backgroundColor: '#dcfce7', color: '#16a34a',
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
  },

  // KPI
  kpiGrid: (isMobile) => ({ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }),
  kpiCard: (active, borderColor, isMobile) => ({
    backgroundColor: '#fff', borderRadius: '10px', padding: isMobile ? '14px 16px' : '18px 22px',
    boxShadow: active ? `0 0 0 3px ${borderColor}60, 0 4px 16px rgba(0,0,0,0.1)` : '0 2px 10px rgba(0,0,0,0.07)',
    borderLeft: `4px solid ${borderColor}`,
    cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.1s',
    transform: active ? 'translateY(-2px)' : 'none',
    userSelect: 'none',
  }),
  kpiTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  kpiLabel: (isMobile) => ({ fontSize: isMobile ? '12px' : '13px', color: '#6b7280', fontWeight: '500' }),
  kpiIcon: { fontSize: '20px', opacity: 0.18 },
  kpiValue: (color, isMobile) => ({ fontSize: isMobile ? '30px' : '38px', fontWeight: '800', color, lineHeight: 1 }),
  kpiHint: { fontSize: '11px', color: '#9ca3af', marginTop: '4px' },

  // Filter bar
  filterBar: (isMobile) => ({
    backgroundColor: '#fff', borderRadius: '10px', padding: isMobile ? '12px 14px' : '14px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px',
    display: 'flex', gap: '10px', alignItems: isMobile ? 'stretch' : 'center',
    flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row',
  }),
  filterLabel: { fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' },
  filterSelect: (isMobile) => ({
    padding: '8px 12px', fontSize: '14px', border: '1.5px solid #d1d5db',
    borderRadius: '7px', outline: 'none', backgroundColor: '#fff', color: '#111827',
    cursor: 'pointer', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : '140px',
  }),
  filterInput: (isMobile) => ({
    padding: '8px 12px', fontSize: '14px', border: '1.5px solid #d1d5db',
    borderRadius: '7px', outline: 'none', backgroundColor: '#fff', color: '#111827',
    width: isMobile ? '100%' : '140px', boxSizing: 'border-box',
  }),
  resetBtn: {
    padding: '7px 16px', fontSize: '13px', fontWeight: '600',
    backgroundColor: '#f3f4f6', border: '1.5px solid #d1d5db', color: '#374151',
    borderRadius: '7px', cursor: 'pointer',
  },
  activeFilterTag: {
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd',
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
  },

  // Table card
  card: {
    backgroundColor: '#fff', borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: '20px', overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 22px', borderBottom: '1px solid #f3f4f6',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '10px' },
  countPill: (bg, color) => ({
    backgroundColor: bg, color,
    padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
  }),

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left', padding: '10px 16px', backgroundColor: '#f8fafc',
    color: '#6b7280', fontWeight: '600', fontSize: '11px',
    textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  },
  td: { padding: '12px 16px', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
  emptyRow: { textAlign: 'center', padding: '36px', color: '#9ca3af', fontStyle: 'italic', fontSize: '14px' },

  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' },
  countCircle: (bg, color) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '26px', height: '26px', borderRadius: '50%',
    fontSize: '12px', fontWeight: '700', backgroundColor: bg, color,
  }),
  actionBtn: {
    backgroundColor: '#1a73e8', color: '#fff', border: 'none',
    padding: '5px 14px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '12px', fontWeight: '600',
  },

  alertBanner: (bg, border, color) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: bg, border: `1px solid ${border}`, color,
    padding: '11px 16px', borderRadius: '10px', marginBottom: '14px',
    fontSize: '14px', fontWeight: '600',
  }),

  loading: { textAlign: 'center', padding: '80px', color: '#6b7280', fontSize: '16px' },
  errorBox: {
    backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
    padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
  },
}

// ============================================================
// Helper components
// ============================================================
function AttendanceBadge({ status }) {
  const map = {
    PRESENT: ['#dcfce7', '#16a34a'],
    LATE:    ['#fef9c3', '#ca8a04'],
    ABSENT:  ['#fee2e2', '#dc2626'],
    EXCUSED: ['#e0f2fe', '#0369a1'],
  }
  const [bg, color] = map[status] || ['#f3f4f6', '#6b7280']
  return <span style={{ ...s.badge, backgroundColor: bg, color }}>{status}</span>
}

function ConfirmedBadge({ confirmed }) {
  return confirmed
    ? <span style={{ fontSize: '11px', backgroundColor: '#dcfce7', color: '#16a34a', padding: '2px 7px', borderRadius: '999px', fontWeight: '600', border: '1px solid #bbf7d0' }}>✓ confirmed</span>
    : <span style={{ fontSize: '11px', backgroundColor: '#fef9c3', color: '#ca8a04', padding: '2px 7px', borderRadius: '999px', fontWeight: '600', border: '1px dashed #fde68a' }}>รอ confirm</span>
}

function CheckoutBadge({ checkoutTime }) {
  return checkoutTime
    ? <span style={{ ...s.badge, backgroundColor: '#dcfce7', color: '#16a34a' }}>Done</span>
    : <span style={{ ...s.badge, backgroundColor: '#fef9c3', color: '#ca8a04' }}>Pending</span>
}

function CountCircle({ value, warnBg, warnColor }) {
  if (value === 0) return <span style={s.countCircle('#f3f4f6', '#9ca3af')}>0</span>
  return <span style={s.countCircle(warnBg, warnColor)}>{value}</span>
}

function KpiCard({ label, value, icon, hint, borderColor, valueColor, active, onClick, isMobile }) {
  return (
    <div style={s.kpiCard(active, borderColor, isMobile)} onClick={onClick}>
      <div style={s.kpiTop}>
        <span style={s.kpiLabel(isMobile)}>{label}</span>
        <span style={s.kpiIcon}>{icon}</span>
      </div>
      <div style={s.kpiValue(valueColor || '#111827', isMobile)}>{value}</div>
      <div style={s.kpiHint}>{active ? '✕ ล้าง filter' : hint}</div>
    </div>
  )
}

function formatTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ============================================================
// Row background based on severity
// ============================================================
function rowBg(duty, hovered) {
  if (hovered) return '#f0f7ff'
  if (duty.incident_count > 0) return '#fff5f5'
  if (duty.issue_count > 0) return '#fffbf0'
  return 'transparent'
}

// ============================================================
// Main component
// ============================================================
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isMobile = useIsMobile()

  const [summary, setSummary] = useState(null)
  const [duties, setDuties] = useState([])
  const [roles, setRoles] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportRange, setExportRange] = useState({ date_from: '', date_to: '' })
  const [confirmModal, setConfirmModal] = useState({ open: false, duty: null })
  const [confirmStatus, setConfirmStatus] = useState('PRESENT')
  const [confirmSaving, setConfirmSaving] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [deleteModal, setDeleteModal] = useState({ open: false, duty: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Active KPI filter: null | 'incidents' | 'issues' | 'pending'
  const [kpiFilter, setKpiFilter] = useState(null)

  // Filter bar state
  const today = new Date().toISOString().split('T')[0]
  const [filters, setFilters] = useState({
    duty_date: today,
    role_id: '',
    shift_id: '',
    attendance_status: '',
  })

  const timerRef = useRef(null)

  const loadAll = useCallback(async () => {
    setError('')
    try {
      const params = {}
      if (filters.duty_date) params.duty_date = filters.duty_date
      if (filters.role_id) params.role_id = filters.role_id
      if (filters.shift_id) params.shift_id = filters.shift_id
      if (filters.attendance_status) params.attendance_status = filters.attendance_status
      if (kpiFilter === 'incidents') params.has_incidents = true
      if (kpiFilter === 'issues') params.has_issues = true
      if (kpiFilter === 'pending') params.pending_checkout = true

      const [sumRes, dutiesRes] = await Promise.all([
        API.get('/dashboard/summary', { params: { duty_date: filters.duty_date || undefined } }),
        API.get('/dashboard/duties', { params }),
      ])
      setSummary(sumRes.data)
      setDuties(dutiesRes.data)
      setLastRefreshed(new Date())
    } catch {
      setError('Failed to load dashboard. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [filters, kpiFilter])

  // Load roles & shifts once for filter dropdowns
  useEffect(() => {
    Promise.all([API.get('/roles/'), API.get('/roles/shifts')])
      .then(([r, s]) => { setRoles(r.data); setShifts(s.data) })
      .catch(() => {})
  }, [])

  // Reload on filter / kpiFilter change
  useEffect(() => {
    setLoading(true)
    loadAll()
  }, [loadAll])

  // Auto-refresh every 30s
  useEffect(() => {
    timerRef.current = setInterval(() => loadAll(), AUTO_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [loadAll])

  const handleKpiClick = (key) => setKpiFilter((prev) => (prev === key ? null : key))

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setKpiFilter(null) // clear KPI filter when manual filter applied
  }

  const handleReset = () => {
    setFilters({ duty_date: today, role_id: '', shift_id: '', attendance_status: '' })
    setKpiFilter(null)
  }

  const hasActiveFilter =
    filters.duty_date !== today ||
    filters.role_id !== '' ||
    filters.shift_id !== '' ||
    filters.attendance_status !== '' ||
    kpiFilter !== null

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  // Current user can confirm if admin OR assigned role สิบเวร OR has สิบเวร duty today
  const canConfirm = Number(user?.is_admin) === 1 ||
    user?.roles?.some(r => r.name === 'สิบเวร') ||
    duties.some(d => d.user_id === user?.id && d.role_name === 'สิบเวร')

  // สิบเวร cannot confirm their own duty
  const canConfirmDuty = (duty) => canConfirm && duty.user_id !== user?.id

  const openConfirmModal = (duty, e) => {
    e.stopPropagation()
    setConfirmStatus(duty.attendance_status || 'PRESENT')
    setConfirmError('')
    setConfirmModal({ open: true, duty })
  }

  const handleConfirm = async () => {
    if (!confirmModal.duty) return
    setConfirmSaving(true)
    setConfirmError('')
    try {
      await confirmAttendance(confirmModal.duty.duty_id, { attendance_status: confirmStatus })
      setConfirmModal({ open: false, duty: null })
      loadAll()
    } catch (err) {
      setConfirmError(err.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setConfirmSaving(false)
    }
  }

  const handleDeleteDuty = async () => {
    if (!deleteModal.duty) return
    setDeleteLoading(true)
    try {
      await deleteDuty(deleteModal.duty.duty_id)
      setDeleteModal({ open: false, duty: null })
      loadAll()
    } catch (err) {
      alert(err.response?.data?.detail || 'ลบไม่สำเร็จ')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openExportModal = () => {
    setExportRange({
      date_from: filters.duty_date || today,
      date_to: filters.duty_date || today,
    })
    setShowExportModal(true)
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (exportRange.date_from) params.set('date_from', exportRange.date_from)
    if (exportRange.date_to) params.set('date_to', exportRange.date_to)
    if (filters.role_id) params.set('role_id', filters.role_id)
    if (filters.shift_id) params.set('shift_id', filters.shift_id)
    if (filters.attendance_status) params.set('attendance_status', filters.attendance_status)
    if (kpiFilter === 'incidents') params.set('has_incidents', 'true')
    if (kpiFilter === 'issues') params.set('has_issues', 'true')
    if (kpiFilter === 'pending') params.set('pending_checkout', 'true')
    const token = localStorage.getItem('token')
    const url = `http://localhost:8001/dashboard/export?${params.toString()}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        const suffix = exportRange.date_from === exportRange.date_to
          ? exportRange.date_from
          : `${exportRange.date_from}_to_${exportRange.date_to}`
        a.download = `duties_${suffix}.xlsx`
        a.click()
        URL.revokeObjectURL(a.href)
      })
    setShowExportModal(false)
  }

  if (loading && !summary) return (
    <div style={s.page}>
      <nav style={s.navbar(isMobile)}>
        <div style={s.navLeft}>
          <h1 style={s.navTitle}>ระบบลงเวร ศูนย์สารสนเทศ</h1>
          <span style={s.navTag}>Dashboard</span>
        </div>
      </nav>
      <div style={s.loading}>Loading dashboard...</div>
    </div>
  )

  return (
    <div style={s.page}>
      {/* ── Navbar ── */}
      <nav style={s.navbar(isMobile)}>
        <div style={s.navLeft}>
          <h1 style={{ ...s.navTitle, fontSize: isMobile ? '15px' : '18px' }} onClick={() => navigate('/checkin')}>
            {isMobile ? 'ระบบลงเวร' : 'ระบบลงเวร ศูนย์สารสนเทศ'}
          </h1>
          <span style={s.navTag}>Dashboard</span>
        </div>
        <div style={s.navRight}>
          {!isMobile && <span style={{ fontSize: '13px', opacity: 0.8 }}>{user?.full_name}</span>}
          <button style={s.navBtn} onClick={() => navigate('/checkin')}>{isMobile ? '← เวร' : '← Check-in'}</button>
          <button style={{ ...s.navBtn, borderColor: 'rgba(220,38,38,0.5)' }} onClick={handleLogout}>ออก</button>
        </div>
      </nav>

      <div style={s.content(isMobile)}>

        {/* ── Top bar ── */}
        <div style={s.topBar(isMobile)}>
          <div>
            <h2 style={s.pageTitle}>Operations Dashboard</h2>
            <div style={s.dateMeta}>
              {new Date(filters.duty_date || today).toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
              {lastRefreshed && (
                <span style={{ marginLeft: '10px', color: '#9ca3af' }}>
                  · Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!isMobile && <span style={s.autoTag}>⟳ Auto 30s</span>}
            <button style={s.refreshBtn} onClick={loadAll} disabled={loading}>
              {loading ? '...' : '↻'}
            </button>
            <button
              style={{ ...s.refreshBtn, backgroundColor: '#16a34a', color: '#fff', border: '1.5px solid #15803d' }}
              onClick={openExportModal}
              title="Export as Excel"
            >
              ↓ Excel
            </button>
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ── KPI Cards (clickable) ── */}
        {summary && (
          <div style={s.kpiGrid(isMobile)}>
            <KpiCard isMobile={isMobile}
              label="เวรทั้งหมด"
              value={summary.total_duties}
              icon="📋"
              hint="แตะเพื่อดูทั้งหมด"
              borderColor="#1a73e8"
              valueColor="#1a73e8"
              active={false}
              onClick={() => { setKpiFilter(null); setFilters(f => ({ ...f })) }}
            />
            <KpiCard isMobile={isMobile}
              label="Incident เปิด"
              value={summary.open_incidents}
              icon="🚨"
              hint="แตะเพื่อกรอง"
              borderColor={summary.open_incidents > 0 ? '#dc2626' : '#16a34a'}
              valueColor={summary.open_incidents > 0 ? '#dc2626' : '#16a34a'}
              active={kpiFilter === 'incidents'}
              onClick={() => handleKpiClick('incidents')}
            />
            <KpiCard isMobile={isMobile}
              label="Checklist Issues"
              value={summary.checklist_issues}
              icon="⚠️"
              hint="แตะเพื่อกรอง"
              borderColor={summary.checklist_issues > 0 ? '#ea580c' : '#16a34a'}
              valueColor={summary.checklist_issues > 0 ? '#ea580c' : '#16a34a'}
              active={kpiFilter === 'issues'}
              onClick={() => handleKpiClick('issues')}
            />
            <KpiCard isMobile={isMobile}
              label="รอ Check-out"
              value={summary.pending_checkout}
              icon="⏳"
              hint="แตะเพื่อกรอง"
              borderColor={summary.pending_checkout > 0 ? '#ca8a04' : '#16a34a'}
              valueColor={summary.pending_checkout > 0 ? '#ca8a04' : '#6b7280'}
              active={kpiFilter === 'pending'}
              onClick={() => handleKpiClick('pending')}
            />
          </div>
        )}

        {/* ── Alert banners ── */}
        {summary?.open_incidents > 0 && (
          <div style={s.alertBanner('#fee2e2', '#fca5a5', '#dc2626')}>
            🚨 {summary.open_incidents} open incident{summary.open_incidents > 1 ? 's' : ''} require follow-up
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                style={{ ...s.badge, backgroundColor: 'transparent', color: '#dc2626', cursor: 'pointer', border: '1.5px solid #dc2626', padding: '3px 12px' }}
                onClick={() => handleKpiClick('incidents')}
              >
                Filter
              </button>
            </div>
          </div>
        )}
        {summary?.checklist_issues > 0 && (
          <div style={s.alertBanner('#ffedd5', '#fdba74', '#c2410c')}>
            ⚠️ {summary.checklist_issues} checklist item{summary.checklist_issues > 1 ? 's' : ''} marked NOT OK
            <button
              style={{ marginLeft: 'auto', ...s.badge, backgroundColor: '#ea580c', color: '#fff', cursor: 'pointer', border: 'none' }}
              onClick={() => handleKpiClick('issues')}
            >
              Filter
            </button>
          </div>
        )}

        {/* ── Filter bar ── */}
        <div style={s.filterBar(isMobile)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={s.filterLabel}>Filter:</span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              {duties.length} รายการ
            </span>
          </div>

          <input
            type="date"
            style={s.filterInput(isMobile)}
            value={filters.duty_date}
            onChange={(e) => handleFilterChange('duty_date', e.target.value)}
          />

          <select
            style={s.filterSelect(isMobile)}
            value={filters.role_id}
            onChange={(e) => handleFilterChange('role_id', e.target.value)}
          >
            <option value="">ทุกตำแหน่ง</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select
            style={s.filterSelect(isMobile)}
            value={filters.shift_id}
            onChange={(e) => handleFilterChange('shift_id', e.target.value)}
          >
            <option value="">ทุกเวร</option>
            {shifts.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
          </select>

          <select
            style={s.filterSelect(isMobile)}
            value={filters.attendance_status}
            onChange={(e) => handleFilterChange('attendance_status', e.target.value)}
          >
            {ATTENDANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {kpiFilter && (
            <div style={s.activeFilterTag}>
              {kpiFilter === 'incidents' && '🚨 Open Incidents'}
              {kpiFilter === 'issues' && '⚠️ Checklist Issues'}
              {kpiFilter === 'pending' && '⏳ Pending Checkout'}
              <span style={{ cursor: 'pointer', marginLeft: '2px' }} onClick={() => setKpiFilter(null)}>✕</span>
            </div>
          )}

          {hasActiveFilter && (
            <button style={{ ...s.resetBtn, width: isMobile ? '100%' : undefined }} onClick={handleReset}>✕ รีเซ็ต</button>
          )}
        </div>

        {/* ── Duties Table ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>
              {kpiFilter === 'incidents' && '🚨 Duties with Open Incidents'}
              {kpiFilter === 'issues' && '⚠️ Duties with Checklist Issues'}
              {kpiFilter === 'pending' && '⏳ Duties Pending Checkout'}
              {!kpiFilter && "Today's Duties"}
            </h3>
            <div style={s.cardMeta}>
              {duties.some(d => d.incident_count > 0) && (
                <span style={s.countPill('#fee2e2', '#dc2626')}>🔴 incident</span>
              )}
              {duties.some(d => d.issue_count > 0) && (
                <span style={s.countPill('#ffedd5', '#c2410c')}>🟠 issue</span>
              )}
              <span style={s.countPill('#f3f4f6', '#6b7280')}>{duties.length} rows</span>
            </div>
          </div>

          {duties.length === 0 ? (
            <div style={s.emptyRow}>
              {hasActiveFilter ? 'ไม่พบข้อมูลตามที่กรอง' : 'ยังไม่มีการลงเวรในวันนี้'}
            </div>
          ) : isMobile ? (
            /* ── Mobile card list ── */
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {duties.map((duty) => (
                <div
                  key={duty.duty_id}
                  style={{
                    backgroundColor: duty.incident_count > 0 ? '#fff5f5' : duty.issue_count > 0 ? '#fffbf0' : '#fff',
                    border: '1.5px solid',
                    borderColor: duty.incident_count > 0 ? '#fecaca' : duty.issue_count > 0 ? '#fed7aa' : '#e5e7eb',
                    borderRadius: '10px', padding: '14px', cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/duty/${duty.duty_id}`)}
                >
                  {/* Top row: name + badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{duty.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{duty.employee_code} · #{duty.duty_id}</div>
                    </div>
                    <AttendanceBadge status={duty.attendance_status} />
                  </div>
                  {/* Role + Shift */}
                  <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600' }}>{duty.role_name}</span>
                    <span style={{ color: '#9ca3af', margin: '0 6px' }}>·</span>
                    <span>{duty.shift_name}</span>
                  </div>
                  {/* Times + status row */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#374151' }}>เข้า: <strong>{formatTime(duty.checkin_time)}</strong></span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>ออก: <strong>{formatTime(duty.checkout_time)}</strong></span>
                    <CheckoutBadge checkoutTime={duty.checkout_time} />
                    <ConfirmedBadge confirmed={duty.attendance_confirmed} />
                    {duty.incident_count > 0 && (
                      <span style={{ fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                        🚨 {duty.incident_count}
                      </span>
                    )}
                    {duty.issue_count > 0 && (
                      <span style={{ fontSize: '12px', backgroundColor: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                        ⚠️ {duty.issue_count}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {canConfirmDuty(duty) && (
                      <button
                        style={{ fontSize: '13px', padding: '6px 18px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600' }}
                        onClick={(e) => openConfirmModal(duty, e)}
                      >
                        {duty.attendance_confirmed ? '✏️ แก้ไขสถานะ' : '✓ Confirm สถานะ'}
                      </button>
                    )}
                    {Number(user?.is_admin) === 1 && (
                      <button
                        style={{ fontSize: '13px', padding: '6px 14px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600' }}
                        onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, duty }) }}
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Desktop table ── */
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>ชื่อ</th>
                    <th style={s.th}>ตำแหน่ง</th>
                    <th style={s.th}>เวร</th>
                    <th style={s.th}>เข้า</th>
                    <th style={s.th}>ออก</th>
                    <th style={s.th}>สถานะ</th>
                    <th style={s.th}>Confirmed</th>
                    <th style={s.th} title="NOT OK checklist items">Issues</th>
                    <th style={s.th}>Incidents</th>
                    <th style={s.th}>Checkout</th>
                    <th style={s.th}>ดู</th>
                    {Number(user?.is_admin) === 1 && <th style={s.th}>ลบ</th>}
                  </tr>
                </thead>
                <tbody>
                  {duties.map((duty) => (
                    <tr
                      key={duty.duty_id}
                      style={{ cursor: 'pointer', backgroundColor: rowBg(duty, hoveredRow === duty.duty_id), transition: 'background-color 0.1s' }}
                      onClick={() => navigate(`/duty/${duty.duty_id}`)}
                      onMouseEnter={() => setHoveredRow(duty.duty_id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ ...s.td, color: '#9ca3af', fontSize: '12px' }}>#{duty.duty_id}</td>
                      <td style={s.td}>
                        <div style={{ fontWeight: '600', color: '#111827' }}>{duty.full_name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{duty.employee_code}</div>
                      </td>
                      <td style={s.td}>{duty.role_name}</td>
                      <td style={s.td}>{duty.shift_name}</td>
                      <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums' }}>{formatTime(duty.checkin_time)}</td>
                      <td style={{ ...s.td, fontVariantNumeric: 'tabular-nums' }}>{formatTime(duty.checkout_time)}</td>
                      <td style={s.td}><AttendanceBadge status={duty.attendance_status} /></td>
                      <td style={s.td} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <ConfirmedBadge confirmed={duty.attendance_confirmed} />
                          {canConfirmDuty(duty) && (
                            <button
                              style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '600' }}
                              onClick={(e) => openConfirmModal(duty, e)}
                            >
                              {duty.attendance_confirmed ? '✏️' : '✓'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={s.td}>
                        <CountCircle value={duty.issue_count} warnBg="#ffedd5" warnColor="#c2410c" />
                      </td>
                      <td style={s.td}>
                        <CountCircle value={duty.incident_count} warnBg="#fee2e2" warnColor="#dc2626" />
                      </td>
                      <td style={s.td}><CheckoutBadge checkoutTime={duty.checkout_time} /></td>
                      <td style={s.td} onClick={(e) => e.stopPropagation()}>
                        <button
                          style={s.actionBtn}
                          onClick={() => navigate(`/duty/${duty.duty_id}`)}
                        >
                          View →
                        </button>
                      </td>
                      {Number(user?.is_admin) === 1 && (
                        <td style={s.td} onClick={(e) => e.stopPropagation()}>
                          <button
                            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            onClick={() => setDeleteModal({ open: true, duty })}
                          >
                            ลบ
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#6b7280', padding: '0 4px 20px' }}>
          <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fff5f5', border: '1px solid #fecaca', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }} />Has open incidents</span>
          <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fffbf0', border: '1px solid #fed7aa', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }} />Has checklist issues</span>
          <span>Click any row to open Duty Detail</span>
        </div>
      </div>

      {/* ── Confirm Attendance Modal ── */}
      {confirmModal.open && confirmModal.duty && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '16px',
        }} onClick={() => setConfirmModal({ open: false, duty: null })}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '14px', padding: '28px 24px', width: '100%', maxWidth: '380px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#1a1a2e' }}>
              Confirm สถานะการมาเวร
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              {confirmModal.duty.full_name} — {confirmModal.duty.role_name} · {confirmModal.duty.shift_name}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#9ca3af' }}>
              เข้า: {formatTime(confirmModal.duty.checkin_time)}
            </p>

            <div style={{ marginBottom: '20px', marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                สถานะการมาเวร
              </label>
              {[
                { value: 'PRESENT', label: 'มาปกติ', color: '#16a34a', bg: '#dcfce7' },
                { value: 'LATE',    label: 'มาสาย',  color: '#ca8a04', bg: '#fef9c3' },
                { value: 'EXCUSED', label: 'ลา',     color: '#0369a1', bg: '#e0f2fe' },
                { value: 'ABSENT',  label: 'ขาด',    color: '#dc2626', bg: '#fee2e2' },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer',
                  backgroundColor: confirmStatus === opt.value ? opt.bg : '#f9fafb',
                  border: `1.5px solid ${confirmStatus === opt.value ? opt.color : '#e5e7eb'}`,
                }}>
                  <input
                    type="radio" name="confirmStatus" value={opt.value}
                    checked={confirmStatus === opt.value}
                    onChange={() => setConfirmStatus(opt.value)}
                    style={{ accentColor: opt.color }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: opt.color }}>{opt.label}</span>
                </label>
              ))}
            </div>

            {confirmError && (
              <div style={{ fontSize: '13px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
                {confirmError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#f3f4f6', border: '1.5px solid #d1d5db', color: '#374151', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setConfirmModal({ open: false, duty: null })}
              >
                ยกเลิก
              </button>
              <button
                style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
                onClick={handleConfirm}
                disabled={confirmSaving}
              >
                {confirmSaving ? 'กำลังบันทึก...' : '✓ บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Duty Modal ── */}
      {deleteModal.open && deleteModal.duty && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '16px',
        }} onClick={() => setDeleteModal({ open: false, duty: null })}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '14px', padding: '28px 24px', width: '100%', maxWidth: '380px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '36px', textAlign: 'center', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '700', color: '#dc2626', textAlign: 'center' }}>
              ยืนยันการลบเวร
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#374151', textAlign: 'center' }}>
              <strong>{deleteModal.duty.full_name}</strong>
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
              {deleteModal.duty.role_name} · {deleteModal.duty.shift_name}<br />
              #{deleteModal.duty.duty_id} · วันที่ {deleteModal.duty.duty_date}
            </p>
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#dc2626' }}>
              การลบจะลบข้อมูล checklist และ incident ที่เกี่ยวข้องทั้งหมด และไม่สามารถกู้คืนได้
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#f3f4f6', border: '1.5px solid #d1d5db', color: '#374151', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setDeleteModal({ open: false, duty: null })}
                disabled={deleteLoading}
              >
                ยกเลิก
              </button>
              <button
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
                onClick={handleDeleteDuty}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {showExportModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowExportModal(false)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '14px', padding: '32px 28px', width: '360px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700', color: '#1a1a2e' }}>
              Export Excel
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#6b7280' }}>
              เลือกช่วงวันที่ที่ต้องการ export
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                style={{ ...s.filterInput, width: '100%', boxSizing: 'border-box' }}
                value={exportRange.date_from}
                onChange={(e) => setExportRange(r => ({ ...r, date_from: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                style={{ ...s.filterInput, width: '100%', boxSizing: 'border-box' }}
                value={exportRange.date_to}
                min={exportRange.date_from}
                onChange={(e) => setExportRange(r => ({ ...r, date_to: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...s.resetBtn, padding: '9px 20px' }}
                onClick={() => setShowExportModal(false)}
              >
                ยกเลิก
              </button>
              <button
                style={{
                  backgroundColor: '#16a34a', color: '#fff', border: 'none',
                  padding: '9px 24px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600',
                }}
                onClick={handleExport}
                disabled={!exportRange.date_from || !exportRange.date_to}
              >
                ↓ Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
