import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../services/api'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setMsg('')
    if (form.new_password !== form.confirm_password) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน'); return
    }
    if (form.new_password.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return
    }
    setLoading(true)
    try {
      const res = await API.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setMsg(res.data.message)
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (e) {
      setError(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={{ marginBottom: 4 }}>เปลี่ยนรหัสผ่าน</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>

        {error && <div style={alertErr}>{error}</div>}
        {msg   && <div style={alertOk}>{msg}</div>}

        <form onSubmit={submit}>
          {[
            { name: 'current_password', label: 'รหัสผ่านปัจจุบัน' },
            { name: 'new_password',     label: 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)' },
            { name: 'confirm_password', label: 'ยืนยันรหัสผ่านใหม่' },
          ].map(f => (
            <div key={f.name} style={{ marginBottom: 16 }}>
              <label style={labelSt}>{f.label}</label>
              <input
                type="password" name={f.name}
                value={form[f.name]} onChange={handle}
                required style={inputSt}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} style={loading ? btnDis : btnPri}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
          <button type="button" onClick={() => navigate(-1)} style={btnBack}>
            ← กลับ
          </button>
        </form>
      </div>
    </div>
  )
}

const wrap   = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }
const card   = { background: '#fff', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }
const labelSt = { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inputSt = { width: '100%', padding: '10px 14px', fontSize: 15, border: '1.5px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }
const btnPri  = { width: '100%', padding: 12, fontSize: 15, fontWeight: 600, color: '#fff', background: '#1a73e8', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 10 }
const btnDis  = { ...{ width: '100%', padding: 12, fontSize: 15, fontWeight: 600, color: '#fff', background: '#93c5fd', border: 'none', borderRadius: 8, cursor: 'not-allowed', marginBottom: 10 } }
const btnBack = { width: '100%', padding: 10, fontSize: 14, color: '#6b7280', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }
const alertErr = { background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16, border: '1px solid #fecaca' }
const alertOk  = { background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16, border: '1px solid #bbf7d0' }
