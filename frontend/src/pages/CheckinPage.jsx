import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoles, getShifts, getDutiesToday, checkin } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

const ROLE_SHIFT_MAP = {
  'สิบเวร':         ['เวรวันราชการ', 'วันหยุด'],
  'ผู้ช่วยสิบเวร':  ['เวรวันราชการ', 'วันหยุด'],
  'โปรแกรมเมอร์':  ['เวรวันราชการ', 'วันหยุด'],
  'ช่าง':           ['วันราชการ', 'วันราชการ กลางคืน', 'วันหยุด รอบเช้า', 'วันหยุด รอบค่ำ'],
  'เวรนอกเวลา':    ['เวรนอกเวลา วันราชการ', 'เวรนอกเวลา วันหยุด'],
}

const SHIFT_COLORS = {
  'เวรนอกเวลา วันราชการ': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  'เวรนอกเวลา วันหยุด':   { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  'วันราชการ':             { bg: '#ede9fe', border: '#7c3aed', text: '#4c1d95' },
  'เวรวันราชการ':          { bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e' },
  'วันหยุด':               { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  'วันราชการ กลางคืน':     { bg: '#e0e7ff', border: '#4338ca', text: '#312e81' },
  'วันหยุด รอบเช้า':        { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
  'วันหยุด รอบค่ำ':         { bg: '#fce7f3', border: '#db2777', text: '#831843' },
}

const STATUS_TH = {
  PRESENT: { label: 'มาปฏิบัติงาน', bg: '#dcfce7', color: '#16a34a' },
  LATE:    { label: 'มาสาย',        bg: '#fef9c3', color: '#ca8a04' },
  ABSENT:  { label: 'ขาดงาน',       bg: '#fee2e2', color: '#dc2626' },
  EXCUSED: { label: 'ลา',           bg: '#e0f2fe', color: '#0369a1' },
}

function formatDateTime(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('th-TH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
}

function StatusBadge({ status }) {
  const c = STATUS_TH[status] || { label: status, bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: '600', backgroundColor: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  )
}

export default function CheckinPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isMobile = useIsMobile()

  const [roles, setRoles] = useState([])
  const [shifts, setShifts] = useState([])
  const [activeDuties, setActiveDuties] = useState([])
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [rolesRes, shiftsRes, dutiesRes] = await Promise.all([
        getRoles(), getShifts(), getDutiesToday(),
      ])
      const rolesData = rolesRes.data || []
      const shiftsData = shiftsRes.data || []
      setRoles(rolesData)
      setShifts(shiftsData)
      setActiveDuties(dutiesRes.data || [])
      if (rolesData.length > 0) {
        setSelectedRole(String(rolesData[0].id))
        const allowed = ROLE_SHIFT_MAP[rolesData[0].name] || []
        const filtered = shiftsData.filter(s => allowed.includes(s.name))
        if (filtered.length > 0) setSelectedShift(String(filtered[0].id))
      }
    } catch {
      setError('Failed to load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (e) => {
    e.preventDefault()
    if (!selectedRole || !selectedShift) { setError('Please select both a role and shift.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await checkin({ role_id: parseInt(selectedRole), shift_id: parseInt(selectedShift) })
      navigate(`/duty/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Check-in failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  // ── Styles ─────────────────────────────────────────
  const s = {
    page: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
    navbar: {
      backgroundColor: '#1a73e8', padding: isMobile ? '0 16px' : '0 24px',
      height: isMobile ? '56px' : '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100,
    },
    navTitle: {
      color: '#fff', fontWeight: '700',
      fontSize: isMobile ? '15px' : '18px', margin: 0,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      maxWidth: isMobile ? '160px' : 'none',
    },
    navRight: { display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' },
    navName: { color: 'rgba(255,255,255,0.9)', fontSize: '13px', display: isMobile ? 'none' : 'block' },
    navBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
      color: '#fff', padding: isMobile ? '5px 10px' : '6px 14px',
      borderRadius: '6px', cursor: 'pointer', fontSize: isMobile ? '13px' : '14px', fontWeight: '500',
    },
    content: { maxWidth: '900px', margin: isMobile ? '16px auto' : '32px auto', padding: '0 12px' },
    card: {
      backgroundColor: '#fff', borderRadius: '12px',
      padding: isMobile ? '16px' : '28px', marginBottom: '16px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    },
    cardTitle: {
      fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#1a1a2e',
      marginTop: 0, marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #e5e7eb',
    },
    error: {
      backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 14px',
      borderRadius: '8px', fontSize: '14px', marginBottom: '16px', border: '1px solid #fecaca',
    },
  }

  if (loading) return (
    <div style={s.page}>
      <nav style={s.navbar}><h1 style={s.navTitle}>ระบบลงเวร ศูนย์สารสนเทศ</h1></nav>
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
    </div>
  )

  // ── Duty card for mobile ────────────────────────────
  const DutyCard = ({ duty }) => (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px',
      marginBottom: '10px', backgroundColor: '#fafafa',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>
            {duty.role?.name || '-'}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            {duty.shift ? `${duty.shift.name.replace(/^เวรนอกเวลา\s*/, '')} (${duty.shift.start_time}-${duty.shift.end_time})` : '-'}
          </div>
        </div>
        <StatusBadge status={duty.attendance_status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px', color: '#374151', marginBottom: '10px' }}>
        <div><span style={{ color: '#9ca3af' }}>เข้า: </span>{formatDateTime(duty.checkin_time)}</div>
        <div><span style={{ color: '#9ca3af' }}>ออก: </span>{formatDateTime(duty.checkout_time)}</div>
      </div>
      <button
        style={{
          width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
          backgroundColor: '#1a73e8', color: '#fff', fontSize: '14px',
          fontWeight: '600', cursor: 'pointer',
        }}
        onClick={() => navigate(`/duty/${duty.id}`)}
      >
        ดูรายละเอียด →
      </button>
    </div>
  )

  // ── Desktop table ───────────────────────────────────
  const DutyTable = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
      <thead>
        <tr>
          {['วันที่', 'ตำแหน่ง', 'เวร', 'เข้างาน', 'ออกงาน', 'สถานะ', ''].map(h => (
            <th key={h} style={{
              textAlign: 'left', padding: '10px 12px', backgroundColor: '#f8fafc',
              color: '#6b7280', fontWeight: '600', fontSize: '12px',
              textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {activeDuties.length === 0 ? (
          <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontStyle: 'italic' }}>
            No duties recorded today.
          </td></tr>
        ) : activeDuties.map((duty) => (
          <tr key={duty.id}>
            <td style={{ padding: '12px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
              {formatDate(duty.duty_date)}
            </td>
            <td style={{ padding: '12px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{duty.role?.name || '-'}</td>
            <td style={{ padding: '12px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
              {duty.shift ? `${duty.shift.name} (${duty.shift.start_time}-${duty.shift.end_time})` : '-'}
            </td>
            <td style={{ padding: '12px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{formatDateTime(duty.checkin_time)}</td>
            <td style={{ padding: '12px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{formatDateTime(duty.checkout_time)}</td>
            <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge status={duty.attendance_status} /></td>
            <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6' }}>
              <button
                style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                onClick={() => navigate(`/duty/${duty.id}`)}
              >View</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  // ── Shift picker ────────────────────────────────────
  const roleName = roles.find(r => String(r.id) === selectedRole)?.name || ''
  const allowed = ROLE_SHIFT_MAP[roleName] || []
  const filteredShifts = shifts.filter(s => allowed.includes(s.name))

  return (
    <div style={s.page}>
      <nav style={s.navbar}>
        <h1 style={s.navTitle}>ระบบลงเวร ศูนย์สารสนเทศ</h1>
        <div style={s.navRight}>
          <span style={s.navName}>{user?.full_name || user?.employee_code}</span>
          <button style={s.navBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button style={s.navBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={s.content}>
        {error && <div style={s.error}>{error}</div>}

        {/* Today's Duties */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>เวรวันนี้</h2>
          {isMobile ? (
            activeDuties.length === 0
              ? <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontStyle: 'italic' }}>ยังไม่มีการลงเวรวันนี้</div>
              : activeDuties.map(d => <DutyCard key={d.id} duty={d} />)
          ) : <DutyTable />}
        </div>

        {/* Check-in Form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>ลงเวร</h2>
          <form onSubmit={handleCheckin}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  ตำแหน่ง
                </label>
                <select
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: '15px',
                    border: '1.5px solid #d1d5db', borderRadius: '8px',
                    backgroundColor: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box',
                  }}
                  value={selectedRole}
                  onChange={(e) => {
                    const roleId = e.target.value
                    setSelectedRole(roleId)
                    const rName = roles.find(r => String(r.id) === roleId)?.name || ''
                    const a = ROLE_SHIFT_MAP[rName] || []
                    const f = shifts.filter(s => a.includes(s.name))
                    setSelectedShift(f.length > 0 ? String(f[0].id) : '')
                  }}
                  required
                >
                  {roles.length === 0 && <option value="">No roles assigned</option>}
                  {roles.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
                </select>
              </div>

              {/* Shift */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  เวร
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredShifts.length === 0 && (
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>ไม่มีเวรสำหรับ role นี้</div>
                  )}
                  {filteredShifts.map(s => {
                    const c = SHIFT_COLORS[s.name] || { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
                    const isSelected = selectedShift === String(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedShift(String(s.id))}
                        style={{
                          backgroundColor: c.bg,
                          border: `2px solid ${isSelected ? c.border : '#e5e7eb'}`,
                          color: c.text, borderRadius: '10px',
                          padding: isMobile ? '12px 16px' : '10px 16px',
                          textAlign: 'left', cursor: 'pointer',
                          fontWeight: isSelected ? '700' : '500',
                          fontSize: isMobile ? '15px' : '14px',
                          boxShadow: isSelected ? `0 0 0 3px ${c.border}40` : 'none',
                        }}
                      >
                        {isSelected ? '✓ ' : ''}{s.name.replace(/^เวรนอกเวลา\s*/, '')}
                        <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.75 }}>
                          ({s.start_time} - {s.end_time})
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || roles.length === 0 || filteredShifts.length === 0}
                style={{
                  width: '100%', padding: isMobile ? '14px' : '11px',
                  borderRadius: '10px', border: 'none',
                  backgroundColor: (submitting || roles.length === 0 || filteredShifts.length === 0) ? '#86efac' : '#16a34a',
                  color: '#fff', fontSize: isMobile ? '16px' : '15px',
                  fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'กำลังลงเวร...' : '✓ ลงเวร'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
