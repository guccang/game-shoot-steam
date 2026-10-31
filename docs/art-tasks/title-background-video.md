# 森林营地宣传背景美术任务单

## 用户指定原片3–6秒循环（2026-10-23，当前交付）

- 目标与参考：遵照用户最终选择，使用 `D:/Download/video-2cbda66ee26a046b.mp4` 的3–6秒，不重新生成、不更换风格。文件SHA256与仓库原v2源片一致：`2cbda66ee26a046ba44d952748148340709e8d322f8c474c9580ac8bad8e5468`。
- 结构、尺寸与分层：取原片[3,6)秒，即24FPS下第72–143帧；按用户后续首尾衔接要求，将首尾各6帧重叠0.25秒，得到原速2.75秒、66帧、720×1280循环。固定镜头、原猫身份、迎风围巾与风景构图保持；视频→遮罩→HTML菜单和上下安全区不变。
- 制作路线：精确裁切后将尾部与头部做6帧短融合，中间60帧保持原速；不倒放、不补静帧、不引入指定区间外画面；同片第一个画面导出海报。不做新美术生成，游戏身体、独立枪械、地图碰撞和昼夜材质修改不适用。
- 资源：继续使用 `assets/title/background.mp4`、`poster.webp`、`manifest.json`；源片复用 `source/original.mp4`，裁切记录保存在 `source/approved-cut-3-6/`；源记录继续排除运行包，MP4≤6MB、海报≤200KB。
- 本轮覆盖先前10秒新片要求及v5选择。验收入口 `src/platform/title-video.js#createTitleVideo`、`src/rendering/visual-review.js#inspectTitleMenu`，`designCriterion: title-background-video`。本轮结论：通过，替换运行视频与同片海报。

- 接缝修订：直接裁切会造成水纹跳变和突兀闭眼，故退回直接裁切方案。0.25秒融合后，水面边界帧平均差异由4.989降至1.647（正常帧间最大1.737）；树冠2.296降至1.640。指标只帮助定位跳变，另复核原尺寸接缝连续帧及真实播放器录像中的连续四轮动作。围巾持续迎风，眨眼自然闭合，未见明显双重轮廓、黑帧或长静止段。短过渡含正常融合柔化，未把相似首尾帧当成唯一验收依据。
- 真实播放：通过，记录6次时间回绕；各秒区间保持局部运动。进入游戏/后台暂停、快速导航恢复、减少动态海报、404显式错误与恢复、自动播放被拒绝后点击恢复、单媒体实例均通过。
- 页面与同屏：通过，320×568、390×844、1280×900首页裁切与44px触控检查正常；白天/夜晚正式角色、怪物、载具、环境及暂停/设置复核通过。右上角齿轮与主页面移除玩法说明保持。
- 实际规格：H.264/yuv420p/faststart、24FPS、66帧、2.750秒、720×1280、静音；MP4为129631字节，海报38496字节。用户文件与已留存v2原片SHA256一致，未重复生成。运行清单包含源区间、融合时长、模型来源及资源哈希。
- 证据：`assets/title/source/approved-cut-3-6/processing.json`，`audit/motion.json`、`audit/seam-comparison.json`、`audit/browser-motion.json`、`audit/browser-layout.json`；[正式首页](../art-reference/title-menu/approved-cut-title-390.png)、[首尾连续帧](../art-reference/title-menu/approved-cut-seam.jpg)。真实录像及手机/桌面/昼夜截图保存在 `output/playwright/title-video-user-cut/`，其中 `blended-cut-loops.webm` 为本轮录制；录像有浏览器录屏压缩，细节以原片连续帧复核。
- 执行范围：仅运行 `tests/title-video-browser.cjs`、`tests/title-menu-visual.cjs` 的4188端口隔离副本，补充源片区间和媒体参数检查；未运行全量测试。未改存档、玩法、角色图集或通行规则，对这些内容不另扩展测试。

## 迎风围巾重新设计 v5（2026-10-23）

