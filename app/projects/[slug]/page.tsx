import { allProjects } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { notFound } from 'next/navigation'
import { genPageMetadata } from 'app/seo'
import Link from 'next/link'
import Image from 'next/image'
const published = () => allProjects.filter((p) => !p.draft)
export const generateStaticParams = () => published().map((p) => ({ slug: p.slug }))
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = published().find((p) => p.slug === slug)
  return p ? genPageMetadata({ title: p.title, description: p.summary }) : { title: '项目不存在' }
}
export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = published().find((p) => p.slug === slug)
  if (!p) notFound()
  const demoUrl =
    p.slug === 'postmaker'
      ? process.env.NEXT_PUBLIC_POSTMAKER_URL || 'http://localhost:8787'
      : process.env.NEXT_PUBLIC_BAICAOYUAN_URL || 'http://localhost:8088'
  return (
    <article className="wrap detail-page">
      <Link className="back-link" href="/projects">
        ← 全部项目
      </Link>
      <header className="detail-header">
        <p className="eyebrow">{p.category} / PROJECT CASE STUDY</p>
        <h1>{p.title}</h1>
        <p className="detail-summary">{p.summary}</p>
        <div className="tag-row">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="detail-actions">
          <a className="button ink" href={p.repository} target="_blank" rel="noreferrer">
            GitHub 源码 ↗
          </a>
          {p.demoStatus === 'local' || p.demoStatus === 'live' ? (
            <a className="button outline" href={demoUrl} target="_blank" rel="noreferrer">
              {p.demoStatus === 'local' ? '本地演示' : '在线演示'} ↗
            </a>
          ) : (
            <span className="demo-pending">演示准备中</span>
          )}
        </div>
        {p.demoStatus === 'local' && (
          <p className="demo-note">
            当前为本地演示，需要先启动部署栈；
            {p.slug === 'postmaker'
              ? ' PostMaker 的摘要与生成需要单独配置模型密钥。'
              : ' 注册和邮件等外部服务仍按本地部署配置。'}
          </p>
        )}
      </header>
      <figure className="detail-cover">
        <Image src={p.cover} alt={p.coverAlt} width={1440} height={900} priority />
        <figcaption>
          来自项目公开仓库的界面示例，展示示例数据，不代表线上用户或业务规模。
        </figcaption>
      </figure>
      <div className="detail-body prose prose-lg">
        <MDXLayoutRenderer code={p.body.code} components={components} />
      </div>
      <div className="detail-bottom">
        <Link href="/projects">← 返回项目列表</Link>
        <a href={p.repository} target="_blank" rel="noreferrer">
          在 GitHub 查看实现 ↗
        </a>
      </div>
    </article>
  )
}
