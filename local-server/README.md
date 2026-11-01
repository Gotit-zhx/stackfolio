# Stackfolio 本地部署目录

这里模拟云服务器上的应用目录。`apps/` 下的两个 GitHub 仓库是运行时克隆，不纳入根仓库提交；主站和个人管理台使用 `stackfolio-site` Compose project，两个演示使用独立 project，数据卷与端口互不共享。管理台只绑定回环地址，并读取 Docker 容器指标。Docker socket 具有高权限，管理台不可公开到互联网，只能通过 SSH 隧道访问。

| 服务            | 本地入口              | Compose project         |
| --------------- | --------------------- | ----------------------- |
| Stackfolio 主站 | http://localhost:3000 | `stackfolio-site`       |
| 个人管理台       | http://127.0.0.1:9090 | `stackfolio-site`       |
| PostMaker       | http://localhost:8787 | `stackfolio-postmaker`  |
| 百草园          | http://localhost:8088 | `stackfolio-baicaoyuan` |

## 命令

从仓库根目录执行：

```bash
./local-server/clone-projects.sh
./local-server/start.sh all
./local-server/start.sh admin
./local-server/status.sh
./local-server/logs.sh postmaker
./local-server/stop.sh all
```

`clone-projects.sh` 使用公开 HTTPS Git URL 拉取 `PostMaker@main` 和 `Text-Image-Platform@master`，本地和云服务器都不需要 GitHub CLI；已存在的 clone 不会自动 pull、reset 或覆盖本地改动。`start.sh` 首次运行会复制环境模板、生成 PostMaker workspace 密钥，并调用百草园的 `init-compose.sh` 生成本地 secrets。停止时不使用 `--volumes`，因此 SQLite、媒体和工作区数据会保留。

百草园首次启动后可导入仓库自带的公开演示数据：

```bash
docker compose -p stackfolio-baicaoyuan \
  --env-file local-server/apps/baicaoyuan/.env.compose \
  -f local-server/apps/baicaoyuan/compose.yaml \
  exec app python manage.py seed_demo_data --disable-login
```

## 配置与云迁移

首次运行会生成被 Git 忽略的 `local-server/.env`。公开配置模板在 `.env.example`，包括绑定地址、端口和三个公开 URL。主站的 `NEXT_PUBLIC_*` 地址在 Docker build 时写入静态页面，因此改域名或子域名后要重新构建：

```bash
./local-server/start.sh site
```

云服务器上使用独立域名或子域名分别指向主站、PostMaker 和百草园。`BIND_ADDRESS=127.0.0.1` 继续保持回环绑定，`NEXT_PUBLIC_*` 使用实际 HTTPS 域名，由公网 Caddy 连接本机端口。管理台包含 Docker socket 访问，只可通过 SSH 隧道访问，绝不交给公网反向代理。HTTPS、应用代理信任、安全 Cookie 和低资源限制已按公网发布配置；AI 模型额度、备份和恢复仍需持续维护，百草园注册保持关闭。备案与配置清单见 [云服务器与部署规划](../docs/cloud-deployment-plan.md)。

## 目录

```text
local-server/
├── apps/                  # GitHub 克隆，Git 忽略
├── compose.yaml           # Stackfolio 主站与个人管理台
├── ../deploy/admin.Dockerfile
├── site.Dockerfile        # Next standalone 镜像
├── postmaker.override.yaml
├── clone-projects.sh
├── start.sh / stop.sh
├── status.sh / logs.sh
└── .env.example
```
