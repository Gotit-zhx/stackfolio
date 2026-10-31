# Stackfolio 本地部署目录

这里模拟云服务器上的应用目录。`apps/` 下的两个 GitHub 仓库是运行时克隆，不纳入根仓库提交；主站使用根目录代码构建。三个 Compose 项目使用不同的 project name，数据卷与端口互不共享。

| 服务            | 本地入口              | Compose project         |
| --------------- | --------------------- | ----------------------- |
| Stackfolio 主站 | http://localhost:3000 | `stackfolio-site`       |
| PostMaker       | http://localhost:8787 | `stackfolio-postmaker`  |
| 百草园          | http://localhost:8088 | `stackfolio-baicaoyuan` |

## 命令

从仓库根目录执行：

```bash
./local-server/clone-projects.sh
./local-server/start.sh all
./local-server/status.sh
./local-server/logs.sh postmaker
./local-server/stop.sh all
```

`clone-projects.sh` 使用 `gh repo clone` 拉取 `PostMaker@main` 和 `Text-Image-Platform@master`；已存在的 clone 不会自动 pull、reset 或覆盖本地改动。`start.sh` 首次运行会复制环境模板、生成 PostMaker workspace 密钥，并调用百草园的 `init-compose.sh` 生成本地 secrets。停止时不使用 `--volumes`，因此 SQLite、媒体和工作区数据会保留。

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

云服务器上建议使用独立域名或子域名分别指向主站、PostMaker 和百草园，再把 `BIND_ADDRESS`、端口和 `NEXT_PUBLIC_*` 改为实际值。首次公网部署前还要配置 HTTPS、AI 模型密钥、邮件服务、备份和资源限制；当前配置默认仅绑定本机地址，百草园注册关闭。

## 目录

```text
local-server/
├── apps/                  # GitHub 克隆，Git 忽略
├── compose.yaml           # Stackfolio 主站
├── site.Dockerfile        # Next standalone 镜像
├── postmaker.override.yaml
├── clone-projects.sh
├── start.sh / stop.sh
├── status.sh / logs.sh
└── .env.example
```
