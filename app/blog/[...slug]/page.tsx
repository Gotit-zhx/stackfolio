import 'css/prism.css'
import Link from 'next/link'
import { allBlogs } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { notFound } from 'next/navigation'
import { genPageMetadata } from 'app/seo'
const published = () => allBlogs.filter((p) => !p.draft)
export const generateStaticParams = () => published().map((p) => ({ slug: p.slug.split('/') }))
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const p = published().find((p) => p.slug === slug.join('/'))
  return p ? genPageMetadata({ title: p.title, description: p.summary }) : { title: '文章不存在' }
}
export default async function Post({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const p = published().find((p) => p.slug === slug.join('/'))
  if (!p) notFound()
  return (
    <article className="wrap detail-page article-page">
      <Link className="back-link" href="/blog">
        ← 全部笔记
      </Link>
      <header className="detail-header">
        <p className="eyebrow">FIELD NOTES / {p.date.slice(0, 10)}</p>
        <h1>{p.title}</h1>
        <p className="detail-summary">{p.summary}</p>
        <div className="tag-row">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </header>
      <div className="detail-body prose prose-lg">
        <MDXLayoutRenderer code={p.body.code} components={components} toc={p.toc} />
      </div>
      <div className="detail-bottom">
        <Link href="/blog">← 返回笔记</Link>
      </div>
    </article>
  )
}
