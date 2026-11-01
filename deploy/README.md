# 云服务器部署模板

服务器目录建议使用 `/srv/stackfolio`。将仓库固定在已验收的 Git 提交或 tag，复制 `local-server/.env.example` 为 `local-server/.env`，再按服务器地址填写公开 URL。`BIND_ADDRESS` 可设置为 `127.0.0.1`，公网入口由 Caddy 连接回环端口；演示端口不应直接暴露给 Docker 之外的服务。

首次上线的顺序：

1. 安装 Docker Engine、Compose plugin、Git、Caddy，并创建约 2 GiB swap。
2. `git clone` Stackfolio 以及两个公开演示仓库；不要在服务器保存个人 GitHub token。
3. 复制环境模板，生成 PostMaker workspace secret 和百草园 secrets。
4. 按 `site`、`postmaker`、`baicaoyuan` 顺序执行 `./local-server/start.sh`，避免小内存实例同时构建。
5. 用 `deploy/Caddyfile.example` 配置主站入口；管理台保持 `127.0.0.1:9090`，仅通过 SSH 隧道访问。
6. 完成健康检查、端口检查和数据持久化检查后，才把项目详情的 `demoStatus` 改为 `live`。

没有域名和备案时，IP 入口只用于受限验收；正式面向中国大陆访客前，应完成域名实名认证、ICP备案和 HTTPS 配置。
