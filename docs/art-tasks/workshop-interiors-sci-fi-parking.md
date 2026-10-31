# 北广场科幻座驾与可进入工坊

## 1 目标与范围
- 稳定标识：workshop-interiors-sci-fi-parking。类别：停驻载具、室内场景与家具、实物交互。
- 目标：北停车场轮换展示六款不同结构的非卖科幻座驾及所有正式可获得载具；武器工坊、载具工坊提供可步行进入、停留、点击实物、三秒候门离开的空间。
- 六款：月梭（双浮筒与尖艏座舱）、星甲（六支撑足与装甲舱）、萤翼（宽翼与双尾推进器）、林鲸（长货舱与外置货箱）、苔虎机械车（四轮舱与探测钻头）、星环（环形轨道与悬挂球舱）。每款至少两项结构差异，不靠换色区分。
- 两室：武器工坊采用木质陈列架和暖色吊灯，六件一组翻看完整正式武器目录；载具工坊采用中央泊位、工具挂板、维修桌、轮胎与零件柜。
- 参考：用户附图、现有 parked-vehicles.js、cottage.js、正式武器和载具绘制器，以及 docs/art-generation-standard.md。
- 制作路线：沿用 Canvas 2D 程序化形体和既有正式装备绘制器，无位图生成。
- 保留：玩家真实猫动画、枪械/独立炮塔、车辆真实泊位及归属、北门通道、入职任务、剧情换车和原购买/升级规则。

## 2 造型与空间
- 科幻车约90×95世界单位；底座停在既有泊位，落地支撑和右下接触影清晰，近处显示型号及非卖品。
- 森林绿描边、柔和奶油与草木色、有限三层平涂；无荧光大光晕和密集碎纹。
- 工坊室内360×380，车库单个泊位居中，工具台在边缘；出入口和两侧步行环路保留。武器陈列架分两行，中间留通道。
- 室内按脚底排序，角色走到台前和台后仍有正确遮挡；家具碰撞共用配置。门垫和三秒候停徽记沿用小屋。
- 房间顶部墙面与窗光区别昼夜，夜间保留温暖的工作灯；背景不与人物争夺对比。

## 3 技术交付
- 正式配置：src/config/parking-visitors.js、src/config/workshop-interiors.js。
- 正式绘制：src/rendering/science-vehicles.js、src/rendering/workshop-interior.js；停驻车继续复用正式车轮/装甲/炮塔。
- 锚点：停驻车辆脚底中心；室内局部坐标左上原点。房间投影等比适配桌面、390与320屏幕。
- 分层：地板/接触影、家具和车辆/人物脚底排序、UI交互及倒计时。无新地形碰撞，室内碰撞独立。
- 新资源透明程序绘制，不新增视频、图集和昼夜副本。武器陈列最多缓存六张192×144画像，约648 KiB，翻页替换；不加载六套场景贴图。

## 4 动画任务补充
- 科幻样车为停机展示，无驾驶/轮腿假动画；灯、机械支脚与外壳独立构造，车辆不整图旋转或拉伸。
- 室内玩家沿用真实连续帧、脚底固定和同源动作时钟；武器陈列为静态实物，无需额外身体动画。
- 原版车辆停驻保持轮相和炮塔独立。施工、试射和升级仍走原工坊流程。

## 5 制作指令
在既有森林绘本风格里设计可进入的工作空间，先保证门口、环路、碰撞和实物交互，再补工具与小摆件。六款科幻车以不同结构建立辨识，不添加购买能力或污染玩家拥有列表。访客轮换必须避开可见泊位、自有车和预约车位，并保留两个公共空位。

## 6 验收记录

