# 载具升阶 · 正面带猫概念原画

依据[游戏美术标准](../art-generation-standard.md)与[项目合同](../../AGENTS.md)。本轮交付车库正面外观定稿候选，供玩家比选和后续拆件。参考 assets/cat-front/source/cat-0-reference.png 中栗子的面部、比例与草绿巾，以及 output/playwright/hero-scarves/field-390-day.png 中停车的正面车身。

- 货运八款：木独轮车、铜轴独轮车、木马车、铜箍马车、蒸汽货车、内燃货车、电驱货车、反重力运输平台。加高斗沿、拓宽横梁、改变动力结构与货台面积表现载量增长。
- 自行车四款：木架、铜件、铁架、电动。车篮、后架、挂包和电池位置逐代可辨。
- 统一约束：整车与栗子正面朝屏幕下方，中轴对称，从略高处看到车顶和货台。马匹同样正面。图案不含背景、文字、地板及武器。
- 本阶段为静态外观提案，整车合影不进战斗图集。正式接入时按猫、挽具、轮组和车身拆层，使用原猫连续帧和脚底锚点，按实际尺寸验收昼夜、手机遮挡与动作。

## 本轮结果

[十二款正面对照图](../art-reference/vehicle-era-front/overview.png)按人力与畜力货车、机械货车、自行车分为三排。同目录 01 至 12 为逐款独立生成的透明 PNG。数字为方案建议净载货量；悬浮平台留待数值设计。

逐张检查了车型中轴、猫脸和马脸朝向、驾驶位、货斗及外露部件；十二张源文件均能解码，画布对角为透明。图像用于确认外观和代际关系。当前交付为静态设计参考，正式部件拆分、碰撞、货物装卸、连续动作与游戏内昼夜验证留至接入阶段。正式接入参考入口为 src/rendering/vehicle.js 的 drawVehicleTracks 和 drawVehicleArmor，以及 src/rendering/cat-animation.js 的 CatSpriteAtlas.draw。概念阶段检查目标为正面一致、货台随升级可辨、原角色面部清楚。

## 第二版 · 乘坐比例和操枪空间

参考实际游戏森林场景 output/title-cat-scarf/field-390.png 的前装甲线与驾驶员头部，以及 heli-stop-390.png 中的独立持械关系。逐款修订空车，将正式栗子头部和小圆脚作为独立预览层。正面车身为主体，马匹正面；车把、缰绳、方向盘不占用猫的双手姿态。自行车脚点不连长腿。交付静态概念合影、独立车身、持枪叠层示例和目录对照。逐款检查脸部位置、边缘、脚踏及可瞄准区域。

### 第二版验收记录

- 正面与分层（designCriterion：驾驶员保持原版猫脸，双手可独立操枪）。[十二款合影](../art-reference/vehicle-era-front/v2/overview.png)全部使用栗子同一真实待机帧的头部，按座位前缘裁切；[空车素材](../art-reference/vehicle-era-front/v2/vehicles/)可单独使用。[逐车锚点](../art-reference/vehicle-era-front/v2/mounts.json)记录猫头中心、脸宽、下颌和遮挡线。
- 脚踏轮廓（designCriterion：骑行时只露小圆脚）。四款自行车分别定位左右脚点；铁制车型返修一次，移除了车叉两侧易被看作腿部的橙色块。
- 攻击空间（designCriterion：车体正面与开火朝向独立）。[三种瞄准方向](../art-reference/vehicle-era-front/v2/attack.png)直接调用 src/rendering/characters.js 的 drawRiderWeapon 显示原游戏的手、武器与枪口。木马车、内燃货车、电动自行车分别向左、右上和右；车身均保持正面。
- 游戏内比例（designCriterion：乘车和步行时猫头视觉尺度一致）。通过浏览器临时在 src/rendering/parked-vehicles.js 的 drawParkedVehicle 入口展示样车，以猫头宽度约 44 世界单位换算每款整车尺寸。实际游戏内同屏复核了人物、怪物、地形与 HUD。截图见 output/playwright/vehicle-era-front-v2/field-390-day.png、field-320-night.png、field-950-day.png、field-950-night.png。正式接入须沿用头宽定位，避免将所有车辆等宽缩放。
- 阶段结论：静态乘坐关系与操枪分层可用于下一步拆件。所有图像位于设计参考目录，本轮运行包新增资源为零。场景预摆仅供比例检查；移动、碰撞、踩踏循环与骑乘实战留到正式车型接入后验收。

