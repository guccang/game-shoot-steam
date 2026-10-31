# 主菜单与通用页面美术任务单

## 本轮修订：修复首页高级设置空分组（2026-10-26）

- 目标与参考：用户截图显示高级设置展开后为空；首页既有规则隐藏调试工具时，应连同空折叠入口一起隐藏。游戏内仍保留高级设置和调试功能。
- 结构、尺寸、分层及保留：沿用原设置底板和滚动区，仅调整首页显示选择器；存档管理独立显示，不改按钮、资源、存档事务或战场绘制。无新增资产及性能开销，动作、通行与昼夜材质修改不适用。
- 正式入口与目标：src/styles/title-menu.css，src/ui/panels/settings.js，designCriterion为menu-navigation。
- 验收计划：320/390手机视口检查首页没有空分组、清档入口可见，游戏内实际展开高级设置和调试工具，返回首页后不遗留空分组。
- 结论：通过。320×568、390×844正式浏览器实际操作已检查：首页不展示空高级分组、清空存档可见；进入游戏后两层展开能显示调试工具，返回首页后空分组保持隐藏，设置无横向溢出。仅检查本次显示逻辑，不运行全量测试。
- 证据：[首页设置](../art-reference/title-menu/advanced-home-390.png)、[游戏内工具](../art-reference/title-menu/advanced-game-320.png)、[验收结果](../art-reference/title-menu/advanced-settings-results.json)。完整脚本与截图位于output/playwright/advanced-settings/。

## 本轮修订：移除首页三行小字（2026-10-26）

- 目标与参考：按用户两张截图，移除“喵喵小队”“风吹过林梢，冒险正好。”和“收拾行囊，出发去森林。”。
- 结构、尺寸与锚点：首页标题仅保留森林巡游；移除开始按钮上方短句，继续复用原有手机布局、按钮触控尺寸和页脚安全区，不新增文字或占位节点。
- 保留与分层：保留背景视频/海报、主标题、齿轮、开始游戏、健康忠告和8+；不改存档交互、场景、角色、动画、碰撞或资源。昼夜战场、通行、动作检查不适用。
- 预算与入口：零新增媒体，删除无用样式，同步正式验收器与现有脚本；入口index.html、src/styles/title-menu.css、src/rendering/visual-review.js#inspectTitleMenu，designCriterion为title-menu。
- 验收计划：320×568、390×844、844×390正式首页截图与溢出/触控检查，确认初始化前后开始按钮保持稳定。
- 结论：通过。320×568、390×844、844×390正式浏览器截图已复核，三行小字完全移除，首页无横向溢出，开始按钮46px高；启动模块加载前后按钮文案、位置和颜色一致。背景视频正常播放。仅执行本次页面检查，未运行全量测试。
- 证据：[320px首页](../art-reference/title-menu/removed-captions-320.png)、[390px首页](../art-reference/title-menu/removed-captions-390.png)、[正式验收数据](../art-reference/title-menu/removed-captions-results.json)；完整截图位于output/playwright/title-remove-captions/。

## 本轮修订：首页固定开始入口（2026-10-26）

- 目标：首页始终显示“开始游戏”和固定出发短句，去掉设备存储说明；有效存档在点击后直接继续，不因加载或存档状态改变首页布局。
- 参考及结构：沿用当前首页背景、标题、齿轮和健康忠告。移除首页存档摘要和第二按钮，清档入口统一移到设置的存档管理区；仅异常时显示必要反馈，正常加载不显示内部运行说明；媒体反馈定位于操作区上方，不参加文档流。
- 尺寸、锚点、分层：原视口与安全区不变；开始按钮保留至少44px触控区。清档复用现有设置确认页，不新增弹窗；无新桌面布局。
- 保留项：原背景视频及同片海报、单播放器、进入后才生成地图、继续和显式清档事务。角色、地图、碰撞、昼夜材质与独立操枪没有修改，相关资产生成和通行测试不适用。
- 动画与预算：不生成任何位图或视频，不改原连续动作；无新增解码与纹理缓存。仅调整现有设置区和固定反馈容器。
- 验收计划：未加载、就绪、有效/无/损坏存档、进入地图准备、视频播放/失败/受限/减少动态时比较首页元素坐标；实际点击继续、设置清档、取消、确认及写入失败；320/390手机和短横屏截图。
- 正式入口：index.html、src/ui/title-menu.js、src/platform/title-video.js、src/rendering/visual-review.js#inspectTitleMenu；designCriterion：title-menu、menu-navigation、title-background-video。
- 结论：通过。10项存档/延迟建图单元检查、34项浏览器交互及布局断言、独立启动延迟和自动播放受限检查通过。320×568、390×844、430×932、844×390浏览器手机视口已截图复核；竖屏无横向溢出，极短横屏可滚动，异常反馈不遮挡标题，按钮触控高度46px。
- 实际交互：有档点击直接继续；取消清档保留进度，写入失败保留原档和确认页，确认清档返回首页后再开始新入职。初始化、建图、正常视频加载不改变入口文案及配色；正常首页不显示存储/加载说明。
- 证据：[320px首页](../art-reference/title-menu/stable-start-320.png)、[390px首页](../art-reference/title-menu/stable-start-390.png)、[存档管理](../art-reference/title-menu/stable-save-settings.png)、[确认页](../art-reference/title-menu/stable-save-confirm.png)、[布局及交互结果](../art-reference/title-menu/stable-start-results.json)。完整截图保留于output/playwright/stable-title-start/。未更改战场绘制、昼夜资源、角色动作和碰撞，相关场景/动作重新验收不适用；未运行全量测试。


