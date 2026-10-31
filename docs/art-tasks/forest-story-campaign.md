# 森林回信故事美术任务单

依据[美术生成任务单](../art-generation-brief.md)与[资源生成标准](../art-generation-standard.md)。2026-10-23；制作前已填写目标、参考、尺寸锚点与保留范围，本记录补充完成验收。

## 1 目标与范围

| 字段 | 本轮内容 |
| --- | --- |
| 名称与标识 | 森林的八封回信 / forest-story-campaign |
| 类别和用途 | 多章目录UI、当前章节人物与既有摆件配置；没有新增位图 |
| 目标 | 玩家在故事中看到当前任务的伙伴、路点和载具，逐步体验已有玩法 |
| 数量和变体 | 新增五章主线、两条委托；一套目录与命名选项，复用现有角色和摆件 |
| 保留项 | 原猫身体真实连续帧、独立武器、机械猫能源与部署、载具履带和旋翼、真实水界与同屏比例 |
| 制作路线 | 配置既有正式绘制器；新增目录和选项使用HTML/CSS |
| 参考 | 原第一章 `docs/art-reference/story-journey` 与本轮 `docs/art-reference/story-campaign` |
| 场景 | 营地、河岸、林间停靠点、维修通道、航标、转发站及正式秘境 |

## 2 造型与空间

| 字段 | 本轮内容 |
| --- | --- |
| 主体剪影 | 沿用猫猫、坦克、气垫船、直升机、箱子、中继站与信箱 |
| 变体区别 | 不新增外形变体；内容差异体现在章节任务与位置，未把换色当新资产 |
| 主次关系 | 当前任务伙伴、目标光圈和载具为主；周围森林与岸线保持原层级 |
| 地面衔接 | 沿用真实草地、河岸与桥面，未覆盖水界或绘制假通路 |
| 活动空间 | 章节表清理必要通路的树木；经过真实桥面或借用水陆/空中能力 |
| 邻接组合 | 原森林与河岸组合不变；停靠点、落点与目标环由同一站点表定位 |
| 光向与明暗 | 原运行时昼夜转换，保持绿色描边、奶油底色与夜间冷色 |

## 3 技术交付

| 字段 | 本轮内容 |
| --- | --- |
| 逻辑尺寸 | 猫与摆件沿用正式绘制器尺寸；目录按钮最小高64px，折叠标题最小高44px |
| 像素尺寸与倍率 | 无新位图导出；图集倍率不变；截图为320×568、390×844、1280×900 |
| 锚点与原点 | 世界站点加dx/dy；人物以真实脚底排序，气泡锚定当前说话者 |
| 分层 | 地面目标光圈 → 原场景实体排序 → 独立武器与效果 → UI；不改变原渲染流程 |
| 透明背景 | 复用原透明图集；没有新背景图层 |
| 碰撞与通行 | 步行不能渡河；气垫船实际过水、直升机实际飞越；没有关闭正式碰撞 |
| 昼夜处理 | 同一形体使用现有色调，白天/夜晚均从正式游戏截取 |
| 文件位置 | 内容 `src/config/story-campaign.js`；UI `src/ui/story.js`、`src/styles/story.css`；截图与报告见下表 |
| 内存与缓存 | 无新增源图集；本轮章节美术派生缓存采样最大4,259,840字节，低于4,603,904字节上限；该值不是浏览器总内存 |

## 4 动画任务补充

本轮没有生产或替换动画：动作时长、帧率、源视频哈希、裁切导出不适用，保留原清单与视频来源。人物继续使用原真实连续帧；正式运行中观察机械猫逐只部署并命中，实际飞行与下机、气垫船航行。猫身体与枪械、控制器、炮塔、旋翼仍独立绘制，没有复制静帧或旋转整图替代动作。不是一次全量旧动画再验收。

## 5 生成指令

不适用：未调用图片或视频生成，没有新增生成提示词。程序界面沿用森林绿描边、奶油色底和现有按钮样式；文字来自配置，未烘焙进贴图。

## 6 验收记录

以下路径相对本文件；全部截图来自正式 `Renderer.draw()`，不是独立拼装预览。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 系列一致、变体可辨 | 沿用原比例和材质；[气垫船](../art-reference/story-campaign/scene-sunleaf-02-day.png)、[重坦](../art-reference/story-campaign/scene-sunleaf-03-day.png)、[直升机](../art-reference/story-campaign/scene-sunleaf-05-day.png)可辨 |
| 落地与前后遮挡合理 | 人物、车辆、树木沿原脚底层级；停靠点人物与货箱、维修通道和转发站均已实际同屏复核；[转发站](../art-reference/story-campaign/scene-sunleaf-06-day.png)。树冠仍会遮住其后的实体，没有移除原遮挡逻辑 |
| 保留活动空间和真实边界 | 全章节通路专项校验通过；[实际键盘渡河](../art-reference/story-campaign/actual-water.png)与[渡口地图](../art-reference/story-campaign/ferry-map.png)；实测飞行抵达、点击载具下机；步行/水陆/空中碰撞专项通过 |
| 动作与部件独立 | [真实三只机械猫部署](../art-reference/story-campaign/actual-team.png)，[昼夜场景采样](../story-reports/forest-campaign-visual.json)记录机械猫2→3只；真实命中触发体验标志；原动画源和武器绘制未替换 |
| 白天与夜晚可读 | 第二至六章10张 `scene-sunleaf-02..06-day/night.png` 留档；[机械队夜景](../art-reference/story-campaign/scene-sunleaf-04-night.png)、[终章夜景](../art-reference/story-campaign/scene-sunleaf-06-night.png)复核通过；两条委托另有昼夜气泡截图 |
| 手机与桌面合格 | 320/390/1280宽度实际浏览器检查；[320目录入口](../art-reference/story-campaign/rogue-entry.png)、[320命名](../art-reference/story-campaign/name-choice-320.png)、[名字进入气泡](../art-reference/story-campaign/named-bubble-320.png)、[桌面委托](../art-reference/story-campaign/guardian-day.png)。本轮为浏览器视口模拟，非实体手机测量 |
| 资源完整且预算合格 | 三份浏览器报告页面异常均为空；角色资源ready、章节查询不串章，派生缓存未超预算；[视觉采样报告](../story-reports/forest-campaign-visual.json) |
| 正式玩法与清理 | 两条委托使用正式祝福与布防操作；[清波后交付提示](../art-reference/story-campaign/guardian-return.png)。五主线、两委托完成后story=null、props=0，刷新保留完成与命名记录 |

正式绘制器入口：`src/rendering/renderer.js#draw`、`src/rendering/story-props.js#storyObjects`、`src/rendering/visual-review.js#inspectStoryCampaign`。

`designCriterion`：`forest-story-campaign`，绑定于 `visual-contract.json`。

结论：**本轮配置、UI与玩法接入范围通过**。截图使用阶段/清场夹具辅助复现，不把流程通过当作自然战斗难度或设备性能的结论。

需修订项：本轮发现目录占满窄屏，已改为默认折叠；营地雪团缺少实体的问题已修正为显式出场；最终截图重拍并复核。无遗留阻断项。

长期参考：[本轮截图目录](../art-reference/story-campaign)、[主线报告](../story-reports/forest-campaign-main.json)、[委托报告](../story-reports/forest-campaign-side.json)、[范围与限制](../forest-story-campaign.md)。
