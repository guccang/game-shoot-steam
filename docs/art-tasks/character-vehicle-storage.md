# 角色物品与载具仓库入口迁移

依据：[美术生成标准](../art-generation-standard.md)、[任务单](../art-generation-brief.md)、[AGENTS](../../AGENTS.md)。

## 1 目标与范围

本轮为手机 UI 交互调整，稳定标识 `character-vehicle-storage`。移除主菜单背包及独立背包页面，当前猫猫详情包含角色信息、随身物品和整理背包；当前载具页面进入该车仓库。室内保持当前猫猫入口，满载无需移动即可整理。

保留正式角色头像、物品图标、分类、重量、数量、道具使用、清理滑条和确认、手机全部功能及仓库建筑。参考 `current-cat.js`、`keepsake-backpack.js`、`field-equipment.js`、`logistics.js` 与统一 UI 底板。采用现有 HTML/CSS/SVG，无新增插画或 imagegen 任务，无后续 PNG 替换项。

## 2 造型与空间

角色页以头像和属性为主，随身物品为分类格子；载具页以当前车状态为主、仓库为子页。沿用森林绿描边与奶油底板。角色信息和物品使用两个明确的切换按钮，整理入口固定在底部。世界造型、地面衔接、碰撞、光向和活动空间不变，本任务不涉及场景几何。

## 3 技术交付

沿用 `ui-panel ui-page` 的手机尺寸、安全区和不小于 44px 触控目标；头像画布保持 240×200、原绘制锚点。层次为世界、角色或载具页、详情或仓库、数量确认。动态数据与事件由程序控制，正式物品目录和底板负责图标与样式。新增页签切换保持节点所有权，关闭子页恢复父页及正确暂停状态。

入口：`src/ui/current-cat.js`、`src/ui/keepsake-backpack.js`、`src/ui/field-equipment.js`、`src/ui/logistics.js`、`src/ui/load-cleanup.js`。无新增位图、资源下载或解码缓存；透明背景和图片替换接口不适用。必需资源沿用正式角色和物品资源，不新增回退。

## 4 动画与交互

无新增动画，角色、武器、载具动作时钟沿用正式运行时。检查页签、物品详情、整理滑条和确认、货物转移、子页返回、室内超载整理和手机功能。原清理拖动逻辑保持。

## 5 生成指令

未调用 imagegen：本次为现有页面结构和入口迁移，沿用现有图标与头像，新增图片不能改善操作归属。

## 6 验收记录

实际验收：

- 正式浏览器流程通过 20 项记录，补充载具/仓库 320×568、844×390 触控布局 4 项，页面错误为 0。
- 分类格子、数量、描述与重量可查看；角色清理的取消不扣货，确认只修改背包；载具装卸与清理只修改当前车货舱；刷新后库存保留。
- 室内超载通过「当前猫猫」进入整理，自动清理后移动负重条件恢复。手机地图、邮件、寻宝与维修子页可点击，逐层关闭后恢复游戏。
- 320×568、390×844、844×390 页面无横向溢出，底部按钮不小于 44px。已人工查看角色资料、物品格子、物品详情、载具仓库、窄屏载具入口、横屏仓库与室内入口截图。
- 白天与夜晚截图沿用正式环境与底板，角色页和载具页文字可读。无新增图片、网络资源或解码缓存。
- 世界遮挡、通行和动作不适用，未修改场景几何及动作绘制。
- 相关单元测试：清理与物品目录 15 项通过；随身重要物品/手机 4 项通过。旧室内测试的固定三发炮弹假设在主分支也失败，现改用正式弹药质量计算明确超载数量，测试已通过。
- 旧浏览器脚本入口同步到角色或载具页面，检查语法；未执行全量历史浏览器测试。

截图与录制保存在主工作区 `output/playwright/character-vehicle-storage/`：`cat-profile.png`、`cat-items-320.png`、`cat-items-844.png`、`vehicle-cargo.png`、`vehicle-layout-320.png`、`cargo-layout-844.png`、`indoor-overloaded.png`、`indoor-cleanup-confirm.png`、`cat-day.png`、`cat-night.png`、`phone-day.png`、`phone-night.png`，过程录制在 `video/`。

正式绘制器入口：`createCurrentCat`、`createKeepsakeBackpack.renderBag`、`createFieldEquipment`、`createLogistics`；头像保持 `drawCat`，物品保持 `paintInventoryIcons`。

正式检查器：`src/rendering/visual-review.js#inspectCharacterVehicleStorage`。

designCriterion：`character-vehicle-storage`。

本轮结论：通过。仅涉及页面结构与交互迁移，不含新造型或 PNG 精修。
