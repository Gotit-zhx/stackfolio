import { createReadStream } from 'node:fs'
import { chmod, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { IP2Region } from 'ip2region/node'

const retentionDays = 90
const retentionMs = retentionDays * 24 * 60 * 60 * 1000

function visitorDirectory(stateDir) {
  return process.env.VISITOR_ANALYTICS_DIR || path.join(stateDir, 'visitors')
}

let query
function lookupLocation(ip) {
  if (ip.includes(':')) return 'IPv6（暂不解析属地）'
  try {
    query ||= new IP2Region({ families: [4] })
    const result = query.lookup(ip)
    return (
      [
        result?.country?.name,
        ...(result?.subdivisions || []).map((part) => part.name),
        result?.city?.name,
        result?.isp,
      ]
        .filter(Boolean)
        .join(' / ') || '未知'
    )
  } catch {
    return '未知'
  }
}

async function files(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  return entries
    .filter((entry) => entry.isFile() && /^visits-\d{4}-\d{2}-\d{2}\.jsonl$/.test(entry.name))
    .map((entry) => entry.name)
}

export function createVisitorMonitor(stateDir) {
  const directory = visitorDirectory(stateDir)
  let cache = null
  let inflight = null
  const getVisitors = async function () {
    if (cache && Date.now() - cache.at < 10_000) return cache.value
    if (inflight) return inflight
    inflight = (async () => {
      const cutoff = Date.now() - retentionMs
      const cutoffDay = new Date(cutoff).toISOString().slice(0, 10)
      const records = []
      let totalViews = 0
      const uniqueIps = new Set()
      let todayViews = 0
      const todayIps = new Set()
      const today = new Date().toISOString().slice(0, 10)
      for (const name of await files(directory)) {
        const fileDate = name.slice(7, 17)
        if (fileDate < cutoffDay) {
          await unlink(path.join(directory, name)).catch(() => {})
          continue
        }
        // Only rewrite the 90-day-old file; the site appends exclusively to today's file.
        const cutoffFileRecords = fileDate === cutoffDay ? [] : null
        const stream = readline.createInterface({
          input: createReadStream(path.join(directory, name), { encoding: 'utf8' }),
          crlfDelay: Infinity,
        })
        for await (const line of stream) {
          if (!line) continue
          try {
            const item = JSON.parse(line)
            if (
              typeof item.time === 'string' &&
              typeof item.ip === 'string' &&
              typeof item.path === 'string' &&
              Date.parse(item.time) >= cutoff
            ) {
              if (cutoffFileRecords) cutoffFileRecords.push(line)
              records.push({
                id: typeof item.id === 'string' ? item.id : `${item.time}-${item.ip}-${item.path}`,
                time: item.time,
                ip: item.ip,
                location: lookupLocation(item.ip),
                path: item.path,
              })
              totalViews++
              uniqueIps.add(item.ip)
              if (item.time.startsWith(today)) {
                todayViews++
                todayIps.add(item.ip)
              }
            }
          } catch {
            // Ignore malformed or partial records.
          }
        }
        if (cutoffFileRecords) {
          const file = path.join(directory, name)
          if (!cutoffFileRecords.length) {
            await unlink(file).catch(() => {})
          } else {
            const temporary = `${file}.${Date.now()}.tmp`
            await writeFile(temporary, `${cutoffFileRecords.join('\n')}\n`, { mode: 0o660 })
            await chmod(temporary, 0o660)
            await rename(temporary, file)
          }
        }
      }
      records.sort((a, b) => b.time.localeCompare(a.time))
      const result = {
        available: records.length > 0,
        retentionDays,
        generatedAt: new Date().toISOString(),
        totalViews,
        uniqueVisitors: uniqueIps.size,
        todayViews,
        todayUniqueVisitors: todayIps.size,
        records: records.slice(0, 200),
      }
      cache = { at: Date.now(), value: result }
      return result
    })().finally(() => {
      inflight = null
    })
    return inflight
  }
  getVisitors.clear = async () => {
    for (const name of await files(directory)) {
      const file = path.join(directory, name)
      await writeFile(file, '', { mode: 0o660 })
      await chmod(file, 0o660)
    }
    cache = null
  }
  return getVisitors
}
