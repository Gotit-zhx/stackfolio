import Link from 'next/link'
import { allBlogs } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
export const metadata = genPageMetadata({ title: '工程笔记' })
export default function Blog() {
  const posts = allBlogs.filter((p) => !p.draft).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="wrap page-content blog-index">
      <div className="page-heading">
        <p className="eyebrow">FIELD NOTES</p>
        <h1>
          工程笔记<span>.</span>
        </h1>
        <p>记录实现过程，也记录问题、取舍和下一步。</p>
      </div>
      {posts.length ? (
        posts.map((p) => (
          <Link className="note-row" href={`/blog/${p.slug}`} key={p.slug}>
            <time>{p.date.slice(0, 10)}</time>
            <div>
              <div className="tag-row">
                {p.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <h2>{p.title}</h2>
              <p>{p.summary}</p>
            </div>
            <span>↗</span>
          </Link>
        ))
      ) : (
        <div className="empty-state">笔记整理中。新的工程实践会发布在这里。</div>
      )}
    </div>
  )
}