## 第三版 · 驾驶员与座位的接触
上一版下颌与车沿齐平，缺少肩颈、前爪与座舱的接触。沿用完整栗子身体帧与围巾，按车型沿真实前缘遮挡胸腹；手推车从后斗沿探身，马车坐在长凳，货车坐在方向盘后，自行车坐在车把后。保持正面、独立操枪和脚踏小圆点。以手机尺寸检查落座关系。

第三版验收记录（designCriterion：头、围巾与短躯干连贯，前爪有接触点，开火时只出现持枪双爪）。十二款使用 src/rendering/cat-animation.js 所用的 CatCoatFrames.get 同源全身帧，按每车前缘曲线裁出身体遮挡。脚踏沿用小圆点。图稿为 900 × 1044 透明 PNG，独立枪与双手使用 src/rendering/characters.js 的 drawRiderWeapon。[代表车型](../art-reference/vehicle-era-front/v3/riders.png)、[十二款总览](../art-reference/vehicle-era-front/v3/overview.png)、[开火构图](../art-reference/vehicle-era-front/v3/attack.png)。静态构图复核通过；在游戏泊车绘制入口临时预摆，390 手机白天核对自行车，320 手机夜间核对货车，另采样了 950 宽窗口的昼夜画面。证据存于 output/playwright/vehicle-era-front-v3。仅作概念原画修订，未新增运行包预算，驾驶动作、碰撞和交互留到接入阶段验收。

## 正式接入
使用第三版座位锚点、第二版空车底稿压缩运行图集。接入真实角色连续帧独立武器，停车无驾驶员；轮纹、脚踏与牵引马步按路程驱动。目标为工坊打造、改造继承原车及货物、手机驾驶与昼夜同屏。

### 正式接入验收 · 2026-11-06

- **车型、乘坐与遮挡**。按 `vehicle-era-front` 逐款取样正式战场。前两行是八档货运车，末行是四档自行车。围巾、肩胸及持枪双爪与驾驶位相接，车辆前沿遮住腹部，自行车脚踏以小圆脚呈现。与道路、树林、庄稼和敌人同屏检查，日夜均能辨认驾驶员和车厢。证据为 `output/playwright/vehicle-eras/lineup-day.png` 和同目录的 `lineup-night.png`、`bike-day.png`、`wagon-day.png`、`hover-night.png`、`hover-wide-day.png`、`hover-wide.png`。
- **动作及战斗**。入口为 `src/rendering/vehicle-eras.js`、`src/rendering/vehicle.js`、`src/combat/vehicle-motion.js` 和正式手持武器绘制器。车身正面固定，轮纹和脚踏按真实位移推进。两款马车共用正面挽马的真实连续帧，移动与停车按匹配姿态衔接。通过 `src/rendering/visual-review.js#inspectVehicleEras` 采样轮相与货载；触控摇杆骑行并对真实目标消耗手枪弹药。减少动态模式使用稳定马姿。
- **操作与通行**。手机视口实际拖动订单结账、升级旧车、到场登车。核对 390 像素宽配方、320 像素宽夜间 HUD 和 950 像素宽的居中画面。逐车验证旧档、货物和车位继承、领马、缺料与写盘失败回滚。地面沿用正式行驶碰撞，反重力平台使用两栖规则。未涉及新建筑与地形实体。
- **预算与结论**。车身图集 265246 字节、挽马图集 133034 字节、帧清单 1760 字节，合计约 391 KiB。源片与生成记录位于 `source/vehicle-eras/`。专项脚本为 `tests/vehicle-eras.test.mjs` 和 `tests/vehicle-eras-browser.cjs`。车型实装与代表玩法视觉复核通过。手机验证使用浏览器触控模拟，未测实体手机性能。

