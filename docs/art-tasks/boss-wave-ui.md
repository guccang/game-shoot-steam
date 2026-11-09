# Boss 清缴波次展示任务单

依据：[游戏美术资源生成标准](../art-generation-standard.md)、[AGENTS.md](../../AGENTS.md)。本单从美术任务模板建立，记录本轮 UI 动态效果开发与验收。

## 1 目标与范围

| 字段 | 本轮内容 |
| --- | --- |
| 资源中文名称与稳定标识 | Boss 清缴波次轨道 / boss-wave-ui |
| 类别和用途 | 任务详情与清缴进场提示 UI |
| 当前阶段与本轮范围 | 动态效果开发；复用原主UI轨道，不生成新图 |
| 本轮目标 | 截图中的任务页显示原波次UI；进入清缴范围显示同一轨道，3秒倒计时关闭 |
| 动态效果与交互目标 | 实时节点、进度、准备圆环与Boss头像保持；自动提示不暂停、不夺焦点；手动页面保留直到关闭 |
| 数量和变体 | 一个正式轨道，详情、进场提示与原HUD之间切换，无新增美术变体 |
| 保留项 | 五批节点、Boss头像及事件、战斗计数、接单/续接/存档提示资格、角色与怪物动作 |
| 制作路线 | HTML/CSS/SVG程序；无须imagegen或PNG替换 |
| 参考与同类资产 | 用户任务页截图；src/styles/wave-progress.css；原wave-track |
| 已确认效果与精修参照 | 奶油底板、森林绿描边，节点与Boss头像延续原UI |
| 后续精修项 | 不适用，本轮无新增静态图案 |
| 使用场景 | 森林清缴范围、远程任务详情 |

## 2 造型与空间

| 字段 | 本轮内容 |
| --- | --- |
| 主体剪影 | 细线连接五个圆形波次节点，右端独立Boss头像 |
| 与其他变体的区别 | 不新增变体；详情中嵌入正文，进场提示置于生命卡下方 |
| 主次关系 | 轮次与状态在上，波次轨道在中；关闭倒计时在提示标题右侧 |
| 地面衔接 | 不适用，屏幕DOM不改变地面 |
| 活动空间 | 提示点击穿透，头像所在容器inert，不遮断移动触控；任务详情沿用暂停与关闭流程 |
| 邻接组合 | 生命卡、问号入口、战场；详情与击杀计数、怪潮说明、固定寻路操作栏相邻 |
| 光向与明暗 | 沿用统一纸页材质，不新增光源；倒计时使用浅奶油文字适配深绿标题 |

## 3 技术交付

| 字段 | 本轮内容 |
| --- | --- |
| 逻辑尺寸 | 轨道44px高；提示最多292px宽，手机自适应；详情使用既有480px上限的统一底板 |
| 像素尺寸或SVG视框与倍率 | 沿用112×112 Boss画布、36×36节点圆环SVG；无新位图 |
| 锚点与原点 | 提示锚定生命卡底部+8px；详情锚定滚动正文，标题与操作栏固定 |
| 分层 | 战场Canvas之上的DOM；自动提示非模态，任务详情原生dialog |
| 程序与图片职责 | 游戏提供真实波次；UI更新节点、圆环、填充与3秒计时；头像沿用正式绘制器 |
| 替换接口与保留项 | wave-track、wave-nodes、boss-button等ID稳定；移动同一节点，不克隆Canvas或监听器 |
| 透明背景 | 不适用，保留原纸页底板与独立Boss头像画布透明区域 |
| 碰撞与可通行性 | 无世界碰撞改动；真实触屏移动验证提示期间仍可行走 |
| 昼夜处理 | 共用原UI，使用正式昼夜场景复核，不生成昼夜副本 |
| 文件格式与位置 | src/ui/wave-help.js、wave-progress.js；src/styles/clearing-flow.css；src/ui/mobile-panels.js |
| 内存与缓存预算 | 一个原112×112 RGBA画布约49KiB，五节点SVG，无新增图片请求、纹理或缓存副本 |
| 必需资源与失败行为 | 沿用正式Boss头像与角色资源加载流程；测试等待application.ready，资源失败明确报错 |

## 4 动画任务补充

| 字段 | 本轮内容 |
| --- | --- |
| 动作和时长 | 进场提示显示3、2、1秒后关闭；原波间准备圆环不变 |
| 时钟、帧率与循环 | 关闭用performance.now()及正式renderFrame；游戏圆环继续使用waveRest/waveWarning，不循环重弹 |
| 动作源码或源视频与连续片段 | createWaveHelp.renderFrame、renderNotice；updateWaveProgress、waveCountdownState；无新增源视频 |
| 尺寸、裁切和缩放 | 复用原节点尺寸与头像，不拉伸角色或烘焙动作 |
| 起停与状态衔接 | 弹窗/暂停/退出取消自动提示；轨道归还原HUD。详情关闭及Escape保留原暂停归属；同轮边界往返不重复触发 |
| 局部真实动作 | 不修改角色、怪物或载具动画；实战移动验收沿用正式动作 |
| 独立部件 | 手、枪口、后坐及载具部件不变；任务涉及的Boss头像为原独立画布 |

## 5 生成指令

