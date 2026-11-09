# 单行牛犁 · 动态实现任务单

## 2026-11-08 行列农具修订

本轮目标：猫与牛的落地范围合为一格，保留两者原有正面连续帧及动作时钟；耕牛、条播机、推镰支持行列作业。猫骑在牛背中心，座位绘制高度为牛蹄上方 96 单位；猫先画、牛头和挽具后画，遮住腿部，沿用电动车骑乘动作时钟。座位高度不改变世界坐标，碰撞和开垦仍使用现有 56×52 田格。挽具、种子与刀具由程序独立绘制，牛身不旋转。行列预览与实际结算共用方向，掉头不横跨另一垄。UI 复用原手机农具栏，加入方向切换和返回换农具；分类记住上次选项。高级机器沿用加工厂配方及成品权限。

参考与保留项：沿用本任务单既有牧栏、农田和角色资产，森林绿描边、奶油黄控件、成年牛比例、脚底锚点和同源待机/移动图集保持。使用 Canvas 与 DOM 修改，无新图片、画布或图集缓存，不涉及 imagegen 或 PNG 替换。正式入口仍为 renderer.js、ox-plow.js、farm-tools.js 与 farm.js；对应设计目标 ox-plow-row、row-reaper-harvest、row-seeder 和 world-farm-delivery。验收完成后在本节记录新证据，以本节替代旧版“牛前猫后跨格及弧线换垄”的空间安排。

### 本轮验收结论

动态实现通过。正式游戏在 4175 端口经手机触摸完成骑牛、按列挖地、松手、换农具及重新打开恢复；实际座位相对牛蹄为 (0,-96)，移动期间猫身体 moveWeight 小于 0.01，牛继续使用同源迈步帧。三类农具行列逻辑共 12 项针对性检查通过；工厂真实配方扣料、成品运输入库和读档启用检查通过。旧档行方向及基础农具保留默认值。返还工具栏为待选择状态，不会在显示耕牛图标时误用锄头；其他农具作业期间牛身热点不抢田块触摸。

| 设计目标 | 实机证据与结论 |
| --- | --- |
| 骑乘、遮挡与风格一致 | [390 白天](../../output/playwright/farm-axis/ox-390-day.png)：猫脸在牛角上方，牛头遮住腿部；角色、怪物、停靠载具及地形同屏。 |
| 昼夜及手机可读 | [320 短屏夜晚](../../output/playwright/farm-axis/ox-320-night.png)、[既有竖版白天](../../output/playwright/farm-axis/ox-1280-day.png)、[既有竖版夜晚](../../output/playwright/farm-axis/ox-1280-night.png)。四按钮全部在屏内且宽高至少 44px，浏览器触控模拟通过，未使用实体手机。 |
| 动态与交互 | [正式浏览器用例](../../tests/farm-axis-browser.cjs) 验证列向开田、推镰完整收三格、条播补三格、未建造拒绝及保存恢复；方向改变会停止旧路线。 |
| 活动边界 | 原地掉头不挪至邻垄，水岸牛身及碰撞拦截由 ox-plow.test.mjs 复核；没有新增地面实体或扩大农田占地。 |
| 资源与失败行为 | 沿用猫和牛图集加载器，缺失仍显式失败；本轮无新增位图、离屏画布或缓存。仅更新与行列间距、座位高度有关的地图依赖指纹，地面绘制未变。 |

PNG 精修不在本轮范围。开发结论为通过；本轮长期参考为上述 farm-axis 截图。

依据[美术标准](../art-generation-standard.md)。农具页沿用手机底板，实景沿用农田和角色比例。主体为暖棕耕牛、浅色双角与木架石犁；牛在猫前方，石犁拖在中间。四腿分相迈步，脚底对齐田地，以真实移动距离累计步态，停止保持姿态。水平步进 56 世界单位，沿用正式地形、角色、湿土和存档。使用 Canvas，无新增图集、纹理或碰撞体。验收目标 ox-plow-row，需看移动开田、停止、折返、手机昼夜与桌面竖版。

## 验收记录

