# 停车场一键换车

依据：[美术资源标准](../art-generation-standard.md)。任务标识 parking-vehicle-swap。

## 1 目标与范围

载具交互及原有Canvas短标签调整：驾驶时可直接点击自有停驻车，先保存旧车，再驾驶目标车。优先同区空位；满位交换目标车位与当前位置。原四轮/履带/旋翼与猫猫资源、比例、独立武器和三秒自动停车保留。参考用户北停车场截图、docs/art-tasks/parking-vehicle-transfer.md；制作路线为现有逻辑与正式绘制器微调。

## 2 造型与空间

不新增车型或变体，结构差异沿用既有车型。主车、停驻车和访客各自唯一显示；短标签驾驶时显示“点击换车”，步行时显示“点击上车”。原停车场地面、院落、道路、材质、光照及前后层次保留。满位时使用目标车腾出的泊位，避免重叠或新增占路车位。

## 3 技术交付

- 原110×20逻辑单位标签，原镜头比例，车体锚点沿用真实车位；透明Canvas，无新增位图。
- 分层沿用地面/车体及独立部件/标签；点击热点沿用90×86。
- 碰撞来自正式停车记录；只在到场155单位内换乘，无远程取车。
- 昼夜共用正式环境处理；截图覆盖桌面1280与手机390/320。
- 源码：core/camp-parking、ui/camp-home、ui/vehicle-transfer、rendering/parked-vehicles。
- 内存预算：无新增纹理、图集、缓存，停车记录仍按车型唯一。
- 工作产物：output/playwright/parking-vehicle-swap/。

## 4 动画任务补充

不适用新增动画、帧率、视频和抽帧。原停车动画、履带轮相、旋翼、角色动作和独立武器均复用；换乘是一次明确点击操作的状态交接。

## 5 生成指令

沿用当前森林配色和短标签，仅在驾驶靠近自有车时展示“点击换车”；保留车型外观和访客身份，不绘制新的停车场或新按钮面板。

## 6 验收记录

| 目标 | 验收结果 |
| --- | --- |
| 驾驶直接换车 | tests/parking-vehicle-swap-browser.cjs真实鼠标点击、触屏短按、工坊按钮均通过，旧车留位、仅一辆活跃；browser.txt |
| 满位合理处理 | 自有目标车加访客占满六位，交换目标车位与驾驶位置，访客记录不变；full-swap.png；单元覆盖往返换乘及存档恢复 |
| 失败与供给保存 | 冷却/远距离失败不改当前车与停车记录；耐久、轮相、余弹及装填保留；34项相关测试通过 |
| 轮廓和遮挡 | 正式车型与猫猫沿用原形体；新增“点击换车”短标签正常显示，车辆无重叠。第一次视觉夹具错误地把访客放到驾驶位置，已将驾驶车辆移到真实过道后重新验收 |
| 活动空间 | tests/parking.test.mjs覆盖实际倒车、取消、通道与路肩；不改变车位地形。停车记录唯一，访客不挤走 |
| 昼夜和多端 | 1280/390/320宽各昼夜6张正式同屏图，角色、载具、环境、敌人与UI均保留；390/320页面说明换行无溢出，panel-390.png、panel-320.png |
| 动作与独立部件 | 无新动画，正式停驻/驾驶绘制及原车轮、旋翼、炮塔保留；无需抽帧及源视频验收 |
| 资源预算 | 无新贴图、图集、缓存，实机无页面错误，无资源缺失 |

截图与日志均在output/playwright/parking-vehicle-swap/。针对性命令：node --test tests/parking-vehicle-transfer.test.mjs tests/camp-home.test.mjs tests/parking.test.mjs（34/34）；浏览器运行上述专项脚本。正式入口：src/rendering/parked-vehicles.js#drawParkedVehicle；采样：src/rendering/visual-review.js#inspectVehicleTransfer；designCriterion：parking-vehicle-transfer。结论：通过。

无需继续修订；确认版本为本任务提交，视觉参考沿用原停车场并补充本轮实机记录。
