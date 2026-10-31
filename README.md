# Stackfolio · Gotit-zhx的个人网站

以 Next.js 和成熟的 Tailwind Nextjs Starter Blog 为基础的中文个人作品集。首页采用深色工程作品集风格，项目、博客与关于页面采用浅色阅读版式。项目内容按公开仓库核对；个人介绍不补写未经确认的学校、雇主或个人贡献。

## 本地启动

需要 macOS、Docker Desktop、Node.js 22+、GitHub CLI（`gh auth login`）和 Git。主站及两个演示由 `local-server/` 中的脚本统一管理，三个项目仍以独立容器运行。

```bash
./local-server/clone-projects.sh
./local-server/start.sh all
```

首次构建会下载依赖并构建三组容器。随后访问：

| 页面            | 地址                    |
| --------------- | ----------------------- |
| Stackfolio 主站 | <http://localhost:3000> |
| PostMaker       | <http://localhost:8787> |
| 百草园          | <http://localhost:8088> |

百草园首次启动后可导入公开示例内容：

```bash
docker compose -p stackfolio-baicaoyuan \
  --env-file local-server/apps/baicaoyuan/.env.compose \
  -f local-server/apps/baicaoyuan/compose.yaml \
  exec app python manage.py seed_demo_data --disable-login
```

PostMaker 初始登录页可创建本地工作区；AI 摘要和生成需要自行配置模型服务。百草园注册默认关闭，演示内容可以匿名浏览。两个应用的数据卷相互独立。

```bash
./local-server/status.sh
./local-server/logs.sh postmaker
./local-server/stop.sh all
```

`stop.sh` 不会删除应用数据。运行环境、端口调整和云服务器迁移说明见 [本地部署目录说明](local-server/README.md)。默认只绑定本机回环地址，不会公开到局域网或互联网。

## 内容维护

- 项目详情：在 `data/projects/` 添加一篇 MDX，并填入源码地址、截图、标签和演示状态。完成部署验收后将 `demoStatus` 设为 `local`；公网部署后设为 `live`。
- 博客文章：在 `data/blog/` 添加 MDX；`draft: true` 的内容不会进入列表、详情页、RSS 或标签页。
- 公开联系方式和站点默认地址：`data/siteMetadata.js`。
- 主站和演示运行命令：`local-server/`。

不持有源码的项目不加入作品列表。原始简历 PDF 不复制进仓库。

## Gitflow 分支约定

主仓库使用 Gitflow：`main` 只保存可发布版本，`develop` 汇总下一版本，日常工作从 `develop` 创建 `feature/*` 分支。修复线上问题使用 `hotfix/*`，准备发布时从 `develop` 创建 `release/*`，验收后合并到 `main` 和 `develop` 并打版本标签。

本次本地 MVP 位于 `feature/local-mvp`。后续提交示例：

```bash
git switch develop
git switch -c feature/<topic>
git add .
git commit -m "feat: <完成的功能>"
git switch develop
git merge --no-ff feature/<topic>
```

合并前运行 `yarn lint`、`yarn typecheck`、`yarn build`，并用 `./local-server/start.sh all` 验收主站和两个演示。远程仓库配置后，再按团队约定推送 `develop` 和发布分支；当前仓库尚未配置 remote。
