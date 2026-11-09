# 点击修复交互调整

## 目标与范围
到达区域只显示建筑名称、材料与修复入口；明确点击后扣料开工。覆盖普通设施、首次武器工坊、修复详情页及任务指引。保留提前修复、已完成主线跳过、原施工动画、保存原子性与范围。

## 结构、尺寸与分层
复用现有附近按钮、手机底板与Canvas范围文字，触控至少44px；不生成或更改美术素材、配色、建筑轮廓、动画及图集。附近按钮按按下时目标锁定，目标变化时取消本次点击。

## 资源与动作
无新增运行图片、无新缓存。木料飞行与施工仍由原正式绘制器和游玩时钟控制。imagegen与身体动画生成不适用。

## 验收计划
正式浏览器320/390昼夜检查附近提示与修复页；验证路过/站立/导航抵达不扣料、仅点击目标开工、材料不足/距离失效/连点/保存失败、首次工坊与已有施工存档。结论：通过。


## 验收结果（2026-10-27）

- 正式浏览器390×844、320×568昼夜共4视图：附近按钮文字清楚、触控高度≥44px，无页面溢出；[窄屏白天](../art-reference/explicit-building-repair/320-day.png)、[长屏夜晚](../art-reference/explicit-building-repair/390-night.png)、[修复详情](../art-reference/explicit-building-repair/panel.png)。复用原森林绿按钮与奶油底板，新增图片/图集内存为0。
- 真实触屏验证：原地不扣料；按下小屋按钮后切换到清缴牌，抬起取消；再次点清缴牌只扣40木头；完工后走到小屋不继续自动修；关闭普通/新手详情均不修；明确按钮分别提交对应建筑；缺料禁用；首次武器工坊骑乘点击和详情页暂停状态下点击均可开工。
- 45项修复、入职和直接依赖单测通过，另3项防误触回归通过：所有设施路过不扣料、错误目标不转投脚边便宜设施、重复点击/保存失败/离开区域均不误扣。
- 同文件中2项清缴回归在本次工作树与未修改的master均失败，位置为`clearing-contract-onboarding.test.mjs`的`acceptClearingPost`初始接单断言；已确认基线问题，不扩大此次改动。
- 单独新增的触屏检查替代现行合同中的两份历史自动投料录制入口，旧脚本留作历史记录。本次未运行全量测试。
- 保留原施工飞木、持久化原子提交、暂停冻结、已支付施工恢复、提前修复和主线跳过；没有改变建筑资源、动画、区域、碰撞与费用。
- 正式入口：`src/core/camp/town-restoration.js#repairFacility`、`src/core/camp/ranger-arrival.js#advanceArrival`、`src/ui/nearby-interaction.js#createNearbyInteraction`、`src/ui/town-restoration.js#createRestorationPanel`。
- `designCriterion: town-restoration`：沿用`src/rendering/visual-review.js#inspectTownRestoration`读取正式目录、范围与build状态，更新`visual-contract.json`的点击要求与验收入口。
- 本地4175已有服务，本轮使用隔离端口4178，保留其他任务服务。

## 修复按钮建筑锚点补充（2026-10-27）

本次只调整现有DOM按钮的位置：普通设施使用 `restorationStatus().facility` 的建筑坐标和高度，多处营门使用当前实体；首次武器工坊使用正式工坊坐标。按钮底边锚定建筑上方，沿用世界镜像、顶部HUD避让和窄屏水平边距，不再取角色头顶或脚下位置。无新增美术素材、动画或缓存。

- 正式入口：`src/ui/nearby-interaction.js` 的 `createNearbyInteraction().render()`，样式为 `src/styles/ui-foundation.css`。对应设计目标 `nearby-click-interaction`：修复入口随建筑投影定位，角色在附近移动不会改变按钮绑定的建筑。
- `tests/repair-building-anchor-browser.cjs` 通过80组正式DOM投影检查：320×568、390×844、844×390及既有1100×844竖版容器，昼夜、角色左右位置，小屋/载具工坊/清缴牌/营门/首次武器工坊。按钮触控尺寸≥44px，无越界和浏览器异常。
- 实际点击小屋只扣80木头并启动小屋施工；到场未点击不扣料，离开后入口隐藏。原点击目标防误触逻辑保留。
- 人工复核小屋手机昼夜、新手武器工坊画面，按钮与建筑对应，门前角色保持可见。截图：`output/playwright/repair-building-anchor/`，已保存主工作区；运行时无新增位图，图集与动作检查不适用本次布局调整。
- 默认4175已有服务，使用独立工作树4178端口验收。结论：通过。
