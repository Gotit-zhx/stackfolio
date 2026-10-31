import os from 'node:os'
import { statfs } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const projects = ['stackfolio-site', 'stackfolio-postmaker', 'stackfolio-baicaoyuan']
const cpu = () =>
  os.cpus().reduce(
    (sum, item) => ({
      idle: sum.idle + item.times.idle,
      total: sum.total + Object.values(item.times).reduce((a, b) => a + b, 0),
    }),
    { idle: 0, total: 0 }
  )

export function createMonitor(root) {
  let previousCpu = cpu()
  const history = []
  async function sample() {
    const now = cpu()
    const total = now.total - previousCpu.total
    const cpuPercent = total
      ? Math.max(0, Math.min(100, (1 - (now.idle - previousCpu.idle) / total) * 100))
      : 0
    previousCpu = now
    const disk = await statfs(root)
    const memory = { used: os.totalmem() - os.freemem(), total: os.totalmem() }
    const sample = {
      time: new Date().toISOString(),
      cpuPercent,
      memoryPercent: (memory.used / memory.total) * 100,
    }
    history.push(sample)
    if (history.length > 60) history.shift()
    let docker = { available: false, containers: [], error: 'Docker 未运行或不可访问。' }
    try {
      const { stdout } = await run('docker', ['ps', '-a', '--format', '{{json .}}'], {
        timeout: 6000,
        maxBuffer: 2_000_000,
      })
      const containers = stdout
        .split('\n')
        .filter(Boolean)
        .map(JSON.parse)
        .filter((c) =>
          projects.some((p) =>
            (c.Labels || '').split(',').includes(`com.docker.compose.project=${p}`)
          )
        )
      let stats = []
      const ids = containers.filter((c) => c.State === 'running').map((c) => c.ID)
      if (ids.length) {
        const result = await run(
          'docker',
          ['stats', '--no-stream', '--format', '{{json .}}', ...ids],
          { timeout: 9000, maxBuffer: 2_000_000 }
        )
        stats = result.stdout.split('\n').filter(Boolean).map(JSON.parse)
      }
      docker = {
        available: true,
        error: null,
        containers: containers.map((c) => ({
          name: c.Names,
          state: c.State,
          status: c.Status,
          ...(stats.find((s) => s.Name === c.Names)
            ? {
                cpu: stats.find((s) => s.Name === c.Names).CPUPerc,
                memory: stats.find((s) => s.Name === c.Names).MemUsage,
                network: stats.find((s) => s.Name === c.Names).NetIO,
              }
            : {}),
        })),
      }
    } catch {
      /* Report unavailable instead of inventing healthy data. */
    }
    return {
      sample,
      history: [...history],
      host: {
        platform: `${os.platform()} / ${os.arch()}`,
        cpuCount: os.cpus().length,
        memory,
        uptimeSeconds: os.uptime(),
        disk: { total: disk.blocks * disk.bsize, available: disk.bavail * disk.bsize },
        scope:
          os.platform() === 'darwin'
            ? '当前 Mac 主机；容器指标来自 Docker Desktop 虚拟机。不是云服务器。'
            : '当前运行管理台的主机。',
      },
      docker,
    }
  }
  let cached, inflight
  return async function get() {
    if (cached && Date.now() - cached.at < 8000) return cached.value
    if (inflight) return inflight
    inflight = sample()
      .then((value) => {
        cached = { at: Date.now(), value }
        return value
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }
}
