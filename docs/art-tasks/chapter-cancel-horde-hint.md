# 章节退出与兽潮站牌提示任务单

依据：[游戏美术资源生成标准](../art-generation-standard.md)、[项目合同](../../AGENTS.md)。沿用[美术任务单](../art-generation-brief.md)的目标、空间、技术、动作与验收分区。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 章节管理、兽潮站牌提示；chapter-cancel-horde-hint |
| 类别和用途 | 手机 UI 交互；当前章节接取点允许暂离/取消，兽潮到场提示可点击 |
| 当前阶段与本轮范围 | 动态交互开发，复用已有驿牌、兽潮盾牌及统一按钮，无新增图片 |
| 本轮目标 | 返回章节驿牌可管理任务；抵达兽潮地点明确知道点击站牌后确认开始 |
| 动态效果与交互目标 | 距离显隐、任务状态切换、确认取消、保存失败重试、重新接取 |
| 数量和变体 | 一个章节管理入口；北门/西门两处兽潮入口，身份和世界坐标独立 |
| 保留项 | 角色、怪物、载具、地形、独立操枪、导航偏好、永久奖励和完成记录 |
| 制作路线 | 现有 HTML/CSS 按钮与 Canvas 驿牌；无需 imagegen 或新增 SVG |
| 参考与同类资产 | 用户提供的章节现场截图；正式 story-posts、nearby-interaction、ui-foundation |
| 已确认效果与精修参照 | 奶油底、森林绿字，沿用现有手机按钮；实际验收见第 6 节 |
| 后续精修项 | 无，本次不变更静态资源 |
| 使用场景 | 当前章节营地驿牌；森林北门和西门兽潮站牌 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影、变体区别 | 复用驿牌和盾牌，不新增造型；两类入口使用不同中文操作文案 |
| 主次关系 | 场景主体保留，短操作按钮在牌上方，任务固定底栏显示暂离/取消 |
| 地面衔接、邻接组合 | 现有地面、营地建筑与牌面不变；章节期间仅恢复本章关联驿牌 |
| 活动空间 | 不新增碰撞，不扩大建筑实体；按钮触控不改变周围通行 |
| 光向与明暗 | 牌面共用既有昼夜材质，HTML 按钮沿用统一奶油底和森林绿字 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸、像素尺寸 | 既有驿牌热点 116×115 世界单位；附近按钮最小 44 CSS px，最大 200 CSS px |
| 锚点与原点 | 驿牌脚底向上 136 单位，兽潮盾牌脚底向上 166 单位；共用正式镜头投影 |
| 分层 | 既有 Canvas 实体层 + DOM 交互层 + 统一原生弹窗 |
| 程序与图片职责 | 程序管理距离、暂停、取消事务、显隐及文案；无图片替换 |
| 替换接口与保留项 | post/gate 稳定 ID、站牌点击、统一暂停归属、任务原进度及奖励规则 |
| 透明背景 | 无新位图；沿用场景热点与统一按钮 |
| 碰撞与可通行性 | 不增加实体碰撞，兽潮提示受牌面距离及营门 160 单位权限约束 |
| 昼夜处理 | 同一套 DOM，现有 Canvas 材质负责昼夜 |
| 文件格式与位置 | src/ui/story.js、src/ui/story-posts.js、src/ui/nearby-interaction.js、src/world/interaction-anchors.js |
| 内存与缓存预算 | 无新增纹理/Canvas/粒子，仅新增一个固定章节 footer；复用单个附近按钮 |
| 必需资源与失败行为 | 原有正式资源正常加载；取消存档失败保留现场并显示中文重试说明 |

## 4 动画任务补充

本次不制作动作、视频或序列帧；局部身体、枪械、载具动画和时钟原样复用。不增加提示动画，不存在帧复制、重采样或整图变形。交互状态变化由正式运行时驱动，暂停与恢复交给统一弹窗。

## 5 生成指令

