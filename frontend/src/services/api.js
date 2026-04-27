import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: on 401, clear storage and redirect to login
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = (import.meta.env.VITE_BASE_PATH || '') + '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================================
// Auth
// ============================================================
export const loginApi = (data) => API.post('/auth/login', data)

// ============================================================
// Users
// ============================================================
export const getCurrentUser = () => API.get('/users/me')
export const getUserRoles = () => API.get('/users/me/roles')
export const getAssignableUsers = () => API.get('/users/assignable')

// ============================================================
// Roles & Shifts
// ============================================================
export const getRoles = () => API.get('/roles/')
export const getShifts = () => API.get('/roles/shifts')
export const getRoleChecklists = (roleId) => API.get(`/roles/${roleId}/checklists`)

// ============================================================
// Duties
// ============================================================
export const checkin = (data) => API.post('/duties/checkin', data)
export const checkout = (dutyId) => API.post(`/duties/${dutyId}/checkout`)
export const confirmAttendance = (dutyId, data) => API.patch(`/duties/${dutyId}/attendance`, data)
export const getDutiesToday = () => API.get('/duties/today')
export const getDuty = (dutyId) => API.get(`/duties/${dutyId}`)
export const getDutyAttachments = (dutyId) => API.get(`/duties/${dutyId}/attachments`)
export const deleteDuty = (dutyId) => API.delete(`/duties/${dutyId}`)
export const uploadDutyFile = (dutyId, formData) =>
  API.post(`/duties/${dutyId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ============================================================
// Checklists
// ============================================================
export const getChecklistLogs = (dutyId) => API.get(`/duties/${dutyId}/checklists`)
export const submitChecklists = (dutyId, data) => API.post(`/duties/${dutyId}/checklists`, data)
export const uploadChecklistFile = (dutyId, checklistLogId, formData) =>
  API.post(`/duties/${dutyId}/checklists/${checklistLogId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ============================================================
// Incidents
// ============================================================
export const createIncident = (dutyId, data) => API.post(`/duties/${dutyId}/incidents`, data)
export const getIncidents = (dutyId) => API.get(`/duties/${dutyId}/incidents`)
export const getIncident = (incidentId) => API.get(`/incidents/${incidentId}`)
export const getIncidentAttachments = (incidentId) => API.get(`/incidents/${incidentId}/attachments`)
export const updateIncident = (incidentId, data) => API.put(`/incidents/${incidentId}`, data)
export const workflowIncident = (incidentId, data) => API.patch(`/incidents/${incidentId}/workflow`, data)
export const uploadIncidentFile = (incidentId, formData) =>
  API.post(`/incidents/${incidentId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const getUsers = () => API.get('/users/')
export const adminResetPassword = (userId) => API.post(`/users/${userId}/reset-password`)
export const toggleUserActive = (userId) => API.patch(`/users/${userId}/toggle-active`)
export const downloadUserTemplate = () =>
  API.get('/users/import/template', { responseType: 'blob' })
export const importUsersExcel = (formData) =>
  API.post('/users/import/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ============================================================
// Face Recognition Service (port 8001)
// ============================================================
const FACE_API = axios.create({
  baseURL: import.meta.env.VITE_FACE_API_URL || 'http://localhost:8001',
})

export const faceEnroll = (employeeId, formData) =>
  FACE_API.post(`/enroll/${employeeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const faceListEnrolled = () => FACE_API.get('/enroll')

export const faceDeleteEnrollment = (employeeId) =>
  FACE_API.delete(`/enroll/${employeeId}`)

export const faceRecognize = (formData) =>
  FACE_API.post('/recognize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const adminBulkCheckin = (items) => API.post('/duties/admin-checkin', items)

export const faceLearn = (formData) =>
  FACE_API.post('/learn', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Separate instance for proxy — no 401 redirect (tk token expiry ≠ local logout)
const PROXY_API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})
PROXY_API.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const proxyTkDuties = (duty_date, tk_token) =>
  PROXY_API.get('/proxy/tk/duties', { params: { duty_date, tk_token } })

export default API
