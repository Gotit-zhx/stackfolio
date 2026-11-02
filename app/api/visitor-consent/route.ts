import { NextRequest, NextResponse } from 'next/server'
import { isIP } from 'node:net'
import { randomUUID } from 'node:crypto'
import { deleteVisitorVisits, recordVisit } from '@/lib/visitor-analytics'

const validPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  value.length <= 300 &&
  !value.startsWith('//')
const buckets = new Map<string, { startedAt: number; count: number }>()
let globalBucket = { startedAt: Date.now(), count: 0 }

function allowed(ip: string) {
  const now = Date.now()
  if (now - globalBucket.startedAt >= 60_000) globalBucket = { startedAt: now, count: 0 }
  globalBucket.count++
  const bucket = buckets.get(ip)
  if (!bucket || now - bucket.startedAt >= 60_000) {
    buckets.set(ip, { startedAt: now, count: 1 })
  } else {
    bucket.count++
  }
  if (buckets.size > 10_000) {
    for (const [key, item] of buckets) if (now - item.startedAt >= 60_000) buckets.delete(key)
  }
  return globalBucket.count <= 120 && (buckets.get(ip)?.count || 0) <= 10
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求无效' }, { status: 400 })
  }
  const input = body as { path?: unknown; consent?: unknown }
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
  const expectedOrigin = forwardedHost ? `${forwardedProto.split(',')[0]}://${forwardedHost}` : ''
  if (!expectedOrigin || request.headers.get('origin') !== expectedOrigin) {
    return NextResponse.json({ error: '请求来源无效' }, { status: 403 })
  }
  if (input.consent === 'yes' || input.consent === 'no') {
    const response = NextResponse.json({ consent: input.consent })
    response.cookies.set('site_analytics_consent', input.consent, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 90 * 24 * 60 * 60,
    })
    if (input.consent === 'no') {
      const visitorId = request.cookies.get('site_analytics_visitor')?.value
      if (visitorId) await deleteVisitorVisits(visitorId)
      response.cookies.set('site_analytics_visitor', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      })
    }
    return response
  }
  const consent = request.cookies.get('site_analytics_consent')?.value
  if (consent !== 'yes') return NextResponse.json({ recorded: false }, { status: 403 })

  const pathname = input.path
  if (!validPath(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '页面路径无效' }, { status: 400 })
  }
  // Caddy overwrites this header from the TCP peer address; never trust arbitrary X-Forwarded-For.
  const ip = request.headers.get('x-real-ip')?.trim()
  if (!ip || ip.length > 64 || isIP(ip) === 0) {
    return NextResponse.json({ error: '无法确认访客 IP' }, { status: 400 })
  }
  if (!allowed(ip)) {
    return NextResponse.json(
      { error: '访问记录请求过于频繁' },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    )
  }
  const visitorId = request.cookies.get('site_analytics_visitor')?.value || randomUUID()
  const response = NextResponse.json(
    { recorded: true },
    { headers: { 'Cache-Control': 'no-store' } }
  )
  await recordVisit(ip, pathname, visitorId)
  response.cookies.set('site_analytics_visitor', visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 90 * 24 * 60 * 60,
  })
  return response
}
