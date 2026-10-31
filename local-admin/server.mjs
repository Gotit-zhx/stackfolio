import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile, writeFile, mkdir, chmod, realpath } from 'node:fs/promises'
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto'
import { build } from 'esbuild'
import { imageSize } from 'image-size'
import { createContentStore, assert, RequestError } from './content.mjs'
import { createMonitor } from './monitor.mjs'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cookieName = 'stackfolio_admin'
const digest = (s) => createHash('sha256').update(s).digest()
const equal = (a, b) => timingSafeEqual(digest(a), digest(b))
const sessionAge = 8 * 60 * 60 * 1000
const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}

export async function createAdminServer({
  root = ROOT,
  stateDir = path.join(ROOT, '.local-admin'),
  password,
  assets,
  port = 9090,
} = {}) {
  root = await realpath(root)
  await mkdir(stateDir, { recursive: true, mode: 0o700 })
  await chmod(stateDir, 0o700)
  const passwordFile = path.join(stateDir, 'access-code')
  if (!password) {
    try {
      password = (await readFile(passwordFile, 'utf8')).trim()
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      password = randomBytes(24).toString('base64url')
      await writeFile(passwordFile, `${password}\n`, { flag: 'wx', mode: 0o600 })
    }
    await chmod(passwordFile, 0o600)
  }
  const store = createContentStore(root, stateDir)
  const monitor = createMonitor(root)
  const sessions = new Map()
  let attempts = { count: 0, window: Date.now() }
  async function body(req) {
    let raw = ''
    for await (const chunk of req) {
      raw += chunk
      assert(Buffer.byteLength(raw) <= 2_000_000, '请求过大。', 413)
    }
    try {
      return JSON.parse(raw)
    } catch {
      throw new RequestError(400, 'JSON 格式无效。')
    }
  }
  const server = http.createServer(async (req, res) => {
    for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value)
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(value))
    }
    try {
      const host = req.headers.host
      const actualPort = server.address()?.port || port
      assert(
        [`localhost:${actualPort}`, `127.0.0.1:${actualPort}`].includes(host),
        '不允许的 Host。',
        403
      )
      assert(
        !req.headers['sec-fetch-site'] ||
          ['same-origin', 'none'].includes(req.headers['sec-fetch-site']),
        '拒绝跨站请求。',
        403
      )
      if (req.headers.origin) assert(req.headers.origin === `http://${host}`, '拒绝跨域请求。', 403)
      if (!['GET', 'HEAD'].includes(req.method))
        assert(
          req.headers.origin === `http://${host}` &&
            req.headers['content-type']?.startsWith('application/json'),
          '写入需要同源 JSON 请求。',
          403
        )
      const url = new URL(req.url, `http://${host}`)
      const token = /(?:^|;\s*)stackfolio_admin=([a-zA-Z0-9_-]+)/.exec(
        req.headers.cookie || ''
      )?.[1]
      for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key)
      const session = token && sessions.get(token)
      const authenticated = Boolean(session && session.expires > Date.now())
      if (url.pathname === '/api/login' && req.method === 'POST') {
        if (Date.now() - attempts.window > 60_000) attempts = { count: 0, window: Date.now() }
        assert(attempts.count < 10, '尝试次数过多，请一分钟后再试。', 429)
        attempts.count++
        const data = await body(req)
        assert(
          typeof data.password === 'string' && equal(password, data.password),
          '访问码不正确。',
          401
        )
        if (sessions.size >= 20) sessions.delete(sessions.keys().next().value)
        const nextToken = randomBytes(32).toString('base64url')
        sessions.set(nextToken, { expires: Date.now() + sessionAge })
        res.setHeader(
          'Set-Cookie',
          `${cookieName}=${nextToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionAge / 1000}`
        )
        return send(200, { authenticated: true })
      }
      if (url.pathname === '/api/session' && req.method === 'GET')
        return send(200, { authenticated })
      if (url.pathname === '/api/logout' && req.method === 'POST') {
        sessions.delete(token)
        res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`)
        return send(200, { authenticated: false })
      }
      if (url.pathname.startsWith('/api/')) {
        assert(authenticated, '请先登录个人管理台。', 401)
        if (url.pathname === '/api/metrics' && req.method === 'GET')
          return send(200, await monitor())
        if (url.pathname === '/api/content' && req.method === 'GET')
          return send(200, await store.list())
        if (url.pathname === '/api/document' && req.method === 'GET')
          return send(
            200,
            await store.read(url.searchParams.get('kind'), url.searchParams.get('slug'))
          )
        if (url.pathname === '/api/document' && req.method === 'POST')
          return send(200, await store.save(await body(req)))
        if (url.pathname === '/api/upload' && req.method === 'POST') {
          const data = await body(req)
          assert(/^[a-z0-9][a-z0-9-]{0,79}$/.test(data.slug), '项目 slug 无效。')
          assert(typeof data.base64 === 'string', '图片无效。')
          const buffer = Buffer.from(data.base64, 'base64')
          assert(buffer.length > 0 && buffer.length <= 1_400_000, '图片请控制在 1.4MB 以内。')
          let extension
          if (buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') extension = 'png'
          if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) extension = 'jpg'
          if (
            buffer.subarray(0, 4).toString() === 'RIFF' &&
            buffer.subarray(8, 12).toString() === 'WEBP'
          )
            extension = 'webp'
          assert(extension, '仅支持 PNG、JPEG、WebP 图片。')
          let dimensions
          try {
            dimensions = imageSize(buffer)
          } catch {
            throw new RequestError(400, '图片数据损坏。')
          }
          assert(
            dimensions.width > 0 &&
              dimensions.height > 0 &&
              dimensions.width * dimensions.height <= 30_000_000,
            '图片尺寸无效或超过三千万像素。'
          )
          const parent = path.join(root, 'public', 'projects')
          assert((await realpath(parent)) === parent, '上传目录无效。')
          const directory = path.join(parent, data.slug)
          try {
            // Check an existing target before mkdir can follow a directory symlink.
            assert((await realpath(directory)) === directory, '上传目录无效。')
          } catch (error) {
            if (error.code !== 'ENOENT') throw error
          }
          await mkdir(directory).catch((error) => {
            if (error.code !== 'EEXIST') throw error
          })
          assert((await realpath(directory)) === directory, '上传目录无效。')
          const name = `${randomBytes(10).toString('hex')}.${extension}`
          await writeFile(path.join(directory, name), buffer, { flag: 'wx' })
          return send(200, { path: `/projects/${data.slug}/${name}` })
        }
        throw new RequestError(404, '接口不存在。')
      }
      if (url.pathname.startsWith('/projects/')) {
        assert(authenticated, '请先登录。', 401)
        assert(
          /^\/projects\/[a-z0-9/_-]+\.(png|jpe?g|webp|avif)$/i.test(url.pathname),
          '图片路径无效。'
        )
        const file = path.join(root, 'public', url.pathname)
        assert((await realpath(file)) === file, '图片路径无效。')
        const ext = path.extname(file)
        res.writeHead(200, {
          'Content-Type':
            ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : `image/${ext.slice(1)}`,
        })
        return res.end(await readFile(file))
      }
      const asset = assets?.[url.pathname === '/' ? '/index.html' : url.pathname]
      if (asset && ['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(200, { 'Content-Type': asset.type })
        return res.end(req.method === 'HEAD' ? '' : asset.content)
      }
      throw new RequestError(404, '页面不存在。')
    } catch (error) {
      send(error.status || 500, {
        error: error.status ? error.message : '管理台操作失败，请检查本地服务。',
      })
    }
  })
  return { server, passwordFile }
}

async function main() {
  const assets = {
    '/index.html': {
      type: 'text/html; charset=utf-8',
      content: await readFile(path.join(ROOT, 'local-admin/index.html')),
    },
    '/studio.css': {
      type: 'text/css; charset=utf-8',
      content: await readFile(path.join(ROOT, 'local-admin/studio.css')),
    },
  }
  const result = await build({
    entryPoints: [path.join(ROOT, 'local-admin/Studio.tsx')],
    bundle: true,
    write: false,
    minify: true,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    target: ['es2022'],
  })
  assets['/studio.js'] = {
    type: 'text/javascript; charset=utf-8',
    content: result.outputFiles[0].contents,
  }
  const { server, passwordFile } = await createAdminServer({ assets })
  server.on('error', (error) => {
    console.error(`管理台启动失败：${error.message}`)
    process.exitCode = 1
  })
  server.listen(9090, '127.0.0.1', () =>
    console.log(
      `个人管理台：http://127.0.0.1:9090\n访问码仅保存在本机：${passwordFile}\n用 cat 读取后登录；请勿分享或提交该文件。`
    )
  )
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
