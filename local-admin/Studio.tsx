import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Cpu,
  Database,
  Eye,
  FilePlus2,
  FileText,
  FolderKanban,
  HardDrive,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'

type Metadata = {
  title: string
  summary: string
  draft: boolean
  tags: string[]
  date?: string
  subtitle?: string
  category?: string
  repository?: string
  order?: number
  cover?: string
  coverAlt?: string
  demoStatus?: string
  demoUrl?: string
  screenshots?: string[]
  contributions?: string[]
  contributionNote?: string
}
type Document = {
  kind: 'blog' | 'projects'
  slug: string
  metadata: Metadata
  body: string
  version: string | null
}
type Item = Omit<Document, 'body'>
type Metrics = {
  sample: { time: string; cpuPercent: number; memoryPercent: number }
  history: { time: string; cpuPercent: number; memoryPercent: number }[]
  host: {
    platform: string
    cpuCount: number
    memory: { used: number; total: number }
    uptimeSeconds: number
    disk: { total: number; available: number }
    scope: string
  }
  docker: {
    available: boolean
    error: string
    containers: {
      name: string
      state: string
      status: string
      cpu?: string
      memory?: string
      network?: string
    }[]
  }
}
type VisitorData = {
  available: boolean
  retentionDays: number
  generatedAt: string
  totalViews: number
  uniqueVisitors: number
  todayViews: number
  todayUniqueVisitors: number
  records: { id: string; time: string; ip: string; location: string; path: string }[]
}
const site = 'http://localhost:3000'
const bytes = (n: number) => `${(n / 1024 ** 3).toFixed(1)} GB`

