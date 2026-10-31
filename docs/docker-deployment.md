# Docker 局域网部署

在主仓库根目录操作。需要 Docker Engine 与 Docker Compose；Windows 使用运行中的 Docker Desktop（Linux 容器）。默认将主机所有 IPv4 网卡的 4173 端口映射到游戏容器，运行页面和素材包含在镜像内，不依赖源目录挂载。游戏为单容器，使用 Docker 默认桥接网络，不额外分配 Compose 子网。

## 构建与启动

PowerShell：

```powershell
$env:GAME_GIT_COMMIT = (git rev-parse HEAD).Trim()
docker compose up -d --build --wait
```

Linux/macOS：

```sh
GAME_GIT_COMMIT=$(git rev-parse HEAD) docker compose up -d --build --wait
```

更新游戏后再次执行同一命令。构建传入的提交号显示在游戏设置中的 Git 指纹处；它描述构建时的版本，建议从干净主分支构建。无需执行 `npm install` 或游戏测试。健康检查仅请求首页 HTTP 200。

如果 4173 已被旧 Node 服务占用，先确认进程属于本游戏，再停止旧服务。不要同时启动 `npm start` 和同端口容器。镜像名为 `game-shoot:local`，Compose 项目为 `game-shoot-lan`；Docker Engine 启动后容器按 `unless-stopped` 策略恢复，主动停止后需手动再次启动。

## 访问与防火墙

本机访问 `http://localhost:4173/`，同一局域网的手机访问 `http://电脑的局域网IPv4:4173/`。Windows 可用 `Get-NetIPConfiguration` 查有默认网关的网卡地址；IP 由路由器分配，改变后需使用新地址。电脑需保持开机且 Docker Desktop 正在运行。

Windows 管理员 PowerShell 可添加仅允许本地子网访问该 TCP 端口的规则（已有同名规则时不要重复添加）：

```powershell
New-NetFirewallRule -Name 'GameShootDocker4173' -DisplayName 'Game Shoot Docker LAN 4173' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4173 -RemoteAddress LocalSubnet -Profile Any
```

仅配置局域网访问，无需路由器端口转发。Wi-Fi 的访客隔离或客户端隔离可能阻止手机访问电脑；需要处在可互通的同一网络。

## 查看与停止

### iOS 首页视频加载失败排查

首页视频为 H.264 High Level 3.1、yuv420p、720×1280，无音轨；页面已使用 muted 和 playsinline。此前 server.mjs 忽略 Range 请求，始终返回整份文件，缺少媒体分段支持。[Apple 媒体服务器说明](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/CreatingVideoforSafarioniPhone/CreatingVideoforSafarioniPhone.html)要求支持字节范围读取。

当前服务支持单段、开放末尾和后缀请求，返回 206、Accept-Ranges、Content-Range 和准确的 Content-Length；越界返回 416，HEAD 不返回正文。无效/多段请求以及无法核验的 If-Range 使用完整 200 响应。二进制媒体不再添加文本 charset。

重新构建启动容器后，可对实际访问地址验证：请求头 Range: bytes=0-1 应返回 206、Content-Range: bytes 0-1/129631，正文长度为2。若代理或CDN仍返回整份200，需检查其是否转发并正确处理Range。仅合并源码不会更新已经运行的Node进程或容器。

回归入口为 tests/server-range.test.mjs，启动隔离随机端口检查真实HTTP响应和分片重组，不影响4175预览。这些协议测试不能替代iPhone/iPad实机复测。若提示“轻触播放”，则属于自动播放限制，应通过播放按钮恢复，与媒体加载错误分别排查。

```sh
docker compose ps
docker compose logs --tail 50 game
docker compose stop
docker compose start --wait
```

游戏存档仍在各浏览器的本地存储中，容器不保存玩家进度。本机 localhost 和手机局域网地址属于不同来源，不自动共享存档。

`.dockerignore` 和 Dockerfile 只分发运行页面、源码、字体、处理后图集、清单、音乐及首页处理后的 MP4/WebP；排除 `.git`、原始素材、生成请求、服务记录、开发依赖和验收输出。

配置参考：[Docker Compose 服务与端口映射](https://docs.docker.com/reference/compose-file/services/#ports)、[Docker 构建上下文排除规则](https://docs.docker.com/build/concepts/context/#dockerignore-files)。
