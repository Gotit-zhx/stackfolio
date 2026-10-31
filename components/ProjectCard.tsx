import Link from 'next/link'
import Image from 'next/image'
import type { Project } from 'contentlayer/generated'

export default function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
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
              {project.title} <span>↗</span>
            </Link>
          </h3>
        </div>
        <p>{project.summary}</p>
        <div className="tag-row">
          {project.tags.slice(0, 4).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <Link href={`/projects/${project.slug}`} className="text-link">
          阅读项目案例 <span>→</span>
        </Link>
      </div>
    </article>
  )
}
