# 成长节奏优化与费用反馈任务单

## 1 目标与范围

- 稳定标识：economy-cadence；类别：已有DOM界面文字与数据反馈。
- 目标：玩家看清升级封顶价；策划看清全部种子的后期最大空档、超标样本及路线假设。
- 数量与结构：工作台增加两项统计与两项路线参数；正式工坊沿用原费用栏。
- 参考：docs/art-reference/balance-workbench-desktop.png、economy-workshop-320-night.png；森林绿、奶油底、原字体。
- 制作路线：原生HTML/JS，既有CSS布局；没有生成或替换贴图。
- 保留：正式角色连续帧、独立手枪/炮塔、履带旋翼、森林场景、昼夜、碰撞、通行。

## 2 造型与空间

沿用左右栏与手机单列，新增统计沿用原卡片。主体剪影、变体、地面衔接、邻接、世界光向不适用：只修改DOM文字。界面不得覆盖原工坊施工工具或引起320宽横向溢出。

## 3 技术交付

- 逻辑尺寸：响应式；桌面1440×1000，手机320/390×844。像素倍率由现有DOM与Canvas负责。
- 锚点、透明背景、碰撞与通行：无新世界对象，不适用。分层：独立数值工具、正式工坊费用栏。
- 昼夜处理：工坊文字沿用原样式，验收同时保留正式游戏昼夜同屏。
- 文件：balance.html、src/balance/app.js、src/config/economy.js。无位图、视频、外部字体；无新增图集或纹理缓存。
- 预算：沿用Worker，报告只保存代表种子详细轨迹，全部种子保存统计和最坏空档起止位置。

## 4 动画任务补充

不适用：没有新动作、源视频、裁切、缩放、帧率或独立部件制作。正式场景继续使用原动作资源，靶场复用正式战斗链。

## 5 实施指令

延续既有森林绿和奶油纸底，在原费用栏用短文案显示封顶价；统计必须清楚标明全部种子、后期边界及超标数量。不得把模拟路线中的回访间隔显示成游戏升级冷却，不得把模型验收标成真人实测。

## 6 验收记录

状态：2026-10-22浏览器验收通过。正式绘制器：src/rendering/visual-review.js#inspectEconomyFeedback；数值工作台入口 /balance.html。
`designCriterion`：economy-workbench-feedback（封顶费用、全部种子的后期空档、320/390/桌面和昼夜可读）。

| 设计目标 | 必须看到的证据 | 实际结果 |
|---|---|---|
| 数据口径清楚 | 100组结果、后期上限、超标数量 | 标准10.94分钟、低效率11.20分钟、均0/100超标；[桌面](../art-reference/cadence-balance-workbench-desktop.png)、[低效率390摘要](../art-reference/cadence-balance-low-summary-390.png) |
| 正式费用一致 | 工坊报价、施工扣费和封顶提示 | 14→15级显示封顶、30%追赶和关键等级；实际施工扣135金币/54木材、等级只加1；[320夜间](../art-reference/cadence-economy-workshop-320-night.png)、[390白天](../art-reference/cadence-economy-workshop-390-day.png) |
| 白天与夜晚可读 | 角色、怪物、载具、环境与UI同屏 | 六组1440/390/320昼夜同屏通过；[桌面白天](../art-reference/cadence-economy-scene-1440-day.png)、[桌面夜晚](../art-reference/cadence-economy-scene-1440-night.png)、[390夜晚](../art-reference/cadence-economy-scene-390-night.png) |
| 手机与桌面合格 | 320/390/1440截图与溢出检查 | 工具页面及正式工坊均无横向溢出，费用栏长文字换行，施工控件仍可用；[320工作台](../art-reference/cadence-balance-workbench-320.png) |
| 交互与资源完整 | 版本2导入导出、版本1迁移、CSV、真实资源加载 | 真实Worker运行标准与低效率、版本2往返、v1补无限额上限、非法版本报错、CSV下载、取消任务、正式靶场、经济账本下载通过；catSprites.load成功，pageerror为空；没有新增图集/缓存 |
| 动作、遮挡及通行 | 本次不修改动作、世界图层和碰撞；正式场景检查保留项 | 正式RAF同屏保留猫、独立主武器、重坦与炮塔；无新世界对象，因此新锚点/绕行/水界和动画生成验收不适用；没有用备用角色通过 |

结论：本次DOM反馈、手机布局、昼夜同屏和真实施工交互通过。完整原始截图及日志位于 `output/economy-cadence/`（合并时保留）；脚本为 `tests/balance-workbench-browser.cjs` 和 `tests/economy-feedback-browser.cjs`。经济压力路线的未达标结果见 `docs/economy-workbench.md`，本任务单不把视觉通过解释为所有玩家节奏保证。没有新增真人全程试玩。
