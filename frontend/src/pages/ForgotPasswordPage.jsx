import { useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../services/api'

export default function ForgotPasswordPage() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [msg, setMsg]     = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]   = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setMsg('')
    setLoading(true)
    try {
      const res = await API.post('/auth/forgot-password', { employee_code: employeeCode.trim() })
      setMsg(res.data.message)
      setSent(true)
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ margin: '12px 0 4px' }}>ลืมรหัสผ่าน?</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            กรอก Employee Code แล้วระบบจะส่งลิงก์รีเซ็ตไปยัง email ของคุณ
          </p>
        </div>

        {error && <div style={alertErr}>{error}</div>}

        {sent ? (
          <div style={alertOk}>
            <strong>ส่งอีเมลแล้ว</strong><br />
            {msg}<br /><br />
            <span style={{ fontSize: 13 }}>ลิงก์มีอายุ 30 นาที กรุณาตรวจสอบกล่องขาเข้า (และโฟลเดอร์ Spam)</span>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Employee Code</label>
              <input
                type="text" value={employeeCode}
                onChange={e => setEmployeeCode(e.target.value)}
                placeholder="เช่น EMP001" required style={inputSt}
              />
            </div>
            <button type="submit" disabled={loading} style={loading ? btnDis : btnPri}>
              {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต Password'}
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
const alertOk  = { background: '#dcfce7', color: '#166534', padding: '14px 16px', borderRadius: 8, fontSize: 14, marginBottom: 16, border: '1px solid #bbf7d0' }
