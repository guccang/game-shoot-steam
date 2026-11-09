# 营地扩建与维修车库任务单

依据：[美术标准](../art-generation-standard.md)、[仓库要求](../../AGENTS.md)。

## 1 目标与范围

本轮为既有 Canvas 建筑的功能扩展：营地向西扩大 600 单位（宽 970 → 1570），载具维修中心 vehicle-repair 搬到西侧整备区，增加一个室内车位及两个室外车位。正常画面可辨维修招牌、工具徽记、敞开库门和门前泊位。制作路线为复用正式车库程序绘制；没有新增位图或 imagegen 请求。保留车型、独立炮塔、真实轮相、猫猫动画、P 点击停车、售货员及一秒进出门。

## 2 造型与空间

宽门车库沿用载具工坊的屋顶、侧墙和立柱，维修招牌与工具徽记区别于销售工坊。西侧支路绕过后墙，连接横向主路和原工坊院落；南侧单独交车位不占门洞及两侧停车位。营地护栏扩至 x=-780，邻里小院仍为原范围，接缝共享部分保持开放。左上受光、右下冷影、森林绿轮廓和奶油配色沿用正式样式。

## 3 技术交付

建筑逻辑尺寸 220×175，底座锚点 (-440,930)，镜像坐标使用正式周期世界几何。分层为院落/接触影/建筑/门洞车辆及独立炮塔；车辆仍用原轮相和车体，不烘焙进建筑。门洞 x±62、y[-104,4] 可进入；侧柱及后墙碰撞保留。源码：src/config/town-layout.js、parking.js、vehicle-repair.js，src/rendering/garage.js、parking.js、parked-vehicles.js、vehicle-repair.js。正常 renderer 正式入口直接使用；不增加贴图解码和常驻画布，无新外部资源依赖。昼夜使用正式世界光照。静态图案后续可精修为 PNG，稳定 ID、尺寸、门洞、分层及状态接口须一致。

## 4 动画任务补充

建筑本身静态。P 点击后的对齐、倒车、刹停由 core/vehicles/parking.js 推进，真实位移驱动车轮；暂停停止，手动移动取消。救援车和维修进度沿 core/vehicles/vehicle-repair.js 游戏时钟运行。未生成视频或身体序列帧，不改变既有猫猫和枪械动画。

## 5 生成指令

未使用 imagegen：用户要求扩大营地与停车功能，现有 Canvas 车库具有匹配的门洞结构、描边及屋顶，直接复用可保持交互几何一致。正式绘制入口 drawVehicleServiceObject → drawCenter → drawGarage / drawGarageGround。验收目标为新旧车库结构一致、维修身份清楚、入库遮挡正确、道路和泊位可通行。

## 6 验收记录

已完成针对性规则测试、真实浏览器 P 倒车/进屋维修、昼夜与 320/390/桌面竖版检查，结果如下。PNG 精修属于后续阶段。本轮不宣称完成 PNG 替换。

### 实际验收（2026-10-31）

- `designCriterion`：`camp-expansion-repair-parking`，已在 visual-contract.json 绑定正式 drawVehicleServiceObject 与 inspectVehicleRepair。
- 专项规则：camp-expansion-repair-parking 7 项、vehicle-repair 10 项、building-roadside-parking 8 项全部通过。验证三泊位、周期镜像、P 按钮、真实森林寻路、侧墙/后墙、售货员交修、旧出发/挂钩/返程和落在新围栏上的旧拖车续接；不重扣费用、不重置工时、原地停放不迁移。
- 地形保护与等级：natural-terrain 6 项、forest-distance-levels 3 项通过。扩大保护矩形并补周期镜像；原野外等级圈不随扩营平移。歪锅营地移到南侧围栏外，保留 2 级、稳定 ID、任务与种子掉落。
- 聚落与迁移回归其余 7 项通过。另确认 main（7d632cb）本身存在 3 项旧测试失败：town-layout 的旧“点击进入 realm-tower”断言、town-west-migration 的旧“自动冷却 60 秒修车”断言、monster-camps 的“全部作物都有营地种子”断言。未把这些既有失败报告为通过；本次新增场景和同模块其余 20 项野怪营地回归通过。
- 浏览器正式流程通过 14 个检查点，pageerror 为 0：390 手机真实触摸 P、连续倒车、自动下车、门口一秒进屋、点击售货员、付费保养、等待完工、取车。实际测量服务按钮不小于 44px，页面无水平溢出及弹窗越界。
- 白天/夜晚：320×568、390×844、844×390、1280×900 均截图复核，桌面保持既有竖版容器，夜间光照采样大于 0.9。画面包含猫、车辆、测试怪物、建筑、院落与 UI；小屏镜头保留既有裁切方式。新野怪营地不侵占维修区。
- 前后遮挡：车体留在真实门洞内、屋顶与立柱覆盖正确；两侧泊位与交付区分离。实际按键绕行录像和倒车轮相保存在 `output/playwright/camp-expansion/video/page@f2063d44d7142d05cb21a1a968abd276.webm`。
- 工作截图：`output/playwright/camp-expansion/`。长期参考：[库内停车](../art-reference/repair-garage-parked.png)、[维修区白天](../art-reference/repair-district-day.png)、[维修区夜晚](../art-reference/repair-district-night.png)。代码语法、JSON 与差异空白检查通过。
- 资源预算：复用正式 Canvas 绘制，无新运行位图、解码或离屏画布；没有视频/序列帧替换，枪械及猫身体动画不变。录屏只作工作验收，不加入运行资源。

本轮功能与程序美术开发结论：通过。PNG 精修替换：后续阶段。本轮无待修订项。

### 维修中心门后遮挡修正

以玩家提供的维修中心门洞截图为参照。门洞沿用原车库的宽度、门槛和底座锚点，目标是步行进门时可见猫猫、屋后行走时能辨认位置，门柱仍能表现前后关系。拆分正式立面的洞内与前景绘制，复用现有画笔、角色动作、武器和停车遮罩。验收覆盖门前、门内、后墙外、驾驶进出、昼夜与手机视口。

正式入口为 `vehicleServiceObjects`、`drawVehicleServiceObject` 与 `clipGarageOpening`。对应 `camp-expansion-repair-parking` 的门框遮挡与手机昼夜可读目标。两层共享一张 544×416 的运行时缓存，约 0.86 MiB，计入既有 8 MiB 营地建筑缓存上限。

验收通过。浏览器中用方向键从坡道走入门洞深处，再退回门前；另用模拟触屏摇杆分别步行、骑电动车进门。复核 390 像素宽白天门内、320 像素宽夜间后墙和宽屏门前的正式场景，角色、武器、载具、野怪与地形同屏。工作截图在 `output/playwright/repair-door-visibility/`，其中 `walk-in-day.png`、`deep-day.png`、`rear-night.png`、`bay-night.png`、`touch-rider.png` 可对照前后关系。三项专项测试通过，覆盖门洞双层深度、墙柱与后墙碰撞、三个维修泊位和跨边界停车。
