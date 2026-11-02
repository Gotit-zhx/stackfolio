import Link from 'next/link'
import { genPageMetadata } from 'app/seo'
import siteMetadata from '@/data/siteMetadata'
import VisitorConsentControls from '@/components/VisitorConsentControls'

export const metadata = genPageMetadata({ title: '隐私说明' })

export default function PrivacyPage() {
  return (
    <div className="wrap page-content privacy-page">
      <div className="page-heading">
        <p className="eyebrow">PRIVACY NOTE</p>
        <h1>
          访问记录说明<span>.</span>
        </h1>
        <p>这份说明解释本站如何处理访问统计信息。</p>
      </div>
      <article className="prose prose-lg">
        <h2>处理者与联系方式</h2>
        <p>
          个人信息处理者：张宏鑫（Gotit-zhx）。如需查询、更正或删除访问记录，可发送邮件至{' '}
          <a href={`mailto:${siteMetadata.email}`}>{siteMetadata.email}</a>。
        </p>
        <h2>记录什么</h2>
        <p>
          只有在访客点击“同意并继续”后，本站才记录访问时间、访问页面、IP
          地址和基于离线数据库生成的粗略 IP
          属地。本站会使用一个随机的第一方标识符，仅用于将记录与撤回请求关联；该标识符保存在
          HttpOnly Cookie
          中。本站不使用第三方统计脚本，不记录来源页面、浏览器指纹、登录账号、密码或页面表单内容。
        </p>
        <h2>为什么记录</h2>
        <p>这些信息只用于了解个人网站和简历页面的访问情况、排查异常访问，并改进网站内容。</p>
        <h2>保存多久</h2>
        <p>
          访问记录最多保存 90 天，管理台会自动清理超过期限的记录。管理台只通过本机或 SSH 隧道访问。
        </p>
        <h2>如何选择</h2>
        <p>
          你可以选择拒绝，拒绝后不会写入访问记录。已同意的访客可以在本页撤回；撤回时会删除与当前浏览器标识关联的访问记录，并停止后续记录。如需查询或删除无法通过此浏览器关联的历史记录，请通过上方邮箱联系我。
        </p>
        <VisitorConsentControls />
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </article>
    </div>
  )
}
