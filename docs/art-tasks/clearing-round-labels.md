# 清缴轮次文案统一

执行依据：[美术标准](../art-generation-standard.md)，沿用[任务单](../art-generation-brief.md)六部分。

## 1 目标与范围

稳定标识 clearing-round-labels。普通清缴按 Boss 轮数展示：第一个 Boss 为第 1 轮；5 批小怪在轮内单独显示进度。范围为清缴 HUD、详情、告示牌面板、首页存档摘要、死亡续战和事件短提示。参考原清缴节点轨道与任务短条，路线为原生 DOM 文案更新。

## 2 造型与空间

保留原森林绿奶油色卡片、圆形节点和 Boss 头像，不新增图形变体。主信息为“第 N 轮”，轮内节点保持 1–5，悬停和无障碍名称标明“批”。原面板锚点、层级、相邻任务和触控区域不变。此任务没有世界实体、地面、碰撞或建筑改动。

## 3 技术交付

入口 src/ui/clearing-round.js、hud.js、wave-progress.js、wave-help.js、clearing.js、title-menu.js。文本在原 DOM 流内排版；无新增位图、固定像素图集、DPR 副本或解码缓存。基于已击败 Boss 的正式战绩计算轮次，不按内部 wave / 5 推断，兼容旧存档不同组长。保留内部刷怪、强度、奖励、存储键及各专属玩法的独立波次。

## 4 动画与保留项

不新增动画，视频、帧率及动作生成不适用。保留节点倒计时圆环、清怪进度、Boss 自动登场、角色操枪及载具动作。

## 5 制作说明

短句优先：“第 N 轮 · 怪潮”“第 N 轮 · 休整”“本轮怪潮：已清理 X / 5 批”。Boss 倒下前不递增轮数，击败后下一次接取为下一轮；死亡、刷新和秘境返回保留同一轮。

## 6 验收记录

计划：首次和第二次 Boss 前后的正式结算与刷新；5 批内轮数固定、节点局部计数；桌面 1280、手机 390 / 320 昼夜同屏、详情页交互与窄屏换行。结果在实机后补充。designCriterion: wave-progress-track。


### 实际验收结果

| 目标 | 结果与证据 |
| --- | --- |
| 每个 Boss 对应一轮 | 通过：正式 updateWaves 完成两轮，各 5 批期间轮数分别固定为 1 / 2；自动召唤后通过正式 hit 结算 Boss，胜利后分别进入 2 / 3 轮。内部批次仍是 1–10，不改变难度和奖励。`result.json`、`boss-1.png`、`boss-2.png` |
| 死亡、刷新和首页摘要 | 通过：第二轮第 1 批击杀 2 只后正式死亡，提示第 2 轮；刷新首页同为第 2 轮，点击继续及重新出发后恢复内部批次 6、击杀 2。`death-round-2.png`、`result.json` |
| 各入口用词统一 | 通过：HUD 实际可见标题、Boss 标题、详情、第 1–5 批节点、提示和告示牌同用轮次/批次；主线说明改为一名 Boss 一轮及自动登场。`board-round-3.png`、各 `help` / `hud` 图 |
| 昼夜同屏与多尺寸 | 通过：1280×800、390×844、320×568 的白天/夜晚共 12 张 HUD/详情截图，经实际查看文字清晰，无横向溢出或新增遮挡；角色、正式电动车、怪物、环境和 UI 同屏。保留原节点、进度与点击区域 |
| 真正交互 | 通过：鼠标点击问号打开详情、关闭后恢复；真实 Boss 结算奖励关闭、死亡续战按钮及告示牌查看均完成。浏览器无 pageerror |
| 动作、活动空间与预算 | 无新增图形、位图、动画、纹理缓存或网络资源；世界坐标、碰撞、通行、角色动作和武器部件未修改，专项动画及实体绕行不适用。沿正式场景完成昼夜复核 |
| 针对性规则检查 | 14 项通过，覆盖详情轮数、旧组长、轮间计数、节点进度与死亡续接。1 项既有倒计时测试在 master 同样失败：测试重复调用已自动完成的 summonBoss 并要求返回 true；已复现基线，未改动无关战斗逻辑。变更脚本语法、JSON 及 diff 空白检查通过，未执行全量测试 |

证据目录：`output/playwright/clearing-round-labels/`，16 张截图及 `result.json`。正式入口 `src/ui/clearing-round.js#clearingRound`、`src/ui/hud.js#createHud`、`src/ui/clearing.js#createClearingPanel`、`src/ui/wave-help.js#createWaveHelp`；正式检查 `src/rendering/visual-review.js#inspectWaveProgress`，`designCriterion: wave-progress-track`。

结论：本次功能及显示验收通过，v1；旧倒计时测试基线失败另行记录。
