import { genPageMetadata } from 'app/seo'
import siteMetadata from '@/data/siteMetadata'
export const metadata = genPageMetadata({ title: '关于' })
export default function About() {
  return (
    <div className="wrap about-page">
      <div className="page-heading">
        <p className="eyebrow">A LITTLE ABOUT ME</p>
        <h1>
          你好，我是Gotit-zhx<span>.</span>
        </h1>
        <p>关注 AI 应用、Agent 工作流与全栈工程。</p>
      </div>
      <div className="about-grid">
        <div className="about-monogram" aria-hidden="true">
          G/<span>GOTIT-ZHX / BUILD, LEARN, REPEAT</span>
        </div>
        <div className="prose prose-lg">
          <h2>把技术放进真实流程里</h2>
          <p>
            我对 AI
            能力如何进入实际产品感兴趣：从信息采集、模型接入，到界面交互、人工审核和最终交付。相比单独的功能演示，我更希望把一个可运行、可解释、可继续维护的流程做完整。
          </p>
          <p>
            这里整理了我的公开项目与工程记录。PostMaker 探索 AI
            内容生产工作流；百草园展示图文社区的完整产品链路。两个项目均由我独立开发，每个项目都提供独立详情页、贡献说明和源码入口。
          </p>
          <h2>正在关注</h2>
          <ul>
            <li>AI 应用与 Agent 工作流的工程落地</li>
            <li>Python、TypeScript 与前后端协作</li>
            <li>自托管、容器化与可重复部署</li>
          </ul>
          <h2>联系我</h2>
          <p>欢迎交流项目、工程实践与 AI 应用开发机会。</p>
          <p>
            <a href={`mailto:${siteMetadata.email}`}>{siteMetadata.email}</a>
            <br />
            <a href={siteMetadata.github} target="_blank" rel="noreferrer">
              GitHub / Gotit-zhx ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