首版牛身在田边小于猫，退回后以近侧后蹄为锚重新放大 2.15 倍，调整木架、牛角与描边。390 宽画面中角尖到蹄底约 82 像素，猫耳到脚底约 55 像素。角色在犁后，牛头、挽具和四蹄可辨。

正式入口为 src/rendering/ox-plow.js 的 drawOxPlow，验收函数 inspectOxPlow 读取同一动作步态，designCriterion 为 ox-plow-row。手机触控模拟通过农具入口领用，摇杆一次连续开出三格；停止后田数稳定，折返遇田会收犁。12 帧采样检查步态，领用失败回滚与旧档默认值已通过单项测试。占地与地形交由正式开田规则。左右通行使用现有角色碰撞，耕牛本身没有独立寻路或碰撞体。本轮无新增位图和缓存。

已复核角色、牛犁、怪物、停靠车辆与田垄同屏。[390 宽白天](../../output/playwright/ox-plow/farm-390-day.png)、[320 宽夜间](../../output/playwright/ox-plow/farm-320-night.png)、[桌面竖版白天](../../output/playwright/ox-plow/farm-1280-day.png)、[桌面竖版夜间](../../output/playwright/ox-plow/farm-1280-night.png)。本阶段程序绘制与交互通过，实体手机与专门 PNG 精修未开展。

## 本轮修订目标
保持成年牛比例，延长挽杆，将石犁铧独立画在牛后蹄与猫手之间；松手抬铧，落铧与按住动作绑定。世界锚点沿用脚底，驻留位置进存档。三格预览与正式提交共用落点和禁耕判断。

修订验收通过。正式农田地面层 drawFarmGround 在角色下方显示三格落点，drawOxPlow 单独绘制浅色石铧与深色木杆。停牛位置含地图、坐标与朝向，parked-ox 按场景深度绘制。单项测试核对松手牵行、按住逐格提交、阻挡抬犁及位置读档；手机浏览器模拟完成购买、走位、单指持续犁三格、松手、停牛、点击牛身再次出工。上列昼夜截图已更新到本次操作栏和犁头版本。无新增位图。旧档已购牛但没有驻留坐标时，首次从农具页出工建立位置。

牧栏、召牛和猫猫风格正面序列帧已接入，动物绘制以[牧栏定稿](pasture.md)为准。连续转向、牛身过水与耕地对齐已纳入针对性回归。

## 牛前猫后的合同行走与掉头

本轮为动态实现。参考电动车中角色与车身的前后遮挡，以牛蹄为整组移动锚点，猫站在牛身后扶犁，两者同时沿田头弧线行走。保留成年牛和猫各自现有的正面连续帧与尺寸，按猫、木柄和犁铧、牛身分层。掉头占用约一行田宽，检查水岸和树干。验收目标为 ox-plow-row，检查摇杆、按住犁地、掉头、停牛复牵和旧档位置，以及短屏、常规手机和桌面昼夜实景。此次不制作新位图。

本轮动态实现通过浏览器验收。正式绘制器 drawOxPlow 与角色绘制共用 oxHandler，inspectOxPlow 提供同帧的牛蹄和扶犁位置。触控模拟完成点击牛身、按住犁出一格、松手掉头、停牛与重新牵牛。此次试走中牛蹄从 y=1020.46 转至 y=968.46，猫和双柄始终在牛身后，转弯中没有新增田块。回归覆盖河岸牛身占地、旧档停牛位置和逐格结算。采用原图集、尺寸与动作时钟，新增位图及缓存为零。

已复核[转弯中段](../../output/playwright/ox-follow/turn.png)、[常规手机白天](../../output/playwright/ox-follow/390-day.png)、[短屏手机夜晚](../../output/playwright/ox-follow/320-night.png)、[桌面白天](../../output/playwright/ox-follow/1280-day.png)和[桌面夜晚](../../output/playwright/ox-follow/1280-night.png)。牛角前置，猫脸与握柄可见；角色、怪物、车辆、地形与操作栏同屏。手机检查使用浏览器触控模拟。

## 2026-11-08 移动与耕种判定分离

