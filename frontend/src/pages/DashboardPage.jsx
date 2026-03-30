import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../services/api'

// ============================================================
// Constants
// ============================================================
const AUTO_REFRESH_MS = 30_000

const ATTENDANCE_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'EXCUSED', label: 'Excused' },
]

// ============================================================
// Styles
// ============================================================
const s = {
  page: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  navbar: {
    backgroundColor: '#1a73e8', padding: '0 24px', height: '60px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100,
  },
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

  content: { maxWidth: '1280px', margin: '24px auto', padding: '0 20px' },

  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' },
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
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' },
  kpiCard: (active, borderColor) => ({
    backgroundColor: '#fff', borderRadius: '12px', padding: '18px 22px',
    boxShadow: active ? `0 0 0 3px ${borderColor}60, 0 4px 16px rgba(0,0,0,0.1)` : '0 2px 10px rgba(0,0,0,0.07)',
    borderLeft: `4px solid ${borderColor}`,
    cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.1s',
    transform: active ? 'translateY(-2px)' : 'none',
    userSelect: 'none',
  }),
  kpiTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  kpiLabel: { fontSize: '13px', color: '#6b7280', fontWeight: '500' },
  kpiIcon: { fontSize: '22px', opacity: 0.18 },
  kpiValue: (color) => ({ fontSize: '38px', fontWeight: '800', color, lineHeight: 1 }),
  kpiHint: { fontSize: '11px', color: '#9ca3af', marginTop: '4px' },

  // Filter bar
  filterBar: {
    backgroundColor: '#fff', borderRadius: '10px', padding: '14px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '20px',
    display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
  },
  filterLabel: { fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' },
  filterSelect: {
    padding: '7px 12px', fontSize: '13px', border: '1.5px solid #d1d5db',
    borderRadius: '7px', outline: 'none', backgroundColor: '#fff', color: '#111827',
    cursor: 'pointer', minWidth: '140px',
  },
  filterInput: {
    padding: '7px 12px', fontSize: '13px', border: '1.5px solid #d1d5db',
    borderRadius: '7px', outline: 'none', backgroundColor: '#fff', color: '#111827',
    width: '140px',
  },
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

function CheckoutBadge({ checkoutTime }) {
  return checkoutTime
    ? <span style={{ ...s.badge, backgroundColor: '#dcfce7', color: '#16a34a' }}>Done</span>
    : <span style={{ ...s.badge, backgroundColor: '#fef9c3', color: '#ca8a04' }}>Pending</span>
}

function CountCircle({ value, warnBg, warnColor }) {
  if (value === 0) return <span style={s.countCircle('#f3f4f6', '#9ca3af')}>0</span>
  return <span style={s.countCircle(warnBg, warnColor)}>{value}</span>
}

function KpiCard({ label, value, icon, hint, borderColor, valueColor, active, onClick }) {
  return (
    <div style={s.kpiCard(active, borderColor)} onClick={onClick}>
      <div style={s.kpiTop}>
        <span style={s.kpiLabel}>{label}</span>
        <span style={s.kpiIcon}>{icon}</span>
      </div>
      <div style={s.kpiValue(valueColor || '#111827')}>{value}</div>
      <div style={s.kpiHint}>{active ? '✕ click to clear filter' : hint}</div>
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

  const [summary, setSummary] = useState(null)
  const [duties, setDuties] = useState([])
  const [roles, setRoles] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

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

  const handleExport = () => {
    const params = new URLSearchParams()
    if (filters.duty_date) params.set('duty_date', filters.duty_date)
    if (filters.role_id) params.set('role_id', filters.role_id)
    if (filters.shift_id) params.set('shift_id', filters.shift_id)
    if (filters.attendance_status) params.set('attendance_status', filters.attendance_status)
    if (kpiFilter === 'incidents') params.set('has_incidents', 'true')
    if (kpiFilter === 'issues') params.set('has_issues', 'true')
    if (kpiFilter === 'pending') params.set('pending_checkout', 'true')
    const token = localStorage.getItem('token')
    const url = `http://localhost:8000/dashboard/export?${params.toString()}`
    // Use fetch to include auth header, then trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `duties_${filters.duty_date || 'today'}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  if (loading && !summary) return (
    <div style={s.page}>
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <h1 style={s.navTitle}>Duty Check-in System</h1>
          <span style={s.navTag}>Dashboard</span>
        </div>
      </nav>
      <div style={s.loading}>Loading dashboard...</div>
    </div>
  )

  return (
    <div style={s.page}>
      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <h1 style={s.navTitle} onClick={() => navigate('/checkin')}>Duty Check-in System</h1>
          <span style={s.navTag}>Dashboard</span>
        </div>
        <div style={s.navRight}>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>{user?.full_name}</span>
          <button style={s.navBtn} onClick={() => navigate('/checkin')}>← Check-in</button>
          <button style={{ ...s.navBtn, borderColor: 'rgba(220,38,38,0.5)' }} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={s.content}>

        {/* ── Top bar ── */}
        <div style={s.topBar}>
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
          <div style={s.topBarRight}>
            <span style={s.autoTag}>⟳ Auto-refresh 30s</span>
            <button style={s.refreshBtn} onClick={loadAll} disabled={loading}>
              {loading ? '...' : '↻ Refresh'}
            </button>
            <button
              style={{ ...s.refreshBtn, backgroundColor: '#16a34a', color: '#fff', border: '1.5px solid #15803d' }}
              onClick={handleExport}
              title="Export current view as CSV"
            >
              ↓ Export CSV
            </button>
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {/* ── KPI Cards (clickable) ── */}
        {summary && (
          <div style={s.kpiGrid}>
            <KpiCard
              label="Total Duties"
              value={summary.total_duties}
              icon="📋"
              hint="Click to show all duties"
              borderColor="#1a73e8"
              valueColor="#1a73e8"
              active={false}
              onClick={() => { setKpiFilter(null); setFilters(f => ({ ...f })) }}
            />
            <KpiCard
              label="Open Incidents"
              value={summary.open_incidents}
              icon="🚨"
              hint="Click to filter duties with incidents"
              borderColor={summary.open_incidents > 0 ? '#dc2626' : '#16a34a'}
              valueColor={summary.open_incidents > 0 ? '#dc2626' : '#16a34a'}
              active={kpiFilter === 'incidents'}
              onClick={() => handleKpiClick('incidents')}
            />
            <KpiCard
              label="Checklist Issues"
              value={summary.checklist_issues}
              icon="⚠️"
              hint="Click to filter duties with NOT OK items"
              borderColor={summary.checklist_issues > 0 ? '#ea580c' : '#16a34a'}
              valueColor={summary.checklist_issues > 0 ? '#ea580c' : '#16a34a'}
              active={kpiFilter === 'issues'}
              onClick={() => handleKpiClick('issues')}
            />
            <KpiCard
              label="Pending Checkout"
              value={summary.pending_checkout}
              icon="⏳"
              hint="Click to filter duties not yet checked out"
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
        <div style={s.filterBar}>
          <span style={s.filterLabel}>Filter:</span>

          <input
            type="date"
            style={s.filterInput}
            value={filters.duty_date}
            onChange={(e) => handleFilterChange('duty_date', e.target.value)}
          />

          <select
            style={s.filterSelect}
            value={filters.role_id}
            onChange={(e) => handleFilterChange('role_id', e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select
            style={s.filterSelect}
            value={filters.shift_id}
            onChange={(e) => handleFilterChange('shift_id', e.target.value)}
          >
            <option value="">All Shifts</option>
            {shifts.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
          </select>

          <select
            style={s.filterSelect}
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
            <button style={s.resetBtn} onClick={handleReset}>✕ Reset</button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#9ca3af' }}>
            {duties.length} result{duties.length !== 1 ? 's' : ''}
          </span>
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
              {hasActiveFilter ? 'No duties match the current filters.' : 'No duties recorded for this date.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    <th style={s.th}>Employee</th>
                    <th style={s.th}>Role</th>
                    <th style={s.th}>Shift</th>
                    <th style={s.th}>Check-in</th>
                    <th style={s.th}>Check-out</th>
                    <th style={s.th}>Attendance</th>
                    <th style={s.th} title="NOT OK checklist items">Issues</th>
                    <th style={s.th}>Incidents</th>
                    <th style={s.th}>Checkout</th>
                    <th style={s.th}>Action</th>
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
    </div>
  )
}
