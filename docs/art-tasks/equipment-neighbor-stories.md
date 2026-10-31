# 森林巡游美术生成任务单

## 2026-10-30 装备任务独立接取

本轮只调整八项装备任务的接取条件和任务状态文案，原页面结构、尺寸、样式、角色、借装、特性体验与背景故事保持不变。取消跨故事前置，已有会话占用明确提示可取消；购买仍要求本任务交付。计划检查新存档现场接取、工坊到任务页入口、中文换行及手机昼夜显示。复用现有资源，新增运行素材与画布为0；不涉及地形、碰撞或动作修改。入口为src/ui/story.js、src/ui/equipment-quests.js；designCriterion=equipment-neighbor-stories。

验收通过：装备任务、章节流程、世界驿牌和目录共33项针对性检查全部通过。浏览器隔离存档没有任何已完成故事，八项工坊条件均直接打开本装备任务，现场接取按钮可用；未交付时购买仍禁用。实际点击接取红狼成功，完成故事数仍为0，浏览器运行错误为0。引力枪、水枪、蜘蛛和红狼开场白改为独立请求，避免假定玩家做过其他故事。

已逐张复核390×844白天和320×568夜晚手机视口，说明文字正常换行、接取按钮可见且无横向溢出；短屏沿用原简介截断与帮助入口。证据：[白天](../art-reference/independent-equipment-quests/day.png)、[夜晚](../art-reference/independent-equipment-quests/night.png)。检查脚本：tests/equipment-quests-browser.cjs，端口4175；完整结果：output/playwright/equipment-quests/independent-result.txt。以上为浏览器触控模拟，未声称实体手机测试；未新增素材或修改动作、地图碰撞。

执行依据：[游戏美术资源生成标准](../art-generation-standard.md)、[项目合同](../../AGENTS.md)与[手机 UI 框架](../ui-foundation.md)。本轮复用既有资产，验收任务状态、正式动作触发和手机页面。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 邻里装备故事 / equipment-neighbor-stories |
| 类别和用途 | 任务交互、工坊购买条件与生活设施反馈 |
| 当前阶段与本轮范围 | 动态效果开发；复用已有角色、武器、载具和摆件，不生成新位图 |
| 本轮目标 | 明确八件装备的故事前提，并在六条新故事中实际借装、照料、护送和交付 |
| 动态效果与交互目标 | 照料使用正式枪口与水流/冰晶弹道；驾驶要求真实上车；工坊显示故事状态，查看和追踪分开 |
| 数量和变体 | 六条新增故事，复用机械核心和直升机两章；八种资格 |
| 保留项 | 原猫连续帧、独立操枪、蜘蛛母体子体、邻里猫小队、履带及旋翼；原价格、谢礼和旧所有权 |
| 制作路线 | 已有正式 Canvas 绘制器与 HTML 手机底板；本轮不使用 imagegen，现有美术已覆盖装备与人物 |
| 参考与同类资产 | src/rendering/story-props.js、src/rendering/living-world.js、src/styles/ui-foundation.css |
| 已确认效果与精修参照 | 沿用已有工坊购买列表、邻里目录、章节对白与进度环 |
| 后续精修项 | 无新位图替换需求 |
| 使用场景 | 邻里委托板、居民、旧哨站、花圃、厨房、林间支路及工坊 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影 | 复用现有箱子、花盆、灯与角色剪影 |
| 与其他变体的区别 | 任务地点、角色组合、正式武器与车辆不同；不以换色替代身份 |
| 主次关系 | 人物和装备为主体，任务摆件与状态说明为次 |
| 地面衔接 | 沿用营地道路和任务通行走廊 |
| 活动空间 | 保留营地门口；遭遇仅在远离安全区的林间空地 |
| 邻接组合 | 沿用原营地与林区布置 |
| 光向与明暗 | 沿用正式昼夜与材质风格 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸 | 沿用故事摆件112×128缓存与原人物尺寸；UI触控不小于44px |
| 像素尺寸或SVG视框与倍率 | 无新增PNG或SVG；正式Canvas随既有DPR处理 |
| 锚点与原点 | 原脚底、箱体底座与枪口坐标 |
| 分层 | 原地面、按脚底排序的实体、独立枪口弹道与UI |
| 程序与图片职责 | 程序处理任务状态、照料进度、借装与导航；既有图片仅承担原角色主体 |
| 替换接口与保留项 | 无资产替换；稳定ID与正式装备编号不变 |
| 透明背景 | 复用原透明资源，无新背景图 |
| 碰撞与可通行性 | 原山湖、水界与树干碰撞；借车使用真实通行能力 |
| 昼夜处理 | 复用环境夜色，UI共用奶油色手机框架 |
| 文件格式与位置 | src/config/equipment-story-chapters.js；src/ui/equipment-quests.js；src/core/equipment-story-actions.js |
| 内存与缓存预算 | 新增位图0字节；复用原有有界效果与设施缓存，新增6个运行源码文件约22.3 KiB；每次运木最多3棵临时任务树 |
| 必需资源与失败行为 | 原猫图集和武器/载具资源；沿用资源加载失败明确报错 |