本次仅修改作业逻辑，保留现有牛背骑乘、正面连续帧、锚点、尺寸与所有美术资源。旧记录中的“折返遇田收犁”由本次规则替代：按住可从禁种地面起步，逐格跳过路面、已有田和禁种区，到可耕地自动继续；田数上限或保存失败不停止牵行。建筑、水域、树干及牛身碰撞仍阻挡实际通行，松手仍抬犁停车。

验收：tests/ox-plow.test.mjs的9项专项通过，覆盖行列跳格、已有作物保护、牧栏/道路禁种、田数上限、保存失败以及河岸牛身碰撞。tests/ox-travel-browser.cjs通过真实牛身入口与触屏按住，在正式Game.update中从路面y=700连续行至916.56；路面未开田，随后在804、856、908形成三块对齐田，松手停止。手机浏览器390×844白天和320×568夜间图见output/playwright/ox-travel/，result.json记录位移与结果，pageerror为零。本次无美术修改及新增资源预算。附带道路旧用例存在2项原有失败，临时还原本次逻辑后同样复现，记录于output/ox-road-baseline.txt；未扩大修改道路规则。

## 2026-11-08 闲置自动回栏

本次仅增加耕牛闲置规则，默认60秒有效森林巡游时间后复用既有真实归栏寻路。骑乘、耕作、接近牛和召唤期间重置计时；暂停、离线、独立玩法及其他地图不补算。牛栏内不重复发起归栏，沿用原正面待机/迈步图集、脚底、挽具、尺寸和动作时钟，不新增美术资源或离屏画布。实际归栏仍使用牛蹄半径26的碰撞，读取当前营地围栏与建筑位置。

本轮结论：通过。新增`tests/ox-idle-return.test.mjs`4项通过，原`ox-plow.test.mjs`9项与`wild-pasture.test.mjs`3项通过；覆盖60秒阈值、骑乘/迎敌不打断、暂停冻结、小数秒读档、写入失败重试、障碍等待、实际走进栏内与不重复归栏。未执行全量测试。

`tests/ox-idle-return-browser.cjs`使用4175正式应用，通过真实触屏点击牛身与停牛，在计时阈值前准备存档计时后由正式帧循环触发并走完归栏；牛蹄最终为(1020,865)，保存的牛位置(906,865)、归栏阶段清空、闲置计时归零，刷新后恢复一致。页面异常0。

已实际查看`output/playwright/ox-idle-return/walking-1.png`、`walking-4.png`与`home-390-day.png`、`home-320-night.png`、`home-1280-night.png`。连续帧`walking-0.png`至`walking-5.png`记录原正面步态沿世界路径移动，昼夜共用锚点；归栏后牛在栏内，人物、地形、围栏及手机操作可读。320×568、390×844为浏览器触屏模拟，1280×900复核现有手机容器；不声称实体手机测试、不新增桌面布局。

正式链路为`src/core/farming/pasture.js#updateOxArrival` → `src/rendering/farm.js#farmObjects` → `src/rendering/ox-plow.js#drawOxPlow`。`visual-contract.json`与`src/rendering/visual-review.js#inspectOxIdleReturn`绑定`designCriterion: ox-idle-return`。采样结果见同目录`report.json`。本轮只改变行为规则，原图集、动作素材、身体比例和独立操枪均未修改；新增图片、解码和Canvas缓存预算为0。当前自动回栏计时范围为森林自由巡游，室内、异地图及独立玩法冻结，避免用异地图坐标直接传送回栏。

## 2026-11-08 点格自动作业（实施目标）

本轮为交互与动作状态开发：点选格子后沿当前行／列自动作业，操作栏改为“停止作业”；退出种地真实走回停驻车辆，抵达后倒计时登乘。参考本任务既有正式昼夜截图，保留牛、猫正面连续帧、固定脚底、工具尺寸、独立挽具与刀头，以及森林绿／奶油黄手机按钮。无结构或位图变体，无新增贴图、Canvas缓存；程序只控制路线、预览、起停与事务。真实碰撞、田块保护、保存失败及满载确认继续有效。验收将覆盖点按松手继续、行列、摇杆接管、暂停、返车、320／390手机与桌面既有竖版容器昼夜。

### 本轮验收结果

