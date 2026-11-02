import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createVisitorMonitor } from './visitors.mjs'
import { createVisitorStore } from '../lib/visitor-store.mjs'

test('visitor monitor only reads records within the 90-day retention window', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-visitors-test-'))
  const stateDir = path.join(root, '.local-admin')
  const directory = path.join(stateDir, 'visitors')
  await mkdir(directory, { recursive: true })
  t.after(() => rm(root, { recursive: true, force: true }))

  const now = new Date()
  const recentDay = now.toISOString().slice(0, 10)
  const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)
  const oldDay = oldDate.toISOString().slice(0, 10)
  const current = {
    time: now.toISOString(),
    ip: '2001:db8::1',
    path: '/about/',
  }
  await writeFile(path.join(directory, `visits-${recentDay}.jsonl`), `${JSON.stringify(current)}\n`)
  await writeFile(
    path.join(directory, `visits-${oldDay}.jsonl`),
    `${JSON.stringify({ ...current, time: oldDate.toISOString() })}\n`
  )

  const stats = await createVisitorMonitor(stateDir)()
  assert.equal(stats.retentionDays, 90)
  assert.equal(stats.totalViews, 1)
  assert.equal(stats.uniqueVisitors, 1)
  assert.equal(stats.records[0].ip, current.ip)
  assert.equal(stats.records[0].path, current.path)
  assert.match(stats.records[0].location, /IPv6/)
  assert.deepEqual(await readdir(directory), [`visits-${recentDay}.jsonl`])
  assert.match(
    await readFile(path.join(directory, `visits-${recentDay}.jsonl`), 'utf8'),
    /2001:db8::1/
  )
})

test('visitor store deletes all records for a visitor on consent withdrawal', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-visitor-store-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const store = createVisitorStore(root)
  await store.record('203.0.113.10', '/', 'visitor-a')
  await store.record('203.0.113.10', '/about', 'visitor-a')
  await store.record('203.0.113.11', '/', 'visitor-b')
  await store.deleteVisitor('visitor-a')
  const contents = await readFile(
    path.join(root, `visits-${new Date().toISOString().slice(0, 10)}.jsonl`),
    'utf8'
  )
  assert.doesNotMatch(contents, /visitor-a/)
  assert.match(contents, /visitor-b/)
})

test('visitor store removes records older than 90 days while preserving the exact cutoff', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-visitor-retention-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const now = new Date('2026-11-02T12:00:00.000Z')
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const store = createVisitorStore(root, { clock: () => now })
  const day = now.toISOString().slice(0, 10)
  await writeFile(
    path.join(root, `visits-${day}.jsonl`),
    [
      JSON.stringify({ id: 'expired', time: new Date(cutoff.getTime() - 1).toISOString() }),
      JSON.stringify({ id: 'cutoff', time: cutoff.toISOString() }),
    ].join('\n') + '\n'
  )
  await store.record('203.0.113.12', '/', 'visitor-current')
  const rows = (await readFile(path.join(root, `visits-${day}.jsonl`), 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  assert.equal(
    rows.some((row) => row.id === 'expired'),
    false
  )
  assert.equal(
    rows.some((row) => row.id === 'cutoff'),
    true
  )
  assert.equal(rows.length, 2)
})

test('visitor store serializes concurrent appends without losing records', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-visitor-concurrent-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const store = createVisitorStore(root)
  await Promise.all(
    Array.from({ length: 40 }, (_, index) =>
      store.record(`203.0.113.${index + 1}`, `/page-${index}`, `visitor-${index}`)
    )
  )
  const contents = await readFile(
    path.join(root, `visits-${new Date().toISOString().slice(0, 10)}.jsonl`),
    'utf8'
  )
  assert.equal(contents.trim().split('\n').length, 40)
})

test('visitor store shares records with the admin group while keeping the directory private', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-visitor-permissions-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const store = createVisitorStore(root)
  await store.record('203.0.113.20', '/', 'visitor-shared')

  const directoryMode = (await stat(root)).mode & 0o7777
  const fileMode =
    (await stat(path.join(root, `visits-${new Date().toISOString().slice(0, 10)}.jsonl`))).mode &
    0o777
  assert.equal(directoryMode, 0o2770)
  assert.equal(fileMode, 0o660)
})

test('visitor monitor returns empty data without creating a missing shared directory', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-visitors-missing-'))
  const stateDir = path.join(root, '.local-admin')
  t.after(() => rm(root, { recursive: true, force: true }))

  const stats = await createVisitorMonitor(stateDir)()
  assert.equal(stats.totalViews, 0)
  await assert.rejects(readdir(path.join(stateDir, 'visitors')), { code: 'ENOENT' })
})