- 用户方向：更喜欢此前有风、围巾飘动的氛围；v4虽然连续运动，但弱化了围巾表现，本轮以恢复氛围感为首要目标。
- 目标与结构：围巾始终展开并随风起伏，猫猫享受微风、自然眨眼，尾巴柔和摆动；麦穗、树叶与河水呼应同一风向。10秒连续运动，首尾不静止，也不让围巾突然出现或消失。
- 参考：从原v2源片 `assets/title/source/original.mp4` 的4.5秒提取完整无UI画面；同源正式绘制器的猫猫、营地比例与配色保持。用已经展开的围巾姿态约束首尾，避免从短领巾突然变成长围巾。
- 制作路线：Seedance 2.5首尾帧，720×1280、9:16、10秒，固定镜头；首尾同一个持续迎风阶段，不重新分配静止开场/收尾。
- 锚点与分层：脚底固定，中段主体，上下保留HTML标题/按钮安全区；视频→遮罩→HTML菜单。不会修改正式游戏身体图集、独立手枪与战斗动作。
- 保留项：原版橘猫脸型、耳朵、身体比例、装备、绿描边与柔和草木配色，营地和湖岸构图。地图通行/碰撞/昼夜材质修改不适用；运行昼夜同屏继续核对。
- 交付：`assets/title/source/windy-v5/`保留参考、提示词、请求及原片；处理后MP4≤6MB、海报≤200KB；继续保持单播放器、后台暂停与减少动态海报。
- 实际造型：通过。绿色围巾始终在猫猫左侧展开，以抬起、下落及布面弯曲形成持续风感；眯眼与眨眼保留松弛神态。围巾与河水为主要运动，麦穗轻微变化，树冠较稳定，环境不抢主体。没有增加长流苏、身体缩放或新的角色部件。
- 连续动作与接缝：通过。10个秒区间的围巾都存在明显局部运动，真实播放器围巾采样平均变化面积36.6%–42.8%；这只用于排除静止段。另复核源片首尾连续帧及真实录制前40秒动作，围巾不消失、不收回短领巾，脚底、装备与人物比例稳定。实际播放器记录4次时间回绕。
- 页面与交互：通过。320×568、390×844、1280×900裁切正常；白天/夜晚角色、怪物、载具、环境和暂停/设置同屏复核通过。进入游戏/后台暂停、减少动态海报、404显式失败及重试、自动播放拒绝后点击恢复、单视频实例均通过。
- 实际规格：Seedance 2.5，720×1280、24FPS、240帧、10.000秒、H.264静音，MP4为374060字节，海报38230字节。连续截取原片前240帧；不复制、不倒放、不变速，不靠静帧凑时长。请求 `vid-ztj-forest-title-20261023-v5`，哈希和来源见运行清单。
- 证据：`assets/title/source/windy-v5/audit/browser-motion.json`、`motion.json`、`seam.jpg`；[正式首页](../art-reference/title-menu/windy-v5-title-390.png)、[布料连续动作](../art-reference/title-menu/windy-v5-cat-motion.jpg)、[循环接缝](../art-reference/title-menu/windy-v5-seam.jpg)。真实录像 `output/playwright/title-windy-scarf/windy-three-loops.webm` 与手机/桌面/昼夜截图已保留。
- 执行范围：使用 `tests/title-video-browser.cjs`、`tests/title-menu-visual.cjs`，仅为避开其他任务的4186端口，将工作副本端口保护改为4187执行；未改正式测试入口，未跑全量测试。正式入口 `src/platform/title-video.js#createTitleVideo`，`designCriterion: title-background-video`。本轮结论：通过，替换运行视频与同片海报。

## 持续动态修订：消除首尾长时间静止（2026-10-23）

