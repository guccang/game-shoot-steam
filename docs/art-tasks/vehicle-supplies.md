# 当前装备、道具、故障与弹药铺任务单

## 1 目标与阶段
动态效果开发。主界面只读当前手持武器和当前载具；道具使用、故障百分比、有限弹药及工坊换炮接入正式玩法。新增弹药铺沿用森林绿描边、奶油墙面和柜台。依据美术资源生成标准与手机 UI 框架。

## 2 参考与结构
参考正式种子小屋、武器工坊及载具装配页。弹药铺使用宽矮屋身、双弹药筒招牌、独立侧箱；布局位于西侧整备道路旁，避让维修院落。门前1秒进入，墙面不可穿，屋内售货员站柜台后。新增页面复用 ui-panel ui-page。

## 3 尺寸、锚点与分层
建筑144×128世界单位，底座锚点在墙根中心，门口在底座下方22；墙体矩形与画面共用同一位置。地面接触影与深度队列沿用正式绘制器。主炮始终复用独立主炮绘制器及枪口，不能旋转整车替代瞄准。无新增位图或缓存。

## 4 动作与保留项
保留猫真实连续帧、独立操枪、车轮履带和主炮后坐。故障状态影响实际移动/开火；装填扣真实库存，暂停冻结。换炮不回满弹药，不恢复故障。仅界面和建筑为程序绘制，PNG精修留待后续阶段。

## 5 实现入口
supplies 配置与业务、field-equipment 页面、ammo-shop 建筑绘制。以正式场景检查昼夜、进屋、柜台、当前装备、换炮、弹药耗尽、制作、道具使用和保存。320/390、短横屏与既有900竖版容器，不新增桌面布局。

## 6 验收
结论：通过，designCriterion 为 `vehicle-supplies`。

- 正式入口：`src/rendering/ammo-shop.js#drawAmmoShop` → `drawBuildingArchitecture`；`src/ui/field-equipment.js#createFieldEquipment`；`src/ui/logistics.js#createLogistics`；`src/rendering/visual-review.js#inspectVehicleSupplies`。主炮继续调用 `drawVehicleArmament`，不使用替代示意图。
- 实际交互：主界面当前武器/载具只读；一秒进出弹药铺、柜台打开购买/制作；实物弹药背包与车辆装卸；HP与部件道具使用；重坦换装红狼主炮；满损坏发动机从手机安排救援；刷新保存挂载、备用弹药与故障。两份浏览器验收脚本均通过，无页面异常。
- 昼夜同屏：`output/playwright/vehicle-supplies/exterior-{320,390,844,900}-{day,night}.png`，同屏检查真实猫连续帧、敌人、车辆、建筑与地面。新铺位于维修中心北侧，屋身和招牌清晰、门前留有通道。
- 手机底板：`shop-panel-320.png`、`shop-panel-844.png`、`shop-panel-900.png` 与 `current-panel-*`；320×568、390×844、844×390、900×1280，内容可滚动、关闭和底部按钮常驻，新增按钮不小于44像素，没有视口溢出。900竖版使用既有手机容器，不新增桌面布局。
- 换炮及动作：`wolf-on-heavy-current.png`、`mounted-world-day.png`、`mounted-world-night.png`，正式重坦车体与红狼主炮组合正确；实际战斗测试验证重型炮弹发射并消耗，耗尽停止，暂停不推进。保留原履带、轮毂与炮管后坐；未新增角色或运动素材，不适用新帧图集生成。
- 柜台和重量：`shop-counter.png`、`ammo-purchased.png`、`ammo-transfer.png`、`engine-disabled.png`、`engine-rescue.png`；墙体阻挡、门前可达及柜台两侧通行检查通过。
- 录像：`output/playwright/vehicle-supplies/video/page@154076302095820f9038b84e0013c8fa.webm` 为完整通过流程。截图、录像保留到主仓库相同输出目录。
- 逻辑验证：`vehicle-supplies.test.mjs` 13项、`vehicle-loadout-weight.test.mjs` 9项、`vehicle-repair.test.mjs` 10项、`shopkeeper-counters.test.mjs` 3项，共35项相关检查通过；共用活动快照覆盖秘境刷新后返回的炮型和实物弹药守恒。仅执行相关测试，未运行全量套件。
- 资源预算：无新增PNG、视频或字体运行资源；建筑复用正式Canvas房屋绘制，新增装备预览画布320×180，仅打开及操作时刷新；不增加逐帧界面重建。截图与验收录像不打入游戏资源包。

浏览器脚本：`tests/vehicle-supplies-browser.cjs`、`tests/vehicle-supplies-transfer-browser.cjs`。本次4175已有服务，工作树使用4176验证。新增补给数据不迁移旧版无限弹药。
