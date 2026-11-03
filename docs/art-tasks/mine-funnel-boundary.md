# 地下浮游炮边缘稳定性 · 美术生成任务单
依据：[美术标准](../art-generation-standard.md)与[项目合同](../../AGENTS.md)。

## 1 目标与范围
稳定标识 mine-funnel-boundary。动态修复：地下岩壁/固定边界处浮游炮保持平滑移动，消除越界后反复拉回。参考正式地下武器和浮游炮连续飞控；不生成新美术。保留原炮体、独立手持控制器、枪口/后坐、推进器、猫真实连续帧和怪物动作。无 PNG 精修项。

## 2 造型与空间
原轮廓、森林绿描边、色彩、比例、地面衔接和左上光向不变；调整飞行目标与边缘约束。原地形、通道、桥梁及碰撞空间保留。主次、邻接组合和分层沿用正式场景，不新增景观或摆件。

## 3 技术交付
HTML/JavaScript 与 Canvas 2D 原尺寸、原锚点、原层级；三门炮位置相对角色坐标，统一沿用14世界单位边缘余量。无新增位图、画布或派生缓存；透明图像、SVG视框不适用。行为由程序输入、目标与原飞行时钟驱动。涉及 src/core/mine-combat.js、src/combat/funnel-movement.js、src/combat/funnel.js；正式渲染沿用 src/rendering/mining.js 和浮游炮绘制器，不隐藏缺失素材。

## 4 动画任务补充
维持原120Hz积分、独立飞行/射击时钟与炮体部件；只消除边缘拉回，不用静帧、整体旋转或拉伸替代运动。停止、暂停、低动态和返航供给继续适用。序列帧来源未修改，新增视频素材不适用。

## 5 生成指令
本轮是飞控规则修复，未调用 imagegen，不新增或替换位图。后续图片精修不在本轮范围内。

## 6 验收记录
| 设计目标 | 实际证据与结论 |
| --- | --- |
| 原画风、尺寸、独立部件 | wall-day/night、fighting-wall-day/night 人工查看：原猫、手持控制器、三门炮、枪口、推进和怪物同屏；未新增或替换素材。 |
| 边缘连续而不回弹 | 原版复现每次回弹14.007世界单位；修复后重复推动检查<0.1。真实120Hz完整环绕1200步，最大单步位移2.622；墙角采用上一帧扫掠，不从远端突然径向拉回。 |
| 边缘、窄路与角色移动 | wall、edge、corridor 昼夜各一组，加320短屏和键盘沿边移动；无穿墙采样，浏览器约束修正最大约3.31，无原先14单位跳退。 |
| 返航、供给与低动态 | 普通/低动态靠墙泊位可完成外挂装填；边缘余量与实际泊位同源，紧凑归队时不会被避让力推出装填点。原地表环绕、射击、充能与帧率一致性测试通过。 |
| 暂停、切换与大幅换位 | 地图暂停期间炮体位置完全冻结；新飞控或玩家大幅换位废弃旧锚点，避免扫掠整条矿道。 |
| 战斗 | fighting-wall-day/night 运行中真实造成伤害；地下武器、隔墙弹道、伙伴与矿车战斗回归通过。 |
| 手机与原容器 | 390×844昼夜、320×568短屏，无横向溢出，保留现有折叠UI。本轮不改布局，未新增桌面布局。 |
| 资源、缓存与交付 | 无新图片、画布或图集；仅WeakMap记录活动飞行炮体的上一帧位置，不进入存档；正式资源无页面错误。PNG替换、透明边缘和新视频序列不适用。 |

正式绘制器保持 src/rendering/mining.js 及原浮游炮绘制；规则入口 src/core/mine-combat.js#projectMineFlyingPoint / constrainMineFlyingNode、src/combat/funnel-movement.js#updateFunnelMovement、src/combat/funnel.js#updateFunnel。
验收入口 src/rendering/visual-review.js#inspectMineFunnelBoundary；designCriterion：mine-funnel-boundary，登记于 visual-contract.json。

针对性验证：
- tests/mine-funnel-boundary.test.mjs 7项通过；tests/funnel-movement.test.mjs 10项、tests/mine-combat.test.mjs 30项通过，共47项直接相关检查通过。未运行全量测试。
- 附加 tests/funnel-loadout.test.mjs 14项中12项通过、2项既有失败：弹道快照未排除 statisticsSource.weapon 的载体差异；改装测试升级调用返回false。两项均在未修改 main（712a884）单独复现相同结果，不是本次地下约束引入；保留旧测试和业务行为，不扩大修复范围。
- tests/mine-funnel-boundary-browser.cjs 8组场景；tests/mine-funnel-boundary-combat-browser.cjs 2组交战场景，均无页面错误。4175已有服务，本轮临时4187测试。
- 截图、完整录制及报告保存在主工作区 output/playwright/mine-funnel-boundary/；browser-result.txt、combat-result.txt 和对应 review.json，连续录像位于 video/。本节图片名均相对此目录。2026-11-03人工复核岩壁昼夜、窄路、短屏与交战截图。

动态修复结论：通过。PNG精修：不适用。本轮范围为地下飞行边缘稳定与靠墙返航，没有更换图像资产；既有挂载测试问题已如实记录。
