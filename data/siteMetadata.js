/** @type {import('pliny/config').PlinyConfig} */
const siteMetadata = {
  title: 'Gotit-zhx · AI 应用与工程实践',
  author: 'Gotit-zhx',
  headerTitle: 'GOTIT / ZHX',
  description: '将 AI 想法变成可体验的产品。Gotit-zhx 的项目、工程笔记与个人网站。',
  language: 'zh-CN',
  theme: 'dark',
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://gotit-zhx.top' : 'http://localhost:3000'),
  siteRepo: 'https://github.com/Gotit-zhx',
  siteLogo: '/static/images/identity.svg',
  socialBanner: '/static/images/identity.svg',
  email: '207259705@qq.com',
  github: 'https://github.com/Gotit-zhx',
  locale: 'zh-CN',
  stickyNav: false,
  analytics: {},
  newsletter: {},
  comments: {},
  search: { provider: 'kbar', kbarConfig: { searchDocumentsPath: '/search.json' } },
}
module.exports = siteMetadata
