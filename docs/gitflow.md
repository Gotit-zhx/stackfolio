# Gitflow 工作流

## 分支职责

| 分支        | 用途               | 规则                                                |
| ----------- | ------------------ | --------------------------------------------------- |
| `main`      | 生产可发布版本     | 只接受经过验收的 `release/*` 或紧急 `hotfix/*` 合并 |
| `develop`   | 下一版本集成分支   | 功能完成并通过检查后合并                            |
| `feature/*` | 新功能、页面和内容 | 从 `develop` 创建，完成后合并回 `develop`           |
| `release/*` | 发布候选版本       | 只修复发布问题、文案和版本号                        |
| `hotfix/*`  | 线上紧急修复       | 从 `main` 创建，同时合并回 `main` 与 `develop`      |

## 本地流程

```bash
git switch develop
git pull --ff-only
git switch -c feature/<topic>

# 开发、验证
git add <files>
git commit -m "feat: <功能>"
git switch develop
git merge --no-ff feature/<topic>
```

发布时：

```bash
git switch develop
git switch -c release/v0.1.0
# 运行构建和本地演示验收
git switch main
git merge --no-ff release/v0.1.0
git tag -a v0.1.0 -m "Stackfolio v0.1.0"
git switch develop
git merge --no-ff release/v0.1.0
```

本地 MVP 通过 `feature/local-mvp` 合入 `develop`；主题、内容、导航与个人管理台通过 `feature/portfolio-polish` 开发和验收，再通过非快进合并回 `develop`。远程仓库为公开的 <https://github.com/Gotit-zhx/stackfolio>，`origin` 已配置，默认分支为 `develop`，用于展示当前集成进度；生产版本仍以 `main` 和发布标签为准。`local-server/apps/` 中的 PostMaker 和百草园是运行时克隆，保持在各自仓库的分支和提交中，不参与 Stackfolio 的 Gitflow 提交。

集成完成后推送 `git push origin develop`；需要远程协作时也可执行 `git push -u origin feature/<topic>`。仓库已公开，默认分支仍为 `develop`。发布验收完成后再推送 `main`、`develop` 及对应版本标签，不把功能上传等同于生产发布。

当前账号请求分支保护 API 返回套餐限制（403），因此尚未启用服务端强制保护。通过明确分支和非快进合并遵守流程；以后若套餐支持，再设置 PR 和必需检查。

验收命令（无需全局 Yarn）：

```bash
node .yarn/releases/yarn-3.6.1.cjs lint
node .yarn/releases/yarn-3.6.1.cjs typecheck
node .yarn/releases/yarn-3.6.1.cjs build
node .yarn/releases/yarn-3.6.1.cjs test:admin
node .yarn/releases/yarn-3.6.1.cjs test:content
```

当前已完成阿里云实例上的受限验收部署，但尚未进行域名、备案和公网生产发布，因此仍不切 `release/*` 或更新 `main`。个人管理台保存内容后也应在 feature 分支提交，再合入 develop；不会自动提交和推送。

纯文档变更检查 Markdown 格式、引用路径及 `git diff --check`，不需要重建未变更的应用。云服务器选型与发布步骤见 [部署规划](cloud-deployment-plan.md)。
