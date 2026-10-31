# 修复倒计时与小屋进入提示

依据[美术任务单](../art-generation-brief.md)、[生成标准](../art-generation-standard.md)与[AGENTS.md](../../AGENTS.md)。

## 1 目标与范围

本轮为程序UI开发：13项后续设施均增加武器工坊同款锤子、圆环与剩余秒数，保留横向进度及修复中文状态；小屋附近增加“进入小屋”触控按钮，任务卡直接说明点击方式。参考现有drawActionCountdown与附近建筑按钮；无新增插画或PNG精修项。

## 2 造型与空间

保留森林绿、奶油底、双层状态；圆环位于设施屋顶，横条在其上方避让。建筑、原锚点、投影、碰撞和通道不变。小屋按钮位于屋顶上方，原门口候停倒计时仍放在屋面。

## 3 技术交付

圆环徽记沿用68×34屏幕像素，错误提示扩至120×34；读取正式施工时间，随镜头反向缩放保持大小。主场景实体绘制后显示，不增加纹理或画布。小屋按钮复用附近交互组件、44像素触控范围和正式入屋校验；坐标取当前小屋配置。入口不改变存档、修复费用、自动修复条件或室内布局。

## 4 动画任务补充

圆环只表现正式倒计时，暂停不推进，结束消失；木料飞行动画和角色动作保留。无需新增视频帧、动作图集或独立部件素材。

## 5 生成指令

不使用imagegen：复用已有Canvas锤子圆环和DOM按钮，动态时间及提示由程序绘制。

## 6 验收记录

| 目标 | 结果与证据 |
| --- | --- |
| 样式统一 | 13项设施在0.6/0.85/1.05倍率下均绘制锤子圆环和剩余秒数；原横条及“修复中”保留 |
| 状态正确 | 暂停只读原施工时间；保存失败显示“保存待重试”，结束与离开场景无残留 |
| 昼夜与手机 | 390×844白天、320×568夜晚各检查小屋/载具工坊/时空塔/告示牌共8组场景；实看短屏载具工坊、时空塔与小屋截图，修复文案、横条、圆环均完整可见 |
| 摆放与通行 | 施工镜头平滑留白，避免顶部资源栏覆盖；横条按倍率避开圆环；实体与碰撞不变，原镜头平滑边界测试通过 |
| 点击进入 | 浏览器实际点击附近“进入小屋”按钮成功进入cottage房间，倒计时已清空；入室截图显示床边休息提示 |
| 任务说明 | 任务卡显示“靠近小屋，点击「进入小屋」”；驾驶时提示“先下车”；详情说明点击及站定3秒两种方式 |
| 条件与兼容 | 驾驶、远距离、未建成、暂停、施工、战斗和对白不能点击绕过；原站定3秒进入、室内出门和休息保存检查通过 |
| 资源与错误 | 无新增图片、画布、纹理缓存；浏览器pageerror为0 |

正式绘制入口：Renderer.draw → drawRestorationBuildCountdown → drawActionCountdown；原工坊入口drawWorkshopBuildCountdown保留。按钮入口：createNearbyInteraction → enterCottage；核心条件canClickCottage。

验证：repair-ui-house-entry、cottage-rest-guide、room-exit-countdown、building-interaction-view、interaction-anchors、building-camera-transition共27项不同的针对性测试通过。截图与日志位于output/playwright/repair-ui-house-entry/，包括320-entry.png、320-inside.png、320-garage.png、320-tower.png和result.txt。采用浏览器手机模拟，无物理手机实测。

本轮结论：通过。动态状态、交互、昼夜和短屏符合本轮范围，无待修订项。

designCriterion：repair-ui-house-entry。PNG精修：不适用。
