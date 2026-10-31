# 波次进度节点任务单

依据：[美术生成标准](../art-generation-standard.md)，按[任务单](../art-generation-brief.md)填写。

## 1 目标与范围

- 标识：wave-progress-track；类别：战场 HUD。
- 目标：玩家一眼读出本组完成几波、剩余几波、当前波清怪进度和末尾 Boss。
- 变体：3 / 4 / 5 个普通节点，加一个领主头像节点；完成用勾，当前用奶油色实心圆，未完成用描边圆。
- 保留：原 Boss 画像、手动挑战及猫爪提示、战斗数值、奖励、故事导航与秘境任务。
- 路线：正式 DOM / CSS；参考用户旧 HUD 截图和 battlefield.css；用于普通巡游。

## 2 造型与空间

- 剪影：深森林绿小卡，上方标题计数，中间细进度线串联波次点，末尾更大的 Boss 圆点。
- 主次：当前波与进度为主，剩余说明为辅；与角色、建筑保持原场景比例。
- 地面衔接、地形光向、邻接地貌：不适用，固定界面覆盖层。
- 活动空间：只在 Boss 按钮接收点击，其他区域保持战场拖动。

## 3 技术交付

- 尺寸：宽约 282px，自适应 320 / 390 手机与桌面竖版战场；Boss 触摸区至少 44×44。
- 锚点：战场左上、资源栏下方；DOM 文本和图形不烘焙。
- 分层与透明：现有 HUD 层，深绿半透明卡，原 112×112 头像 Canvas。
- 碰撞：不适用；昼夜复用同一高对比配色。
- 文件：src/ui/wave-progress.js、src/styles/wave-progress.css；证据在 output/playwright/wave-progress。
- 预算：最多六个节点、复用现有头像，节点组改变时才重建；无新位图或图集缓存。

## 4 动画补充

静态节点，不新增角色或场景动画。保留现有猫爪提示；进度填充不改变游戏时钟与起停。

## 5 制作指令

沿用森林绿和奶油黄；进度线穿过普通圆点并止于末尾 Boss 头像。完成、当前、待解锁同时使用符号与文字区分，不能仅靠颜色。保持暂停、刷新、Boss 重试与胜利进入下一组的状态一致。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 系列一致、节点可辨 | 深绿卡片、奶油高亮、完成勾与描边待机节点；3/4/5波保持固定节点数，Boss始终位于末尾。 |
| 界面遮挡和活动空间 | 修正上车/清波Toast覆盖节点的问题；文本区不接收鼠标，Boss触摸区域44×44；实际键盘移动105px以上。 |
| 白天与夜晚同屏 | output/playwright/wave-progress/{1280,390,320}-{day,night}.png；正式角色、怪物、载具与场景同屏。 |
| 手机与桌面 | 六组截图逐张检查，无横向溢出、节点挤压、Toast遮挡，说明和清怪计数可读。 |
| 交互与存档 | 真实点击末尾Boss后出现原血条；胜利奖励180不变，下一组归零；刷新保留已完成勾，死亡重试保留组起点；故事/秘境隐藏巡游轨道。 |
| 资源与预算 | 无新贴图，复用112×112头像；最多6个普通节点（含旧存档兼容），DOM只在换组重建，浏览器无脚本错误。 |
| 动作、地形和通路 | 未改动作/碰撞/地图。截图夹具暂停车炮射击以保留近处怪物，非完整战斗通关；交互流程使用正式命中结算。 |

相关测试：wave-progress、patrol-wave-gates、patrol-progress、boss-paw-reminder 共18项通过；仅验证改动及直接受影响功能。浏览器脚本 tests/wave-progress-browser.cjs；结构化结果 output/playwright/wave-progress/result.json。

正式入口：createHud → updateWaveProgress；Boss 头像仍为 drawBossIcon。
designCriterion：wave-progress-track。
结论：通过。首次验收发现Toast遮住进度轨道，已下移并复验。

合并兼容：保留 master 新增的秘境专属 HUD 样式，巡游进度样式在其之前加载。320/390/1280 三个宽度实际往返时空之塔，确认秘境仅显示局内入口、普通轨道隐藏，返回森林节点不变；结果见 output/playwright/wave-progress/integration-result.json。

长期基准：docs/art-reference/wave-progress/ 下的390-day、320-night与boss-ready截图。
