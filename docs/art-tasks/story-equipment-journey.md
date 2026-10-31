# 第一章装备体验叙事任务单

依据美术生成任务单与美术标准填写；本次延伸现有气泡和任务界面，不生成位图。

## 1 目标与范围
- 标识：story-equipment-journey；用途：装备选择、可选体验、战斗短气泡、工坊引导。
- 目标：救援故事自然引出枪车配合；反馈来自真实命中，不暂停战斗、不移动镜头。
- 变体：三套现有装备各一条体验与分支对白；角色与场景不换造型。
- 保留：原战斗数值、奖励、三波守点、两路线、所有动画及碰撞。
- 参考：docs/art-reference/story-table 与 story-camera；使用营地、路线、守点、领主场景。

## 2 造型与空间
- 沿用森林绿描边、奶油气泡；短气泡不显示翻页按钮。主次：攻击预警优先，体验记录次之。
- 人物脚底、图集及头部锚点保持；远处人物不拉镜头，普通反馈等安全间隙显示。
- 地面、光照、邻接结构与活动空间不变；仅教学遭遇方向按配置提供练习机会。

## 3 技术交付
- DOM气泡自适应320/390与桌面；锚点读取正式镜头，纯UI无碰撞。
- 新增一个复用短气泡节点和一行可选体验提示；不增加图集、画布或常驻粒子。
- 剧情、条件、触发次数、提示优先级及后续入口均放配置；运行时事件不改变伤害。
- 生命周期：会话退出移除短气泡；完成保留可忽略工坊入口，不保留地图人物道具。

## 4 动画任务补充
不生成动画，沿用正式角色和车辆动作；仅检查新UI不遮挡操作和预警。

## 5 生成指令
复用现有HTML/CSS气泡；不生成素材。不改变角色、武器、载具、地貌与战斗特效。

## 6 验收记录
验收日期：2026-10-23。结论：通过。`designCriterion: story-equipment-journey`。

| 设计目标 | 正式入口与验收结果 | 证据 |
| --- | --- | --- |
| 三套搭配由真实体验引出 | `Game.hit`、正式激光弹道与领主冲锋结算发送事件；试射中实际触发激光贯穿、水面电弧、冰冻炮击；未达成可选目标仍能完成主线 | [体验专项 24 项](../story-reports/story-journey-tests.txt)、[战斗相关 19 项](../story-reports/story-journey-combat.txt)、[浏览器实际试射](../story-reports/story-journey-browser.json) |
| 气泡不抢镜头、不暂停、可继续操作 | `src/ui/story-chatter.js` 复用正式渲染器视图与人物锚点；三套自然触发气泡均验证镜头稳定、游戏仍在 playing，键盘可移动；角色画外危险期延后、领主蓄力/冲锋隐藏 | [布局与显示守卫](../story-reports/story-journey-layout.json) |
| 手机/桌面昼夜统一且可读 | 320、390、1280 三种视口的昼夜截图逐张人工检查；奶油底、森林绿文字与场景一致，未改变角色、车辆和地形美术 | [320 白天](../art-reference/story-journey/layout-320-day.png) / [夜晚](../art-reference/story-journey/layout-320-night.png)，[390 白天](../art-reference/story-journey/layout-390-day.png) / [夜晚](../art-reference/story-journey/layout-390-night.png)，[桌面白天](../art-reference/story-journey/layout-1280-day.png) / [夜晚](../art-reference/story-journey/layout-1280-night.png) |
| 枪车与反馈同屏 | 正式 Canvas 绘制车辆、手持武器、怪物及特效；真实试射中确认反馈与搭配对应，图集/动画/锚点未修改 | [水电白天](../art-reference/story-journey/tide-arc-day.png) / [夜晚](../art-reference/story-journey/tide-arc-night.png)，[冰炮白天](../art-reference/story-journey/frost-guard-day.png) / [夜晚](../art-reference/story-journey/frost-guard-night.png) |
| 遮挡与通行 | 初查发现守点气泡可能碰到玩家身体，增加身体避让与空间不足延后；最终六个昼夜布局样本均不压玩家、在屏内，不拦截点击，不覆盖底部操作区；DOM 无碰撞，不修改通行 | 最终六张 layout 截图及布局报告 |
| 体验记录、对白和章后引导 | 刷新保留三项真实发现、最近搭配与已选对白分支；章末仍按最近实际体验的冰炮回应；武器与载具工坊入口均定位对应装备并可试用，借用装备不写入拥有状态；“以后再说”刷新后仍生效 | [章后入口](../art-reference/story-journey/followup.png)、两份浏览器报告 |
| 清理与原玩法不变 | 完成后 story 为 null、剧情道具为空；三套装备×两路线旧基准保留，明确排除授权修改的对白及 Q20 出生坐标，其他阶段位置、敌人数值/配额、修复计时、奖励仍比对；未新增奖励 | 24 项体验/主线专项及浏览器结算记录 |
| 资源与性能预算 | 无新增位图、音频、图集、画布与粒子；新增一个复用短气泡 DOM 节点，队列上限 6。两组浏览器运行无 pageerror；没有进行无关性能压测 | `STORY_JOURNEY.speech`、`createStoryChatter`、浏览器 errors 为空 |

正式复核入口：`src/rendering/visual-review.js` 的 `inspectStoryJourney`，已登记在 `visual-contract.json`。实际绘制入口沿用 `renderer.view/canvas` 和 `src/rendering/story-guidance.js` 的 `storyCueInfo`。

验证边界：主浏览器脚本通过实际 UI 和自然试射验证三种效果；路线/守点/结算通过章节检查点夹具直达。补充布局脚本用阶段与气泡夹具固定截图条件，并用高生命测试敌人验证画外守卫，不能把这些夹具样本当作自然战斗通关或平衡性测试。未运行全量测试。

动作资源生成、结构参考图、帧数/透明边缘和纹理预算检查不适用：本任务未生成或替换美术资源；正式运行保留并观察原有角色与载具运动，不重新验收无改动的全套动作资源。
