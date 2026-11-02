'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const consentKey = 'gotit-zhx-visitor-consent'

async function saveConsent(value: 'yes' | 'no') {
  const response = await fetch('/api/visitor-consent/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent: value }),
    keepalive: true,
  })
  if (!response.ok) throw new Error('暂时无法保存选择，请稍后重试。')
  localStorage.setItem(consentKey, value)
  if (value === 'yes') {
    await fetch('/api/visitor-consent/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
      keepalive: true,
    })
  }
}

export default function VisitorNotice() {
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setVisible(!localStorage.getItem(consentKey))
  }, [])
  if (!visible) return null
  return (
    <aside className="visitor-notice" aria-label="访问记录说明">
      <div>
        <strong>访问记录说明</strong>
        <p>
          为了解简历投递后的访问情况，在你同意后，本网站会记录访问时间、IP 地址和访问页面，最多保留
          90 天；IP 属地由离线数据库粗略查询。你可以随时撤回并删除关联记录。
          <Link href="/privacy">查看隐私说明</Link>
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="visitor-notice-actions">
        <button
          type="button"
          className="visitor-notice-decline"
          onClick={() =>
            void saveConsent('no')
              .then(() => setVisible(false))
              .catch((reason) => setError((reason as Error).message))
          }
        >
          拒绝
        </button>
        <button
          type="button"
          className="visitor-notice-accept"
          onClick={() =>
            void saveConsent('yes')
              .then(() => setVisible(false))
              .catch((reason) => setError((reason as Error).message))
          }
        >
          同意并继续
        </button>
      </div>
    </aside>
  )
}
