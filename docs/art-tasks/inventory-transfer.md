# 背包与载具货舱双向移物任务单

依据：[美术标准](../art-generation-standard.md)、[AGENTS](../../AGENTS.md)。沿用美术生成任务单的目标、参考、结构、规格、实现与验收六部分。

## 1 目标与范围
动态交互开发，稳定标识 `inventoryTransfer`。背包详情增加移到载具，载具仓库改为可点货格；选择数量、车辆并展示真实负重，失败保留物品。保留重要物品、常备农具、装备动作与现有存档身份。

## 2 参考
正式背包 `keepsake-backpack.js` 的物品图标和货格；`docs/ui-foundation.md` 手机林间告示板。仅复用现有图标，无新增插画。

## 3 结构差异
背包详情保留用途和使用按钮，新增移物入口；货舱按实物货格展示；子底板以物品、目标车辆、数量和重量预览组织信息。取消不改库存，确认才保存。

## 4 规格、锚点与分层
标准 `ui-panel ui-panel--compact`，图标沿用正式尺寸，按钮至少44px。标题、滚动正文、固定操作栏分层，原生dialog管理焦点与暂停；无世界坐标、碰撞或新动画锚点。

## 5 实现
程序DOM与既有Canvas/SVG物品图标，不调用imagegen。正式入口 `src/ui/inventory-transfer.js`、`src/ui/logistics.js`、`src/ui/keepsake-backpack.js`。PNG精修为后续阶段，本次不新增位图资产。

## 6 验收记录
2026-11-08：使用4175端口、隔离Edge手机触控上下文验收，不写用户存档。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 系列一致、结构可辨 | 沿用背包货格、正式物品图标和统一奶油纸/森林绿底板；数量和载具输入共用框架样式。人工检查 `output/playwright/inventory-transfer/load-day.png`、`cargo-grid-day.png`。 |
| 动态交互与暂停正确 | 真实点按背包→铜矿→移到载具，输入3件后背包8→5、货舱0→3；再点货格取回2件，背包5→7、货舱3→1。取消无变化，保存失败可重试，满载禁用提交，提交前车辆移远则拒绝。逐层关闭保持暂停，最后恢复巡林。 |
| 白天夜晚可读 | `load-day.png`、`cargo-grid-day.png`、`unload-night.png`，使用正式场景光照终态与运行UI；已人工检查。世界实体未改，怪物及部件动作不另造验收替身。 |
| 手机与既有竖版容器 | 320×568、360×640、390×844、430×932、844×390、1280×900；`panel-*.png`和`quantity-*.png`。全部控件至少44×44，无横向越界；短屏正文原生滚动可操作数量，确认栏固定。桌面只检查已有竖版容器，无新桌面布局。物理手机系统键盘、安全区仍待安装包真机复核。 |
| 落地、遮挡、通路和动作 | 不适用：仅改变DOM货格和子底板，不增删世界实体、碰撞、动画或独立操枪部件。 |
| 资源与预算 | 新增位图0字节，复用既有Canvas/SVG图标；底板只在用户操作时刷新，无每帧列表重建。浏览器异常0条，`report.json`记录正式DOM尺寸与状态。递归绘制依赖变化后重新生成两套地图缓存并检查指纹。 |
| 数量、重量与存档 | `tests/inventory-transfer.test.mjs` 6组通过；覆盖矿石别名、工业材料、木材、作物、种子、补给、备用弹药、武器弹匣、鱼获、帐篷、距离、容量、读档和失败回滚。既有背包4项与购枪负重10项通过。购枪夹具补充现行铜制枪械部件，保留原负重断言。 |
| PNG替换与接口 | 后续阶段；本次没有位图替换，既有尺寸、物品ID、动作时钟与交互接口保留。 |

正式入口：`src/ui/inventory-transfer.js#createInventoryTransfer`、`src/ui/logistics.js#createLogistics`、`src/ui/keepsake-backpack.js#createKeepsakeBackpack`。

`designCriterion`：`inventory-transfer`；正式验收器 `src/rendering/visual-review.js#inspectInventoryTransfer`，绑定于 `visual-contract.json#inventoryTransfer`。

动态交互开发结论：通过上述浏览器与针对性逻辑检查。PNG精修替换结论：后续阶段。本轮无待修订项；真实手机系统界面未在本环境验收。

长期参考：`output/playwright/inventory-transfer/` 截图和报告；浏览器脚本 `tests/inventory-transfer-browser.cjs`。