## 本轮修订：健康忠告与年龄标识（2026-10-23）

- 目标：右下角显示8+；继续游戏、重新开始整体上移，下方完整显示用户提供的四行游戏健康忠告。
- 参考与结构：沿用已确认首页、森林绿背景和奶油色文字，增加静态HTML页脚与小尺寸描边年龄标识；不是新增角色或美术变体。
- 尺寸、锚点与分层：首页竖版容器内底部页脚，右下角安全区内8+；忠告11px、四行排版，菜单保留44px以上触控区。视频→遮罩→标题/操作/页脚分层，中央猫猫留白。
- 保留与不适用：保留右上角设置、循环视频及原有存档流程；不改玩法、地图碰撞、动画、昼夜材质和独立操枪，相关资产制作与通行检查不适用。
- 制作与预算：仅HTML/CSS布局，无新位图、视频、解码实例或事件监听器；小屏与异常提示状态允许纵向滚动，文字不遮挡按钮。
- 正式入口：`index.html`、`src/styles/title-menu.css`、`src/rendering/visual-review.js#inspectTitleMenu`；`designCriterion: title-menu`。
- 实际结果：通过。320×568、390×844、1280×900首页完整显示四行原文；8+为34×38px，距右边14px、底部16px，与忠告保留6px以上间距；按钮上移约110px且点击区仍≥44px。首次/继续页面均无横向或纵向溢出，中央猫猫可见。320×480低高度可正常纵向滚动。
- 交互与同屏：`tests/title-menu-visual.cjs`的4188端口副本通过，设置→帮助→设置→首页、清档取消和触摸继续正常；三尺寸白天/夜晚正式角色、怪物、载具、环境及暂停/设置均复核。背景视频持续播放，模拟加载失败时错误与重试入口可见、可操作，忠告不覆盖操作。
- 资源与性能：零新增运行媒体/监听器；只有DOM、CSS与正式验收采样字段。未改存档和游戏规则，仅运行本次页面相关浏览器检查，没有运行全量测试。
- 长期证据：[320px](../art-reference/title-menu/health-notice-320.png)、[390px](../art-reference/title-menu/health-notice-390.png)、[桌面](../art-reference/title-menu/health-notice-1280.png)、[布局数据](../art-reference/title-menu/health-layout.json)、[正式页面结果](../art-reference/title-menu/health-visual.json)。完整截图、异常态检查脚本与结果保存于`output/playwright/title-health-notice/`。

## 本轮修订：右上角设置入口（2026-10-23）

