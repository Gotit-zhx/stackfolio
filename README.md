# Stackfolio · Gotit-zhx的个人网站

以 Next.js、TypeScript、MDX 和 Docker Compose 构建的中文个人作品集与发布工作台。它同时承载自我介绍、项目详情、在线演示入口、博客和仅本人可访问的资源监控。项目内容按公开仓库核对；三个展示项目均为本人独立编写，不补写未经确认的学校或雇主经历。

## 本地启动

需要 macOS、Docker Desktop、Node.js 22+ 和 Git。主站及两个演示由 `local-server/` 中的脚本统一管理，三个项目仍以独立容器运行。

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

可在浏览器内编辑、预览、保存和发布文章或项目，同时查看真实主机/项目容器资源。个人管理台独立运行且只绑定回环地址，访问码登录；不随公开主站部署。

```bash
node .yarn/releases/yarn-3.6.1.cjs admin
# 自己在终端读取访问码：cat .local-admin/access-code
# 访问 http://127.0.0.1:9090
```

完整操作、权限划分、发布生效步骤、备份恢复与将来 SSH 隧道访问见 [个人管理台说明](docs/personal-studio.md)。

- 项目详情：在 `data/projects/` 添加一篇 MDX，填入源码地址、截图、个人贡献、标签与演示状态。`local` 表示尚未公网部署；`live` 必须填入 HTTPS `demoUrl`，不可用本机地址冒充在线演示。
- 博客文章：在 `data/blog/` 添加 MDX；`draft: true` 的内容不会进入列表、详情页、RSS 或标签页。
- 公开联系方式和站点默认地址：`data/siteMetadata.js`。
- 主站和演示运行命令：`local-server/`。

不持有源码的项目不加入作品列表。原始简历 PDF 不复制进仓库。

## Gitflow 分支约定

主仓库使用 Gitflow：`main` 只保存可发布版本，`develop` 汇总下一版本，日常工作从 `develop` 创建 `feature/*` 分支。修复线上问题使用 `hotfix/*`，准备发布时从 `develop` 创建 `release/*`，验收后合并到 `main` 和 `develop` 并打版本标签。

最初 MVP 通过 `feature/local-mvp` 合入；主题、内容与个人管理台通过 `feature/portfolio-polish` 开发并合入 `develop`。后续提交示例：

```bash
git switch develop
git switch -c feature/<topic>
git add .
git commit -m "feat: <完成的功能>"
git switch develop
git merge --no-ff feature/<topic>
```

功能合并前运行 lint、typecheck、build、test:admin、test:content，并验收主站与演示。无需全局 Yarn，可用 `node .yarn/releases/yarn-3.6.1.cjs <命令>`；纯文档变更检查格式、链接和 Git 差异即可。

远程仓库为公开的 [Gotit-zhx/stackfolio](https://github.com/Gotit-zhx/stackfolio)，默认分支为 `develop`；`main` 只保存经过验收的发布版本。完成集成后执行 `git push origin develop`；生产发布另走 `release/*`，不因日常上传直接更新 `main`。完整流程见 [Gitflow 说明](docs/gitflow.md)。

## 云服务器规划

主要面向中国大陆访客，服务器月均预算不超过 50 元。当前部署目标为阿里云 Ubuntu 24.04 实例；域名和 ICP 备案仍按 [云服务器与部署规划](docs/cloud-deployment-plan.md) 单独推进。云端模板和 Caddy 入口见 [云服务器部署模板](deploy/README.md)。