无 imagegen 请求：已有站牌美术足够表达地点，本轮修复交互入口与提示可见性，使用正式绘制器和既有 UI 材质。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 系列一致、变体可辨 | 通过。复用正式驿牌、盾牌和统一奶油按钮；无新造型或换色变体。[章节白天](../art-reference/chapter-cancel-horde-hint/chapter-320-day.png)、[北门站牌](../art-reference/chapter-cancel-horde-hint/horde-top-390-day.png) |
| 落地与前后遮挡合理 | 通过本轮 UI 范围。没有改变实体脚底与绘制排序；提示跟随实体锚点，短屏避开任务卡、资源条，返场时暂缓可选章节短句。 |
| 保留活动空间和真实边界 | 不新增碰撞或地形；沿用原可通行空间。单测覆盖远离驿牌后入口隐藏、兽潮须同时在牌前及营门许可范围。未修改水界、桥头，无需重验全地图。 |
| 动作柔和且部件独立 | 沿用既有真实身体、操枪和气垫船动作；浏览器保持正式循环，没有替换或修改动画。无需新增动作生产验收。 |
| 动态进度与交互正确 | 通过独立浏览器存档的真实触屏：返场管理、取消确认返回、保存失败重试、取消后刷新、重新接取、暂离后取消、西门/北门开始与退出兽潮。取消不发奖励、不改永久完成记录。 |
| 白天与夜晚可读 | 通过。章节与两门各采样白天/夜晚；正式光照读数为 0/1。[章节夜晚](../art-reference/chapter-cancel-horde-hint/chapter-390-night.png)、[西门夜晚](../art-reference/chapter-cancel-horde-hint/horde-left-320-night.png)。章节画面包含猫、载具、场景与 UI；兽潮入口安全区域不额外生成攻击怪物。 |
| 手机及既有竖版容器合格 | 通过 320×568、390×844、844×390 和 1280×900 的原竖版容器，共 24 张场景图；按钮约 158×55 CSS px，确认底栏在短屏可见。[取消确认](../art-reference/chapter-cancel-horde-hint/cancel-confirm.png)。使用 Chromium 手机触屏模拟；未连接物理手机，不宣称已验证物理刘海或系统栏。 |
| 资源完整且预算合格 | 浏览器流程无页面错误及 HTTP 资源失败；零新位图、零新画布/粒子/纹理缓存，一个章节 footer 和复用的附近按钮。 |
| PNG替换保留动态与接口 | 不适用：本轮修复 UI 交互，未替换静态资产，暂无 PNG 精修项。 |

针对性测试：`tests/chapter-cancel-horde-hint.test.mjs` 5 项、`tests/story.test.mjs` 8 项、`tests/interaction-anchors.test.mjs` 3 项、`tests/story-posts.test.mjs` 中“章节只保留”1 项通过。未运行全量测试或国际化检查。

浏览器脚本：`tests/chapter-cancel-horde-hint-browser.cjs`。完整工作证据：`output/playwright/chapter-cancel-horde-hint/`；最终章节视觉修订另以 `?entry-visual` 单独复核，不重跑无关功能。

正式绘制器入口：`src/rendering/story-posts.js#storyPostObjects`、`src/ui/story.js#createStoryPanel`、`src/ui/nearby-interaction.js#createNearbyInteraction`。

designCriterion：`chapter-cancel-horde-hint`。

验收入口：`src/rendering/visual-review.js#inspectChapterTaskEntries`；合同：`visual-contract.json#chapterTaskEntries`。

动态交互开发结论：通过。PNG 精修结论：不适用，无新增图片任务。

确认版本：2026-10-30；本轮修复章节管理与兽潮站牌可发现性，不代表重新验收全地图或新增动作。需修订内容：本轮发现的短屏出画、HUD 与可选短句遮挡均已处理。

### 2026-11-02 选车页操作精简

目标：章节选择载具阶段移除“暂离章节”，保留取消任务和开始行动；取消确认文案不再指向已移除的入口。沿用原手机底板、触控尺寸、配色、场景绘制与动作，无新增美术资源、纹理或缓存。

验收：320×568 夜间和 390×844 白天实机通过，选车、取消确认返回、开始行动及行动阶段管理入口均正常，无页面异常。正式入口 `src/ui/story.js#createStoryPanel`，`designCriterion` 沿用 `chapter-cancel-horde-hint`；截图位于 `output/playwright/chapter-vehicle-actions/`。结论：通过；无静态资产替换，PNG 制作不适用。
