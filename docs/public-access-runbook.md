# gotit-zhx.top 公网访问与发布运行手册

本文集中记录阿里云控制台中需要手动维护的项目、已部署入口、主站安全更新流程和故障回退步骤。当前公网入口已经启用；后续操作用于复核、更新和故障处理。

最后核验时间：2026-11-01（Asia/Shanghai）

## 1. 当前公网入口

| 用途 | 公网地址 | 服务器回环后端 |
| --- | --- | --- |
| 个人网站 | `https://gotit-zhx.top` | `127.0.0.1:3000` |
| 个人网站别名 | `https://www.gotit-zhx.top` | `127.0.0.1:3000` |
| PostMaker 演示 | `https://postmaker.gotit-zhx.top` | `127.0.0.1:18787` |
| 百草园演示 | `https://baicaoyuan.gotit-zhx.top` | `127.0.0.1:18088` |
| 个人管理台 | 不提供公网地址 | `127.0.0.1:9090`，仅 SSH 隧道 |

Caddy 在服务器宿主机监听 80/443，按域名转发到回环端口。3000、18787、18088、9090、Redis、数据库和 Docker socket 不得加入安全组，也不得加入 Caddy 公网配置。

## 2. 需要你在阿里云控制台手动维护的内容

### DNS

在阿里云云解析 DNS 中保持以下记录：

| 主机记录 | 类型 | 记录值 |
| --- | --- | --- |
| `@` | A | `120.24.174.196` |
| `www` | A 或 CNAME | `120.24.174.196` 或 `@` |
| `postmaker` | A 或 CNAME | `120.24.174.196` 或 `@` |
| `baicaoyuan` | A 或 CNAME | `120.24.174.196` 或 `@` |

私有地址 `172.17.1.64` 不得写入公网 DNS。不要为管理台创建 `admin.gotit-zhx.top` 记录。

变更记录后，在服务器上验证解析和 HTTPS 路由：

```bash
ssh -i /Users/gotit/Downloads/SSH-key.pem root@120.24.174.196
for host in gotit-zhx.top www.gotit-zhx.top postmaker.gotit-zhx.top baicaoyuan.gotit-zhx.top; do
  printf '%s: ' "$host"
  getent ahostsv4 "$host" | head -n 1
  curl -fsSL -o /dev/null -w 'HTTP %{http_code}, IP %{remote_ip}\n' "https://$host/"
done
```

本机网络可能通过 DNS 代理返回 `198.18.0.0/15` 测试地址；这种结果不能证明生产 DNS 错误。以外部解析、服务器上的 `getent`，以及 HTTPS 实际返回的 `remote_ip` 共同判断。

### 安全组

阿里云安全组应放行：

- TCP 80：HTTP 到 HTTPS 重定向和证书验证。
- TCP 443：公网 HTTPS。
- TCP 22：必要的 SSH 管理入口；能限制来源 IP 时不要开放给所有地址。

不要放行 3000、18787、18088、9090、6379、数据库端口或 Docker socket。安全组变更后，在服务器执行 `ss -lntp` 检查实际监听端口。

### 备案和域名控制台

ICP备案已通过，当前按要求不在页脚展示备案号。若备案信息、网站内容或服务范围变化，应先在阿里云备案控制台确认是否需要变更备案。网站上线后的公安联网备案等事项，按阿里云和属地主管部门的最新要求自行跟进；证件、验证码和后台截图不要放入 Git 仓库。

## 3. 当前部署的验证证据

服务器 `/srv/stackfolio` 当前位于 Git 提交 `7b42ad7`（`develop`），公网 Caddy 配置校验通过，以下四个地址均返回 HTTP 200：

```text
https://gotit-zhx.top
https://www.gotit-zhx.top
https://postmaker.gotit-zhx.top
https://baicaoyuan.gotit-zhx.top
```

PostMaker 健康接口返回 `status: ok`。主站、管理台、百草园和 PostMaker 相关容器均为 healthy；服务器可用内存约 465 MiB，并保留约 2 GiB swap。主站镜像在 Mac 上以 `linux/amd64` 构建后传输，服务器不执行主站构建。

## 4. 以后发布主站更新的低负载流程

以下流程适用于主站代码、项目页和博客内容更新。它把构建放在 Mac 上，避免在低配服务器上产生构建峰值内存。

### 4.1 在 Mac 上准备发布提交

