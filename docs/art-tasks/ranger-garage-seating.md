# 森林巡游美术生成任务单

复制本任务单，为每批资源填写一份。执行依据为[游戏美术资源生成标准](../art-generation-standard.md)。未确定的尺寸、锚点或碰撞关系，应先对照现有同类资源核实。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 载具工坊与后座乘坐 / ranger-garage-seating |
| 类别和用途 | 建筑、角色乘坐与入库动作 |
| 本轮目标 | 后座只见脸；两人下车后由松伯倒推入库；宽门深车位 |
| 数量和变体 | 一座宽车库、一套接班动作；住宅与工坊保持独立 |
| 保留项 | 真实猫连续帧、正面车头、20秒接送、独立小手与无武器电动车 |
| 制作路线 | 延伸正式 Canvas 绘制与剧情导演 |
| 参考与同类资产 | 用户两张问题截图；ranger-scenic-arrival 实机基准 |
| 使用场景 | 森林营地 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影 | 宽坡屋顶、整面敞开大车门、深色内墙与地坪 |
| 与其他变体的区别 | 宽扁车库区别于尖顶住宅；大敞门区别于武器工坊小门 |
| 主次关系 | 建筑托住停车空间，侧边工具架为次景 |
| 地面衔接 | 宽石板坡道接土路，边缘接触影 |
| 活动空间 | 门洞124宽；玩家在左侧等候；东侧保留工坊间通路 |
| 邻接组合 | 西侧林缘、东侧武器工坊、南侧土路 |
| 光向与明暗 | 左上亮屋面、右侧冷墙、檐下阴影 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸 | 220×175世界单位；门洞124×104 |
| 像素尺寸与倍率 | Canvas缓存480×400，2倍采样 |
| 锚点与原点 | 底座(265,650)，车位(265,608)，门前停靠(265,705) |
| 分层 | 地面坡道/建筑缓存/车辆与人物/手部/对白 |
| 透明背景 | 透明；墙根小接触影，大投影在地面 |
| 碰撞与可通行性 | 沿用装饰不新增墙碰撞；树冠避让按完整车库尺寸 |
| 昼夜处理 | 共用正式夜色与冬季屋顶材质 |
| 文件格式与位置 | src/rendering/garage.js；任务单与docs/art-reference/ranger-garage-seating |
| 内存与缓存预算 | 单张480×400 RGBA约0.73MiB；无雪/雪及昼夜最多4张约2.93MiB，无新位图下载 |

## 4 动画任务补充

静态资产标注“不适用”。猫身体当前仅生成正面待机和移动，不增加多方向身体序列。

| 字段 | 填写内容 |
| --- | --- |
| 动作和时长 | 待机/乘坐、3秒下车、5秒倒推及2秒返回、原告别 |
| 帧率、帧数和循环 | 原图集帧率、连续片段保持，不重制 |
| 源视频与连续片段 | assets/cat-front/animations.json 原资源不变 |
| 统一裁切和缩放 | 乘坐保留1.05比例，仅裁掉颈下身体；不裁改源帧 |
| 起停与状态衔接 | 统一剧情时钟、暂停冻结、刷新重建；减少动态沿用规则 |
| 局部真实动作 | 原猫步态；轮胎纹理按实际位移；停车后不转轮 |
| 独立部件 | 司机握把和推车手独立绘制，车不挂武器 |

## 5 制作说明

延续森林绘本风格，以宽坡顶、立柱、大门洞与深车位重绘载具工坊。乘客保留真实待机帧，只展示颈部以上。门前下车后玩家靠左等候，松伯在右侧握把倒推，停车后步行回到玩家面前交接。禁止拉伸原小屋或旋转猫身体模拟倒车。

## 6 验收记录

