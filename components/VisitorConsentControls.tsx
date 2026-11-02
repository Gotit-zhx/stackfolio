'use client'

import { useState } from 'react'

const consentKey = 'gotit-zhx-visitor-consent'

export default function VisitorConsentControls() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function revoke() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/visitor-consent/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: 'no' }),
      })
      if (!response.ok) throw new Error('暂时无法保存，请稍后重试。')
      localStorage.setItem(consentKey, 'no')
      setMessage('已撤回同意，之后的访问不会再被记录。')
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="privacy-controls">
      <button type="button" className="secondary" disabled={busy} onClick={() => void revoke()}>
        撤回同意并停止后续记录
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  )
}