- 用户实际反馈：旧片约前3秒静止、中间4秒运动、后3秒静止，循环观感成为动4秒、停6秒。撤回旧版“动作真实与循环通过”的结论；播放器时间回绕不等于素材持续运动。
- 本轮目标：10秒全程可感知的轻柔局部运动，开头立即运动，结尾保持运动穿过接缝；去掉建立场景、等待和逐渐停住的分镜。
- 制作路线：继续使用 Seedance 2.5 首尾帧约束，原正式绘制器参考 `assets/title/source/reference.png`；参考未变，不重新设计角色或营地。
- 结构、尺寸与锚点：720×1280、9:16、10秒，固定镜头；猫猫保持中段脚底位置，标题与操作安全区沿用现有页面。仍为背景视频→遮罩→HTML菜单分层。
- 保留项：原版橘猫身份、绿围巾、手持装备、营地比例与森林配色；身体图集和游戏操枪不变。地图通行、碰撞和战斗动作修改不适用。
- 运动要求：猫猫周期呼吸、尾巴/围巾持续摆动，树叶/麦穗和河水持续轻动；任意一秒不可全部冻结；首尾位置相近但运动不停顿，不拼接复制静帧、不拉伸整图、不倒放凑循环。
- 交付与预算：v3、v4请求/原片/逐段检查记录各存 `assets/title/source/continuous-v3/`、`continuous-v4/`，运行MP4≤6MB、同片海报≤200KB、一个视频元素。原始旧片与请求保留便于对照。
- v3退回记录：每秒局部动作及三轮解码技术检查通过，但生成了更长围巾，末尾至开头姿态跳变；不作为交付。v4提示词约束短领巾、固定身体轮廓与首尾运动方向。
- v4实际结果：通过。720×1280、24FPS、240帧、10.000秒，H.264静音；运行片438305字节，同片海报44042字节。连续截取原片前240帧，无补帧、复制、倒放或变速。
- 持续动作：旧片在真实播放器新增检查中被拒绝（第1/2/8/9秒近乎无运动）。v4角色各秒有效变化面积为3.45%–6.84%，麦穗4.43%–9.68%，树冠及水面每秒也有变化；指标用于定位静止段，不能单独作为审美通过依据。逐帧接缝复核保留短领巾、脚底和手持装备，尾巴自然回卷，无v3的围巾突现。
- 实际播放器：连续录制并采样三次时间回绕，全部十个秒区间都有局部运动；复核录制前40秒的连续动作，未见长静止段或主体形体突变。进入游戏、切后台、减少动态、404失败提示、重试、自动播放拒绝后点击恢复及单解码实例均通过。证据：`assets/title/source/continuous-v4/audit/browser-motion.json`。
- 页面与同屏：`tests/title-menu-visual.cjs`通过。320×568、390×844、1280×900首页无裁切/横向溢出，右上设置保留；白天/夜晚正式角色、怪物、载具、环境及暂停/设置同屏正常。未改存档与玩法，未运行全量测试。
- 长期图：[新首页](../art-reference/title-menu/continuous-v4-title-390.png)、[逐秒角色动作](../art-reference/title-menu/continuous-v4-cat-motion.jpg)、[接缝连续帧](../art-reference/title-menu/continuous-v4-seam.jpg)。完整录制与各尺寸/昼夜截图保留在 `output/playwright/title-video-continuous/`，其中 `accepted-continuous-loops.webm` 为真实播放器记录。
- 正式入口：`src/platform/title-video.js#createTitleVideo`、`src/rendering/visual-review.js#inspectTitleMenu`；`designCriterion: title-background-video`，新请求 `vid-ztj-forest-title-20261023-v4`。本轮结论：通过，替换运行片与海报；旧请求和退回产物保留，不进入运行包。

依据：由 art-generation-brief.md 任务单复制整理，执行 ../art-generation-standard.md 与 ../../visual-contract.json。

## 1 目标与范围
- 标识：title-background-video，用途：游戏首页与通用页面。
- 目标：原版森林绘本风格，手机和桌面竖版画框；进入、继续、清档与返回形成完整闭环。
- 数量：一套页面、一段10秒9:16视频；不新增角色变体。
- 保留：原猫身份、身体连续帧、独立手与枪、全部玩法与现有存档恢复规则。
- 制作路线：正式场景首帧 → Seedance 2.5 首尾帧生成 → H.264处理。
- 参考：docs/art-reference/landscape-six-day.png、landscape-six-night.png、hud-compact-phone.png；正式 Renderer 和 assets/cat-front。