## 4 动画任务补充

静态资产说明动画不适用原因。程序或SVG动画填写实际时钟、局部动作和录制路径，不虚构视频来源或序列帧；使用视频和序列帧时填写来源字段。猫身体继续使用真实连续帧，当前仅生成正面待机和移动，不增加多方向身体序列，也不以单张imagegen图片变形代替身体动作。

| 字段 | 填写内容 |
| --- | --- |
| 动作和时长 | 照料2秒近距离交互；角色和装备动作采用原连续时钟 |
| 时钟、帧率与循环 | 游戏dt；暂停不更新；照料射击间隔遵循正式武器 |
| 动作源码或源视频与连续片段 | src/combat/weapon-fire.js、recoil.js、spider.js；猫主体沿用assets/cat-front |
| 尺寸、裁切和缩放 | 不变更资产尺寸或图集裁切 |
| 起停与状态衔接 | 离开照料范围或受伤取消进度，借装退出恢复原装备 |
| 局部真实动作 | 复用角色移动、蜘蛛步态、猫小队出车与履带旋翼 |
| 独立部件 | 原枪口、手、后坐及车炮独立绘制 |

## 5 生成指令

本轮不调用 imagegen：现有角色、武器、车辆和生活摆件可满足本次叙事。只扩展任务状态与正式动作的触发，不更换美术风格。

## 6 验收记录

验收日期：2026-10-30。designCriterion：`equipment-neighbor-stories`。实际运行服务使用4176：默认4175已被其他进程占用，未终止原服务。浏览器使用隔离存档。

