import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, adminResetPassword, toggleUserActive } from '../services/api'

export default function AdminUsersPage() {
  const navigate   = useNavigate()
  const [users, setUsers]       = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [resetResult, setResetResult] = useState(null) // { name, temp_password }
  const [actionId, setActionId] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      setUsers(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (user) => {
    if (!window.confirm(`รีเซ็ต password ของ "${user.full_name}" ใช่ไหม?`)) return
    setActionId(user.id)
    try {
      const res = await adminResetPassword(user.id)
      setResetResult({ name: user.full_name, temp_password: res.data.temp_password })
    } catch (e) {
      alert(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setActionId(null)
    }
  }

  const handleToggle = async (user) => {
    const action = user.is_active == 1 ? 'ปิด' : 'เปิด'
    if (!window.confirm(`${action}บัญชี "${user.full_name}" ใช่ไหม?`)) return
    setActionId(user.id)
    try {
      const res = await toggleUserActive(user.id)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: res.data.is_active } : u))
    } catch (e) {
      alert(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setActionId(null)
    }
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.employee_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={btnBack}>← กลับ</button>
        <h2 style={{ margin: 0, flex: 1 }}>จัดการ Users</h2>
        <span style={{ color: '#6b7280', fontSize: 14 }}>{users.length} คน</span>
      </div>

      {/* Reset Result Modal */}
      {resetResult && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🔑</div>
            <h3 style={{ textAlign: 'center', margin: '0 0 16px' }}>รีเซ็ตสำเร็จ</h3>
            <p style={{ margin: '0 0 8px', color: '#374151' }}>
              <strong>{resetResult.name}</strong> สามารถ Login ด้วย:
            </p>
            <div style={pwBox}>
              <span style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 2 }}>
                {resetResult.temp_password}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '12px 0 20px' }}>
              แจ้ง password นี้ให้ user แล้วให้ไปเปลี่ยนที่เมนู "เปลี่ยนรหัสผ่าน"
            </p>
            <button onClick={() => setResetResult(null)} style={btnPri}>
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text" placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
        value={search} onChange={e => setSearch(e.target.value)}
        style={searchInput}
      />

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 40 }}>กำลังโหลด...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr style={{ background: '#1F4E79' }}>
                {['รหัส', 'ชื่อ-นามสกุล', 'Email', 'Roles', 'สถานะ', 'จัดการ'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={td}><code>{u.employee_code}</code></td>
                  <td style={td}>{u.full_name}</td>
                  <td style={{ ...td, color: '#6b7280', fontSize: 13 }}>{u.email || '-'}</td>
                  <td style={td}>
                    {u.roles.length > 0
                      ? u.roles.map(r => (
                          <span key={r.id} style={roleBadge}>{r.name}</span>
                        ))
                      : <span style={{ color: '#9ca3af', fontSize: 13 }}>-</span>
                    }
                  </td>
                  <td style={td}>
                    <span style={u.is_active == 1 ? badgeOn : badgeOff}>
                      {u.is_active == 1 ? 'ใช้งาน' : 'ปิด'}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleReset(u)}
                      disabled={actionId === u.id}
                      style={btnReset}
                      title="รีเซ็ต password"
                    >
                      🔑 รีเซ็ต
                    </button>
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={actionId === u.id}
                      style={u.is_active == 1 ? btnOff : btnOn}
                      title={u.is_active == 1 ? 'ปิดบัญชี' : 'เปิดบัญชี'}
                    >
                      {u.is_active == 1 ? 'ปิด' : 'เปิด'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                    ไม่พบ user
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const btnBack   = { padding: '6px 14px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 }
const btnPri    = { width: '100%', padding: 12, fontSize: 15, fontWeight: 600, color: '#fff', background: '#1a73e8', border: 'none', borderRadius: 8, cursor: 'pointer' }
const btnReset  = { padding: '4px 10px', fontSize: 13, background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', borderRadius: 5, cursor: 'pointer', marginRight: 6 }
const btnOff    = { padding: '4px 10px', fontSize: 13, background: '#fce4ec', color: '#c62828', border: '1px solid #f48fb1', borderRadius: 5, cursor: 'pointer' }
const btnOn     = { padding: '4px 10px', fontSize: 13, background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: 5, cursor: 'pointer' }
const searchInput = { width: '100%', padding: '10px 14px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }
const table     = { width: '100%', borderCollapse: 'collapse', fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }
const th        = { padding: '12px 14px', color: '#fff', fontWeight: 600, textAlign: 'left', fontSize: 13 }
const td        = { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }
const roleBadge = { display: 'inline-block', background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 4, marginBottom: 2 }
const badgeOn   = { background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '2px 8px', fontSize: 12 }
const badgeOff  = { background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 8px', fontSize: 12 }
const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modal     = { background: '#fff', borderRadius: 12, padding: '32px 28px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }
const pwBox     = { background: '#f0f9ff', border: '2px dashed #38bdf8', borderRadius: 8, padding: '16px', textAlign: 'center', color: '#0369a1' }
