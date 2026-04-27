import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, faceEnroll, faceListEnrolled, faceDeleteEnrollment } from '../services/api'

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8', padding: '1.5rem' },
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '1.5rem', marginBottom: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  title: { fontSize: '1.4rem', fontWeight: 700, color: '#1a237e', margin: 0 },
  backBtn: { background: 'none', border: '1px solid #1a237e', color: '#1a237e', borderRadius: 8, padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 600 },
  searchBox: { width: '100%', padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#1a237e', color: '#fff', padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.9rem' },
  td: { padding: '0.7rem 1rem', borderBottom: '1px solid #eee', fontSize: '0.9rem', verticalAlign: 'middle' },
  badge: (enrolled) => ({
    display: 'inline-block', padding: '0.2rem 0.7rem', borderRadius: 12,
    fontSize: '0.8rem', fontWeight: 600,
    background: enrolled ? '#e8f5e9' : '#fce4ec',
    color: enrolled ? '#2e7d32' : '#c62828',
  }),
  uploadBtn: { background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem' },
  deleteBtn: { background: '#c62828', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem', marginLeft: '0.5rem' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', borderRadius: 12, padding: '2rem', width: 400, maxWidth: '90vw' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1a237e', marginBottom: '1rem' },
  preview: { width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8, marginBottom: '1rem', background: '#f5f5f5' },
  fileInput: { display: 'none' },
  fileLabel: { display: 'block', textAlign: 'center', padding: '2rem', border: '2px dashed #1a237e', borderRadius: 8, cursor: 'pointer', color: '#1a237e', marginBottom: '1rem' },
  confirmBtn: { width: '100%', padding: '0.7rem', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1rem', marginTop: '0.5rem' },
  cancelBtn: { width: '100%', padding: '0.7rem', background: '#eee', color: '#333', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '1rem', marginTop: '0.5rem' },
  error: { color: '#c62828', marginBottom: '0.5rem', fontSize: '0.9rem' },
  success: { color: '#2e7d32', marginBottom: '0.5rem', fontSize: '0.9rem' },
}

export default function FaceEnrollPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [enrolled, setEnrolled] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const usersRes = await getUsers()
      setUsers(usersRes.data)
    } catch {
      setMsg({ text: 'โหลดรายชื่อพนักงานไม่สำเร็จ', type: 'error' })
    }
    try {
      const enrolledRes = await faceListEnrolled()
      const map = {}
      for (const e of enrolledRes.data) map[e.employee_id] = e
      setEnrolled(map)
    } catch {
      // face service อาจยังไม่พร้อม — แสดงรายชื่อได้แต่ยังไม่มีข้อมูล enroll
    }
    setLoading(false)
  }

  const openModal = (user) => {
    setModal({ user })
    setPreview(null)
    setFile(null)
    setFiles([])
    setPreviews([])
    setIsDragging(false)
    setMsg({ text: '', type: '' })
  }

  const closeModal = () => {
    setModal(null)
    setPreview(null)
    setFile(null)
    setFiles([])
    setPreviews([])
  }

  const addFiles = (newFiles) => {
    const imgs = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    setFiles(prev => [...prev, ...imgs])
    setPreviews(prev => [...prev, ...imgs.map(f => URL.createObjectURL(f))])
    setMsg({ text: '', type: '' })
  }

  const handleFileChange = (e) => addFiles(e.target.files)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const removePreview = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    if (!files.length) { setMsg({ text: 'กรุณาเลือกรูปภาพก่อน', type: 'error' }); return }
    setSaving(true)
    setMsg({ text: '', type: '' })
    let ok = 0
    try {
      for (const f of files) {
        const fd = new FormData()
        fd.append('employee_code', modal.user.employee_code)
        fd.append('full_name', modal.user.full_name)
        fd.append('file', f)
        await faceEnroll(modal.user.id, fd)
        ok++
        setMsg({ text: `กำลังบันทึก... ${ok}/${files.length}`, type: 'success' })
      }
      setMsg({ text: `บันทึกสำเร็จ ${ok} รูป`, type: 'success' })
      await load()
      setTimeout(closeModal, 800)
    } catch (e) {
      setMsg({ text: e.response?.data?.detail || 'เกิดข้อผิดพลาด', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`ลบข้อมูลใบหน้าของ ${user.full_name} ใช่ไหม?`)) return
    try {
      await faceDeleteEnrollment(user.id)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'เกิดข้อผิดพลาด')
    }
  }

  const filtered = users.filter(u =>
    u.full_name.includes(search) || u.employee_code.includes(search)
  )

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => navigate('/dashboard')}>← กลับ</button>
          <h1 style={s.title}>จัดการรูปใบหน้าพนักงาน</h1>
          <span style={{ marginLeft: 'auto', color: '#666', fontSize: '0.9rem' }}>
            Enroll แล้ว {Object.keys(enrolled).length} / {users.length} คน
          </span>
        </div>

        <input
          style={s.searchBox}
          placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>กำลังโหลด...</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>รหัส</th>
                <th style={s.th}>ชื่อ-นามสกุล</th>
                <th style={s.th}>สถานะ</th>
                <th style={s.th}>จำนวนรูป</th>
                <th style={s.th}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const e = enrolled[u.id]
                return (
                  <tr key={u.id} style={{ background: e ? '#f1f8e9' : '#fff' }}>
                    <td style={s.td}>{u.employee_code}</td>
                    <td style={s.td}>{u.full_name}</td>
                    <td style={s.td}>
                      <span style={s.badge(!!e)}>{e ? 'Enrolled' : 'ยังไม่มีรูป'}</span>
                    </td>
                    <td style={s.td}>{e ? `${e.photo_count} รูป` : '-'}</td>
                    <td style={s.td}>
                      <button style={s.uploadBtn} onClick={() => openModal(u)}>
                        {e ? 'อัปเดตรูป' : '+ เพิ่มรูป'}
                      </button>
                      {e && (
                        <button style={s.deleteBtn} onClick={() => handleDelete(u)}>ลบ</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={s.modal} onClick={closeModal}>
          <div style={{ ...s.modalBox, width: 480 }} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>เพิ่มรูปใบหน้า — {modal.user.full_name}</p>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#1a237e' : '#aaa'}`,
                borderRadius: 10, padding: '1.2rem', textAlign: 'center',
                cursor: 'pointer', marginBottom: '0.8rem',
                background: isDragging ? '#e8eaf6' : '#fafafa',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '1.8rem' }}>📂</div>
              <div style={{ fontWeight: 600, color: '#1a237e' }}>ลากรูปมาวาง หรือคลิกเพื่อเลือก</div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>JPG / PNG · เลือกได้หลายรูปพร้อมกัน</div>
            </div>

            <input
              id="faceFile" type="file" accept="image/*" multiple
              style={s.fileInput} ref={fileRef} onChange={handleFileChange}
            />

            {/* Preview grid */}
            {previews.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
                {previews.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={p} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #ddd' }} />
                    <button
                      onClick={() => removePreview(i)}
                      style={{ position: 'absolute', top: -6, right: -6, background: '#c62828', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: '0.7rem', lineHeight: '20px', textAlign: 'center', padding: 0 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {msg.text && <p style={msg.type === 'error' ? s.error : s.success}>{msg.text}</p>}

            <button style={s.confirmBtn} onClick={handleSave} disabled={saving || !files.length}>
              {saving ? msg.text || 'กำลังบันทึก...' : `บันทึก${files.length > 0 ? ` (${files.length} รูป)` : ''}`}
            </button>
            <button style={s.cancelBtn} onClick={closeModal}>ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  )
}
