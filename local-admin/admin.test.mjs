import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rename, rm, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { request } from 'node:http'
import { createAdminServer } from './server.mjs'

test('private studio: authentication, request boundaries, content persistence and conflicts', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-admin-test-'))
  const stateDir = path.join(root, '.local-admin')
  await mkdir(path.join(root, 'data/blog'), { recursive: true })
  await mkdir(path.join(root, 'data/projects'), { recursive: true })
  await mkdir(path.join(root, 'public/projects'), { recursive: true })
  const { server } = await createAdminServer({
    root,
    stateDir,
    password: 'test-local-access',
    port: 0,
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  })
  let cookie = ''
  const get = (url, headers = {}) =>
    fetch(origin + url, { headers: { Cookie: cookie, ...headers } })
  const post = (url, payload, headers = {}) =>
    fetch(origin + url, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, ...headers },
      body: JSON.stringify(payload),
    })

  assert.equal(server.address().address, '127.0.0.1')
  for (const endpoint of ['/api/content', '/api/metrics', '/api/document?kind=blog&slug=sample'])
    assert.equal((await get(endpoint)).status, 401)
  const hostileHost = await new Promise((resolve, reject) => {
    request(origin + '/api/session', { headers: { Host: 'evil.example' } }, (response) => {
      response.resume()
      resolve(response.statusCode)
    })
      .on('error', reject)
      .end()
  })
  assert.equal(hostileHost, 403)
  assert.equal((await get('/api/session', { Origin: 'https://evil.example' })).status, 403)
  assert.equal((await get('/api/session', { 'Sec-Fetch-Site': 'cross-site' })).status, 403)
  assert.equal((await post('/api/login', { password: 'wrong' })).status, 401)
  const login = await post('/api/login', { password: 'test-local-access' })
  assert.equal(login.status, 200)
  assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
  assert.match(login.headers.get('content-security-policy'), /frame-ancestors 'none'/)
  cookie = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await get('/api/session')).headers.get('cache-control'), 'no-store')
  assert.equal((await post('/api/document', {}, { Origin: 'https://evil.example' })).status, 403)
  assert.equal((await post('/api/document', {}, { Origin: '' })).status, 403)
  const entry = {
    kind: 'blog',
    slug: 'verification-draft',
    version: null,
    metadata: {
      title: '测试草稿',
      date: '2026-10-31',
      draft: true,
      tags: ['测试'],
      summary: '本地内容维护验证',
    },
    body: '## 草稿\n\n这是一篇用于验证本地管理台保存、读取和发布的测试文章，测试完成后不会保留。',
  }
  const draftResponse = await post('/api/document', entry)
  assert.equal(draftResponse.status, 200)
  const draft = await draftResponse.json()
  assert.equal(draft.metadata.draft, true)
  assert.equal((await (await get('/api/content')).json()).length, 1)
  assert.match(
    await readFile(path.join(root, 'data/blog/verification-draft.mdx'), 'utf8'),
    /draft: true/
  )
  assert.equal((await post('/api/document', entry)).status, 409)
  assert.equal((await post('/api/document', { ...entry, slug: '../escape' })).status, 400)
  assert.equal(
    (
      await post('/api/document', {
        ...entry,
        slug: 'bad-date',
        metadata: { ...entry.metadata, date: '2026-02-30' },
      })
    ).status,
    400
  )
  assert.equal(
    (await post('/api/document', { ...entry, slug: 'bad-mdx', body: '<Broken' })).status,
    400
  )
  const publishedResponse = await post('/api/document', {
    ...draft,
    metadata: { ...draft.metadata, draft: false },
  })
  assert.equal(publishedResponse.status, 200)
  const published = await publishedResponse.json()
  assert.equal(published.metadata.draft, false)
  assert.equal((await readdir(path.join(stateDir, 'backups'))).length, 1)
  assert.match(await readFile(path.join(stateDir, 'audit.jsonl'), 'utf8'), /publish/)
  assert.equal((await post('/api/upload', { slug: '../escape', base64: 'x' })).status, 400)
  assert.equal(
    (
      await post('/api/upload', {
        slug: 'sample',
        base64: Buffer.from('<script>').toString('base64'),
      })
    ).status,
    400
  )
  const image = await post('/api/upload', {
    slug: 'sample',
    base64:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lQ0AAAAASUVORK5CYII=',
  })
  assert.equal(image.status, 200)
  const { path: imagePath } = await image.json()
  assert.equal((await get(imagePath)).status, 200)
  const outside = path.join(root, 'outside-uploads')
  await mkdir(outside)
  await symlink(outside, path.join(root, 'public/projects/linked-upload'))
  const uploadPayload = {
    slug: 'linked-upload',
    base64: (await readFile(path.join(root, 'public', imagePath))).toString('base64'),
  }
  assert.equal((await post('/api/upload', uploadPayload)).status, 400)
  assert.deepEqual(await readdir(outside), [])
  await symlink(
    path.join(root, 'public', imagePath),
    path.join(root, 'public/projects/sample/linked.png')
  )
  assert.equal((await get('/projects/sample/linked.png')).status, 400)
  const project = {
    kind: 'projects',
    slug: 'sample-project',
    version: null,
    metadata: {
      title: '项目测试',
      summary: '验证项目元数据',
      draft: true,
      tags: [],
      subtitle: 'TEST PROJECT',
      category: '测试',
      repository: 'https://github.com/Gotit-zhx/PostMaker',
      order: 3,
      cover: imagePath,
      coverAlt: '测试图片',
      screenshots: [imagePath],
      contributions: ['已确认负责的模块'],
      demoStatus: 'local',
    },
    body: '## 项目测试',
  }
  assert.equal((await post('/api/document', project)).status, 200)
  assert.equal(
    (
      await post('/api/document', {
        ...project,
        slug: 'linked-image',
        metadata: { ...project.metadata, cover: '/projects/sample/linked.png' },
      })
    ).status,
    400
  )
  assert.equal(
    (
      await post('/api/document', {
        ...project,
        slug: 'unsafe-live',
        metadata: { ...project.metadata, demoStatus: 'live', demoUrl: 'http://localhost:8787' },
      })
    ).status,
    400
  )
  await symlink(
    path.join(root, 'data/blog/verification-draft.mdx'),
    path.join(root, 'data/blog/linked.mdx')
  )
  assert.equal((await get('/api/document?kind=blog&slug=linked')).status, 400)
  await rename(path.join(root, 'public/projects'), path.join(root, 'public/projects-original'))
  await symlink(outside, path.join(root, 'public/projects'))
  assert.equal((await post('/api/upload', { ...uploadPayload, slug: 'new-folder' })).status, 400)
  assert.deepEqual(await readdir(outside), [])
  assert.equal((await post('/api/logout', {})).status, 200)
  assert.equal((await get('/api/content')).status, 401)
  assert.equal((await get(imagePath)).status, 401)
})

test('login attempts are rate limited', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-login-test-'))
  const { server } = await createAdminServer({
    root,
    stateDir: path.join(root, '.local-admin'),
    password: 'test-code',
    port: 0,
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  })
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await fetch(origin + '/api/login', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: '{"password":"wrong"}',
        })
      ).status,
      401
    )
  assert.equal(
    (
      await fetch(origin + '/api/login', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: '{"password":"test-code"}',
      })
    ).status,
    429
  )
})
