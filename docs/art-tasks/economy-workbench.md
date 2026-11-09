# 数值工作台与成长反馈任务单

## 目标与范围
用途：策划调参工作台、玩家工坊费用与挑战反馈。稳定标识 economy-workbench。
参考：原游戏森林绿描边、奶油黄、柔和草木配色与既有工坊；不新增角色、地形或位图。
目标：可比较资源和时间；玩家能理解升级增幅、追赶价与森林/秘境双路线资格。
制作路线：原生 HTML/CSS、SVG 数据曲线与正式 Game 试射；文字数值不烘焙进资源。
保留：动作、脚底、独立手枪/炮塔、昼夜、碰撞、通行与正式战斗链。

## 造型与空间
工作台采用横向时间轴作为主视图，左侧参数、右侧结果；手机改为单列。
配色：森林墨绿 #294f3b、草地 #dce9d1、奶油 #fff4cb、纸白 #f8fbf4、晶体蓝 #347e87。
字体：标题用本机中文衬线宋体，控件用微软雅黑/系统无衬线；数值使用表格数字。
世界锚点、落影、碰撞、地图通路不适用：本任务只增加 DOM 工具和工坊文本反馈。

## 技术交付
入口 /balance.html；桌面 1440×900，手机320/390宽度；流式布局，无外部字体和网络资源。
分层：独立工具文档、正式工坊现有底栏；试射使用原 Game，不新画战斗示意。
资源：HTML/CSS/JS；SVG仅用于数据图。无图集、透明贴图或源视频需求。
预算：曲线抽样最多721点/资源，模拟移到Worker；试射和结果不常驻多份游戏实例。

## 动画与生成指令
不适用：没有生成位图/动画。正式试射保留装填、弹丸、蓄能和召唤时钟。

## 验收记录
日期：2026-10-22。UI与同屏视觉验收通过；经济体验的限制另见 `docs/economy-workbench.md`，不得将本表解释为全部节奏目标通过。
对应 designCriterion：economy-workbench-feedback。
正式入口：src/rendering/visual-review.js#inspectEconomyFeedback、src/core/workshop/workshop-trial.js。

| 检查项 | 实际结果与证据 |
|---|---|
| 桌面工作台 | 1440宽度，真实100种子Worker结果、购买及升级时间轴、余额曲线、方案对照；[桌面截图](../art-reference/balance-workbench-desktop.png) |
| 手机工作台 | 320与390宽度无横向页面溢出，参数单列，宽表局部横滚；[320截图](../art-reference/balance-workbench-320.png)、[390截图](../art-reference/balance-workbench-390.png) |
| 正式工坊 | 选择攻击内芯，键盘放入连接点、选择焊枪并按住施工；Lv.4→5准确扣74金币30木材，追赶价30%与关键等级可读；[320夜间](../art-reference/economy-workshop-320-night.png)、[390白天](../art-reference/economy-workshop-390-day.png) |
| 昼夜同屏 | 正式角色、重型坦克、独立炮塔、怪物、地表与HUD同屏；[桌面白天](../art-reference/economy-scene-1440-day.png)、[桌面夜晚](../art-reference/economy-scene-1440-night.png)、[手机夜晚](../art-reference/economy-scene-390-night.png) |
| 动作与真实资源 | 实际载入catSprites，资源加载失败脚本明确报错；正式RAF持续战斗和工坊试射使用原动画与攻击链。本任务未生成或替换动作、贴图、视频 |
| 遮挡、通行及锚点 | 本次仅DOM文本与独立工具，没有修改世界锚点、碰撞体、通行区域和遮挡算法；真实场景保留角色坐姿、独立枪口和原图层关系 |
| 导入导出与交互 | 版本JSON导出再导入、非法JSON报错、报告CSV下载、保留对照、取消Worker、正式试射和本地账本下载均通过；工具前后正式存档相同 |
| 资源预算 | 未新增位图、图集、字体或源视频；模拟和试射在Worker中执行并可终止，曲线按两分钟采样；自动记录最多600条事件 |
| 验收脚本 | `tests/balance-workbench-browser.cjs`、`tests/economy-feedback-browser.cjs`；后者逐项调用正式`inspectEconomyFeedback`，输出criterion和溢出检查。已在同步主分支新怪物、蜘蛛、球赛功能后重跑 |
| 连续运行 | `tests/balance-playthrough-browser.cjs`真实运行30分钟，记录见`docs/balance-reports/real-raf-30min.json`；属于自动操作观察，不宣称真人审美或主观好玩验收 |

结论：工具与游戏反馈的视觉、布局和交互通过。初次桌面截图曾捕获预热中的空画布，已退回；脚本改为等待正式应用`ready`，重新截图后通过。没有用空场景或备用角色画面作为验收证据。


## 2026-10-25 资源职责与独立木材费用上限

本轮仅扩展原工作台表单、用途说明和费用参数；沿用森林绿/奶油黄、原生控件、现有工坊、字体与分层。没有新增美术资源，也不改人物、怪物、地形、动画或碰撞。结构变化为清缴计价复选框及分类别木材上限；手机继续单列，展开状态与键盘焦点保持。尺寸/锚点/视频/图集项不适用（DOM表单，无新素材）。

对应 `designCriterion: economy-workbench-feedback`；正式反馈检查仍调用 `src/rendering/visual-review.js#inspectEconomyFeedback`。经济限制以[资源复核](../resource-source-balance.md)为准。

- 桌面1440与手机390/320真实浏览器无横向溢出，计价语义随开关更新，中文帮助可读：[桌面](../balance-reports/resource-source/qa/workbench-1440.png)、[390](../balance-reports/resource-source/qa/workbench-390.png)、[320](../balance-reports/resource-source/qa/workbench-320.png)、[独立木材上限](../balance-reports/resource-source/qa/wood-cap-320.png)。上限截图170为编辑测试候选，正式默认180。
- 导出后导入、非法字段类型拒绝、候选不污染正式存档、100组短观察窗显示0/100完成均通过；采集预设与参数提示对应实际模型。
- 工坊桌面与手机昼夜六组检查，原价35/14、3折实际11/5和缺口显示正确；真实按住施工扣费准确，四类别反馈保持：[桌面昼](../balance-reports/resource-source/qa/workshop-1440-day.png)、[桌面夜](../balance-reports/resource-source/qa/workshop-1440-night.png)、[手机昼](../balance-reports/resource-source/qa/workshop-320-day.png)、[手机夜](../balance-reports/resource-source/qa/workshop-320-night.png)。视觉复核确认报价底栏未裁切。
- 世界遮挡、通行、姿态、连续帧、资源预算没有改动，本轮不以表单验收代替新的动作素材验收。没有新增图集、视频或外部加载资源；测试截图只作证据。

结论：本轮表单与正式报价交互通过；长周期为模拟、采集为自动操作采样，不标注为真人体验验收。