async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(
    `/api/${path}`,
    data === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
  )
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || `请求失败：${response.status}`)
  return result
}
function blank(kind: Document['kind']): Document {
  const common = { title: '', summary: '', draft: true, tags: [] }
  return {
    kind,
    slug: '',
    version: null,
    body: '',
    metadata:
      kind === 'blog'
        ? { ...common, date: new Date().toLocaleDateString('en-CA') }
        : {
            ...common,
            subtitle: '',
            category: '',
            repository: '',
            order: 3,
            cover: '',
            coverAlt: '',
            demoStatus: 'not-deployed',
            demoUrl: '',
            screenshots: [],
            contributions: [],
            contributionNote: '',
          },
  }
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="brand-mark">G/</span>
        <p className="eyebrow">GOTIT-ZHX / PRIVATE STUDIO</p>
        <h1>欢迎回到工作台。</h1>
        <p className="muted">内容编辑与资源监控，只有你可以访问。</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            try {
              await api('login', { password })
              onLogin()
            } catch (error) {
              setError((error as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <label>
            本机访问码
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入本机生成的访问码"
            />
          </label>
          <p className="help">
            在终端读取项目内 <code>.local-admin/access-code</code>。访问码不会在公开网站显示。
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            <KeyRound size={16} />
            {busy ? '正在验证…' : '进入个人管理台'}
          </button>
        </form>
        <div className="private-note">
          <LockKeyhole size={14} /> 127.0.0.1:9090 · 仅回环地址 · 会话认证
        </div>
      </div>
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="chart-wait">采样中，约 10 秒后显示趋势</div>
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 300},${70 - v * 0.6}`)
    .join(' ')
  return (
    <svg
      className="sparkline"
      viewBox="0 0 300 75"
      preserveAspectRatio="none"
      role="img"
      aria-label="最近的 CPU 用量趋势"
    >
      <line x1="0" x2="300" y1="70" y2="70" stroke="currentColor" opacity=".15" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Monitor({
  metrics,
  loading,
  refresh,
}: {
  metrics: Metrics | null
  loading: boolean
  refresh: () => void
}) {
  const host = metrics?.host
  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow">OBSERVABILITY</p>
          <h2>运行状态</h2>
        </div>
        <button className="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          刷新
        </button>
      </div>
      <p className="scope">{host?.scope || '正在获取当前主机与 Docker 实时数据。'}</p>
      <div className="metric-grid">
        <article className="metric">
          <div>
            <Cpu size={17} />
            <span>主机 CPU</span>
          </div>
          <strong>{metrics ? `${metrics.sample.cpuPercent.toFixed(1)}%` : '—'}</strong>
          <small>{host ? `${host.cpuCount} 核 / ${host.platform}` : '等待采样'}</small>
          <Sparkline values={metrics?.history.map((s) => s.cpuPercent) || []} />
        </article>
        <article className="metric">
          <div>
            <Database size={17} />
            <span>主机内存</span>
          </div>
          <strong>{metrics ? `${metrics.sample.memoryPercent.toFixed(1)}%` : '—'}</strong>
          <small>
            {host ? `${bytes(host.memory.used)} / ${bytes(host.memory.total)}` : '等待采样'}
          </small>
          <progress max="100" value={metrics?.sample.memoryPercent || 0} />
          <small>操作系统已用内存，包含缓存</small>
        </article>
        <article className="metric">
          <div>
            <HardDrive size={17} />
            <span>磁盘可用空间</span>
          </div>
          <strong>{host ? bytes(host.disk.available) : '—'}</strong>
          <small>{host ? `所在卷总容量 ${bytes(host.disk.total)}` : '等待采样'}</small>
          <progress
            max="100"
            value={host ? (1 - host.disk.available / host.disk.total) * 100 : 0}
          />
          <small>
            {host ? `主机运行 ${Math.floor(host.uptimeSeconds / 3600)} 小时` : '等待采样'}
          </small>
        </article>
      </div>
      <article className="panel">
        <div className="panel-title">
          <h3>
            <Server size={17} />
            项目容器
          </h3>
          <span className="pill">只读监控</span>
        </div>
        <p className="help">
          仅显示 Stackfolio 管理的三组 Compose 服务，不读取环境变量、应用日志或其他容器。
        </p>
        {metrics?.docker.available ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>服务</th>
                  <th>状态</th>
                  <th>CPU</th>
                  <th>内存</th>
                  <th>网络 I/O</th>
                </tr>
              </thead>
              <tbody>
                {metrics.docker.containers.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>
                      <span className={`state ${c.state === 'running' ? 'running' : ''}`} />
                      {c.status}
                    </td>
                    <td>{c.cpu || '—'}</td>
                    <td>{c.memory || '—'}</td>
                    <td>{c.network || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!metrics.docker.containers.length && (
              <p className="empty">没有发现项目容器。请使用 local-server/start.sh 启动。</p>
            )}
          </div>
        ) : (
          <p className="empty">{metrics?.docker.error || '正在读取容器状态…'}</p>
        )}
        <p className="help">
          每 10 秒自动刷新 ·{' '}
          {metrics ? `上次采样 ${new Date(metrics.sample.time).toLocaleTimeString()}` : '等待数据'}
        </p>
      </article>
      <div className="boundary">
        <ShieldCheck size={20} />
        <div>
          <b>个人运维面保持私有</b>
          <p>
            当前显示本机数据。以后可在云服务器通过 SSH 隧道访问同一管理台；不应将 9090 端口或 Docker
            socket 暴露到公网。公众只看到作品、文章与项目演示。
          </p>
        </div>
      </div>
    </section>
  )
}

function VisitorAnalytics({
  data,
  loading,
  refresh,
}: {
  data: VisitorData | null
  loading: boolean
  refresh: () => void
}) {
  const [notice, setNotice] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  async function clearRecords() {
    try {
      const response = await fetch('/api/visitors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_VISIT_RECORDS' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '清空失败')
      setNotice('访问记录已清空。')
      setConfirmClear(false)
      refresh()
    } catch (error) {
      setNotice((error as Error).message)
    }
  }
  return (
    <section>
      <div className="section-title">
        <div>
          <p className="eyebrow">SITE TRAFFIC / CONSENT BASED</p>
          <h2>访客记录</h2>
        </div>
        <button className="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          刷新
        </button>
      </div>
      <p className="scope">
        仅统计同意访问记录的主站访客。按 IP 粗略去重，属地来自离线数据库，可能不准确。
      </p>
      <div className="metric-grid visitor-metric-grid">
        <article className="metric">
          <div>
            <Activity size={17} />
            <span>累计页面访问</span>
          </div>
          <strong>{data?.totalViews ?? '—'}</strong>
          <small>最多保留 {data?.retentionDays ?? 90} 天</small>
        </article>
        <article className="metric">
          <div>
            <Users size={17} />
            <span>累计 IP 数</span>
          </div>
          <strong>{data?.uniqueVisitors ?? '—'}</strong>
          <small>同一 IP 可能对应多人</small>
        </article>
        <article className="metric">
          <div>
            <Activity size={17} />
            <span>今日页面访问</span>
          </div>
          <strong>{data?.todayViews ?? '—'}</strong>
          <small>以 UTC 日期统计</small>
        </article>
        <article className="metric">
          <div>
            <Users size={17} />
            <span>今日 IP 数</span>
          </div>
          <strong>{data?.todayUniqueVisitors ?? '—'}</strong>
          <small>按 IP 粗略去重</small>
        </article>
      </div>
      <article className="panel">
        <div className="panel-title">
          <h3>
            <Users size={17} />
            最近访问
          </h3>
          <div className="visitor-panel-actions">
            <span className="pill">完整 IP / 私有数据</span>
            {confirmClear ? (
              <>
                <button className="secondary small" onClick={() => setConfirmClear(false)}>
                  取消
                </button>
                <button className="danger small" onClick={() => void clearRecords()}>
                  确认清空
                </button>
              </>
            ) : (
              <button className="secondary small" onClick={() => setConfirmClear(true)}>
                清空记录
              </button>
            )}
          </div>
        </div>
        {notice && (
          <p className="message" role="status">
            {notice}
          </p>
        )}
        <p className="help">
          展示最近 200 条记录。IP 属地为网络出口的大致位置，不能确认访问者的身份或个人精确位置。
        </p>
        {data?.records.length ? (
          <div className="table-scroll">
            <table className="visitor-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>IP 地址</th>
                  <th>粗略属地 / 运营商</th>
                  <th>页面</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.time).toLocaleString()}</td>
                    <td className="visitor-ip">{record.ip}</td>
                    <td>{record.location}</td>
                    <td className="visitor-path">{record.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">暂无已同意访客的记录。访客选择拒绝时不会被记录。</p>
        )}
      </article>
      <div className="boundary">
        <ShieldCheck size={20} />
        <div>
          <b>收集范围与隐私边界</b>
          <p>
            只收集同意后的主站页面访问；随机第一方标识仅用于撤回时删除关联记录，不抓取来源页面、浏览器指纹或表单内容。记录保存
            90 天，管理台通过本机或 SSH 隧道访问。
          </p>
        </div>
      </div>
    </section>
  )
}

function Editor({
  value,
  setValue,
  onSaved,
  onCancel,
}: {
  value: Document
  setValue: (doc: Document | null) => void
  onSaved: (doc: Document) => void
  onCancel: () => void
}) {
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const patch = (fields: Partial<Metadata>) => {
    setValue({ ...value, metadata: { ...value.metadata, ...fields } })
    setConfirmPublish(false)
  }
  async function save(draft: boolean) {
    setBusy(true)
    setNotice('')
    try {
      const doc = await api<Document>('document', {
        ...value,
        metadata: { ...value.metadata, draft },
      })
      onSaved(doc)
      setNotice(
        draft
          ? '草稿已写入仓库文件。可继续编辑。'
          : '已发布到源文件。开发服务会自动更新；容器站点需重新构建才能生效。'
      )
      setConfirmPublish(false)
    } catch (error) {
      setNotice((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setNotice('')
    try {
      if (file.size > 1_400_000) throw new Error('图片请控制在 1.4MB 以内。')
      const buffer = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (const b of buffer) binary += String.fromCharCode(b)
      const result = await api<{ path: string }>('upload', {
        slug: value.slug,
        base64: btoa(binary),
      })
      patch({
        cover: value.metadata.cover || result.path,
        screenshots: [...(value.metadata.screenshots || []), result.path],
      })
      setNotice('图片已上传。保存项目后才会加入案例。')
    } catch (error) {
      setNotice((error as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const m = value.metadata
  return (
    <section className="editor">
      <div className="section-title">
        <div>
          <p className="eyebrow">
            CONTENT STUDIO / {value.kind === 'blog' ? 'ARTICLE' : 'PROJECT'}
          </p>
          <h2>{value.version ? '编辑内容' : '写一点新东西。'}</h2>
        </div>
        <button className="secondary" onClick={onCancel}>
          <ArrowLeft size={15} />
          返回列表
        </button>
      </div>
      <div className="editor-note">
        <LockKeyhole size={14} /> 草稿不会进入公开页面。保存会写入
        MDX，保留本地备份；发布不会自动提交 Git。
      </div>
      <div className="panel">
        <div className="editor-fields">
          <label>
            标题
            <input
              value={m.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="一个清楚的标题"
            />
          </label>
          <div className="two-col">
            <label>
              URL slug
              <input
                disabled={value.version !== null}
                value={value.slug}
                pattern="[a-z0-9][a-z0-9-]*"
                onChange={(e) => setValue({ ...value, slug: e.target.value })}
                placeholder="my-new-post"
              />
              <span className="help">英文字母、数字与短横线；保存后固定</span>
            </label>
            {value.kind === 'blog' ? (
              <label>
                发布日期
                <input
                  type="date"
                  value={m.date}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </label>
            ) : (
              <label>
                排序
                <input
                  type="number"
                  min="0"
                  value={m.order}
                  onChange={(e) => patch({ order: Number(e.target.value) })}
                />
              </label>
            )}
          </div>
          <label>
            摘要
            <textarea
              rows={2}
              value={m.summary}
              onChange={(e) => patch({ summary: e.target.value })}
              placeholder="用于列表和搜索结果的简短说明"
            />
          </label>
          <label>
            标签（英文逗号分隔）
            <input
              value={m.tags.join(',')}
              onChange={(e) => patch({ tags: e.target.value.split(',').map((v) => v.trim()) })}
              onBlur={() => patch({ tags: m.tags.filter(Boolean) })}
            />
          </label>
          {value.kind === 'projects' && (
            <>
              <div className="two-col">
                <label>
                  英文副标题
                  <input value={m.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
                </label>
                <label>
                  项目分类
                  <input value={m.category} onChange={(e) => patch({ category: e.target.value })} />
                </label>
              </div>
              <label>
                GitHub 仓库
                <input
                  type="url"
                  value={m.repository}
                  onChange={(e) => patch({ repository: e.target.value })}
                />
              </label>
              <div className="two-col">
                <label>
                  演示状态
                  <select
                    value={m.demoStatus}
                    onChange={(e) => patch({ demoStatus: e.target.value })}
                  >
                    <option value="not-deployed">尚未部署</option>
                    <option value="local">本地预览（仅本人）</option>
                    <option value="live">公网在线</option>
                  </select>
                </label>
                <label>
                  演示 URL
                  <input
                    value={m.demoUrl || ''}
                    onChange={(e) => patch({ demoUrl: e.target.value })}
                    placeholder="在线时必须填写 https://…"
                  />
                </label>
              </div>
              <label>
                封面图片路径
                <input
                  value={m.cover}
                  onChange={(e) => patch({ cover: e.target.value })}
                  placeholder="/projects/项目名/图片.jpg"
                />
              </label>
              <label>
                封面描述
                <input value={m.coverAlt} onChange={(e) => patch({ coverAlt: e.target.value })} />
              </label>
              <label>
                截图路径（每行一张）
                <textarea
                  rows={3}
                  value={m.screenshots?.join('\n') || ''}
                  onChange={(e) => patch({ screenshots: e.target.value.split('\n') })}
                  onBlur={() => patch({ screenshots: m.screenshots?.filter(Boolean) })}
                />
              </label>
              <button
                className="secondary fit"
                onClick={() => fileRef.current?.click()}
                disabled={busy || !value.slug}
              >
                <ImagePlus size={16} />
                上传项目截图
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
              <label>
                个人贡献（每行一项）
                <textarea
                  rows={3}
                  value={m.contributions?.join('\n') || ''}
                  onChange={(e) => patch({ contributions: e.target.value.split('\n') })}
                  onBlur={() => patch({ contributions: m.contributions?.filter(Boolean) })}
                />
              </label>
              <label>
                职责范围说明
                <input
                  value={m.contributionNote || ''}
                  onChange={(e) => patch({ contributionNote: e.target.value })}
                  placeholder="例如：本人独立开发；或说明协作分工"
                />
              </label>
            </>
          )}
          <div className="body-title">
            <span>正文 / Markdown</span>
            <button className="secondary small" onClick={() => setPreview(!preview)}>
              <Eye size={15} />
              {preview ? '编辑正文' : '阅读预览'}
            </button>
          </div>
          {preview ? (
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value.body || '*还没有正文。*'}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              className="body-input"
              aria-label="正文 Markdown"
              rows={17}
              value={value.body}
              onChange={(e) => {
                setValue({ ...value, body: e.target.value })
                setConfirmPublish(false)
              }}
              placeholder={'## 从一个问题开始\n\n记录实现过程、取舍与边界。'}
            />
          )}
          <p className="help">
            预览支持 Markdown；自定义 MDX 组件请在公开站点构建后核验。保存前会检查 MDX 语法。
          </p>
        </div>
        <div className="editor-actions">
          <span className="pill">{m.draft ? '草稿' : '已发布'}</span>
          <button className="secondary" disabled={busy} onClick={() => void save(true)}>
            <Save size={16} />
            {m.draft ? '保存草稿' : '转为草稿'}
          </button>
          <button
            className="primary"
            disabled={busy || !value.slug || !m.title.trim()}
            onClick={() => setConfirmPublish(true)}
          >
            <Upload size={16} />
            发布内容
          </button>
        </div>
        {confirmPublish && (
          <div className="publish-confirm">
            <p>发布后内容会进入公开列表、详情页、RSS 和站点地图。已核对内容与公开信息？</p>
            <button className="primary" disabled={busy} onClick={() => void save(false)}>
              <Check size={15} />
              确认发布
            </button>
            <button className="secondary" onClick={() => setConfirmPublish(false)}>
              继续编辑
            </button>
          </div>
        )}
        {notice && (
          <p className="message" role="status">
            {notice}
          </p>
        )}
      </div>
    </section>
  )
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [tab, setTab] = useState<'content' | 'monitor' | 'visitors'>('content')
  const [items, setItems] = useState<Item[]>([])
  const [editor, setEditor] = useState<Document | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    api<{ authenticated: boolean }>('session')
      .then((v) => setAuthenticated(v.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setMetrics(await api<Metrics>('metrics'))
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  const refreshVisitors = useCallback(async () => {
    setLoading(true)
    try {
      setVisitorData(await api<VisitorData>('visitors'))
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  async function list() {
    try {
      setItems(await api<Item[]>('content'))
    } catch (error) {
      setMessage((error as Error).message)
    }
  }
  useEffect(() => {
    if (!authenticated) return
    void list()
    void refresh()
    const timer = setInterval(() => {
      void refresh()
      if (tab === 'visitors') void refreshVisitors()
    }, 10_000)
    return () => clearInterval(timer)
  }, [authenticated, refresh, refreshVisitors, tab])
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', before)
    return () => window.removeEventListener('beforeunload', before)
  }, [dirty])
  const canLeave = () => !dirty || window.confirm('当前修改还未保存，确定离开？')
  if (authenticated === null) return <div className="login-screen muted">正在打开个人工作台…</div>
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />
  return (
    <div className="studio">
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={(event) => {
            event.preventDefault()
            if (canLeave()) {
              setEditor(null)
              setDirty(false)
            }
          }}
        >
          <span className="brand-mark">G/</span>
          <span>
            GOTIT <i>/ STUDIO</i>
          </span>
        </button>
        <div className="private-label">
          <LockKeyhole size={13} /> PERSONAL / LOCAL ONLY
        </div>
        <button
          className="icon-button"
          aria-label="退出登录"
          onClick={async () => {
            if (!canLeave()) return
            await api('logout', {})
            setAuthenticated(false)
            setItems([])
            setMetrics(null)
            setEditor(null)
            setDirty(false)
          }}
        >
          <LogOut size={18} />
        </button>
      </header>
      <div className="studio-grid">
        <aside className="sidebar">
          <p className="eyebrow">WORKSPACE</p>
          <button
            className={tab === 'content' ? 'active' : ''}
            onClick={() => {
              if (canLeave()) {
                setTab('content')
                setEditor(null)
                setDirty(false)
              }
            }}
          >
            <FileText size={18} />
            内容管理
            <ChevronRight size={14} />
          </button>
          <button
            className={tab === 'monitor' ? 'active' : ''}
            onClick={() => {
              if (canLeave()) {
                setTab('monitor')
                setEditor(null)
                setDirty(false)
              }
            }}
          >
            <Activity size={18} />
            资源监控
            <ChevronRight size={14} />
          </button>
          <button
            className={tab === 'visitors' ? 'active' : ''}
            onClick={() => {
              if (canLeave()) {
                setTab('visitors')
                setEditor(null)
                setDirty(false)
                void refreshVisitors()
              }
            }}
          >
            <Users size={18} />
            访客记录
            <ChevronRight size={14} />
          </button>
          <a href={site} target="_blank" rel="noreferrer">
            <ArrowUpRight size={18} />
            打开公开站点
          </a>
          <div className="sidebar-foot">
            <ShieldCheck size={19} />
            <p>
              公开站点不包含
              <br />
              内容写入与监控 API
            </p>
          </div>
        </aside>
        <main className="workspace">
          {message && (
            <p className="message" role="status">
              {message}
            </p>
          )}
          {editor ? (
            <Editor
              value={editor}
              setValue={(doc) => {
                setEditor(doc)
                setDirty(true)
              }}
              onSaved={(doc) => {
                setEditor(doc)
                setDirty(false)
                void list()
              }}
              onCancel={() => {
                if (canLeave()) {
                  setEditor(null)
                  setDirty(false)
                }
              }}
            />
          ) : tab === 'monitor' ? (
            <Monitor metrics={metrics} loading={loading} refresh={() => void refresh()} />
          ) : tab === 'visitors' ? (
            <VisitorAnalytics
              data={visitorData}
              loading={loading}
              refresh={() => void refreshVisitors()}
            />
          ) : (
            <>
              <div className="section-title">
                <div>
                  <p className="eyebrow">PERSONAL PUBLISHING</p>
                  <h1>
                    让想法，持续生长<span>.</span>
                  </h1>
                  <p className="muted">文章与项目统一维护。先写草稿，再发布。</p>
                </div>
                <span className="pill">
                  <ShieldCheck size={14} /> 私有管理区
                </span>
              </div>
              <div className="new-content-grid">
                <button className="new-content" onClick={() => setEditor(blank('blog'))}>
                  <FilePlus2 size={24} />
                  <div>
                    <h2>写一篇博客</h2>
                    <p>Markdown 编辑、阅读预览与草稿管理</p>
                  </div>
                  <ArrowUpRight size={20} />
                </button>
                <button className="new-content" onClick={() => setEditor(blank('projects'))}>
                  <FolderKanban size={24} />
                  <div>
                    <h2>添加项目案例</h2>
                    <p>截图、贡献、源码与演示入口</p>
                  </div>
                  <ArrowUpRight size={20} />
                </button>
              </div>
              <article className="panel">
                <div className="panel-title">
                  <h3>
                    <LayoutDashboard size={17} />
                    内容库
                  </h3>
                  <span className="help">{items.length} 篇 / 项</span>
                </div>
                <div className="content-list">
                  {items.map((item) => (
                    <button
                      key={`${item.kind}/${item.slug}`}
                      className="content-row"
                      onClick={async () => {
                        try {
                          setEditor(
                            await api<Document>(`document?kind=${item.kind}&slug=${item.slug}`)
                          )
                          setMessage('')
                        } catch (error) {
                          setMessage((error as Error).message)
                        }
                      }}
                    >
                      <span className="content-kind">
                        {item.kind === 'blog' ? <FileText size={17} /> : <FolderKanban size={17} />}
                      </span>
                      <div>
                        <h3>{item.metadata.title}</h3>
                        <p>
                          {item.kind === 'blog' ? '博客' : '项目'} / {item.slug}
                        </p>
                      </div>
                      <span className={`pill ${item.metadata.draft ? 'draft' : ''}`}>
                        {item.metadata.draft ? '草稿' : '已发布'}
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </article>
              <div className="boundary">
                <ShieldCheck size={20} />
                <div>
                  <b>发布到源文件，不直接修改运行中的容器</b>
                  <p>
                    开发模式会自动重载。主站通过 Compose 运行时，发布后执行{' '}
                    <code>./local-server/start.sh site</code> 重新构建。备份与操作记录仅留在本机
                    .local-admin 目录。
                  </p>
                </div>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <LockKeyhole size={12} /> PRIVATE STUDIO / GOTIT-ZHX
            <span>数据不会发送到第三方服务</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
