import Link from 'next/link'
import Github from '@/components/GitHubIcon'
import { allBlogs, allProjects } from 'contentlayer/generated'
import ProjectCard from '@/components/ProjectCard'
import siteMetadata from '@/data/siteMetadata'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Code2,
  Command,
  Mail,
  Search,
  Workflow,
} from 'lucide-react'

export default function Home() {
  const projects = allProjects.filter((p) => !p.draft).sort((a, b) => a.order - b.order)
  const posts = allBlogs
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> AI APPLICATIONS · FULL-STACK DEVELOPMENT
          </p>
          <h1>
            把想法，
            <br />
            做成<span>可以体验</span>
            <br />
            的产品<span className="hero-period">.</span>
          </h1>
          <p className="hero-intro">
            你好，我是Gotit-zhx。关注 AI 应用、Agent 工作流与全栈开发，
            <br className="desktop-break" />
            在真实项目中连接模型能力、产品体验和工程交付。
          </p>
          <div className="hero-actions">
            <Link href="#selected-work" className="button primary">
              探索我的项目 <ArrowDownRight size={18} />
            </Link>
            <a
              href={siteMetadata.github}
              target="_blank"
              rel="noreferrer"
              className="button subtle"
            >
              <Github size={16} /> GitHub <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="hero-footnote">
            <span>01 — 从想法到交付</span>
            <span>持续构建，持续记录</span>
          </div>
        </div>
        <div className="system-map" aria-label="工程实践：连接采集、AI 生成、人工审核与产品交付">
          <div className="map-heading">
            <span>WORKFLOW / 01</span>
            <span className="map-live">
              <span className="status-dot" /> BUILDING
            </span>
          </div>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="map-core">
            <span className="map-monogram">
              G<span>/</span>
            </span>
            <small>IDEA → PRODUCT</small>
          </div>
          <div className="map-node node-input">
            <b>01 / INPUT</b>
            <span>
              <Search size={15} /> 发现问题
            </span>
            <small>Research & Sources</small>
          </div>
          <div className="map-node node-ai">
            <b>02 / INTELLIGENCE</b>
            <span>
              <Bot size={15} /> 连接 AI 能力
            </span>
            <small>Models & Workflows</small>
          </div>
          <div className="map-node node-ship">
            <b>03 / DELIVERY</b>
            <span>
              <Workflow size={15} /> 构建真实体验
            </span>
            <small>Interface & Deployment</small>
          </div>
          <div className="map-footer">
            <span>Python / TypeScript</span>
            <span>
              <Command size={12} />
              <Code2 size={13} />
            </span>
          </div>
        </div>
      </section>
      <section id="selected-work" className="work-section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SELECTED WORK / 01—02</p>
            <h2>用作品，回答问题。</h2>
          </div>
          <Link href="/projects" className="text-link">
            全部项目 <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="project-grid">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      </section>
      <section className="practice-section wrap">
        <div>
          <p className="eyebrow">HOW I BUILD</p>
          <h2>
            不止于跑通。
            <br />
            <span>也关注如何交付。</span>
          </h2>
        </div>
        <div className="practice-list">
          {[
            ['01', 'AI 工作流', '将采集、模型调用与人工审核串成有边界、可追溯的流程。'],
            ['02', '完整产品体验', '从页面交互到 API、账号与数据，围绕用户流程组织实现。'],
            ['03', '可重复的部署', '通过容器隔离应用，用统一命令管理服务、日志和持久化。'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="notes-section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIELD NOTES</p>
            <h2>边做，边记录。</h2>
          </div>
          <Link href="/blog" className="text-link">
            全部笔记 <ArrowUpRight size={15} />
          </Link>
        </div>
        {posts.length ? (
          posts.map((p) => (
            <Link className="note-row" key={p.slug} href={`/blog/${p.slug}`}>
              <time>{p.date.slice(0, 10).replaceAll('-', '.')}</time>
              <div>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))
        ) : (
          <p className="empty-state">工程笔记正在整理中。</p>
        )}
      </section>
      <section id="contact" className="contact-section wrap">
        <p className="eyebrow">LET’S CONNECT</p>
        <h2>
          有一个好想法？
          <br />
          <span>一起把它做出来。</span>
        </h2>
        <div className="contact-links">
          <a href={`mailto:${siteMetadata.email}`}>
            <Mail size={16} /> {siteMetadata.email} <ArrowUpRight size={14} />
          </a>
          <a href={siteMetadata.github} target="_blank" rel="noreferrer">
            <Github size={16} /> GitHub / Gotit-zhx <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </>
  )
}
