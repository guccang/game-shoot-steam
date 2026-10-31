# 地图打开性能

## 原因和处理

原地图每次打开都会调用 `paintGround`，同步遍历整个森林并绘制装饰和山体，再叠加文字、玩家和任务。面板还会重新设置 GroundCache 的地图/季节，丢失战场季节过渡参数，可能清空战场地块缓存。

现在森林四季及湖谷底图由同一正式绘制序列离线导出。手机只异步读取、解码当前底图；重复打开复用位图，玩家位置、任务、清缴与地图文字仍由原面板实时绘制。底图加载与战场地块、季节过渡互相独立。没有修改模拟频率、移动速度或游戏时钟。

只缓存最近两张解码图，合计约 3.08 MiB；当前加载任务估算另约 1.54 MiB，取消后迟到的结果立即释放。五张 PNG 共 3,159,447 字节，单张 720×560。资源清单含尺寸、字节数、SHA-256 和绘制依赖指纹。缺图或错误尺寸会显示“地图加载失败，请关闭后重试。”；不会回退到同步画世界或替代图片。未解码完成时显示“正在准备地图…”，仍可关闭。

## 资源维护

默认从当前工作树启动 `$env:PORT='4175'; node server.mjs`。其他任务占用时可使用空闲本地端口，本轮隔离验证使用 4185，未停止其他任务的服务。

在本地页面运行以下命令，生成脚本会销毁该测试页面的游戏实例；请使用独立测试浏览器会话：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=map-preview open http://localhost:4175
npx --yes --package @playwright/cli playwright-cli -s=map-preview run-code --filename scripts/build-map-previews.cjs > output/map-previews.log
node scripts/save-map-previews.mjs output/map-previews.log
```

绘制依赖变化后重新生成，并运行资源指纹和浏览器像素对照。位图内容改变时递增 `MAP_PREVIEW_VERSION`，再导出清单，避免部署缓存继续返回旧图片。PNG 是处理后的运行资源，导出日志不分发到游戏包。

## 针对性验证

单元测试：`node --test tests/map-preview-cache.test.mjs tests/ground-retention.test.mjs tests/render-pipeline.test.mjs`。

浏览器先运行 `tests/map-preview-assets-browser.cjs` 检查五张图的像素，再运行 `tests/map-open-browser.cjs` 创建隔离游戏实例并测量重复开图，最后运行 `tests/map-panel-browser.cjs` 检查冷加载、失败重试、当前位置及320/390昼夜布局。

证据保存于 `output/playwright/map-open/`。浏览器测试分别记录底图贴图、整次点击和后续帧延迟；公共弹窗布局、后台负载与CPU降速会影响整次点击时间，不能据此承诺实际Mate 50 Pro长时间游玩的帧率或温度。

本轮13项单元检查通过，五张PNG逐像素对照全部零差异。连续四次开图只加载一张图，地块与过渡对象身份均保持。浏览器普通速度下点击处理为61.8/20.8ms（底图4.1/2.9ms），4倍CPU降速为82.1/98.3ms（底图13.4/18.2ms）；后续帧分别79.5/35.0/143.3/150.9ms。冷加载立即关闭、404明确失败后重新打开恢复、两处玩家位置更新均通过。故意阻断图片产生的404控制台错误属于失败路径测试，未出现页面脚本异常。
