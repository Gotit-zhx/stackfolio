import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, access, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { generateRSS } from './rss.mjs'

test('RSS follows publish, retag, withdrawal and empty publication states', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'stackfolio-rss-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const config = {
    siteUrl: 'https://example.com',
    title: '测试站点',
    description: '发布工作流验证',
    language: 'zh-CN',
    email: 'author@example.com',
    author: 'Author',
  }
  const published = {
    slug: 'published',
    title: '公开文章',
    summary: '摘要',
    date: '2026-10-31',
    draft: false,
    tags: ['MDX', 'R&D'],
  }
  const draft = {
    ...published,
    slug: 'private-draft',
    title: '草稿内容',
    draft: true,
    tags: ['Private'],
  }
  const read = (file) => readFile(path.join(directory, file), 'utf8')
  const missing = (file) => assert.rejects(access(path.join(directory, file)), { code: 'ENOENT' })
  generateRSS(config, [published, draft], directory)
  assert.match(await read('feed.xml'), /公开文章/)
  assert.doesNotMatch(await read('feed.xml'), /草稿内容|private-draft/)
  assert.match(await read('tags/rd/feed.xml'), /R&amp;D/)
  await missing('tags/private/feed.xml')
  generateRSS(config, [{ ...published, tags: ['Next.js'] }, draft], directory)
  await missing('tags/mdx/feed.xml')
  await missing('tags/rd/feed.xml')
  assert.match(await read('tags/nextjs/feed.xml'), /公开文章/)
  generateRSS(config, [{ ...published, draft: true }, draft], directory)
  await missing('feed.xml')
  await missing('tags/nextjs/feed.xml')
  generateRSS(config, [published, { ...draft, draft: false }], directory)
  assert.match(await read('feed.xml'), /private-draft/)
  assert.match(await read('tags/private/feed.xml'), /草稿内容/)
})