## 2 造型与空间
- 轮廓：圆润猫猫、阔叶树冠、营地屋顶与湖岸；森林绿描边、奶油黄、三层有限平涂。
- 构图：顶部标题，中部营地猫猫，下部菜单；按钮区域低对比留白。
- 地面：沿用营地、草地、水岸与实际阴影，左上光、右下冷影。
- 活动空间：只作用于屏幕页面，不改地图通行与碰撞；新地貌/变体差异不适用。

## 3 技术交付
- 逻辑尺寸：沿用游戏竖版容器；手机320/390，桌面1280×900检查。
- 视频：720×1280目标、10秒、不透明、静音MP4；不逐帧重定位和拉伸。
- 锚点：屏幕中心，object-fit cover，猫猫主体在中段安全区；HTML标题及按钮独立分层。
- 分层：背景视频、可读性遮罩、标题与菜单；暂停页使用正式战场。
- 碰撞：纯界面，无新碰撞；通路验收不适用，验证点击不穿透。
- 昼夜：视频固定晴日；暂停/设置在实际白天与夜晚同屏验收。
- 位置：assets/title为处理后资源，assets/title/source为原片及请求，output/playwright为验收证据。
- 预算：MP4≤6MB、海报≤200KB、单视频元素；720×1280 RGBA每帧约3.52MiB，不制作全帧常驻图集。

## 4 动画任务补充
- 全程10秒保持自然局部运动，开头即动、结尾继续运动；固定镜头，以周期动作连接首尾，不用静止等待建立场景或收尾。
- 首尾同源参考，真实10秒连续片段；实际24 FPS、240帧；哈希见清单，循环证据见第6节。
- 入游戏/切后台暂停播放；减少动态使用同片海报；播放失败明确报告。
- 首页不改正式操枪资源，宣传片不作为身体动作图集。

## 5 生成指令
延续《森林巡游》正式场景三分之四俯视、森林绿描边、柔和奶油与草木配色、有限平涂。保持原版猫猫与营地身份，固定镜头，轻微呼吸眨眼、尾巴围巾与树叶水纹，首尾衔接，无文字按钮水印。禁止写实、3D替换、整图抖动、额外肢体、镜头切换、比例跳变。完整请求保存在assets/title/source。

## 6 验收记录

以下保留首次v2历史记录，不代表持续动态修订通过；其中旧版“动作真实与循环”结论已撤回，当前结论见本文开头修订记录。

| 设计目标 | 结果 | 证据与实际入口 |
| --- | --- | --- |
| 系列一致与留白 | 通过。原版橘猫、营地、麦田、树林与河岸；标题和按钮独立，中段角色不被菜单遮挡。 | ../art-reference/title-menu/title-390-fresh.png、title-320-continue.png、title-1280-continue.png |
| 比例与落地 | 通过。角色尺寸、脚底、接触影及森林绿描边延续正式参考，无镜头位移或整体拉伸。 | assets/title/source/reference.png、../art-reference/title-menu/title-cat-motion.png |
| 动作真实与循环 | 通过。连续帧中眨眼、尾巴、围巾与水纹独立变化；首尾姿态自然连接。浏览器记录4次回绕，非静帧播放。 | ../art-reference/title-menu/title-loop-seam.png；output/playwright/title-three-loops.webm 与 title-video-checks.json |
| 昼夜同屏 | 通过。正式角色、怪物、载具、场景与游戏UI在白天、夜晚同屏复核；暂停页与设置可读。 | ../art-reference/title-menu/menu-game-390-day.png、menu-game-390-night.png、menu-pause-390-day.png、menu-pause-320-night.png |
| 手机与桌面 | 通过。320×568、390×844、1280×900；无横向溢出，主要按钮≥44px，触摸继续未穿透摇杆。 | output/playwright/title-visual-checks.json；../art-reference/title-menu/menu-reset-320.png |
| 进入与存档保护 | 通过。首次不写成长档、有效旧档继续、损坏保留原文、拒绝访问临时游玩；清档失败保留旧数据，死亡续游保留成长。 | tests/title-menu.test.mjs、tests/title-menu-browser.cjs；output/playwright/title-menu-checks.json |
| 暂停与恢复 | 通过。菜单冻结游戏/经济/对白更新，继续恢复特殊玩法，嵌套帮助不提前解除主动暂停。 | src/app/create-app.js；output/playwright/title-menu-checks.json |
| 资源与播放失败 | 通过。单视频实例；战场与后台暂停、减少动态海报、404明确失败、自动播放被拒绝可点击恢复，快速往返不滞留解码播放。 | tests/title-video-browser.cjs；output/playwright/title-video-checks.json |
| 世界通路、变体、操枪修改 | 不适用。未改碰撞或新增角色变体；原游戏角色动作与独立手持部件原样保留。宣传视频不复用为战斗图集。 | git差异与正式场景截图 |

