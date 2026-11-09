# 单行推镰

## 2026-11-08 行列与建造权限

本轮保持双轮割台、木柄、尺寸、刃口锚点与独立轮刀动画，扩展按行、按列预览和作业，机具方向与刀口命中统一。机器需要加工厂成品入库；分类选择和方向持久化，操作栏提供“换农具”。无新增图片、图集或缓存，PNG 精修不在本次范围。

`designCriterion: row-reaper-harvest` 动态验收通过。[按列收割](../../output/playwright/farm-axis/reaper-column-moving.png) 为正式手机运行截图；farm-axis-browser.cjs 通过真实按住触摸收完同列三格后自动停，邻列三格保留。切回按行后预览与机具恢复横向。单测覆盖两轴、障碍、满载确认与存档失败；[共用昼夜及短屏检查](ox-plow.md)验证四按钮最小 44px，使用浏览器手机模拟。正式绘制入口不变，inspectRowReaper 增加方向采样。新记录替代历史版本“常备、无需建造”的条件。

依据[美术生成标准](../art-generation-standard.md)与[项目合同](../../AGENTS.md)。本轮制作常备农具 row-reaper 的可玩版本。

## 造型与交互目标

参照正式镰刀的钢色、锄头木柄及牛犁预览。玩家推动约 48×32 世界单位的双侧导轮割台，猫爪握柄，轮毂与锯齿刀片由实际行进距离驱动。刃口在玩家身前，预览指示同一行的田块。松手抬刀停走，摇杆可换行。目标与田块的脚底、取景和昼夜合成沿用现有世界坐标。

## 技术交付

菜单图标与场景农具共用 Canvas 2D 主体。车轮、割刀、木架分别绘制，地面预览位于作物下方。猫继续使用原正面连续帧。无新视频、位图、纹理或离屏缓存，无需生图及 PNG 替换。真实通行沿用玩家移动碰撞，不能穿越障碍远距收割。设计目标为 row-reaper-harvest。

## 本轮验收结果

- 正式绘制入口为 `src/rendering/farm-tools.js#drawFarmTool` 和 `src/rendering/farm.js` 的田块预览。连续动作按实际位移驱动，可通过 `src/rendering/visual-review.js#inspectRowReaper` 读取作业状态，对应 `designCriterion: row-reaper-harvest`。
- 在 4175 端口运行游戏，经种地菜单拿起推镰，以浏览器触屏事件完成掉头、按住收割、松手、再次按住、到行尾自动停和收起。收割期间实际移动超过 80 个世界单位。短屏底栏三个按钮可见，收割按钮触控高度至少 44px。
- 已检查[手机白天](../../output/playwright/row-reaper/field-390-day.png)、[短屏夜间](../../output/playwright/row-reaper/field-320-night.png)、[宽视口白天](../../output/playwright/row-reaper/field-1280-day.png)及[宽视口夜间](../../output/playwright/row-reaper/field-1280-night.png)。轮架接在猫爪前，奶油色描边区分当前行与邻行，底栏未遮挡田地。宽视口沿用手机画框。
- `tests/row-reaper.test.mjs` 验证偏移对齐、双向移动、只收成熟作物、松手制动、碰撞、保存失败和满载确认。`tests/row-reaper-browser.cjs` 验证实际操作入口。相关牛犁及收获负重回归通过。
- 本轮结果：动态交互阶段通过。复用农具图标画布，新增一枚同规格小图标，新增分发位图、图集与视频均为零。此任务以手推割台为主体，怪物攻击、载具旋翼及视频源交付不适用。

## 2026-11-08 点格自动收割（实施目标）

点中任意田格，自动走近该行／列田头并逐格收割成熟作物，结束或点击“停止作业”停下。保留原推镰形状、26单位刀头接触偏移、角色脚底与真实步态，按钮沿用手机统一UI样式和44px触控区，无新增美术资源与结构变体。源码沿用src/core/farming/row-reaper.js、src/ui/ox-plow.js、src/rendering/farm-tools.js。参照本任务已有昼夜实机图，完成后补充交互、行列、满载确认、同屏与预算证据。

### 点格自动收割验收结论

动态阶段通过。点选未熟格自动走到田头，成熟作物逐格收获，未熟作物保留；点选已收空格可选择整列，行列结束自动停止，按钮停止与摇杆接管有效。暂停冻结，迎敌恢复前重新验证路线；超载确认继续只授权当前格。手机按钮保持44px，无新布局、图集或Canvas缓存，正面角色连续帧、刀头26单位接触点、导轮行程与独立手持分层保持。

正式工作台`inspectRowReaper`及`inspectFarmAutoWork`读取同一运行时；设计目标为`row-reaper-harvest`与`farm-auto-work`。[完整交互报告](../../output/playwright/farm-auto-work/report.json)与[连续帧采样](../../output/playwright/farm-auto-work/motion-report.json)通过，六帧推镰实际行程13.04→120.55、待办3→1。已查看[动作首帧](../../output/playwright/farm-auto-work/motion-reaper-0.png)、[动作中段](../../output/playwright/farm-auto-work/motion-reaper-3.png)、[390白天同屏](../../output/playwright/farm-auto-work/together-reaper-390-day.png)、[320夜间](../../output/playwright/farm-auto-work/reaper-320-night.png)及1280既有竖版容器昼夜。手机使用浏览器触控模拟，未测试实体设备；未新增PC布局。通行、资源、原有失败的基线说明及本次39项专项结果见[耕牛任务单本轮验收](ox-plow.md#本轮验收结果)。PNG替换不在本轮范围。