| 设计目标 | 实际验收与证据 |
| --- | --- |
| 后座只露脸 | [390白天乘坐](../art-reference/ranger-garage-seating/garage-seated-390-day.png)：原比例、真实眨眼与表情帧，仅保留颈部以上；身体、尾脚不外露。 |
| 宽车库与系列一致 | [安静参观](../art-reference/ranger-garage-seating/garage-garage-390-day.png)：独立宽坡屋顶、立柱、124宽门洞、内墙和地坪，区别于相邻武器工坊。 |
| 下车后倒推入库 | [连续录制](../art-reference/ranger-garage-seating/parking-and-walk.webm)、[最终推车手部](../art-reference/ranger-garage-seating/garage-motion-10.png)：3秒下车时车不动；玩家靠左等候；松伯侧边握把倒推5秒，再用2秒回到玩家面前。推车握把手替换同侧垂手，避免多手。 |
| 停车、遮挡与通行 | 车位(265,608)，前轮末端约645，位于650门槛内；门洞共享几何裁切车与老人。正式移动完成入库、退出、左/右/后方绕行，入口和两工坊间未堵；[返回门前](../art-reference/ranger-garage-seating/garage-walk-return.png)。沿用建筑装饰及透显机制，不新增墙体碰撞。 |
| 昼夜与冬雪 | [320夜间推车](../art-reference/ranger-garage-seating/garage-pushing-320-night.png)、[320冬季](../art-reference/ranger-garage-seating/garage-winter-320-day.png)。屋顶积雪沿正式季节材质；角色和车辆保持自身色调。 |
| 手机与桌面 | 1280×900、390×844、320×740，各阶段昼夜采样无横向溢出。最终专项38张，完整自动演出另按10个阶段记录；[正式采样](../art-reference/ranger-garage-seating/garage-samples.txt)。 |
| 战斗与工坊 | 实际砍木→门前修复→造首枪→首波出现→刷新续接；两个地图门牌分别打开对应清单，电动车挂载入口禁用。[390同屏白天](../art-reference/ranger-garage-seating/ranger-battle-390-day.png)、[320同屏夜晚](../art-reference/ranger-garage-seating/ranger-battle-320-night.png)。 |
| 动作与资源预算 | 沿用原猫真实连续图集，加载状态ready；驾驶、步行与轮纹独立，倒推轮纹反向，停下冻结。无新增运行图片；车库480×400缓存单张768000字节，雪/无雪与昼夜最多3072000字节；实机场景缓存共22项11023872字节。 |

针对性检查：`node --test tests/ranger-arrival.test.mjs tests/reset-progress.test.mjs`，12项通过，覆盖下车先后、轮纹反向、全阶段双方坐标恢复、停车边界、赠品防重、地图净空与后续教学。未运行全量测试。

实机脚本：`tests/ranger-garage-browser.cjs`、`tests/ranger-garage-walk.cjs`、`tests/ranger-scenic-live-browser.cjs`、既有采集/修复造枪/战斗工坊脚本。绕行脚本后半段使用已完成剧情的空间夹具，不替代前面真实完成教学的证据。完整截图与完整入场录像保留于主工作区 `output/playwright/ranger-garage-seating/`。

正式绘制器入口：`src/rendering/garage.js#drawGarage`、`src/rendering/ranger-arrival.js#drawArrivalObject`、`src/core/ranger-arrival.js#poseArrival`。

`designCriterion`：`ranger-garage-seating`，正式采样入口 `src/rendering/visual-review.js#inspectGarageArrival`。

结论：通过。乘坐脸部、下车顺序、手部与停车过程经实机检查并修订；车库与营地配色及同屏比例一致。

合并主分支载具升级绘制后，两边验收合同均保留。增查 `tests/vehicle-wheels.test.mjs` 3项通过；[合并后夜间原装电动车](../art-reference/ranger-garage-seating/garage-integrated-night.png)实机显示正常，无页面错误。

## 2026-10-23 乘坐层级修订（制作前）

用户指出只截猫头导致身体断开，且两人左右错位。本轮覆盖前文“仅保留颈部以上”的要求：完整绘制玩家真实连续身体帧，从画面前方到后方依次为老巡林员、玩家、深色后座挡板，两个角色与车身共用中心线。车头仍在人物前，独立握把手置顶。只修正乘坐局部层级与横向锚点，人物纵向座位、原比例、车库尺寸、下车与倒推流程保持。参考为本轮用户截图；无新增运行图片或缓存。


修订验收通过：

