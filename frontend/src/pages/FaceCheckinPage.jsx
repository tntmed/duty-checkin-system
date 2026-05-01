import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { faceRecognize, getShifts, getUsers, getRoles, adminBulkCheckin, faceLearn, proxyTkDuties } from '../services/api'

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8', padding: '1.5rem' },
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '1.5rem', marginBottom: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#1a237e', margin: 0 },
  backBtn: { background: 'none', border: '1px solid #1a237e', color: '#1a237e', borderRadius: 8, padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 600 },
  uploadZone: { border: '2px dashed #1a237e', borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', color: '#1a237e', marginBottom: '1rem' },
  uploadZoneActive: { border: '2px dashed #1a237e', borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer', color: '#1a237e', marginBottom: '1rem', background: '#e8eaf6' },
  fileInput: { display: 'none' },
  preview: { width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 10, marginBottom: '1rem', background: '#f5f5f5' },
  btn: (color) => ({ width: '100%', padding: '0.8rem', background: color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1rem', marginTop: '0.5rem' }),
  btnDisabled: { width: '100%', padding: '0.8rem', background: '#9e9e9e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'not-allowed', fontWeight: 700, fontSize: '1rem', marginTop: '0.5rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#1a237e', color: '#fff', padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.9rem' },
  td: { padding: '0.7rem 1rem', borderBottom: '1px solid #eee', fontSize: '0.9rem', verticalAlign: 'middle' },
  badge: (ok) => ({ display: 'inline-block', padding: '0.2rem 0.7rem', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600, background: ok ? '#e8f5e9' : '#fff3e0', color: ok ? '#2e7d32' : '#e65100' }),
  summary: { display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  summaryItem: (color) => ({ background: color, borderRadius: 10, padding: '0.8rem 1.5rem', textAlign: 'center', flex: 1, minWidth: 120 }),
  summaryNum: { fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1 },
  summaryLabel: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  select: { padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #ddd', fontSize: '0.9rem', width: 200 },
  error: { background: '#fce4ec', color: '#c62828', padding: '1rem', borderRadius: 8, marginBottom: '1rem' },
  success: { background: '#e8f5e9', color: '#2e7d32', padding: '1rem', borderRadius: 8, marginBottom: '1rem' },
  infoBox: { background: '#e3f2fd', color: '#0d47a1', padding: '1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' },
  resultBadge: (s) => ({ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, background: s === 'ok' ? '#e8f5e9' : '#fce4ec', color: s === 'ok' ? '#2e7d32' : '#c62828' }),
}

// Map sign text → role name (ป้ายแสดงตำแหน่ง ไม่ใช่ชื่อเวร)
const SIGN_TO_ROLE = {
  'สิบเวรประจำวัน':  'สิบเวร',
  'โปรแกรมเมอร์':    'โปรแกรมเมอร์',
  'ช่างซ่อมบำรุง':   'ช่าง',
  'เวรนอกเวลา':      'เวรนอกเวลา',
  'ผู้ช่วยสิบเวร':   'ผู้ช่วยสิบเวร',
}

function matchRoleFromSign(signText, roles) {
  if (!signText) return null
  const roleName = SIGN_TO_ROLE[signText.trim()]
  if (!roleName) return null
  return roles.find(r => r.name === roleName || r.name.includes(roleName)) || null
}

export default function FaceCheckinPage() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [shifts, setShifts] = useState([])
  const [roles, setRoles] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [selectedShifts, setSelectedShifts] = useState({})  // index → shift_id
  const [selectedRoles, setSelectedRoles] = useState({})    // index → role_id
  const [included, setIncluded] = useState({})              // index → bool
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [learnResult, setLearnResult] = useState(null)
  const [tkToken, setTkToken] = useState(() => localStorage.getItem('tk_token') || '')
  const [tkDuties, setTkDuties] = useState({}) // employee_id → duty from tk
  const [tkLoading, setTkLoading] = useState(false)
  const [tkError, setTkError] = useState('')

  useEffect(() => {
    getShifts().then(r => setShifts(r.data.filter(s => s.is_active))).catch(() => {})
    getRoles().then(r => setRoles(r.data.filter(ro => ro.is_active !== false))).catch(() => {})
    getUsers().then(r => {
      const map = {}
      r.data.forEach(u => { map[u.id] = u })
      setUsersMap(map)
    }).catch(() => {})
  }, [])

  const setImage = (f) => {
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
    setResult(null); setError(''); setSelectedShifts({}); setSelectedRoles({}); setIncluded({}); setSaveResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) setImage(f)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setError(''); setResult(null); setSaveResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await faceRecognize(fd)
      setResult(res.data)
      const selShifts = {}
      const selRoles = {}
      const selIncluded = {}
      res.data.results.forEach((r, i) => {
        const matchedRole = matchRoleFromSign(r.shift_text, roles)
        const user = usersMap[r.employee_id]
        selRoles[i] = matchedRole ? matchedRole.id : (user?.roles?.[0]?.id ?? '')
        selShifts[i] = ''
        selIncluded[i] = r.identified
      })
      setSelectedShifts(selShifts)
      setSelectedRoles(selRoles)
      setIncluded(selIncluded)
    } catch (e) {
      setError(e.response?.data?.detail || 'เกิดข้อผิดพลาดในการวิเคราะห์')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    const items = []
    result.results.forEach((r, i) => {
      if (!included[i] || !selectedRoles[i] || !selectedShifts[i]) return
      items.push({ user_id: r.employee_id, role_id: Number(selectedRoles[i]), shift_id: Number(selectedShifts[i]) })
    })
    const noShift = result.results.filter((r, i) => included[i] && selectedRoles[i] && !selectedShifts[i])
    if (noShift.length > 0 && items.length === 0) {
      setError(`กรุณาเลือกเวรให้ครบ — ยังไม่ได้เลือกเวร ${noShift.length} คน`)
      return
    }
    if (items.length === 0) {
      setError('ไม่มีรายการที่พร้อมบันทึก — ตรวจสอบให้เลือกเวรครบทุกคน')
      return
    }
    setSaving(true); setError('')
    try {
      const res = await adminBulkCheckin(items)
      setSaveResult(res.data.results)

      // Auto-learn: crop confirmed faces and append to training data
      try {
        const confirmations = result.results
          .filter((r, i) => r.identified && selectedShifts[i] && selectedRoles[i])
          .map(r => ({ employee_id: r.employee_id, face_location: r.face_location }))

        if (confirmations.length > 0 && file) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('confirmations', JSON.stringify(confirmations))
          const lr = await faceLearn(fd)
          setLearnResult(lr.data)
        }
      } catch {
        // learning failure is non-critical, don't block check-in
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const handleTkVerify = async () => {
    if (!tkToken) { setTkError('กรุณาใส่ Token ของ tk server'); return }
    setTkLoading(true); setTkError('')
    localStorage.setItem('tk_token', tkToken)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await proxyTkDuties(today, tkToken)
      const duties = res.data?.duties || res.data || []
      const map = {}
      duties.forEach(d => { if (d.employee_code) map[d.employee_code] = d })
      setTkDuties(map)

      // Auto-fill ตำแหน่ง และเวร จาก tk data
      if (result) {
        const newRoles = { ...selectedRoles }
        const newShifts = { ...selectedShifts }
        result.results.forEach((r, i) => {
          const empCode = usersMap[r.employee_id]?.employee_code || r.employee_code
          const tkd = map[empCode]
          if (!tkd) return
          // match role_name → role id
          const matchedRole = roles.find(ro => ro.name === tkd.role_name)
          if (matchedRole) newRoles[i] = matchedRole.id
          // match shift_name → shift id
          const matchedShift = shifts.find(sh => sh.name === tkd.shift_name)
          if (matchedShift) newShifts[i] = matchedShift.id
        })
        setSelectedRoles(newRoles)
        setSelectedShifts(newShifts)
      }
    } catch (e) {
      setTkError(e.response?.data?.detail || 'เชื่อมต่อ tk server ไม่สำเร็จ')
    } finally {
      setTkLoading(false)
    }
  }

  const readyCount = result
    ? result.results.filter((r, i) => included[i] && selectedRoles[i]).length
    : 0

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>← กลับ</button>
          <h1 style={s.title}>วิเคราะห์รูปถ่ายเวรประจำวัน</h1>
        </div>
        <div style={s.infoBox}>
          อัปโหลดรูปถ่ายกลุ่มที่เจ้าหน้าที่ถือป้ายสีเหลือง ระบบจะจำหน้าและอ่านป้ายอัตโนมัติ
        </div>
        <div
          style={isDragging ? s.uploadZoneActive : s.uploadZone}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
          <div style={{ fontWeight: 600 }}>คลิกหรือลากรูปมาวางที่นี่</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.3rem' }}>JPG, PNG</div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={s.fileInput} onChange={e => setImage(e.target.files[0])} />
        {preview && <img src={preview} alt="preview" style={s.preview} />}
        {error && <div style={s.error}>{error}</div>}
        <button style={file && !loading ? s.btn('#1a237e') : s.btnDisabled} onClick={handleAnalyze} disabled={!file || loading}>
          {loading ? 'กำลังวิเคราะห์... (อาจใช้เวลา 20-60 วินาที)' : 'วิเคราะห์รูปภาพ'}
        </button>
      </div>

      {result && (
        <div style={s.card}>
          <h2 style={{ ...s.title, marginBottom: '1.2rem' }}>ผลการวิเคราะห์</h2>
          <div style={s.summary}>
            <div style={s.summaryItem('#1a237e')}><div style={s.summaryNum}>{result.total_faces}</div><div style={s.summaryLabel}>ใบหน้าทั้งหมด</div></div>
            <div style={s.summaryItem('#2e7d32')}><div style={s.summaryNum}>{result.identified}</div><div style={s.summaryLabel}>จำได้</div></div>
            <div style={s.summaryItem('#e65100')}><div style={s.summaryNum}>{result.unidentified}</div><div style={s.summaryLabel}>จำไม่ได้</div></div>
          </div>

          {/* Bulk shift selector */}
          <div style={{ background: '#f0f4f8', border: '1px solid #ddd', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '0.8rem', display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#1a237e', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>กำหนดเวรให้ทุกคนที่เลือก:</span>
            <select
              style={{ ...s.select, flex: 1, minWidth: 200 }}
              onChange={e => {
                if (!e.target.value) return
                const newShifts = { ...selectedShifts }
                result?.results.forEach((r, i) => { if (included[i]) newShifts[i] = e.target.value })
                setSelectedShifts(newShifts)
              }}
            >
              <option value="">-- เลือกเวร --</option>
              {shifts.map(sh => <option key={sh.id} value={sh.id}>{sh.name} ({sh.start_time}-{sh.end_time})</option>)}
            </select>
          </div>

          {/* tk Server Verify */}
          <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: '0.8rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#1a237e', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>🔗 ตรวจสอบกับ tk server:</span>
            <input
              style={{ flex: 1, minWidth: 200, padding: '0.4rem 0.7rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.85rem', fontFamily: 'monospace' }}
              placeholder="วาง Token จาก tk.pmk.ac.th"
              value={tkToken}
              onChange={e => setTkToken(e.target.value)}
            />
            <button
              style={{ padding: '0.4rem 1rem', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              onClick={handleTkVerify} disabled={tkLoading}
            >
              {tkLoading ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล tk'}
            </button>
            {Object.keys(tkDuties).length > 0 && <span style={{ color: '#2e7d32', fontSize: '0.85rem' }}>✓ ดึงข้อมูลได้ {Object.keys(tkDuties).length} รายการ</span>}
            {tkError && <span style={{ color: '#c62828', fontSize: '0.85rem' }}>{tkError}</span>}
          </div>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>รวม</th>
                <th style={s.th}>#</th>
                <th style={s.th}>สถานะ</th>
                <th style={s.th}>รหัส</th>
                <th style={s.th}>ชื่อ-นามสกุล</th>
                <th style={s.th}>ตำแหน่ง</th>
                <th style={s.th}>เวร (เลือก)</th>
                <th style={s.th}>สถานะ tk</th>
                <th style={s.th}>ความมั่นใจ</th>
                {saveResult && <th style={s.th}>ผลบันทึก</th>}
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, i) => {
                const user = usersMap[r.employee_id]
                const displayName = user?.full_name || r.full_name
                const roleNames = user?.roles?.map(ro => ro.name).join(', ') || '-'
                const saved = saveResult?.find(x => x.user_id === r.employee_id)
                return (
                  <tr key={i} style={{ background: included[i] ? '#fff' : '#f5f5f5', opacity: included[i] ? 1 : 0.5 }}>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      {r.identified && (
                        <input type="checkbox" checked={!!included[i]}
                          onChange={e => setIncluded(prev => ({ ...prev, [i]: e.target.checked }))}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      )}
                    </td>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}><span style={s.badge(r.identified)}>{r.identified ? 'จำได้' : 'จำไม่ได้'}</span></td>
                    <td style={s.td}>{user?.employee_code || r.employee_code || '-'}</td>
                    <td style={s.td}>{displayName || <span style={{ color: '#999' }}>ไม่ทราบ</span>}</td>
                    <td style={s.td}>
                      {r.identified ? (
                        <select
                          style={{ ...s.select, width: 160 }}
                          value={selectedRoles[i] ?? ''}
                          onChange={e => setSelectedRoles(prev => ({ ...prev, [i]: e.target.value }))}
                        >
                          <option value="">-- เลือกตำแหน่ง --</option>
                          {roles.map(ro => <option key={ro.id} value={ro.id}>{ro.name}</option>)}
                        </select>
                      ) : <span style={{ color: '#999' }}>-</span>}
                    </td>
                    <td style={s.td}>
                      {r.identified ? (
                        <select
                          style={s.select}
                          value={selectedShifts[i] ?? ''}
                          onChange={e => setSelectedShifts(prev => ({ ...prev, [i]: e.target.value }))}
                        >
                          <option value="">-- เลือกเวร --</option>
                          {shifts.map(sh => <option key={sh.id} value={sh.id}>{sh.name} ({sh.start_time}-{sh.end_time})</option>)}
                        </select>
                      ) : <span style={{ color: '#999' }}>-</span>}
                    </td>
                    <td style={s.td}>
                      {r.identified && (() => {
                        const empCode = user?.employee_code || r.employee_code
                        const tkd = tkDuties[empCode]
                        if (!tkd && Object.keys(tkDuties).length === 0) return <span style={{ color: '#999', fontSize: '0.8rem' }}>-</span>
                        if (!tkd) return <span style={{ background: '#fce4ec', color: '#c62828', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>ยังไม่ได้ลง</span>
                        return (
                          <div style={{ fontSize: '0.8rem' }}>
                            <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '0.2rem 0.6rem', borderRadius: 8, fontWeight: 600, display: 'inline-block' }}>✓ ลงแล้ว</div>
                            <div style={{ color: '#555', marginTop: 2 }}>{tkd.shift_name}</div>
                            <div style={{ color: '#888' }}>{tkd.checkin_time ? new Date(tkd.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                          </div>
                        )
                      })()}
                    </td>
                    <td style={s.td}>{r.identified ? `${Math.round(r.confidence * 100)}%` : '-'}</td>
                    {saveResult && <td style={s.td}>{saved ? <span style={s.resultBadge(saved.status)}>{saved.status === 'ok' ? 'บันทึกแล้ว' : saved.status}</span> : '-'}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {saveResult ? (
            <div style={{ marginTop: '1rem' }}>
              <div style={s.success}>
                บันทึกสำเร็จ {saveResult.filter(x => x.status === 'ok').length} / {saveResult.length} รายการ
              </div>
              {learnResult && (
                <div style={{ ...s.infoBox, marginTop: '0.5rem' }}>
                  เรียนรู้ใบหน้าเพิ่มอัตโนมัติ {learnResult.learned} / {learnResult.total} คน — ครั้งต่อไปจะแม่นขึ้น
                </div>
              )}
            </div>
          ) : (
            <button
              style={readyCount > 0 && !saving ? s.btn('#2e7d32') : s.btnDisabled}
              onClick={handleConfirm}
              disabled={readyCount === 0 || saving}
            >
              {saving ? 'กำลังบันทึก...' : `ยืนยันและบันทึก Check-in (${readyCount} คน)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
