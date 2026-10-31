# 波次紧凑面板与问号详情任务单

## 2026-10-23 焦点提示修订计划
用户指出问号点击后出现大黄圈。本轮只修正输入方式与焦点表现：鼠标/触屏操作隐藏外圈，键盘 Tab、Enter、空格、Esc 操作保留焦点提示；不移走焦点，不更改44px点击区、26px问号圈、波次圆环及弹窗暂停归属。沿用原颜色和正式 DOM，无新增图片、动画或世界碰撞变更。修改 `createWaveHelp` 与焦点 CSS，验收鼠标、真实触摸事件、键盘及输入方式切换；320/390/桌面昼夜复核。

修订验收：通过。仅运行 `tests/wave-help-focus-browser.cjs`，28次焦点状态检查通过，浏览器错误0。鼠标在1280/390/320昼夜点击关闭后轮廓为none；Tab导航和Enter/空格打开、Esc关闭保留键盘轮廓；改用鼠标关闭即隐藏。独立hasTouch浏览器以真实tap验证390px昼夜触摸后无黄圈、转键盘可见。所有关闭操作恢复问号焦点及战斗，44×44点击区保留。

人工查看桌面、手机昼夜及键盘对照截图：问号小圆圈和Boss节点保持原样，鼠标/触屏无多余金色圈，键盘圈清晰。正式读取器 `inspectWaveProgress.helpFocus` 与原 `wave-compact-help` 合同绑定。本次不涉及地面、通行、动画、贴图及缓存变更。代表截图和报告：[`../art-reference/wave-help-focus/`](../art-reference/wave-help-focus/)；完整截图保存在主仓库 `output/playwright/wave-help-focus/`。未运行无关单元测试或全量测试。

依据 [美术生成标准](../art-generation-standard.md)，按 [任务单](../art-generation-brief.md)记录。

## 1 目标与范围
- 标识：wave-compact-help；类别：正式 DOM 波次 HUD 和详情弹窗。
- 参考：用户要求、wave-node-countdown 正式截图。主面板只保留进度轨道、编号节点、Boss 和问号；当前波次及击杀/总数放入详情。
- 保留：圆环实际计时、Boss 手动入口、剧情/秘境自身标题与计数、战斗/奖励数值。
- 路线：原 HTML/CSS/JavaScript；无新增图片资源。

## 2 造型与空间
- 单行轨道右侧放问号，移除标题所在整行，缩小纵向占用。
- 沿用森林绿面板和奶油金节点；详情沿用奶油黄弹窗，突出波次与计数。
- 地面、剪影变体、碰撞与邻接不适用：无世界资产修改。

## 3 技术交付
- 面板宽 292px（小屏上限视口减 28px），纵向目标约 60px；轨道高 44px，原圆环 35px。
- 问号及 Boss 点击区域均不小于 44px；问号视觉圆圈 26px；详情宽不超过 360px。
- 屏幕 DOM 原 HUD/模态层，零新增贴图、缓存和解码资源；截图仅进文档。
- 320/390/1280 宽昼夜同屏，检查节点与按钮不重叠。

## 4 动画补充
不新增装饰动画。沿用计时圆环；查看详情时统一暂停，关闭恢复进入前状态。世界人物、武器和载具动作保持。

## 5 制作指令
隐藏普通波次标题的整行而不留空白；问号点击读取正式波次、击杀数量与总名额，区分准备、战斗、休整、Boss 待挑战。不在主面板重复展示文字。

## 6 验收记录
- 结论：通过，2026-10-23。正式入口：`src/ui/wave-help.js#createWaveHelp / waveHelpState`、`src/ui/wave-progress.js#updateWaveProgress`、`src/rendering/visual-review.js#inspectWaveProgress`；对应 `visual-contract.json` 的 `wave-compact-help`。
- 实际运行：在隔离端口 4237 使用正式应用、HUD 和世界绘制器。1280×900、390×844、320×568 均检查白昼/夜晚；每次真实点击问号打开详情并关闭。面板高度均为 60px，主面板无标题和计数字符，圆环、五个节点、Boss 与问号无重叠；Boss 与问号各保留 44×44 点击区。
- 交互：详情准确显示第 2 波、10 / 44；击杀改变后重新打开为 19 / 44。打开暂停，关闭按钮与 Esc 恢复战斗及问号焦点；圆环暂停期间不前进。Boss 待挑战说明与实际手动入口一致。剧情/秘境不显示问号，继续使用自身标题；应用卸载重挂只生成一套按钮和弹窗。浏览器错误为零。
- 针对性单元测试：`node --test tests/wave-help.test.mjs`，4 项通过，覆盖当前配额、准备/休整、Boss 和新组边界。浏览器脚本：`tests/wave-compact-help-browser.cjs`，通过。未执行全量测试。
- 同屏人工复核：角色、持枪、载具、怪物、地形与新 HUD 配色一致；手机下详情未越界、计数清楚。战斗圆环在单行中完整可见，面板明显减少纵向占用。仅调整屏幕 UI，世界碰撞、通行、素材锚点及动作帧不涉及；无新增世界遮挡或运行贴图预算。
- 证据：[`../art-reference/wave-compact-help/`](../art-reference/wave-compact-help/) 内含六张 `hud-{1280,390,320}-{day,night}.png`、桌面白昼及手机夜晚详情、320px 倒计时截图和 `browser-result.json`。完整 13 张截图与 CLI 记录保留于主仓库 `output/playwright/wave-compact-help/`。