- [390白天乘坐](../art-reference/ranger-seat-layers/seat-ride-390-day.png)、[320夜间停靠](../art-reference/ranger-seat-layers/seat-stopped-320-night.png)、[桌面](../art-reference/ranger-seat-layers/seat-stopped-desktop-day.png)：两位角色和车身同轴；玩家完整图集帧在老人之后，深色挡板在玩家之后，不再用颈部裁切制造孤立猫头。身体侧缘与尾巴自然可见，双脚由前方老人和车头遮挡。
- [连续乘坐至下车](../art-reference/ranger-seat-layers/seating-to-dismount.webm)、[下车中间态](../art-reference/ranger-seat-layers/seat-dismount-390-day.png)：原帧动画与动作时钟保留，下车恢复完整步态，车停稳后才倒推。路线、车库、工具交接和战斗规则未改，通行沿用上一轮通过结果。
- `tests/ranger-seat-layers-browser.cjs` 检查骑行、停靠、下车、倒推4个阶段的桌面/390/320昼夜共24张画面；正式身体资源ready，无页面错误，乘坐阶段三者横坐标一致。
- `node --test tests/ranger-arrival.test.mjs tests/reset-progress.test.mjs` 12项通过，包含新档坐标与刷新恢复。仅按影响检查，未运行全量测试。
- 正式绘制入口仍为 `src/rendering/ranger-arrival.js#drawArrivalObject`，`designCriterion=ranger-garage-seating` 已同步修订为完整身体和前后层级。零新增运行资源与缓存，既有帧尺寸、比例、昼夜合成与独立操控部件保持。

本节替代之前“后座只保留颈部以上”的实现与对应旧截图作为当前乘坐验收依据。

## 2026-10-23 后座高度修订（制作前）

用户截图中后座猫头露出过高。本轮将后座整体脚底锚点降低，让松伯自然遮挡大部分脸，只露耳朵及少量头顶；替代上一轮后座完整脸外露的构图。参考为用户本轮开场骑行截图，保留原猫真实连续帧、1.05 比例、同轴前后分层、前座位置、车身及握把。尺寸、透明背景、原点和资源格式不变，不裁切身体、不缩放或旋转帧。新档初始化、骑行、恢复及下车起点共用后座高度配置，保证动作衔接；车库、碰撞与通行不变。无新增运行图片或缓存。

正式入口：`src/core/ranger-arrival.js#arrivalRiders`、`src/rendering/ranger-arrival.js#drawArrivalObject`；`designCriterion=ranger-garage-seating`，沿用正式采样器。验收覆盖桌面及 320/390 昼夜乘坐、停靠、下车及倒推画面，连续动作与刷新衔接；物理手机验收条件单独注明。结果待完成后填写。

修订结果（本节为当前后座高度验收依据）：

- 后座脚底从车身纵向 -54 调整为 -28，整体下移 26 个世界单位。前座仍为 -27，后座在下车开始时保持位于前座之后，避免切换独立人物深度时突然盖住松伯；新档及正式骑行共用配置。
- [390 白天](../art-reference/ranger-seat-height/seat-ride-390-day.png)、[320 夜晚](../art-reference/ranger-seat-height/seat-stopped-320-night.png)、[桌面](../art-reference/ranger-seat-height/seat-ride-desktop-day.png)：猫脸大部分被松伯遮住，仅露耳朵和少量头顶。完整原身体帧保持，侧边尾巴自然可见，车辆及握把完整。
- [下车画面](../art-reference/ranger-seat-height/seat-dismount-390-day.png)、[连续录制](../art-reference/ranger-seat-height/seat-height-final.webm)、[正式状态采样](../art-reference/ranger-seat-height/motion-samples.json)：自然时间推进停靠、下车、倒推，位置和步态连续，轮子随实际位移变化。
- 浏览器专项覆盖 4 个阶段 × 3 个尺寸 × 昼夜，共 24 张；资源状态 ready，无页面错误。修正旧采样脚本在正式历法中反复点击日期按钮的死循环，改为显式环境预览。
- `node --test tests/ranger-arrival.test.mjs` 11 项通过，包含暂停与全阶段刷新恢复、接送路线通行、交接后玩法。未运行全量测试。通行和建筑沿用原规则，本次未改碰撞。
- 资源预算：改造前后均无新增运行资源、图集、缓存或绘制调用，仅共用一个坐姿数值；运行猫图集仍为 2 页、48 帧、19763200 字节。当前地面缓存 32 项、29625344 字节，均为既有系统。完整截图与录制保存在主工作区 `output/playwright/ranger-seat-height/`。

结论：本次后座高度的浏览器视觉与动作专项通过。320/390 为模拟视口，未连接实体手机，不作为实机操作及性能验收。
