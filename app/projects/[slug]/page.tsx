import { allProjects } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { notFound } from 'next/navigation'
import { genPageMetadata } from 'app/seo'
import Link from 'next/link'
import Github from '@/components/GitHubIcon'
import Image from 'next/image'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import DemoStatus from '@/components/DemoStatus'
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
    p.demoUrl ||
    (p.slug === 'stackfolio'
      ? process.env.NEXT_PUBLIC_SITE_URL
      : p.slug === 'postmaker'
        ? process.env.NEXT_PUBLIC_POSTMAKER_URL
        : p.slug === 'baicaoyuan'
          ? process.env.NEXT_PUBLIC_BAICAOYUAN_URL
          : undefined)
  return (
    <article className="wrap detail-page">
      <Link className="back-link" href="/projects">
        <ArrowLeft size={14} /> 全部项目
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
            <Github size={16} /> GitHub 源码 <ArrowUpRight size={15} />
          </a>
        </div>
        <DemoStatus status={p.demoStatus} url={demoUrl} slug={p.slug} repository={p.repository} />
        {p.slug === 'baicaoyuan' ? (
          <section className="demo-credentials" aria-labelledby="demo-credentials-title">
            <div>
              <p className="demo-credentials-label" id="demo-credentials-title">
                游客演示账号
              </p>
              <p className="demo-credentials-note">
                打开百草园演示后，可使用以下账号体验登录后的内容、关注和收藏功能。
              </p>
            </div>
            <dl>
              <div>
                <dt>账号</dt>
                <dd>
                  <code>demo_muyu</code>
                </dd>
              </div>
              <div>
                <dt>密码</dt>
                <dd>
                  <code>DemoGarden!2026</code>
                </dd>
              </div>
            </dl>
            <p className="demo-credentials-warning">仅用于公开演示，请勿提交个人信息或敏感内容。</p>
          </section>
        ) : null}
      </header>
      <figure className="detail-cover">
        <Image src={p.cover} alt={p.coverAlt} width={1440} height={900} priority />
        <figcaption>
          来自项目公开仓库的界面示例，展示示例数据，不代表线上用户或业务规模。
        </figcaption>
      </figure>
      {p.screenshots?.length ? (
        <section className="detail-gallery" aria-label="项目截图">
          <div className="detail-section-label">SCREENSHOTS / 项目截图</div>
          <div className="detail-gallery-grid">
            {p.screenshots.map((image, index) => (
              <figure key={image}>
                <Image
                  src={image}
                  alt={`${p.title} 界面截图 ${index + 1}`}
                  width={1200}
                  height={760}
                />
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {p.contributions?.length ? (
        <section className="detail-contributions">
          <div className="detail-section-label">CONTRIBUTION / 贡献与交付</div>
          <ul>
            {p.contributions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{p.contributionNote || '以上说明根据本人确认的职责范围整理。'}</p>
        </section>
      ) : null}
      <div className="detail-body prose prose-lg">
        <MDXLayoutRenderer code={p.body.code} components={components} />
      </div>
      <div className="detail-bottom">
        <Link href="/projects">
          <ArrowLeft size={14} /> 返回项目列表
        </Link>
        <a href={p.repository} target="_blank" rel="noreferrer">
          在 GitHub 查看实现 <ArrowUpRight size={15} />
        </a>
      </div>
    </article>
  )
}
