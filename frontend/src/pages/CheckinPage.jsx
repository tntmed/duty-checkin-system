import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoles, getShifts, getDutiesToday, checkin } from '../services/api'

const styles = {
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
  navTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '18px',
    margin: 0,
  },
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    color: '#ffffff',
    fontSize: '14px',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#ffffff',
    padding: '6px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  content: {
    maxWidth: '900px',
    margin: '32px auto',
    padding: '0 16px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 0,
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    color: '#6b7280',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '12px',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
  },
  viewBtn: {
    backgroundColor: '#1a73e8',
    color: '#ffffff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  emptyRow: {
    textAlign: 'center',
    padding: '24px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: '1',
    minWidth: '180px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#111827',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  checkinBtn: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    padding: '10px 28px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s',
  },
  checkinBtnDisabled: {
    backgroundColor: '#86efac',
    cursor: 'not-allowed',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
}

function formatDateTime(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString()
}

function StatusBadge({ status }) {
  const colorMap = {
    PRESENT: { bg: '#dcfce7', color: '#16a34a' },
    LATE: { bg: '#fef9c3', color: '#ca8a04' },
    ABSENT: { bg: '#fee2e2', color: '#dc2626' },
    EXCUSED: { bg: '#e0f2fe', color: '#0369a1' },
  }
  const c = colorMap[status] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{ ...styles.badge, backgroundColor: c.bg, color: c.color }}>
      {status}
    </span>
  )
}

export default function CheckinPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [roles, setRoles] = useState([])
  const [shifts, setShifts] = useState([])
  const [activeDuties, setActiveDuties] = useState([])
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [rolesRes, shiftsRes, dutiesRes] = await Promise.all([
        getRoles(),
        getShifts(),
        getDutiesToday(),
      ])
      const rolesData = rolesRes.data || []
      const shiftsData = shiftsRes.data || []
      const dutiesData = dutiesRes.data || []

      setRoles(rolesData)
      setShifts(shiftsData)
      setActiveDuties(dutiesData)

      if (rolesData.length > 0) setSelectedRole(String(rolesData[0].id))
      if (shiftsData.length > 0) setSelectedShift(String(shiftsData[0].id))
    } catch (err) {
      setError('Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (e) => {
    e.preventDefault()
    if (!selectedRole || !selectedShift) {
      setError('Please select both a role and shift.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await checkin({
        role_id: parseInt(selectedRole),
        shift_id: parseInt(selectedShift),
      })
      navigate(`/duty/${res.data.id}`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Check-in failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <nav style={styles.navbar}>
          <h1 style={styles.navTitle}>ระบบลงเวร ศูนย์สารสนเทศ</h1>
        </nav>
        <div style={styles.loadingText}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <h1 style={styles.navTitle}>ระบบลงเวร ศูนย์สารสนเทศ</h1>
        <div style={styles.navUser}>
          <span>{user?.full_name || user?.employee_code}</span>
          <button
            style={{ ...styles.logoutBtn, backgroundColor: 'rgba(255,255,255,0.2)' }}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        {/* Today's Duties Table */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Today's Duties</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Shift</th>
                <th style={styles.th}>Check-in Time</th>
                <th style={styles.th}>Check-out Time</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeDuties.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyRow}>
                    No duties recorded today.
                  </td>
                </tr>
              ) : (
                activeDuties.map((duty) => (
                  <tr key={duty.id}>
                    <td style={styles.td}>
                      {new Date(duty.duty_date).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>{duty.role?.name || '-'}</td>
                    <td style={styles.td}>
                      {duty.shift
                        ? `${duty.shift.name} (${duty.shift.start_time}-${duty.shift.end_time})`
                        : '-'}
                    </td>
                    <td style={styles.td}>{formatDateTime(duty.checkin_time)}</td>
                    <td style={styles.td}>{formatDateTime(duty.checkout_time)}</td>
                    <td style={styles.td}>
                      <StatusBadge status={duty.attendance_status} />
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.viewBtn}
                        onClick={() => navigate(`/duty/${duty.id}`)}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1557b0')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1a73e8')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Check-in Form */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>New Check-in</h2>
          <form onSubmit={handleCheckin}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  style={styles.select}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                >
                  {roles.length === 0 && (
                    <option value="">No roles assigned</option>
                  )}
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Shift</label>
                <select
                  style={styles.select}
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  required
                >
                  {shifts.length === 0 && (
                    <option value="">No shifts available</option>
                  )}
                  {shifts.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || roles.length === 0 || shifts.length === 0}
                style={{
                  ...styles.checkinBtn,
                  ...(submitting || roles.length === 0 || shifts.length === 0
                    ? styles.checkinBtnDisabled
                    : {}),
                }}
                onMouseOver={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = '#15803d'
                }}
                onMouseOut={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = '#16a34a'
                }}
              >
                {submitting ? 'Checking in...' : 'Check In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