- 目标：首页设置改为右上角齿轮，复用正式战场 `#settings-button` 图标和 `icon-button` 样式；移除首页独立玩法说明入口。
- 结构与参考：底部文字导航改为顶部独立图标，不新增资源或变体；参考正式战场右上角设置。
- 尺寸、锚点与分层：44×44 CSS 像素点击区，右上角14px及安全区内边距，背景遮罩之上，避开标题。
- 保留项：视频、标题、存档按钮、设置面板及其中的玩法说明。不改场景、身体、武器或动画；地面衔接、地图通行和动作修改不适用。
- 预算：复用字符图标，无新增位图、解码或缓存。
- 验收入口：`index.html`、`src/ui/title-menu.js#createTitleMenu`；`designCriterion`：`title-menu`、`menu-navigation`。
- 实际结果：通过。320×568、390×844、1280×900均在页面右上角14px显示44×44齿轮，无标题遮挡或横向溢出；图标与颜色和战场一致。点击/Enter打开设置，Esc关闭恢复齿轮焦点，设置→玩法说明→设置→首页正常；首页独立说明及分隔点已移除。
- 同屏复核：运行 `tests/title-menu-visual.cjs` 通过，三尺寸白天/夜晚角色、怪物、载具、环境及暂停/设置同屏正常，触摸继续不穿透；视频仍为单实例正常播放。仅检查相关页面，没有运行全量测试。
- 长期截图：[320px](../art-reference/title-menu/settings-icon-320.png)、[390px](../art-reference/title-menu/settings-icon-390.png)、[桌面](../art-reference/title-menu/settings-icon-1280.png)。完整本轮页面及昼夜截图保留在 `output/playwright/title-settings-icon/`；地图通行、动画修改不适用。

依据：由 art-generation-brief.md 任务单复制整理，执行 ../art-generation-standard.md 与 ../../visual-contract.json。

## 1 目标与范围
- 标识：title-menu，用途：游戏首页与通用页面。
- 目标：原版森林绘本风格，手机和桌面竖版画框；进入、继续、清档与返回形成完整闭环。
- 数量：一套页面、一段10秒9:16视频；不新增角色变体。
- 保留：原猫身份、身体连续帧、独立手与枪、全部玩法与现有存档恢复规则。
- 制作路线：HTML/CSS 界面与现有正式绘制器。
- 参考：docs/art-reference/landscape-six-day.png、landscape-six-night.png、hud-compact-phone.png；正式 Renderer 和 assets/cat-front。

## 2 造型与空间
- 轮廓：圆润猫猫、阔叶树冠、营地屋顶与湖岸；森林绿描边、奶油黄、三层有限平涂。
- 构图：顶部标题，中部营地猫猫，下部菜单；按钮区域低对比留白。
- 地面：沿用营地、草地、水岸与实际阴影，左上光、右下冷影。
- 活动空间：只作用于屏幕页面，不改地图通行与碰撞；新地貌/变体差异不适用。

## 3 技术交付
- 逻辑尺寸：沿用游戏竖版容器；手机320/390，桌面1280×900检查。
- 当前视频：720×1280、原v2源片3–6秒首尾重叠0.25秒形成2.75秒循环、不透明、静音MP4；不逐帧重定位和拉伸，最新裁切记录见视频任务单。
- 锚点：屏幕中心，object-fit cover，猫猫主体在中段安全区；HTML标题及按钮独立分层。
- 分层：背景视频、可读性遮罩、标题与菜单；暂停页使用正式战场。
- 碰撞：纯界面，无新碰撞；通路验收不适用，验证点击不穿透。
- 昼夜：视频固定晴日；暂停/设置在实际白天与夜晚同屏验收。
- 位置：assets/title为处理后资源，assets/title/source为原片及请求，output/playwright为验收证据。
- 预算：MP4≤6MB、海报≤200KB、单视频元素；720×1280 RGBA每帧约3.52MiB，不制作全帧常驻图集。

## 4 动画任务补充
- 视频按最新持续动态要求修订：10秒每秒都保留局部运动，不再采用首尾静止分镜；具体版本与结果以 [视频任务单](title-background-video.md) 为准。
- 首尾同源参考，真实10秒连续片段；实际24 FPS、240帧；哈希见清单，循环证据见第6节。
- 入游戏/切后台暂停播放；减少动态使用同片海报；播放失败明确报告。
- 首页不改正式操枪资源，宣传片不作为身体动作图集。

## 5 生成指令
延续《森林巡游》正式场景三分之四俯视、森林绿描边、柔和奶油与草木配色、有限平涂。保持原版猫猫与营地身份，固定镜头，轻微呼吸眨眼、尾巴围巾与树叶水纹，首尾衔接，无文字按钮水印。禁止写实、3D替换、整图抖动、额外肢体、镜头切换、比例跳变。完整请求保存在assets/title/source。

## 6 验收记录

以下为首次页面交付记录。旧视频的持续动作结论已因首尾长静止段撤回，修订视频的实际结果与资源规格以 [视频任务单](title-background-video.md) 的最新修订为准；页面与存档记录继续保留。

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
