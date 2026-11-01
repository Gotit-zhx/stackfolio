'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, CircleHelp, ExternalLink, Monitor, Radio } from 'lucide-react'

export default function DemoStatus({
  status,
  url,
  slug,
  repository,
}: {
  status: string
  url?: string
  slug: string
  repository: string
}) {
  const [local, setLocal] = useState(false)
  useEffect(() => {
    setLocal(['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname))
  }, [])
  const localUrl =
    url ||
    (slug === 'postmaker'
      ? 'http://localhost:8787'
      : slug === 'baicaoyuan'
        ? 'http://localhost:8088'
        : undefined)
  const validLive = (() => {
    try {
      const parsed = new URL(url || '')
      return (
        parsed.protocol === 'https:' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
      )
    } catch {
      return false
    }
  })()
  const available = status === 'live' ? validLive : status === 'local' && local && localUrl
  return (
    <div className={`demo-panel ${status}`}>
      <div className="demo-panel-heading">
        <span
          className={`status-badge status-${status === 'live' && validLive ? 'live' : status === 'local' ? 'local' : 'pending'}`}
        >
          {status === 'live' && validLive ? <Radio size={13} /> : <Monitor size={13} />}
          {status === 'live' && validLive
            ? '公网演示 · 已配置'
            : status === 'local'
              ? '本地预览 · 尚未上线'
              : '演示准备中'}
        </span>
        {available ? (
          <a
            className="text-link"
            href={status === 'live' ? url : localUrl}
            target="_blank"
            rel="noreferrer"
          >
            {status === 'live' ? '打开在线演示' : '打开本地预览'}
            <ExternalLink size={14} />
          </a>
        ) : (
          <a className="text-link" href={repository} target="_blank" rel="noreferrer">
            查看源码与部署说明
            <ArrowUpRight size={14} />
          </a>
        )}
      </div>
      <p>
        <CircleHelp size={14} />
        {status === 'local'
          ? '本地链接仅在本站的本机预览中提供，不代表服务正在运行。请先启动对应演示栈。'
          : status === 'live' && validLive
            ? '演示使用独立环境。服务可用性以实际访问结果为准，请勿提交个人敏感数据。'
            : '尚未配置可公开访问的演示地址；可以先阅读项目案例和源码。'}
      </p>
      {status === 'local' && (
        <small>
          {slug === 'postmaker'
            ? 'PostMaker：本地工作区可注册；摘要与生成需要单独配置模型密钥。'
            : slug === 'baicaoyuan'
              ? '百草园：支持匿名浏览示例内容，注册默认关闭；登录操作需本地演示账号。'
              : '账号与外部服务以项目自身配置为准。'}
        </small>
      )}
    </div>
  )
}