验收日期：2026-10-25。以下路径均位于 `output/playwright/workshop-interiors/`，来自隔离端口4282的正式游戏运行。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 六款科幻座驾轮廓可辨 | 两批并排展示月梭/星甲/萤翼与林鲸/苔虎/星环；双浮筒、六足、宽翼、长货舱、四轮钻头、环形球舱均清晰。`scene-0-320-day.png`、`scene-1-390-night.png`，以及各尺寸昼夜同系列截图。 |
| 覆盖全部正式访客 | 6款正式车型均由原车体、履带/轮胎和独立原厂炮塔绘制；`visitors-0-390-night.png`、`visitors-1-320-day.png`。核心测试12次轮换覆盖12个型号，视野内不替换、无重复车位、不授予所有权；原预约和两个空位规则保留。 |
| 可进入的武器工坊 | 木地板、低展柜、窗与吊灯；全部17件装备分3组，最后一组不造假展品。`weapons-390-day.png`、`weapons-320-night.png`、`weapons-page-2.png`。正式鼠标/键盘/触屏点击均打开对应装备，真实购买通过，见 `weapon-purchased.png`。 |
| 实际车辆与修理空间 | 中央仅一个泊位，复用garage记录；维修挂板、工具桌、备胎、工具车及带图册名牌的零件柜围绕布置。`vehicle-1280-day.png`、`vehicle-320-night.png`。实际倒车入库后自动下车进入，车辆唯一且可点击整备，空车库不复制携带车。 |
| 通行与边界 | 5像素网格可达性检查通过全部展柜前方、车库两侧和两张工具台；家具和车身为真实底座碰撞。实机键盘走动、两类页面关闭后继续步行、三秒进出及移开取消通过，见 `entry.png`、`exit.png` 与 browser.txt/actions.txt。入职推车、旧小屋及停车相关检查通过。 |
| 原角色动作、独立部件 | `walk-0.png`至`walk-2.png`记录正式键盘行走连续采样，沿用同源视频身体、脚底和动作时钟；停机样车不伪造轮腿/旋翼动画。新增动画源文件、帧率及抽帧不适用，本次不修改原动画资源。 |
| 昼夜同屏与遮挡 | 正式角色、怪物、科幻载具、环境和HUD同时出现在 `scene-{0,1}-{1280,390,320}-{day,night}.png`。实体按脚底排序，车库真实车辆保留独立炮塔，室内夜景窗色和灯光可辨。实机查看对应截图通过。 |
| 桌面及手机适配 | 1280×800、390×844、320×568各昼夜检查通过，室内热点与页码未超屏、标题和出门操作无重叠，保留键盘焦点轮廓与至少44像素实物热点。 |
| 资源与存档 | 正式验收读取6张192×144画像，共663552字节（648 KiB），翻页替换；不新增视频、位图或昼夜资源副本。3份浏览器脚本页面错误均为空。真实购买、保存和刷新后回到室外坐标，车库记录保持唯一。 |

- 针对性测试：`node --test tests/workshop-interiors.test.mjs tests/camp-home.test.mjs tests/parking.test.mjs tests/workshop-lifecycle.test.mjs`，31/31通过，记录 `unit.txt`。
- 实机：`tests/workshop-interiors-browser.cjs`、`tests/workshop-interiors-actions-browser.cjs`、`tests/workshop-interiors-scene-browser.cjs`；结果分别为 `browser.txt`、`actions.txt`、`scene.txt`。
- 正式绘制器：`src/rendering/science-vehicles.js#drawScienceVehicle`、`src/rendering/workshop-interior.js#drawWorkshopInterior`、`src/rendering/parked-vehicles.js#drawParkedHull`。
- 正式采样：`src/rendering/visual-review.js#inspectWorkshopInteriors`；`visual-contract.json#workshopInteriorsCriterion`；designCriterion：`workshop-interiors-sci-fi-parking`。
- 结论：通过。修订记录：零件柜补上“载具图册”名牌，让点击用途可见。新室内只扩展普通营地，入职施工与任务专用换车入口仍使用原流程。
- 确认版本：本任务分支提交；参考图以上述正式实机截图为准，现有 `docs/art-reference/landscape-six-day.png` 与夜景基准继续保留。
