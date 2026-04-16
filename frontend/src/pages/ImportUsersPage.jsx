import { useState } from 'react'
import { downloadUserTemplate, importUsersExcel } from '../services/api'

export default function ImportUsersPage() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadUserTemplate()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'users_template.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('ไม่สามารถดาวน์โหลด template ได้')
    }
  }

  const handleUpload = async () => {
    if (!file) { setError('กรุณาเลือกไฟล์ Excel ก่อน'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await importUsersExcel(formData)
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'เกิดข้อผิดพลาดในการ import')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 8 }}>นำเข้าข้อมูลผู้ใช้งาน</h2>
      <p style={{ color: '#555', marginBottom: 24 }}>
        ดาวน์โหลด template Excel กรอกข้อมูล แล้วอัปโหลดเพื่อสร้าง user ทีเดียวหลายคน
      </p>

      {/* Step 1 */}
      <div style={cardStyle}>
        <div style={stepBadge}>1</div>
        <div>
          <strong>ดาวน์โหลด Template</strong>
          <p style={{ margin: '4px 0 12px', color: '#555', fontSize: 14 }}>
            ไฟล์ Excel จะมีตัวอย่างและรายชื่อ Role ที่ใช้ได้
          </p>
          <button onClick={handleDownloadTemplate} style={btnPrimary}>
            ⬇ ดาวน์โหลด users_template.xlsx
          </button>
        </div>
      </div>

      {/* Step 2 */}
      <div style={cardStyle}>
        <div style={stepBadge}>2</div>
        <div style={{ flex: 1 }}>
          <strong>อัปโหลดไฟล์ที่กรอกข้อมูลแล้ว</strong>
          <p style={{ margin: '4px 0 12px', color: '#555', fontSize: 14 }}>
            รองรับเฉพาะ .xlsx
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={e => { setFile(e.target.files[0]); setResult(null); setError('') }}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              style={file && !loading ? btnSuccess : btnDisabled}
            >
              {loading ? 'กำลัง import...' : '⬆ Import'}
            </button>
          </div>
          {file && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#333' }}>📄 {file.name}</p>}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={alertDanger}>{error}</div>
      )}

      {/* Result */}
      {result && (
        <div style={cardStyle}>
          <div>
            <strong style={{ fontSize: 16 }}>ผลการ Import</strong>
            <div style={{ display: 'flex', gap: 16, margin: '12px 0', flexWrap: 'wrap' }}>
              <div style={statBox('#e8f5e9', '#2e7d32')}>
                <span style={{ fontSize: 28, fontWeight: 'bold' }}>{result.created}</span>
                <span style={{ fontSize: 13 }}>สร้างสำเร็จ</span>
              </div>
              <div style={statBox('#fff3e0', '#e65100')}>
                <span style={{ fontSize: 28, fontWeight: 'bold' }}>{result.updated}</span>
                <span style={{ fontSize: 13 }}>อัปเดตแล้ว</span>
              </div>
              <div style={statBox('#fce4ec', '#c62828')}>
                <span style={{ fontSize: 28, fontWeight: 'bold' }}>{result.errors.length}</span>
                <span style={{ fontSize: 13 }}>ข้อผิดพลาด</span>
              </div>
            </div>

            {result.created_codes.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>สร้างใหม่:</strong>
                <span style={{ fontSize: 13, color: '#2e7d32' }}> {result.created_codes.join(', ')}</span>
              </div>
            )}
            {result.updated_codes.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>อัปเดตแล้ว:</strong>
                <span style={{ fontSize: 13, color: '#e65100' }}> {result.updated_codes.join(', ')}</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <strong style={{ fontSize: 13, color: '#c62828' }}>ข้อผิดพลาด:</strong>
                <ul style={{ margin: '4px 0 0 16px', fontSize: 13, color: '#c62828' }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  display: 'flex', gap: 16, background: '#fff',
  border: '1px solid #e0e0e0', borderRadius: 8,
  padding: '20px', marginBottom: 16,
}
const stepBadge = {
  width: 32, height: 32, minWidth: 32,
  background: '#1976d2', color: '#fff',
  borderRadius: '50%', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  fontWeight: 'bold', fontSize: 16,
}
const btnPrimary = {
  background: '#1976d2', color: '#fff', border: 'none',
  borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14,
}
const btnSuccess = {
  background: '#2e7d32', color: '#fff', border: 'none',
  borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
}
const btnDisabled = {
  background: '#bdbdbd', color: '#fff', border: 'none',
  borderRadius: 6, padding: '8px 16px', cursor: 'not-allowed', fontSize: 14, whiteSpace: 'nowrap',
}
const alertDanger = {
  background: '#fce4ec', color: '#c62828', border: '1px solid #ef9a9a',
  borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14,
}
const statBox = (bg, color) => ({
  background: bg, color, borderRadius: 8,
  padding: '12px 20px', display: 'flex', flexDirection: 'column',
  alignItems: 'center', minWidth: 90,
})
