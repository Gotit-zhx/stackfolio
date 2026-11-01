# 云服务器部署模板

当前阿里云 Ubuntu 24.04 实例运行于 `/srv/stackfolio`。ICP 备案已通过，域名已解析，Caddy 提供公网 HTTPS，并将请求转发至主站、PostMaker 和百草园的回环端口。管理台仍只监听 `127.0.0.1:9090`，通过 SSH 隧道访问。主站和管理台由 Stackfolio Gitflow 管理，两个演示项目保留各自仓库与独立 Compose project。

服务器资源有限，按 `site`、`admin`、`postmaker`、`baicaoyuan` 顺序启动，等待一项健康后再启动下一项。不要在服务器同时构建多个应用。公开配置模板为 `local-server/.env.example`；服务器 `.env`、演示项目密钥和管理台访问码只保存在服务器。

PostMaker 在低配实例上必须在服务器私有环境文件中设置 `POSTMAKER_RESOURCE_PROFILE=low`。根目录脚本会自动叠加 `local-server/postmaker.server.override.yaml`，限制四个容器的内存、swap、CPU 和进程数；本机默认不启用该限制文件。启动后逐项观察健康状态与 `docker stats`，不要在服务器执行镜像构建。

首次上线的顺序：

1. 服务器已安装 Docker Engine、Compose plugin、Git、Caddy，并创建约 2 GiB swap。
2. Stackfolio 和两个公开演示仓库已克隆到 `/srv/stackfolio`；克隆使用公开 HTTPS，不保存个人 GitHub token。
3. 服务器专用环境配置和应用 secrets 已生成，均未提交 Git。
4. 镜像在本机按目标架构准备并传输，服务器依次加载和启动；每项启动后须单独通过健康检查。
5. Caddy 监听公网 80/443 并按域名代理三项服务；管理台只监听 `127.0.0.1:9090`。
6. 主站及两个项目详情均已通过 HTTPS 验收并标记为 `live`。

管理台容器需要访问 Docker socket 来读取容器统计；Docker socket 的访问权限等同于主机 root，因此管理台必须继续保持 `127.0.0.1:9090`，并且只能通过 SSH 隧道打开。不要将 9090 放进安全组或 Caddy 反向代理。

公网入口已启用。ICP备案号按用户要求暂不展示；管理台仍受限于 SSH 隧道访问。

## 当前已部署实例

截至 2026-11-01，服务器已从 `develop` 部署并运行以下健康容器。镜像均在本机按 `linux/amd64` 准备后传输，服务器不执行应用构建：

| 服务            |    服务器回环端口 | 本机 SSH 隧道示例 |
| --------------- | ----------------: | ----------------: |
| Stackfolio 主站 |  `127.0.0.1:3000` |           `23000` |
| 个人管理台      |  `127.0.0.1:9090` |            `9090` |
| 百草园          | `127.0.0.1:18088` |           `28088` |
| PostMaker       | `127.0.0.1:18787` |           `28787` |

建立隧道后访问本机地址：

```bash
ssh -N \
  -L 23000:127.0.0.1:3000 \
  -L 9090:127.0.0.1:9090 \
  -L 28088:127.0.0.1:18088 \
  -L 28787:127.0.0.1:18787 \
  <账号>@<服务器地址>
```

当前服务器部署提交为 `7b42ad7`。四项应用和 PostMaker 的 Redis、RSSHub、DataRadar 均已通过健康检查；低配实例可用内存应持续观察，出现明显下降时先停止演示服务再排查，不在服务器执行构建或大规模清理。完整公网操作和更新步骤见 `docs/public-access-runbook.md`。

### 受限验收的 SSH 隧道构建

受限验收阶段，主站镜像中的演示链接必须指向本机 SSH 隧道端口，而不是 `local-server/.env.example` 中供本地开发使用的 `8787` 和 `8088`。在 Mac 上构建 `linux/amd64` 镜像时使用临时环境覆盖：

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:23000 \
NEXT_PUBLIC_POSTMAKER_URL=http://localhost:28787 \
NEXT_PUBLIC_BAICAOYUAN_URL=http://localhost:28088 \
  docker compose -p stackfolio-site \
  --env-file local-server/.env \
  -f local-server/compose.yaml build --platform linux/amd64 site
```

随后将构建好的镜像传到服务器并依次启动；服务器只加载镜像和配置，不执行 `docker build`。建立上面的 SSH 隧道后，主站详情页中的演示链接才可从本机打开。正式域名和 HTTPS 上线时，应把这三个 `NEXT_PUBLIC_*` 值改为真实 HTTPS 地址并重新构建主站。
