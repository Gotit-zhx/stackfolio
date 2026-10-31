import { readFile, readdir, writeFile, rename, mkdir, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import matter from 'gray-matter'
import { compile } from '@mdx-js/mdx'

export class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
export const assert = (condition, message, status = 400) => {
  if (!condition) throw new RequestError(status, message)
}
const hash = (value) => createHash('sha256').update(value).digest('hex')
const slugPattern = /^[a-z0-9][a-z0-9-]{0,79}$/
const localImage = (value) => /^\/projects\/[a-z0-9/_-]+\.(png|jpe?g|webp|avif)$/i.test(value)
const stringField = (value, name, limit = 500) => {
  assert(
    typeof value === 'string' && value.trim().length > 0 && value.length <= limit,
    `${name}不能为空，且最多 ${limit} 字符。`
  )
}

export function createContentStore(root, stateDir) {
  async function location(kind, slug) {
    assert(['blog', 'projects'].includes(kind) && slugPattern.test(slug), '内容类型或 slug 无效。')
    const folder = path.join(root, 'data', kind)
    assert((await realpath(folder)) === folder, '内容目录不可为符号链接。')
    const file = path.join(folder, `${slug}.mdx`)
    try {
      assert(!(await lstat(file)).isSymbolicLink(), '内容文件不可为符号链接。')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    return file
  }
  async function read(kind, slug) {
    const file = await location(kind, slug)
    let raw
    try {
      raw = await readFile(file, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') throw new RequestError(404, '内容不存在。')
      throw error
    }
    const parsed = matter(raw)
    // gray-matter parses ISO date values as Date objects; the editor uses YYYY-MM-DD.
    for (const key of ['date', 'lastmod']) {
      if (parsed.data[key] instanceof Date)
        parsed.data[key] = parsed.data[key].toISOString().slice(0, 10)
    }
    return { kind, slug, metadata: parsed.data, body: parsed.content.trim(), version: hash(raw) }
  }
  async function list() {
    const items = []
    for (const kind of ['blog', 'projects']) {
      for (const name of (await readdir(path.join(root, 'data', kind)))
        .filter((name) => name.endsWith('.mdx'))
        .sort()) {
        const slug = name.slice(0, -4)
        if (slugPattern.test(slug)) {
          const item = await read(kind, slug)
          items.push({ kind, slug, metadata: item.metadata, version: item.version })
        }
      }
    }
    return items
  }
  async function validate(kind, metadata, body) {
    assert(
      metadata && typeof metadata === 'object' && !Array.isArray(metadata),
      '元数据必须为对象。'
    )
    assert(typeof body === 'string' && body.length <= 150_000, '正文过长。')
    stringField(metadata.title, '标题', 160)
    stringField(metadata.summary, '摘要', 500)
    assert(typeof metadata.draft === 'boolean', '必须明确设置草稿或发布状态。')
    assert(
      Array.isArray(metadata.tags) &&
        metadata.tags.length <= 16 &&
        metadata.tags.every((tag) => typeof tag === 'string' && tag.trim() && tag.length < 40),
      '标签格式不正确。'
    )
    if (kind === 'blog') {
      assert(
        /^\d{4}-\d{2}-\d{2}$/.test(metadata.date) &&
          !Number.isNaN(Date.parse(metadata.date)) &&
          new Date(metadata.date).toISOString().slice(0, 10) === metadata.date,
        '日期格式应为 YYYY-MM-DD。'
      )
    } else {
      for (const key of ['subtitle', 'category', 'coverAlt']) stringField(metadata[key], key, 200)
      assert(
        /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(metadata.repository),
        '请填写 GitHub 仓库的 HTTPS 地址。'
      )
      assert(Number.isFinite(metadata.order) && metadata.order >= 0, '项目排序必须为非负数字。')
      assert(localImage(metadata.cover), '封面请使用 /projects/ 下的本地图片。')
      assert(['not-deployed', 'local', 'live'].includes(metadata.demoStatus), '演示状态无效。')
      if (metadata.demoStatus === 'live') {
        let url
        try {
          url = new URL(metadata.demoUrl)
        } catch {
          throw new RequestError(400, '在线演示需要填写有效 HTTPS 地址。')
        }
        assert(
          url.protocol === 'https:' &&
            !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
            !url.username &&
            !url.password,
          '在线演示应使用公开 HTTPS 地址。'
        )
      }
      assert(
        Array.isArray(metadata.screenshots) &&
          metadata.screenshots.length <= 8 &&
          metadata.screenshots.every(localImage),
        '截图请使用 /projects/ 下的本地图片，最多 8 张。'
      )
      assert(
        Array.isArray(metadata.contributions) &&
          metadata.contributions.length <= 10 &&
          metadata.contributions.every((v) => typeof v === 'string' && v.length < 500),
        '贡献说明格式无效。'
      )
      for (const image of [metadata.cover, ...metadata.screenshots]) {
        const file = path.join(root, 'public', image)
        try {
          assert((await realpath(file)) === file && (await lstat(file)).isFile(), '图片路径无效。')
        } catch {
          throw new RequestError(400, `图片尚未上传：${image}`)
        }
      }
    }
    if (!metadata.draft) assert(body.trim().length >= 40, '发布前请填写至少 40 字符正文。')
    try {
      await compile(body, { development: false })
    } catch {
      throw new RequestError(400, 'MDX 语法检查失败，请检查括号、标签与代码块。')
    }
  }
  // Serialize writes: two browser tabs cannot silently overwrite each other.
  let writeQueue = Promise.resolve()
  async function saveInner(input) {
    const { kind, slug, metadata, body, version } = input
    const file = await location(kind, slug)
    await validate(kind, metadata, body)
    let old
    try {
      old = await readFile(file, 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    assert(
      old === undefined ? version === null : version === hash(old),
      '文件已被修改，请重新载入后再保存。',
      409
    )
    if (old !== undefined) {
      const folder = path.join(stateDir, 'backups')
      await mkdir(folder, { recursive: true, mode: 0o700 })
      await writeFile(
        path.join(folder, `${kind}-${slug}-${Date.now()}-${randomBytes(4).toString('hex')}.mdx`),
        old,
        { mode: 0o600 }
      )
    }
    const next = matter.stringify(`\n${body.trim()}\n`, metadata)
    const temporary = `${file}.${randomBytes(6).toString('hex')}.tmp`
    await writeFile(temporary, next, { flag: 'wx', mode: 0o600 })
    await rename(temporary, file)
    await mkdir(stateDir, { recursive: true, mode: 0o700 })
    await writeFile(
      path.join(stateDir, 'audit.jsonl'),
      JSON.stringify({
        time: new Date().toISOString(),
        action: metadata.draft ? 'save-draft' : 'publish',
        kind,
        slug,
      }) + '\n',
      { flag: 'a', mode: 0o600 }
    )
    return read(kind, slug)
  }
  function save(input) {
    const operation = writeQueue.then(() => saveInner(input))
    writeQueue = operation.catch(() => {})
    return operation
  }
  return { read, list, save }
}
