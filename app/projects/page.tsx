import { allProjects } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import ProjectCard from '@/components/ProjectCard'
export const metadata = genPageMetadata({ title: '项目' })
export default function Projects() {
  const projects = allProjects.filter((p) => !p.draft).sort((a, b) => a.order - b.order)
  return (
    <div className="wrap page-content">
      <div className="page-heading">
        <p className="eyebrow">PROJECT ARCHIVE</p>
        <h1>
          项目与实践<span>.</span>
        </h1>
        <p>用可阅读的案例、公开源码和可运行的演示，记录从想法到交付的过程。</p>
      </div>
      <div className="project-grid">
        {projects.map((p, i) => (
          <ProjectCard project={p} index={i} key={p.slug} />
        ))}
      </div>
    </div>
  )
}
