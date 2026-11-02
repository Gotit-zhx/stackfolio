import { appendFile, chmod, mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

let writes = Promise.resolve()

function exclusive(task) {
  const current = writes.then(task, task)
  writes = current.catch(() => {})
  return current
}

export function createVisitorStore(directory, { clock = () => new Date() } = {}) {
  async function pruneExpired(now) {
    const cutoff = now.getTime() - 90 * 24 * 60 * 60 * 1000
    const names = await readdir(directory).catch((error) =>
      error.code === 'ENOENT' ? [] : Promise.reject(error)
    )
    for (const name of names) {
      if (!/^visits-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) continue
      const file = path.join(directory, name)
      const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean)
      const kept = lines.filter((line) => {
        try {
          return Date.parse(JSON.parse(line).time) >= cutoff
        } catch {
          return false
        }
      })
      if (kept.length === lines.length) continue
      if (kept.length === 0) {
        await unlink(file).catch(() => {})
      } else {
        const temporary = `${file}.${randomUUID()}.tmp`
        await writeFile(temporary, `${kept.join('\n')}\n`, { mode: 0o660 })
        await chmod(temporary, 0o660)
        await rename(temporary, file)
      }
    }
  }

  return {
    async record(ip, pathname, visitorId) {
      return exclusive(async () => {
        const now = clock()
        await mkdir(directory, { recursive: true, mode: 0o770 })
        await chmod(directory, 0o2770)
        await pruneExpired(now)
        const visit = {
          id: randomUUID(),
          visitorId,
          time: now.toISOString(),
          ip,
          path: pathname,
        }
        const today = now.toISOString().slice(0, 10)
        await appendFile(
          path.join(directory, `visits-${today}.jsonl`),
          `${JSON.stringify(visit)}\n`,
          { mode: 0o600 }
        )
        await chmod(path.join(directory, `visits-${today}.jsonl`), 0o660).catch((error) => {
          if (error.code !== 'EPERM') throw error
        })
        return visit
      })
    },
    async deleteVisitor(visitorId) {
      if (!visitorId) return
      await exclusive(async () => {
        await mkdir(directory, { recursive: true, mode: 0o770 })
        await chmod(directory, 0o2770)
        const names = await readdir(directory)
        for (const name of names) {
          if (!/^visits-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) continue
          const file = path.join(directory, name)
          const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean)
          const kept = lines.filter((line) => {
            try {
              return JSON.parse(line).visitorId !== visitorId
            } catch {
              return false
            }
          })
          if (kept.length === lines.length) continue
          if (!kept.length) {
            await unlink(file).catch(() => {})
          } else {
            const temporary = `${file}.${randomUUID()}.tmp`
            await writeFile(temporary, `${kept.join('\n')}\n`, { mode: 0o660 })
            await chmod(temporary, 0o660)
            await rename(temporary, file)
          }
        }
      })
    },
  }
}

const store = createVisitorStore(process.env.VISITOR_ANALYTICS_DIR || '/app/.visitor-analytics')

export const recordVisit = (...args) => store.record(...args)
export const deleteVisitorVisits = (visitorId) => store.deleteVisitor(visitorId)
