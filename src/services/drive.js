/**
 * Google Drive integration for the Documents section.
 *
 * Uses the Google Identity Services (GIS) token client (loaded in index.html)
 * with the restricted `drive.file` scope: the app can only see and manage the
 * files/folders it creates or opens — never the whole Drive.
 *
 * Storage model:
 *  - The workspace owner (admin) connects their Drive once and the app creates
 *    a shared folder "Kormiis - <company>" inside it.
 *  - The folder is shared "Anyone with the link can edit", so every teammate
 *    who signs in with their own Google account can upload into the same folder.
 *  - Document METADATA stays in Firestore (already real-time synced), so we only
 *    touch Drive for the actual file bytes. Downloads open the public
 *    webContentLink — no auth required.
 */

const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const TOKEN_KEY = 'kormiis_drive_token'

const getClientId = () => (import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim()

export const isDriveConfigured = () => !!getClientId()

const hasGis = () => typeof window !== 'undefined' && !!window.google && !!window.google.accounts?.oauth2

let tokenClient = null

/**
 * Returns a Google OAuth access token for this user (with drive.file scope).
 * Prompts for consent on first use; reuses/refreshes silently afterwards.
 */
export const getDriveToken = async ({ forcePrompt = false } = {}) => {
  if (!isDriveConfigured()) {
    throw new Error('Google Drive is not configured yet. The admin needs to add the Google Client ID.')
  }
  if (!hasGis()) {
    throw new Error('Google Sign-In is still loading. Please try again in a moment.')
  }

  const saved = sessionStorage.getItem(TOKEN_KEY)
  if (saved && !forcePrompt) return saved

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: SCOPE,
      callback: () => {}
    })
  }

  const token = await new Promise((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp?.error) {
        sessionStorage.removeItem(TOKEN_KEY)
        reject(new Error(resp.error_description || resp.error || 'Google authorization failed'))
        return
      }
      if (resp?.access_token) {
        sessionStorage.setItem(TOKEN_KEY, resp.access_token)
        resolve(resp.access_token)
        return
      }
      reject(new Error('Google did not return an access token.'))
    }
    tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' })
  })

  return token
}

export const hasDriveToken = () => !!sessionStorage.getItem(TOKEN_KEY)

export const clearDriveToken = () => sessionStorage.removeItem(TOKEN_KEY)

const driveFetch = async (path, { method = 'GET', headers = {}, body } = {}) => {
  const token = await getDriveToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let message = `Drive request failed (${res.status})`
    try {
      const parsed = JSON.parse(errText)
      message = parsed.error?.message || message
    } catch (e) { /* ignore */ }
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

const ensureSharedFolder = async (folderId) => {
  // "Anyone with the link can edit" — this is what lets every teammate
  // upload/download without needing individual folder grants.
  await driveFetch(`files/${folderId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'writer', type: 'anyone' })
  }).catch((e) => {
    if (e.status !== 403) throw e
  })
}

/**
 * Finds (or creates) the company's shared Drive folder and ensures it is
 * shared with the company. Returns the folder id.
 */
export const findOrCreateCompanyFolder = async (companyUid, companyName) => {
  if (!companyUid) throw new Error('Missing company ID.')
  const folderName = `Kormiis - ${(companyName || '').trim() || companyUid}`

  const escaped = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const q = encodeURIComponent(`name='${escaped}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const list = await driveFetch(`files?q=${q}&fields=files(id,name,webViewLink)`)

  if (list?.files?.length > 0) {
    const existing = list.files[0]
    await ensureSharedFolder(existing.id)
    return { folderId: existing.id, shareLink: existing.webViewLink || '', created: false }
  }

  const created = await driveFetch('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' })
  })
  await ensureSharedFolder(created.id)
  return { folderId: created.id, shareLink: created.webViewLink || '', created: true }
}

/**
 * Uploads a file into the company's shared Drive folder.
 * Returns Drive metadata including id, name, size and webContentLink.
 */
export const uploadToDriveFolder = async (folderId, file) => {
  if (!folderId) throw new Error('No Drive folder connected yet. Ask your admin to connect Google Drive.')
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: [folderId]
  }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const token = await getDriveToken()
  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webContentLink,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    }
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let message = `Upload failed (${res.status})`
    try {
      const parsed = JSON.parse(errText)
      message = parsed.error?.message || message
    } catch (e) { /* ignore */ }
    throw new Error(message)
  }
  const data = await res.json()
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size,
    downloadUrl: data.webContentLink || data.webViewLink || '',
    viewLink: data.webViewLink || ''
  }
}

/**
 * Permanently deletes a file from the company's Drive folder.
 */
export const deleteDriveFile = async (fileId) => {
  if (!fileId) return
  await driveFetch(`files/${fileId}`, { method: 'DELETE' })
}