```bash
cd /Users/gotit/Programme.localized/stackfolio
git checkout develop
git pull --ff-only origin develop
npm run lint
npm run typecheck
npm run test:admin
npm run test:content
git diff --check
```

按 Gitflow 将变更从 `feature/*` 合并到 `develop`；准备发布时建立 `release/*`，验收后合并到 `main` 和 `develop` 并创建版本标签。生产镜像使用明确版本号，例如 `v0.1.2`。

### 4.2 在 Mac 上构建 amd64 镜像

```bash
docker buildx build \
  --builder desktop-linux \
  --platform linux/amd64 \
  --load \
  -t stackfolio-site-site:v0.1.2 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://gotit-zhx.top \
  --build-arg NEXT_PUBLIC_POSTMAKER_URL=https://postmaker.gotit-zhx.top \
  --build-arg NEXT_PUBLIC_BAICAOYUAN_URL=https://baicaoyuan.gotit-zhx.top \
  -f local-server/site.Dockerfile .
```

### 4.3 传输、保留回滚镜像并更新单个服务

以下命令不会把密码或私钥写入仓库；私钥路径按本机实际位置调整。服务器只加载镜像，不执行 `docker build`。

```bash
docker save stackfolio-site-site:v0.1.2 | gzip | \
  ssh -i /Users/gotit/Downloads/SSH-key.pem root@120.24.174.196 \
  'gunzip | docker load'

ssh -i /Users/gotit/Downloads/SSH-key.pem root@120.24.174.196 <<'REMOTE'
set -eu
cd /srv/stackfolio
old=$(docker image inspect stackfolio-site-site -f '{{.Id}}')
docker tag "$old" stackfolio-site-site:before-v0.1.2
docker tag stackfolio-site-site:v0.1.2 stackfolio-site-site:latest
docker compose -p stackfolio-site \
  --env-file local-server/.env \
  -f local-server/compose.yaml \
  up -d --no-build --wait --wait-timeout 90 site
docker ps --filter name=stackfolio-site-site-1 \
  --format '{{.Names}} {{.Image}} {{.Status}}'
free -m
REMOTE
```

只更新 `site` 服务，不要为了主站内容变更重启 PostMaker、百草园或其数据库。更新后从服务器验收：

```bash
for host in gotit-zhx.top www.gotit-zhx.top postmaker.gotit-zhx.top baicaoyuan.gotit-zhx.top; do
  curl -fsSL -o /dev/null -w "$host HTTP %{http_code} %{remote_ip}\n" "https://$host/"
done
curl -fsSL https://postmaker.gotit-zhx.top/api/health
docker ps --format '{{.Names}} {{.Status}}' | sort
free -m
```

### 4.4 回退主站镜像

如果只有主站更新异常，回退镜像并保留数据卷：

```bash
ssh -i /Users/gotit/Downloads/SSH-key.pem root@120.24.174.196
cd /srv/stackfolio
docker tag stackfolio-site-site:before-v0.1.2 stackfolio-site-site:latest
docker compose -p stackfolio-site --env-file local-server/.env \
  -f local-server/compose.yaml up -d --no-build --wait --wait-timeout 90 site
```

如果 Caddy 配置变更失败，先验证再 reload：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 5. 管理台访问

管理台不使用公网域名。维护时，在 Mac 上建立 SSH 隧道：

```bash
ssh -N -i /Users/gotit/Downloads/SSH-key.pem \
  -L 9090:127.0.0.1:9090 root@120.24.174.196
```

然后只在本机打开 `http://127.0.0.1:9090`。关闭终端即关闭隧道；不要把 9090 添加到 Caddy 或安全组。

## 6. 日常检查和故障顺序

1. 检查 DNS 是否仍指向 `120.24.174.196`。
2. 检查 `sudo caddy validate --config /etc/caddy/Caddyfile` 和 Caddy 服务状态。
3. 检查 `docker ps`、单个容器日志和 `free -m`。
4. 低配实例出现内存不足时，先停止不必要的演示服务，再处理日志或构建问题；不要在服务器同时构建多个应用。
5. 不要删除 SQLite、媒体目录、Docker volume 或 `.env` 作为常规排障手段。数据恢复前先备份，并记录当前提交、镜像和配置版本。

## 7. 不应提交或发送的材料

服务器密码、SSH 私钥、GitHub Token、工作区密钥、数据库密码、管理台访问码和任何私有 `.env` 文件只保存在本机安全存储或服务器私有目录中，不写入 Git、博客或截图。