本次动态交互结论：通过。旧版“按住／松手”手机操作由点格启动与停止按钮替代，内部手动驱动接口保留兼容。耕牛从所选格沿当前行列和朝向开垦，遇连续可耕地边界停止，已有田与作物不覆盖；收割器点空田、未熟田或成熟田均可选中所在行列，从较近田头逐格处理，只结算成熟作物。暂停冻结计划，迎敌保留计划并在解除警戒后重寻路径，摇杆或停止按钮可接管。超载仍沿用单格确认，确认后需重新点格安排后续收割。

退出种地改为实际走回原车门前；走回阶段不计上车时间，抵达后正式候停一秒再上车。原车耐久、弹药与装填进度保持，手动输入取消返车，路线受阻停止并提示。登乘镜头使用独立世界锚点缓动，兼容渲染插值、减少动态及上车后立即驾驶，实测登乘帧镜头位移约1.55世界单位，未出现原先约50单位的跳切。

- 针对性单元检查：`farm-auto-work.test.mjs`6项、`farm-dismount.test.mjs`9项、`ox-plow.test.mjs`9项、`row-reaper.test.mjs`4项、`ox-idle-return.test.mjs`4项和`camera-safety.test.mjs`7项通过，共39项；未运行全量测试。
- `farm-auto-combat.test.mjs`另有6项原有失败（其余18项通过）；将本轮迎敌分支及收割停止行为替换为改动前逻辑后，同样6项复现，见[基线记录](../../output/farm-auto-combat-baseline.txt)。不以这些旧失败宣称全库测试通过。
- 正式4175手机触控测试为[浏览器脚本](../../tests/farm-auto-work-browser.cjs)，真实点格松手、横纵行选择、暂停恢复、停止、退出及一秒候停均通过；[交互报告](../../output/playwright/farm-auto-work/report.json)、[最终返车镜头报告](../../output/playwright/farm-auto-work/return-report.json)的页面异常为0。录制见`output/playwright/farm-auto-work/page@3a69d49d96e1fd9781d70251bf98f5af.webm`（完整交互）、`page@4b71031a9fb83eaa53cb8b69bc3113f5.webm`（最终返车）。
- 工作台通过`inspectFarmAutoWork`直接采样正式队列与绘制状态：[连续帧数据](../../output/playwright/farm-auto-work/motion-report.json)。六帧中牛蹄沿世界位置移动约96单位，步态相位1.87→17.29；推镰行程13.04→120.55，待办3→1。已复核`motion-ox-0.png`至`motion-ox-5.png`和`motion-reaper-0.png`至`motion-reaper-5.png`，脚底、挽具、骑姿与独立刀头保持，逐格结算不靠瞬移。
- 实际查看[390白天角色／怪物／载具／田地／UI同屏](../../output/playwright/farm-auto-work/together-reaper-390-day.png)、[320短屏牛犁夜间](../../output/playwright/farm-auto-work/together-ox-320-night.png)、[既有竖版容器夜间](../../output/playwright/farm-auto-work/together-reaper-1280-night.png)及同目录各尺寸昼夜对照。按钮至少44px、中文未溢出、遮挡与脚底层级沿用原绘制器；手机测试为浏览器触控模拟，未声称实体手机验收。
- 通行使用正式地形、树干、建筑与停车碰撞；路径受阻、地图变化、保存失败、已有作物保护由专项验证。原角色和动物连续帧、固定锚点、大小、分层及独立操枪保持；本轮没有图片生成或PNG替换，新增位图、解码内存和离屏Canvas预算均为0。寻路仅保留当前一格分帧搜索，完成、停止及接管后释放。

正式入口：`src/core/farming/farm.js#queueAdvancedFarm`、`src/core/farming/row-reaper.js#driveReaper`、`src/ui/ox-plow.js`、`src/rendering/ox-plow.js#drawOxPlow`、`src/rendering/farm-tools.js#drawFarmTool`、`src/core/navigation/scene-approach.js#approachParkedVehicle`、`src/rendering/camera.js#CombatCamera.update`。`visual-contract.json`绑定`designCriterion: farm-auto-work`，原`ox-plow-row`与`row-reaper-harvest`采样增加自动计划状态。PNG精修不在本轮范围；没有待修订的本次交互或视觉问题。
