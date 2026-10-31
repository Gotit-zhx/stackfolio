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

本地 MVP 通过 `feature/local-mvp` 合入 `develop`；主题、内容、导航与个人管理台通过 `feature/portfolio-polish` 开发和验收，再通过非快进合并回 `develop`。根仓库还没有远程地址，因此暂不执行 `push`。`local-server/apps/` 中的 PostMaker 和百草园是运行时克隆，保持在各自仓库的分支和提交中，不参与 Stackfolio 的 Gitflow 提交。

验收命令（无需全局 Yarn）：

```bash
node .yarn/releases/yarn-3.6.1.cjs lint
node .yarn/releases/yarn-3.6.1.cjs typecheck
node .yarn/releases/yarn-3.6.1.cjs build
node .yarn/releases/yarn-3.6.1.cjs test:admin
node .yarn/releases/yarn-3.6.1.cjs test:content
```

暂不切 release 或更新 main，因为当前只完成本地验收，没有云服务器或公开发布。个人管理台保存内容后也应在 feature 分支提交，再合入 develop；不会自动提交和推送。