未调用imagegen：用户要求恢复现有波次UI，直接复用正式节点、SVG圆环和Boss头像。没有新增图片、源请求或PNG精修项。原本体与独立操枪合同保持。

## 6 验收记录

| 设计目标 | 证据与实际结果 |
| --- | --- |
| 系列一致、变体可辨 | 复用同一wave-track；五批节点与Boss头像完整。详情与进场卡均保留森林绿/奶油材质；修订过标题倒计时对比度 |
| 落地与前后遮挡合理 | 世界资产无变化，无新增落地或实体遮挡；昼夜截图检查DOM不盖住角色主体 |
| 保留活动空间和真实边界 | clearing-compact-hud-browser.cjs真实触控期间移动86.8世界单位；不改变物理边界 |
| 动作柔和且部件独立 | 不修改动画资源；实战角色移动、怪潮与领主结算回归通过；布局截图保留角色、怪物、载具同屏 |
| 动态进度与交互正确 | 实测提示3001.6ms；3→2→1文案通过；唯一轨道身份保持；打开详情取消提示，手动页面超过3秒仍打开；寻路按钮、关闭、Escape、续接及读档不重复通过 |
| 白天与夜晚可读 | output/playwright/boss-wave-ui/arrival-390-day.png、arrival-390-night.png及detail对应图；检查角色、怪物、载具、环境和UI同屏 |
| 手机及既有竖版容器合格 | 320×568、360×640、390×844、430×932、844×390、1280×900昼夜共12组；24张截图。轨道及正文无横向溢出；关闭/寻路触控≥44px，短横屏正文滚动、底栏固定。浏览器触屏模拟，不宣称物理手机安装包验收 |
| 资源完整且预算合格 | application.ready通过，无pageerror；一个正式轨道、一份原头像画布，无新增图片及解码预算 |
| PNG替换保留动态与接口 | 不适用，本轮为现有UI复用，无PNG替换 |

正式绘制器入口：src/ui/wave-help.js#createWaveHelp、src/ui/wave-progress.js#updateWaveProgress；头像沿用src/ui/hud.js#createHud与drawBossIcon。

验收入口：src/rendering/visual-review.js#inspectBossWaveUi；visual-contract.json#bossWaveUiCriterion，designCriterion为boss-wave-ui。

证据：output/playwright/boss-wave-ui/result.json；tests/boss-wave-ui-browser.cjs；tests/clearing-compact-hud-browser.cjs；相关单元测试20项通过。wave-node-countdown.test.mjs的“下一波首刷应为1只”旧断言失败（实际4只），已在未修改main复现，与本次UI无关，未修改刷怪数值。

动态效果开发结论：通过。12组昼夜布局与真实触控、计时、详情交互均通过，最终截图已复核。

PNG精修替换结论：不适用，无新增图案。

本轮范围：任务详情和进场提示复用原波次轨道，3秒关闭与手机布局。

需修订内容：无本轮未完成项；低对比倒计时与短横屏操作栏已修订并通过复核。

确认后的版本与长期参考：见本次Git提交及上述输出截图，保持原美术参考。
## 2026-11-08 统一进场详情与收拢动画

本轮按用户要求取消独立进场提示，使用同一个 `wave-help-dialog` 和唯一正式波次轨道；3、2、1 秒后等比平移缩向生命卡旁猫猫问号，手动打开从图标展开且不自动关闭。读详情期间沿用统一弹窗暂停保护，替代此前非模态不暂停的要求。原纸材、森林绿、猫问号 SVG、Boss 头像与 44px 触控保留，无新图片、离屏画布和世界镜头缩放。

动画使用实时 DOM 中心坐标与 Web Animations，收起 440ms、手动展开 260ms；减少动态模式只淡出 100ms。外部关闭、快速重开和卸载撤销旧动画回调，唯一轨道归还原 HUD。正式绘制/检查入口为 `src/ui/wave-help.js`、`src/ui/wave-progress.js`、`src/rendering/visual-review.js#inspectBossWaveUi`，设计目标 `boss-wave-ui` 与 `clearing-compact-hud`。

本轮动态验收通过：`tests/boss-wave-ui-browser.cjs` 检查 320/360/390/430 手机、844×390 短横屏和 1280 既有竖版容器的昼夜共 12 组；同一面板、轨道、当前批次、Boss 头像与固定操作栏均可读，没有横向溢出或小于 44px 的操作。`tests/clearing-panel-motion-browser.cjs` 实测面板出现后 3000.5ms 开始收起，动画终点与猫猫图标中心误差 x/y 均 0px，手动常驻、Escape、关闭途中重开和减少动态通过。11 项详情与首次展示资格单元检查通过。

证据：[首次完整面板](../../output/playwright/clearing-panel-motion/arrival.png)、[缩向入口中段](../../output/playwright/clearing-panel-motion/collapsing.png)、[收起后入口](../../output/playwright/clearing-panel-motion/icon.png)，尺寸与昼夜证据在 `output/playwright/boss-wave-ui/`。手机采用浏览器触控模拟，未使用实体手机。原场景角色、怪物、载具及环境同屏保留；动画只作用于 DOM 面板。无素材生成及 PNG 替换项，资源预算不变。
