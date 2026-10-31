import Link from 'next/link'
import Image from 'next/image'
import type { Project } from 'contentlayer/generated'
import { ArrowUpRight } from 'lucide-react'

export default function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const statusLabel =
    project.demoStatus === 'live'
      ? '在线演示'
      : project.demoStatus === 'local'
        ? '本地预览 · 尚未上线'
        : '演示准备中'
  return (
    <article className={`project-card project-${project.slug}`}>
      <Link
        href={`/projects/${project.slug}`}
        className="project-visual"
        aria-label={`查看 ${project.title} 项目详情`}
      >
        <div className="preview-top">
          <span>{project.category}</span>
          <span>0{index + 1} / SELECTED WORK</span>
        </div>
        <div className="preview-window">
          <div className="window-bar">
            <i />
            <i />
            <i />
            <span>{project.slug}.local</span>
          </div>
          <Image src={project.cover} alt={project.coverAlt} width={1440} height={900} />
        </div>
      </Link>
      <div className="project-caption">
        <div>
          <p className="eyebrow">{project.subtitle}</p>
          <h3>
            <Link href={`/projects/${project.slug}`}>
              {project.title} <ArrowUpRight size={19} strokeWidth={1.6} />
            </Link>
          </h3>
        </div>
        <p>{project.summary}</p>
        <div className="tag-row">
          {project.tags.slice(0, 4).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <span className={`status-badge status-${project.demoStatus}`}>{statusLabel}</span>
        <Link href={`/projects/${project.slug}`} className="text-link">
          阅读项目案例 <ArrowUpRight size={15} strokeWidth={1.7} />
        </Link>
      </div>
    </article>
  )
}
