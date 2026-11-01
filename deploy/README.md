# 云服务器部署模板

当前阿里云 Ubuntu 24.04 实例仅用于本人受限验收：没有域名或 ICP 备案，网站和演示不对公网开放。服务器目录为 `/srv/stackfolio`，主站和管理台由 Gitflow `develop` 分支管理，演示项目保留各自仓库及独立 Compose project。公网 SSH 可用时，通过 SSH 隧道访问回环绑定端口；公网 80/443 不代理这些服务。

服务器资源有限，按 `site`、`admin`、`postmaker`、`baicaoyuan` 顺序启动，等待一项健康后再启动下一项。不要在服务器同时构建多个应用。公开配置模板为 `local-server/.env.example`；服务器 `.env`、演示项目密钥和管理台访问码只保存在服务器。

首次上线的顺序：

1. 服务器已安装 Docker Engine、Compose plugin、Git、Caddy，并创建约 2 GiB swap。
2. Stackfolio 和两个公开演示仓库已克隆到 `/srv/stackfolio`；克隆使用公开 HTTPS，不保存个人 GitHub token。
3. 服务器专用环境配置和应用 secrets 已生成，均未提交 Git。
4. 服务依次构建并启动；每项启动后须单独通过健康检查。
5. Caddy 继续监听公网 80，但不代理网站或演示；通过 SSH 隧道访问服务器回环端口。管理台只监听 `127.0.0.1:9090`。
6. 无域名和备案期间，项目详情保持未上线；只有完成合规公网发布并通过 HTTPS 验收后才改为 `live`。

管理台容器需要访问 Docker socket 来读取容器统计；Docker socket 的访问权限等同于主机 root，因此管理台必须继续保持 `127.0.0.1:9090`，并且只能通过 SSH 隧道打开。不要将 9090 放进安全组或 Caddy 反向代理。

当前受限验收只通过 SSH 隧道访问，不使用公网 IP 作为网站入口。正式面向中国大陆访客前，应完成域名实名认证、ICP备案和 HTTPS 配置。