## 独轮手推车比例调整
对照正式昼间车型总览，木车和铜车的车斗、车轮接近双轮货车的尺寸。调整目标为单人手推比例，参考自行车把宽和猫身；木车取原车体的 65%，铜车取 68%。以既有车体原点定位，让车沿裁切、轮纹、落影和驾驶员位置共用相同比例，角色与武器保持原尺寸。
验收通过。designCriterion 为 vehicle-era-front。同镜头对比木车、铜车、双轮木马车与木制自行车，见[正式场景等尺寸裁图](../art-reference/vehicle-era-front/barrow-scale.png)。320 夜间、390 白天及 950 宽竖版容器的原屏截图存于 output/playwright/barrow-scale。已核对轮纹和车斗对齐、猫胸在车沿后方、枪口露出；手机模拟触控推动独轮车，轮相随位移推进。4 项升阶载具专项检查通过。复用原图集，不增加解码预算。

## 其余升阶载具的同场比例

本轮覆盖两辆马车、三辆动力货车和一辆反重力平台、四辆自行车。以已经确认的独轮车、原有电动车和猫头为尺，先检查轻车把宽，再检查车斗、货箱与平台的横向占地。保留轮胎、脚踏、马蹄、车斗、骑手胸口及操枪的既有分层；各部件绕同一世界锚点换算。停驻与骑乘共用比例，手机列表在固定图框内完整展示。复用现有透明图集；无新增位图、碰撞或载货参数。正式入口为 `eraHullScale`、`drawEraHull`、`clipEraSeat`、`riderPosition` 与 `drawParkedHull`。

**验收通过**（`designCriterion: vehicle-era-front`）。自行车依木、铜、铁、电助力取原图在世界中尺寸的 68%、69%、71%、73%；木马车与铜箍马车取 74%、78%；蒸汽、内燃、电驱及反重力车型依次取 78%、82%、84%、86%。[同镜头夜间对照](../art-reference/vehicle-era-front/era-scale-night.png)含松果战车、电动车及木独轮车。逐款检查 390 宽白天、320 宽夜晚和 950 宽既有竖屏容器，猫头与独立操枪保持统一比例，货车驾驶室、马车挽具、车轮和自行车脚踏对齐。通过模拟触控驾驶铜箍马车并下车，轮相、马步连续帧与停放位置正常，空车仍保留挽马。原屏截图与白天对照见 `output/playwright/era-scale/`。4 项升阶载具专项测试通过。未测试实体手机性能；本次无新图集或解码开销。

## 自行车踏板、车轮与入职赠车

本轮目标为四款自行车在实际移动时，能从正面看清轮胎滚动和一高一低交替踏动的两只小圆脚。依据运行图集第三行，以每款车的 250 × 250 原画、车架中轴和脚踏轴为锚点。保留车篮、货架、原车漆、猫身与独立操枪。用 Canvas 局部遮罩拆出原图静态踏板，曲柄、踏板、圆脚和轮纹按实际轮相绘制。校验起步、停车、重新骑行和夜间可读性。开场交给玩家木制自行车，松伯驾驶自己的退休专车。

验收通过（designCriterion `vehicle-era-front`）。正式入口为 `src/rendering/vehicle-eras.js` 的 `clipBicycleFrame` 和 `drawBicycleDrive`，使用 `advanceVehicleWheels` 的实际轮相。四款车型按各自的踏轴和胎面范围拆分。两侧相差半圈，踏板保持水平，圆脚随踏板移动；前轮朝向固定，滚动胎纹在轮顶和接地点收窄。两组相反踏姿见 `output/playwright/bicycle-drive/drive-phases.png`。共用原始图集、阴影、层次与碰撞，新增运行图片、离屏画布和派生缓存均为零；本轮无 PNG 替换。

使用 4175 正式页面在触屏模拟中跳过开场、读信、靠近北广场泊位上车并拖动摇杆，采样五个不同轮相，松手待车停稳后复测轮相保持。390 宽白天连续画面见 `output/playwright/bicycle-drive/wood-day-0.png` 至 `wood-day-4.png`，其中可见持械骑手、怪物、枪口与道路；320 宽夜间见 `wood-night.png`，950 宽既有竖版容器昼夜见 `wood-wide-day.png` 与 `wood-wide-night.png`（同目录）。场景几何沿用原自行车；正常与跳过交接、旧档电动车续教、木车分批采木入库及重新读档经专项验证。未测实体手机。