实际视频：Seedance 2.5，720×1280，24 FPS，240帧，精确10秒，H.264/yuv420p/faststart，无音轨；349370字节。海报44490字节。RGBA单帧约3.52MiB，不常驻全部帧，仅一个视频元素；源片与运行片哈希见 assets/title/manifest.json。

原片为241帧、10.041667秒，处理时连续截取前240帧，不补帧、不复制帧。运行循环区间[0,10)。v1请求因首尾帧模式不接受显式ratio被服务端拒绝，完整保留在source/rejected-v1；v2改adaptive，由720×1280参考确定9:16，成功产物及请求完整留存。

正式入口：src/ui/title-menu.js#createTitleMenu、src/platform/title-video.js#createTitleVideo、src/rendering/renderer.js#Renderer.draw；验收读取 src/rendering/visual-review.js#inspectTitleMenu。

designCriterion：title-menu、menu-navigation、title-background-video，登记于 visual-contract.json。

结论：通过。完整工作证据保留在主仓库 output/playwright/title-menu/；上表output文件可在该目录找到。长期截图已进入 docs/art-reference/title-menu/。

### 界面设计参数
森林墨绿 #294338，按钮绿 #3c765b，奶油黄 #f4df9c，草木边线 #9bac7b，背景深绿 #19382f。标题使用系统楷体优先、中文无衬线回退；正文沿用微软雅黑/PingFang。顶部标题、中段角色、底部纵向操作；仅视频承担持续动态。

最终功能验收共29项通过，包含刷新后恢复祝福选择、守护休整返回后保持面板暂停归属、剧情对白在首页不继续计时。已合入同期master的波次存档与进度条变更，相关13项存档/波次测试通过。精简证据见 title-menu-evidence.json，完整录制与JSON保留在主仓库output目录。

### 2026-10-28 开始入口与背景视频加载解耦

本轮只调整启动与媒体生命周期，沿用正式视频、同片海报、首页布局和按钮样式，无新位图、画布或解码实例。轻量入口先启用开始按钮；游戏模块仍准备中时，点击只记录一次开始意图并显示“正在准备游戏…”，正式应用准备好后自动进入既有建图过场。游戏必需资源失败仍明确报错，不能进入不完整场景。视频使用独立缓冲，首帧之前显示同源海报，canplay后才播放；晚到的媒体在游戏中继续暂停，返回首页再恢复。减少动态和自动播放受限入口保留。

验收：tests/title-video-start-browser.cjs通过四种真实网络延迟/失败场景：延迟入口模块与视频时点击仍被接收，媒体请求未放行前已进入游戏；留在首页时延迟视频完成后自动播放；视频404仍可进入；必需启动模块503保留错误并禁止进入。迟到媒体不会在战场背后播放，返回首页恢复，减少动态切回海报，正常场景零页面错误。tests/title-menu-loading-browser.cjs确认启动前后按钮位置、312×46px尺寸与配色不变，自动播放受限入口可用。语法及diff检查通过。

正式入口：src/platform/title-start.js、src/main.js、src/platform/title-video.js、index.html；designCriterion沿用title-menu/menu-navigation/title-background-video。证据output/playwright/title-video-start/result.txt、layout-regression.txt、early-start-pending.png、video-pending.png、video-playing.png；长期截图docs/art-reference/title-menu/start-before-ready.png。使用隔离端口4187验证，默认4175由其他开发服务占用。结论：开始游戏不等待首页视频，验收通过。
