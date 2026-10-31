# 普通场景恢复正常镜头任务单

依据：游戏美术资源生成标准 1.0；由美术生成任务单复制后按镜头修复范围填写。

## 1 目标与范围

- 名称与标识：普通场景正常跟随镜头 / restore-normal-camera。
- 类别与用途：正式场景取景修复，不生成或替换美术资源。
- 目标：森林、高塔、远征恢复原版近距离跟随视角；仅守护女神默认容纳整个战场并允许缩放。
- 数量与变体：一个模式分流修复；普通场景沿用原版武器镜头，守护女神保留全景构图。
- 保留项：角色身份与比例、视频连续帧、枪械、后坐、载具与怪物动作、地形、UI、通行几何和昼夜着色。
- 制作路线：复用 CombatCamera.update 中已有原版镜头分支。
- 参考：src/rendering/camera.js 的原版近景分支及 tests/camera-safety.test.mjs；现有角色、地形及载具资源全部沿用。
- 使用场景：森林地图、时空之塔、肉鸽远征、守护女神及其相互切换。

## 2 造型与空间

主体剪影、变体结构、地面衔接和邻接组合：不适用，本次不改造资产或布局。
主次关系：普通场景突出角色及身边战斗，守护女神突出全场布防。
活动空间：不修改入口、桥头、岸线或碰撞；恢复随角色移动的原版视线。
光向与明暗：继续使用原有左上受光及统一昼夜转换。

## 3 技术交付

- 逻辑尺寸：普通镜头按画布宽度恢复原版倍率，普通武器手机 0.85、宽屏 1.05；狙击、浮游炮等沿用既有武器镜头规则。
- 像素尺寸与倍率：无新增位图；设备像素比与 Canvas 逻辑坐标保持原样。
- 锚点与原点：普通镜头跟随角色世界坐标；守护女神全景仍以秘境场地中心为基准。
- 分层、透明背景、接触影：全部沿用正式绘制链，不改写资产。
- 碰撞与通行：纯取景修改，不改变物理数据。
- 昼夜：沿用 EnvironmentTransition 与 SceneTone。
- 文件：src/rendering/camera.js；相关测试及 visual-contract.json；验收图和日志保存于 output/restore-normal-camera/。
- 资源预算：新增运行资源 0 字节，不新增图集或缓存，沿用现有上限。

## 4 动画任务补充

不生成动画；时长、帧率、循环、源视频、统一裁切及源帧索引不变。保留猫身体起停姿态衔接、独立操枪、怪物动作与载具履带/旋翼。通过既有动作回归与正式场景连续帧复核。

## 5 生成指令

不调用位图或视频生成工具。让普通场景进入原版正常镜头分支，只在守护女神进入全景与手动缩放分支；离开守护女神时清除倍率与旧的跟随缓动状态。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 正常尺寸与系列一致 | 手机正常武器倍率 0.85、桌面战场倍率 1.05，角色和载具恢复原比例；normal-camera-320-day.png、normal-camera-390-night.png、normal-camera-1280-day.png 已人工检查。 |
| 跟随、切换与遮挡 | 镜头跟随玩家真实移动；森林、高塔、远征与原版近景分支逐项一致。恢复原有树冠、麦田、标牌深度遮挡，未修改几何或图层。tests/battlefield-zoom.test.mjs、tests/camera-safety.test.mjs 通过。 |
| 活动空间与真实边界 | 本次不改动地图或物理边界；完整 513 项测试通过，包含移动、水界、载具与寻路回归。 |
| 动作与独立部件 | 正式守护同屏包含普通枪械、浮游炮、无人机及载具，昼夜连续 8 帧均变化；output-horde.log 中 guardian-field-day/night 均为 8 个独立帧。无新动画，源帧、锚点和部件逻辑不变。 |
| 昼夜与手机桌面 | normal-camera-{320,390,1280}-{day,night}.png 为正常镜头，horde-{320,390,1280}-{day,night}.png 为守护全景；角色、怪物、载具、环境及 UI 同屏，已复核正常距离与守护全景区别。 |
| 输入与模式限制 | 三种非守护模式无缩放入口、不响应捏合；守护横竖屏缩放、建造与重新进入全景通过，见 output-pinch.log、output-horde.log。 |
| 资源与预算 | 正式猫图集加载成功；无新增位图或解码内存，相同视图连续绘制地面缓存未重建。197 模块语法、导入及分层检查通过。 |

全部截图及日志：output/restore-normal-camera/。首次桌面截图捕获到窗口尺寸调整的透明过渡帧，已让验收等待 ResizeObserver 和两帧绘制，并校验正式画布非空后重新截图通过。
正式绘制器：src/rendering/renderer.js Renderer.draw → src/rendering/camera.js CombatCamera.update。
designCriterion：normal-scene-camera、guardian-battlefield-overview。
结论：通过。版本：restore-normal-camera v1；本次为恢复原版构图，不替换长期美术资产参考图。


## 2026-10-27 肉鸽远征固定默认战斗镜头

- 目标：远征所有抽取武器均使用默认战斗倍率（窄屏0.85、宽画布1.05），不再触发狙击、浮游炮和脉冲广角；退出后仍按森林原装备取景。
- 路线、参考及保留项：复用 CombatCamera.update 的普通近景；角色跟随锚点、地形与UI分层、碰撞、射程、攻击及独立操枪不变。不新增资产、变体、纹理和缓存，动画与资源生成项不适用。
- 尺寸与场景：320×568、390×844、844×390手机画布昼夜；角色、载具、敌人及UI使用正式绘制器同屏检查，无新增PC布局。
- 正式入口：src/rendering/camera.js#CombatCamera.update、src/rendering/renderer.js#draw/prepareGround；designCriterion：normal-scene-camera。
- 验收结论：通过。tests/expedition-camera.test.mjs 与 tests/camera-safety.test.mjs 共9项通过；tests/expedition-camera-browser.cjs 的三种手机视口昼夜共6组通过，正式绘制和地面预热倍率一致，五类武器均保持0.85；横屏继续使用现有手机画布，无单独桌面布局。
- 退出远征恢复原狙击装备及0.6倍率；浏览器无页面异常。模拟移动与守护缩放切换由针对性单测覆盖，浏览器设置前置进度并冻结随机战斗，仅验证正式取景、装备切换及退出，不代替实体手机或全程通关。
- 人工检查正式同屏截图：[320白天](../verification/expedition-camera/320-day.png)、[390夜晚](../verification/expedition-camera/390-night.png)、[短横屏](../verification/expedition-camera/844-day.png)。角色、敌人、载具、地形和HUD可辨；未新增资源和动作，碰撞/通行数据未修改。
- git diff --check通过，未执行全量测试。
