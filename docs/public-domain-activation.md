# gotit-zhx.top 公网访问操作手册

这份文档记录 `gotit-zhx.top` 公网 HTTPS 发布与验收结果，并保留故障回退说明。

**当前状态（2026-11-01）：** 用户确认 ICP 备案已通过；服务器端解析和 HTTPS 校验均指向 `120.24.174.196`；公网 Caddy、HTTPS 证书和三个应用入口已启用。ICP备案号按用户要求暂不展示在页脚。

## 当前架构

| 入口      | 域名                                 | 后端                       |
| --------- | ------------------------------------ | -------------------------- |
| 主站      | `gotit-zhx.top`、`www.gotit-zhx.top` | `127.0.0.1:3000`           |
| PostMaker | `postmaker.gotit-zhx.top`            | `127.0.0.1:18787`          |
| 百草园    | `baicaoyuan.gotit-zhx.top`           | `127.0.0.1:18088`          |
| 管理台    | 不配置公网域名                       | `127.0.0.1:9090`，SSH 隧道 |

公网只需要让 Caddy 接收 80/443；应用端口、管理台、Redis、数据库和 Docker socket 继续保持回环绑定。

## 发布前核对项（已完成）

### 1. 确认域名实名和备案状态

在域名注册商/阿里云备案控制台确认：

- 域名已经完成实名认证。
- 实名主体与个人备案主体一致。
- 阿里云服务器实例具备备案资格。
- 备案网站名称和内容描述与实际个人作品集、博客和项目演示一致。
- 如果备案尚未提交，先提交并等待审核；审核期间不要把网站作为正式公网服务开放。

备案材料中的证件照片、身份证信息、短信验证码和个人核验信息请直接填写在阿里云控制台，不要发送到聊天或写入仓库。

### 2. 在 DNS 控制台添加解析

在 `gotit-zhx.top` 的 DNS 控制台添加以下记录：

| 主机记录     | 类型       | 记录值                  | 用途           |
| ------------ | ---------- | ----------------------- | -------------- |
| `@`          | A          | `120.24.174.196`        | 根域名主站     |
| `www`        | A 或 CNAME | `120.24.174.196` 或 `@` | 主站别名       |
| `postmaker`  | A 或 CNAME | `120.24.174.196` 或 `@` | PostMaker 演示 |
| `baicaoyuan` | A 或 CNAME | `120.24.174.196` 或 `@` | 百草园演示     |

不要填写云服务器私网地址，也不要给管理台创建 `admin.gotit-zhx.top` 记录。

添加后等待 DNS 生效，并在本机运行：

```bash
for host in gotit-zhx.top www.gotit-zhx.top \\
postmaker.gotit-zhx.top baicaoyuan.gotit-zhx.top; do
echo "--- $host"
  dig +short A "$host"
done
```

四个主机名都应该最终返回 `120.24.174.196`。如果仍返回停放地址、空结果或其他地址，先检查 DNS 控制台中的旧记录、线路/地域解析和 DNS 托管位置。

### 3. 调整阿里云安全组

在阿里云 ECS/轻量服务器安全组中确认：

- 放行 TCP 80。
- 放行 TCP 443。
- SSH 22 只允许你的管理来源或按现有管理策略限制。
- 不放行 TCP 3000、18787、18088、9090。
- 不放行 Redis、数据库、Docker socket 或内部依赖端口。

发布前 Caddy 仅监听本机端口；公网切换后改为监听 80/443。仅开放安全组端口不会自动修改反向代理配置。

### 已完成的公网切换

用户已确认备案通过，阿里云 DNS 记录已配置，安全组已放行 TCP 80/443。四个域名通过外部 DNS 核验后，已启用 Caddy 自动 HTTPS 和主站、PostMaker、百草园反向代理。主站镜像在 Mac 本地按 `linux/amd64` 构建并传到服务器加载，服务器未参与构建。

## 已执行的服务器侧工作

本次已执行：

1. 将 `develop` 中的公网 Caddy 配置同步到 `/etc/caddy/Caddyfile`。
2. 先运行 `caddy validate`，通过后再 reload。
3. 让 Caddy 根据域名反向代理主站、PostMaker 和百草园。
4. 运行 `deploy/prepare-public-env.sh`，备份并更新应用的 HTTPS、Cookie 和允许域名配置。
5. 在本机按真实 HTTPS 地址重建 `linux/amd64` 主站镜像。
6. 通过 SSH 传输镜像，服务器只加载镜像，不在低配服务器构建。
7. 依次验证 HTTPS、项目演示、健康检查、Cookie、CSRF、代理头和资源余量。
8. 已将项目详情中的演示状态改为 `live`；Gitflow 发布已完成，`v0.1.1` 已推送，服务器当前部署 `develop` 提交 `7b42ad7`。

管理台始终保留在 `127.0.0.1:9090`，不会被公网 Caddy 代理。

### 审核通过后的自动切换脚本

仓库提供了 `deploy/activate-public-caddy.sh`。它会先检查四个域名是否都解析到 `120.24.174.196`，然后备份现有 Caddy 配置、运行 `caddy validate`，最后才 reload Caddy。脚本要求显式设置确认变量，避免备案审核期间误开放：

```bash
cd /srv/stackfolio
PUBLIC_RELEASE_CONFIRMED=1 sudo -E ./deploy/activate-public-caddy.sh
```

只有在 ICP 备案已通过、DNS 已生效、阿里云安全组已放行 TCP 80/443 后才执行。脚本不配置管理台公网入口，也不改变应用回环绑定。

应用环境准备脚本同样要求显式确认：

```bash
cd /srv/stackfolio
PUBLIC_RELEASE_CONFIRMED=1 ./deploy/prepare-public-env.sh
```

它只修改公开 URL、安全 Cookie、百草园允许域名和低资源 profile，并在每个环境文件旁生成带时间戳的备份；不会生成、打印或覆盖应用 secret。

## 故障回退

如果公网切换后出现问题，回退方式是：

```bash
sudo cp /etc/caddy/Caddyfile.before-stackfolio-public /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

应用镜像保留上一版，数据库、媒体文件和工作区数据不随 Caddy 配置回退。任何数据库迁移都必须先备份并单独验证恢复。

## 当前观测

截至 2026-11-01：

- `https://gotit-zhx.top/`、`https://www.gotit-zhx.top/`、`https://postmaker.gotit-zhx.top/`、`https://baicaoyuan.gotit-zhx.top/` 均已取得有效 HTTPS 响应。
- 主站和百草园首页返回 HTTP 200；PostMaker 首页可加载，`/api/health` 返回 `status: ok`。
- 主站、PostMaker、百草园和管理台后端端口仍只绑定回环地址；公网入口为 Caddy 的 80/443。
- 管理台仍仅通过 SSH 隧道访问，不配置公网域名。
- 切换后服务器可用内存约 454 MiB；Docker 容器均运行，健康检查处于恢复观察期。
- 环境文件和 Caddy 原配置均已生成回滚副本；主站旧镜像保留为 `stackfolio-site-site:before-public-20261101`。
- ICP 备案号按用户明确要求不添加到页脚。