| 检查项 | 实际结果与证据 | 结论 |
| --- | --- | --- |
| 武器与载具购买条件 | 八项底层交易均拒绝未完成故事的首次购买；工坊保留价格与材料，并可查看对应故事。[武器条件](../art-reference/equipment-neighbor-stories/workshop-locked-390.png)、[载具短屏](../art-reference/equipment-neighbor-stories/vehicle-condition-320x568.png) | 通过 |
| 手机布局 | 320×568、360×640、390×844、430×932、844×390，另在1280×900检查原页面；条件按钮和购买按钮至少44px、无相交、无横向溢出。[横屏](../art-reference/equipment-neighbor-stories/vehicle-condition-844x390.png) | 浏览器通过；未连接实体手机 |
| 目录与导航 | 邻里页八张装备卡；工坊可查看缺失前置；查看不自动追踪。居民和委托板现场入口校验距离。[目录](../art-reference/equipment-neighbor-stories/catalog-390.png) | 通过 |
| 水与冰实际照料 | 点击目标后正式枪口、后坐与弹道持续出效果；不以对话直接计完成。[浇水白天](../art-reference/equipment-neighbor-stories/equipment-water-day.png)、[浇水夜晚](../art-reference/equipment-neighbor-stories/equipment-water-night.png)、[冰晶白天](../art-reference/equipment-neighbor-stories/equipment-frost-day.png)、[冰晶夜晚](../art-reference/equipment-neighbor-stories/equipment-frost-night.png) | 通过 |
| 引力场与蜘蛛 | 真实战斗采样，母体、子体与控制器保留独立绘制；归队后收起召唤。[引力白天](../art-reference/equipment-neighbor-stories/equipment-gravity-day.png)、[引力夜晚](../art-reference/equipment-neighbor-stories/equipment-gravity-night.png)、[蜘蛛白天](../art-reference/equipment-neighbor-stories/equipment-spider-day.png)、[蜘蛛夜晚](../art-reference/equipment-neighbor-stories/equipment-spider-night.png) | 通过 |
| 红狼真实碾压 | 原版车身与履带；炮火不伤任务树、炮塔不锁定任务树。实际方向键移动17次采样后3棵树归零，进入CLEAR；非直接改树生命。[白天](../art-reference/equipment-neighbor-stories/equipment-red-wolf-day.png)、[夜晚](../art-reference/equipment-neighbor-stories/equipment-red-wolf-night.png)、[开路完成](../art-reference/equipment-neighbor-stories/red-wolf-cleared.png) | 通过 |
| 金杯与手机操作 | 原邻里猫小队真实出车作战；触屏拖动确实移动车辆。[白天](../art-reference/equipment-neighbor-stories/equipment-jinbei-day.png)、[夜晚](../art-reference/equipment-neighbor-stories/equipment-jinbei-night.png) | 浏览器触控模拟通过 |
| 人物、比例与遮挡 | 修正故事人物和常驻人物同屏重复；保留真实猫连续帧及独立武器。上述昼夜截图检查人物、道具、怪物和环境同屏；目标箭头可点击，界面未遮住照料目标 | 通过 |
| 取消与归还 | 合并后在320短屏实际点击委托板管理、确认取消并刷新；记录未完成、无装备、无残留会话。[取消确认](../art-reference/equipment-neighbor-stories/equipment-cancel-320.png) | 通过 |
| 通行与恢复 | 正式章节入口校验路线；借车阶段必须在车内；复用红狼正式碰撞与扫掠。照料/碾压中途重载从阶段重建，暂离恢复永久装备 | 通过 |
| 资源与缓存 | 无新增运行位图、音视频、图集；任务花盆与记录纸复用正式Canvas和现有有界缓存。截图仅作设计证据，不接入运行资源 | 通过 |
| 连续交互录制 | `output/playwright/equipment-quests/interaction.webm`，保留于主工作目录；包含工坊、任务及动态场景采样。红狼最终修正另以专项实际驾驶脚本和上述截图验收 | 本地证据已保留 |
| 图片生成与PNG替换 | 未生成或替换角色/载具图片，本轮不需要imagegen或新PNG运行资产 | 不适用 |

正式入口：[绘制器](../../src/rendering/renderer.js)、[故事摆件](../../src/rendering/story-props.js)、[生活设施](../../src/rendering/living-world.js)、[只读验收采样](../../src/rendering/visual-review.js)。

首轮针对性测试26项全部通过，涵盖购买门槛、旧档、存档失败重试、六条任务、真实碾压及原谢礼。合并章节取消功能后补齐装备委托板管理入口，相关17项回归通过。浏览器脚本见[实现说明](../equipment-neighbor-stories.md)。新故事的战斗另用正式更新循环验证：冰晶、蜘蛛、红狼、金杯均可清场；引力需要移动保持距离，已补入对白提示。此项是确定输入的模拟检查，不等于完整玩家难度测试。

动态效果开发结论：本地浏览器功能与昼夜视觉验收通过；实体手机性能、安全区与触控手感仍待设备验收。PNG精修替换不适用。
