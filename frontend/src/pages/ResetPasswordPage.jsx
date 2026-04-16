import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import API from '../services/api'

export default function ResetPasswordPage() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token') || ''

  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [msg, setMsg]   = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('ลิงก์ไม่ถูกต้อง กรุณาขอรีเซ็ต password ใหม่')
  }, [token])

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.confirm_password) {
      setError('รหัสผ่านไม่ตรงกัน'); return
    }
    if (form.new_password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return
    }
    setLoading(true)
    try {
      const res = await API.post('/auth/reset-password', {
        token,
        new_password: form.new_password,
      })
      setMsg(res.data.message)
      setDone(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={iconBox}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 style={{ margin: '12px 0 4px' }}>ตั้งรหัสผ่านใหม่</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>กรอกรหัสผ่านใหม่ที่ต้องการ</p>
        </div>

        {error && <div style={alertErr}>{error}</div>}

        {done ? (
          <div>
            <div style={alertOk}><strong>สำเร็จ!</strong> {msg}</div>
            <button onClick={() => navigate('/login')} style={btnPri}>
              ไปหน้า Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {[
              { name: 'new_password',     label: 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)' },
              { name: 'confirm_password', label: 'ยืนยันรหัสผ่านใหม่' },
            ].map(f => (
              <div key={f.name} style={{ marginBottom: 16 }}>
                <label style={labelSt}>{f.label}</label>
                <input
                  type="password" name={f.name}
                  value={form[f.name]} onChange={handle}
                  required disabled={!token} style={inputSt}
                />
              </div>
            ))}
            <button type="submit" disabled={loading || !token} style={loading || !token ? btnDis : btnPri}>
              {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ color: '#1a73e8', fontSize: 14, textDecoration: 'none' }}>
            ← กลับไปหน้า Login
          </Link>
        </div>
      </div>
    </div>
  )
}

const wrap    = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }
const card    = { background: '#fff', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }
const iconBox = { width: 52, height: 52, background: '#1a73e8', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const labelSt = { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inputSt = { width: '100%', padding: '10px 14px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }
const btnPri  = { width: '100%', padding: 12, fontSize: 15, fontWeight: 600, color: '#fff', background: '#1a73e8', border: 'none', borderRadius: 8, cursor: 'pointer' }
const btnDis  = { width: '100%', padding: 12, fontSize: 15, fontWeight: 600, color: '#fff', background: '#93c5fd', border: 'none', borderRadius: 8, cursor: 'not-allowed' }
const alertErr = { background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16, border: '1px solid #fecaca' }
const alertOk  = { background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16, border: '1px solid #bbf7d0' }
