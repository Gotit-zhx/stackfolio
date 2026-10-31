import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, copyFile, symlink, readFile, realpath, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { createContentStore } from '../local-admin/content.mjs'
import { generateRSS } from './rss.mjs'

const run = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))

test('content compilation updates search and tag indexes when publishing and withdrawing', async (t) => {
  const directory = await realpath(
    await mkdtemp(path.join(os.tmpdir(), 'stackfolio-content-test-'))
  )
  t.after(() => rm(directory, { recursive: true, force: true }))
  for (const folder of ['data/blog', 'data/projects', 'app', 'public'])
    await mkdir(path.join(directory, folder), { recursive: true })
  await symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'))
  await copyFile(
    path.join(root, 'contentlayer.config.ts'),
    path.join(directory, 'contentlayer.config.ts')
  )
  await copyFile(
    path.join(root, 'data/siteMetadata.js'),
    path.join(directory, 'data/siteMetadata.js')
  )
  const store = createContentStore(directory, path.join(directory, '.local-admin'))
  let document = await store.save({
    kind: 'blog',
    slug: 'verification',
    version: null,
    metadata: {
      title: '发布撤稿测试',
      date: '2026-10-31',
      draft: true,
      summary: '用于验证搜索、标签与 RSS 的同步。',
      tags: ['Verification'],
    },
    body: '## 发布验证\n\n这篇文章只在隔离的临时目录中用于验证内容发布与撤回，不写入真实站点，也不提交到仓库。',
  })
  async function verify(visible) {
    const { stdout, stderr } = await run(
      process.execPath,
      [path.join(root, 'node_modules/contentlayer2/bin/cli.cjs'), 'build'],
      {
        cwd: directory,
        env: { ...process.env, NODE_ENV: 'production', INIT_CWD: directory, PWD: directory },
        timeout: 60000,
        maxBuffer: 2_000_000,
      }
    )
    const read = async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'))
    const tags = await read('app/tag-data.json')
    const search = await read('public/search.json')
    assert.equal(tags.verification || 0, visible ? 1 : 0, stdout + stderr)
    assert.equal(
      search.some((entry) => entry.slug === 'verification'),
      visible
    )
    const allBlogs = await read('.contentlayer/generated/Blog/_index.json')
    generateRSS(
      {
        siteUrl: 'https://example.com',
        title: 'Test',
        description: 'Test',
        language: 'zh-CN',
        email: 'author@example.com',
        author: 'Author',
      },
      allBlogs,
      path.join(directory, 'public')
    )
    if (visible)
      assert.match(await readFile(path.join(directory, 'public/feed.xml'), 'utf8'), /verification/)
    else await assert.rejects(readFile(path.join(directory, 'public/feed.xml')), { code: 'ENOENT' })
  }
  await verify(false)
  document = await store.save({ ...document, metadata: { ...document.metadata, draft: false } })
  await verify(true)
  await store.save({ ...document, metadata: { ...document.metadata, draft: true } })
  await verify(false)
})
