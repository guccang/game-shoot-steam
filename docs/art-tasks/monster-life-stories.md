# 怪物邻里委托板与奖励界面任务单

依据 [美术生成标准](../art-generation-standard.md)，沿用 [任务单](../art-generation-brief.md) 的目标、空间、技术与验收项目。

## 目标与范围（制作前）
- 稳定标识：monster-neighbors；雾松密林新增一块常驻委托板，提供三个怪物生活故事。
- 正常游戏可辨认怪物委托、每篇首通奖励与整组装备二选一；原营地建筑布局不变。
- 参考：src/rendering/story-posts.js、story-props.js、enemies.js、bosses.js。复用正式委托板、芽团、叶蝠、野猪王、枭爵绘制，不生成位图。
- 保留：猫连续帧、独立操枪、怪物动作、车体与主炮、原战斗数值、昼夜处理。

## 造型与空间（制作前）
- 委托板沿用双柱绿屋顶和信件剪影，以名称“怪物邻里委托板”区分用途；不新增建筑造型变体，结构差异不适用。
- 在雾松密林道路附近放置，与营地建筑保持距离。板前留交互空地，任务走廊明确清树但不移除地形碰撞。
- 角色、友善怪物和领主按脚底排序；怪物 NPC 只在所属阶段存在，不参与攻击与清场计数。
- 左上受光、森林绿描边、奶油底色；奖励卡以状态文字和按钮同时表达锁定、可领、已领。

## 技术交付（制作前）
- 委托板约 128×112 逻辑单位，底座世界坐标为锚；复用 Canvas 矢量，无新增解码图片。
- 普通怪物沿用 96×96 图集帧，领主沿用正式矢量原尺寸；透明背景、接触阴影不变。
- 分层：地面影子→脚底深度排序主体→头顶气泡；UI 独立 DOM。
- 通行：委托板装饰不新增碰撞；正式森林树木避让入口；任务仍由正式 blocked 检查。
- 缓存：无新增 NPC 缓存或昼夜副本；共享现有怪物图集上限和领主绘制。静态板没有动画，动作生成/视频裁切不适用。
- 新 NPC 复用既有待机与翼动作，不改变起停、攻击或操枪部件；无需生成视频或新动画帧。

## 故事与奖励

| 故事 | 任务与人物 | 单篇首通 |
| --- | --- | --- |
| 野猪王的减盐午餐 | 阿团取食材→抢回午餐篮→给铁牙送饭→带回洗碗的承诺 | 300金币、100木材、2机械零件 |
| 叶蝠的夜班假条 | 听小夜解释→沿两处换班点送信→发现枭爵老花→清开赏花小径 | 350金币、80木材、2能源晶体 |
| 领主们的周末集市 | 装货→气垫船运送→清开摊位→把漏汤陶碗改成花盆 | 450金币、120木材、3机械零件 |

地点：森林地图雾松密林 (650,1800)，交互点 (650,1840)。三篇独立接取，无主线门槛。
全部交付后，萤火激光步枪 / 水陆两栖气垫船永久二选一；载具附赠专属主炮。已拥有的选项折算1000金币，现有成长与出战配置不变。重玩不重复发奖。

## 验收记录（2026-10-23）

| 设计目标 | 实际检查与证据 | 结果 |
| --- | --- | --- |
| 系列一致、人物可辨 | 正式 drawSlime / drawNewBoss 复用芽团、叶蝠、铁牙和枭爵；[铁牙对白](../art-reference/monster-stories/npc-neighbors-lunch-320-day.png)、[枭爵夜间对白](../art-reference/monster-stories/npc-neighbors-night-390-night.png) | 通过 |
| 落地与前后遮挡 | 委托板底座按正式排序，真实W/S前后绕行并驾驶新获得的气垫船；NPC脚底坐标额外用正式blocked验证，无水体或山体阻挡 | 通过 |
| 通行与任务完整 | 三篇从接取、借用、逐站行进、清场、交谈到交付；正式任务走廊采样全部可通行，友善NPC不计入敌人 | 通过 |
| 动作与部件 | NPC复用正式待机/振翼与领主动作；枪械、猫身体、车载主炮仍由正式渲染器绘制，无静帧替换和新增素材 | 通过；本次不改运动/攻击动画，未重复无关全动画验收 |
| 昼夜同屏 | 1280×900、390×844、320×568各自日夜采样，共六组世界画面和十二组领主对白；[白天](../art-reference/monster-stories/world-390-day.png)、[夜晚](../art-reference/monster-stories/world-320-night.png) | 通过 |
| 手机、桌面奖励清楚 | [桌面目录](../art-reference/monster-stories/catalog-desktop.png)、[手机可领取](../art-reference/monster-stories/rewards-390.png)、[320已领取](../art-reference/monster-stories/claimed-320.png)、[390已领取](../art-reference/monster-stories/claimed-390.png)，无横向溢出 | 通过 |
| 装备获取途径 | 武器与载具工坊均检查真实点击后的来源说明；[正式工坊](../art-reference/monster-stories/equipment-source.png) | 通过 |
| 资源与预算 | 无新位图/图集、无新增NPC缓存，沿用怪物缓存和矢量领主；浏览器两份脚本均无pageerror | 通过 |

实机方式：真实点击入口、跳过已读对白、整备、交付、选奖与刷新；移动任务和战斗配额用明确的路点/伤害夹具加速，未把它们当作自然战斗难度或胜率验收。场景另行通过键盘驾驶与昼夜正式绘制检查。

定向测试共25项：monster-stories（6）、story-posts（6）、story-table（6）、story-camera（4）、story-guidance（3）。没有执行全量测试。内容表及第一章原数值/奖励基线、清理与阶段恢复，奖励保存失败重试、二选一、重复折算和旧档白名单均通过。

发现并修复：大型NPC靠近画面边缘时身体会裁切；在人物表添加halfWidth，由现有镜头进行最小留边。原有逐句镜头稳定检查继续通过。交付和领奖使用合法进度副本，保留载具等级/主炮选择访问器，领取新车后可立即驾驶。

正式绘制器入口：src/rendering/story-posts.js#drawStoryPost、story-props.js#drawStoryProp、enemies.js#drawSlime、bosses.js#drawNewBoss。
designCriterion：visual-contract.json#monsterNeighborCriterion / src/rendering/visual-review.js#inspectMonsterStories。
复现脚本：tests/monster-stories-browser.cjs、tests/monster-stories-visual.cjs；详细临时截图在output/playwright/monster-stories，长期参考见上方已入库链接。
结论：通过。无需新素材生成，保留原故事数值与奖励，全部新增人物和任务道具随阶段/会话清理。
