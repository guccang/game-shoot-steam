# 矿车方向与拆除 · 美术生成任务单
依据：[美术标准](../art-generation-standard.md)、[项目合同](../../AGENTS.md)。

## 1 目标与范围
稳定标识 mine-cart-controls-removal。动态交互开发：停车页增加中心摇杆、四向按钮及键盘选向；折叠工具新增拆除回收确认页。参考用户停车页截图、现有统一手机底板。目标：方向与地图北朝上一致，松手提交但保持停车，确认后回收指定对象。保留猫真实连续帧、矿车车轮、独立武器与场景绘制。本轮采用 HTML/CSS 程序交互，无需生成新位图，暂无 PNG 精修项。

## 2 造型与空间
北上南下、西左东右，中心圆形摇杆，与方形方向按钮区分；选中深绿、禁用沿用框架。标题、正文、底部操作统一层次。场景地面、光向、碰撞与通行形状不变；弹窗暂停游戏，不占用世界空间。

## 3 技术交付
紧凑底板最大360px；摇杆72×72px，中心锚点，移动拇指独立层；方向触控不小于44px。手机320/390宽及短屏、既有竖版容器使用同一布局。事件、输入死区、选中和存档由程序控制。无新增图片、画布及位图缓存，透明背景及图集不适用。昼夜沿用同一纸页与既有背景转换。入口 src/ui/mine-cart-directions.js、src/ui/mine-demolition.js、src/styles/mining.css；素材仍使用正式资源，缺失应失败。

## 4 动画任务补充
摇杆拇指随 pointermove 即时偏移，松手/取消回中，无独立循环时钟。原角色身体、车轮与操枪保持既有来源及锚点；本轮不生成或修改动作序列。暂停时不推进场景，关闭后恢复原状态。

## 5 生成指令
无 imagegen 请求：本轮为既有原生 UI 控件及触摸输入，不新增插画。参考与程序入口见前述部分。

## 6 验收记录
| 设计目标 | 实际证据与结论 |
| --- | --- |
| 系列一致、方向可辨 | direction-day.png、direction-night.png、junction-direction.png：森林绿/奶油底板；北上南下，当前方向深绿，无轨出口禁用。人工查看通过。 |
| 落地、遮挡与活动空间 | world-day.png、world-night.png：原猫与矿车位于正式轨道，场景布局未改；拆除保留桥梁与通道。未新增世界几何，绕行模型不适用。 |
| 动作和独立部件 | 浏览器实际开车前进、中途停车和摇杆掉头，坐标不跳变；猫身体/车轮/手持武器绘制器未改。连续记录见 video/。不新增身体序列，故无需重做帧素材验收。 |
| 交互、暂停与恢复 | 场景摇杆、方向页摇杆、按钮、方向键/WASD；长按不重复保存；松手中立、触摸取消不提交；路口键盘与恢复自动；弹窗暂停，选择仍停车；回收取消、确认、失败及切层失效均通过。 |
| 昼夜可读 | direction-day/night、world-day/night、removal-day、occupied-rail 均人工查看；场景在入口安全区，无主动怪物，怪物素材与战斗规则本轮不变。 |
| 手机及既有竖版容器 | 320×568、360×640、390×844、430×932、844×390和1280×900；共20组画面记录，无横向溢出，弹窗按钮≥44px。横屏短高度正文可滚动到第三项并提交，固定操作栏可用。未新增桌面布局。 |
| 资源和预算 | 无新增图片、Canvas和位图缓存；正式页面无 pageerror。透明边缘和图集检查不适用。 |
| PNG替换保留动态 | 不适用：本轮只实现原生UI与输入，不新增或替换位图。 |

正式入口：src/ui/mine-cart-directions.js#createMineCartDirections、src/ui/mine-demolition.js#createMineDemolition、src/rendering/mining.js（保留正式场景）。
验收接口：src/rendering/visual-review.js#inspectMineCartControls。
designCriterion：mine-cart-controls-removal，已登记 visual-contract.json。

针对性逻辑测试：tests/mine-cart-controls-removal.test.mjs 与 tests/mine-cart-directions.test.mjs，共18项通过。覆盖原价返还、防重复回收、占用轨段、路口清理、保存失败不变及层间隔离。
浏览器：tests/mine-cart-controls-removal-browser.cjs（17组画面）、tests/mine-cart-controls-edge-browser.cjs（3组画面），均无页面错误；未运行全量测试。默认4175已有服务，本轮隔离测试使用4187。

截图、录像及报告保存在主工作区 output/playwright/mine-cart-controls/；browser-result.txt、edge-result.txt 为对应执行记录。上述图片名均相对此目录。2026-11-03人工复核方向页昼夜、320短屏、回收页昼夜、横屏滚动及场景昼夜截图。
动态效果开发结论：通过。PNG精修替换结论：不适用。
本轮范围与结论：停车选向和设施回收已通过核心事务、实际触控/键盘和手机视觉验收；无待修订项。长期参考为上述方向页与回收页截图。
