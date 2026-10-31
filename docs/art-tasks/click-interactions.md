# 森林巡游美术生成任务单

本任务由美术任务单复制填写，执行依据为[游戏美术资源生成标准](../art-generation-standard.md)和[手机 UI 框架](../ui-foundation.md)。制作前已确定下列范围、尺寸与保留项。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 附近点击交互 / nearby-click-interaction |
| 类别和用途 | UI 场景交互按钮 |
| 本轮目标 | 靠近显示具体操作，停留不自动执行 |
| 数量和变体 | 单个按钮按附近对象切换文案 |
| 保留项 | 原猫动作、武器、载具入库动画、场景比例与碰撞 |
| 制作路线 | 现有 DOM 与统一 ui-button 样式 |
| 参考与同类资产 | src/ui/camp-home.js；src/styles/ui-foundation.css |
| 使用场景 | 森林建筑、室内展品、床边、停车及消防返站 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影 | 短文字按钮 |
| 与其他变体的区别 | 不新增美术变体；文案区分动作 |
| 主次关系 | 场景为主，附近提示为辅 |
| 地面衔接 | 不适用：DOM 提示不改地面 |
| 活动空间 | 建筑入口与停车路线保持原碰撞 |
| 邻接组合 | 原营地、小屋与工坊 |
| 光向与明暗 | 共用 UI 配色；场景沿用昼夜绘制 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸 | 最大宽 200 CSS 像素，最小高 44 CSS 像素 |
| 像素尺寸与倍率 | DOM 自适应，不新增位图 |
| 锚点与原点 | 常规视窗投影至人物头顶，短横屏放在人物下方空位；夹取在视窗内 |
| 分层 | 场景上方 UI 层 |
| 透明背景 | 不适用：现有按钮材质 |
| 碰撞与可通行性 | 不增加世界碰撞 |
| 昼夜处理 | 复用 ui-button--primary 的森林绿底、奶油文字与统一描边 |
| 文件格式与位置 | src/ui/nearby-interaction.js；截图 output/playwright/click-*.png |
| 内存与缓存预算 | 1 个持久按钮；无图集与解码增量 |

## 4 动画任务补充

本轮不生产动画、视频源片或图集，帧率、裁切与源视频条目不适用。保留真实猫身体、手持武器、载具轮相和消防出入库动作。改变的是动作的发起条件：明确点击后才开始，普通倒车仍能被方向输入和近身危险中止。

## 5 制作指令

沿用正式 DOM、Canvas 及手机 UI 按钮材质，只创建一个附近操作按钮，按当前最近对象显示具体动作。按钮不参与世界碰撞，不增加地面或建筑素材。移除建筑、小屋进出、床边休息、展品、普通停车及消防返站的停留计时触发；开场既定的一秒等待、战斗冷却和奖励收据计时不属于场景交互，保持原规则。

点击时重新计算距离、场景与目标，弹窗、暂停和睡眠中不执行。关闭后可原地再次点击，不需要走开重置。

## 6 验收记录

| 设计目标 | 证据 | 实际结果 |
| --- | --- | --- |
| 系列一致、操作可辨 | [床边](../art-reference/click-bed-mobile.png)、[展品](../art-reference/click-display-mobile.png) | 同一森林绿按钮区分进入、查看、休息和入库，使用正式 UI 材质 |
| 落地与遮挡 | [短横屏](../art-reference/click-touch-landscape.png) | 初版横屏头顶提示挤压人物，已改至人物下方空位；正式角色和建筑层级保持 |
| 活动空间与边界 | workshop-interiors、parking 核心测试；触屏与键盘室内移动 | 家具、停车路线和过道未改；单指拖动实际移动约 67 世界单位，按钮未抢占拖动 |
| 动作连续与独立部件 | output/playwright/click-parking-live.webm；普通停车全泊位和消防正式驾驶测试 | 原速等待 3.6 秒不执行，点击后连续倒车下车；消防返站明确点击后连续交接，无重复奖励 |
| 白天夜晚可读 | [320 白天](../art-reference/click-320-day.png)、[390 夜晚](../art-reference/click-390-night.png)、[消防场景](../art-reference/click-fire-mobile.png)、[停车场景](../art-reference/click-parking-mobile.png) | 正式场景与按钮同屏，昼夜均清楚；动物与载具绘制器未替换 |
| 手机与电脑操作 | 320×568、390×844、844×390、1280×900 视窗；独立 hasTouch 浏览器 | 按钮实测高 44px，无横向或屏外溢出；鼠标、键盘确认与真实 touch 事件均可用；未做物理手机安装包验收 |
| 资源完整与预算 | 浏览器无页面异常，1 个持久 DOM 节点 | 未新增运行时位图、图集、视频或解码缓存；按钮不逐帧重建 |

正式绘制器入口：src/ui/nearby-interaction.js:createNearbyInteraction 与原 Renderer.draw；室内、消防、停车均使用正式场景。  
验收入口：src/rendering/visual-review.js:inspectNearbyInteraction。  
designCriterion：nearby-click-interaction，登记于 visual-contract.json#nearbyClickInteractionCriterion。  
结论：通过本任务范围内的浏览器交互及视觉验收。  
修订记录：放行室内 HUD 隐藏规则中的附近按钮；短横屏按钮改放人物下方。  
长期参考图：上表中 docs/art-reference/click-*.png。

## 7 针对性检查

- 核心测试共 54 项通过：building-entry、camp-home、exhibit-countdown-bridge、parking、fire-rescue、fire-transit、workshop-interiors。只运行相关文件，未运行全量测试。
- 旧小屋测试仍假定上一版推车开场，已更新为当前九秒接送期间不被普通停车接管的断言。
- tests/click-interactions-browser.cjs：实际等待、鼠标点击入屋、键盘走到床边、休息原地重开、清缴／告示／消防站／营门入口点击。
- tests/click-interactions-visual-browser.cjs：正式工坊移动至展品、点击普通停车、消防返站及昼夜截图。消防使用站前起始夹具；完整出警驾驶由核心消防测试覆盖。
- tests/click-interactions-fire-visual-browser.cjs、tests/click-interactions-screens-browser.cjs：分段恢复验收入口。
- tests/click-interactions-touch-browser.cjs：独立触屏浏览器、真实 touch 点击与单指拖动，页面异常为零。
- tests/click-interactions-parking-live-browser.cjs：原速停车录像与明确点击后下车。

运行证据放在 output/playwright/click-*，长期截图已复制到本任务引用的 docs/art-reference。未修改位图资产，故生成服务、视频抠像和图集边界专项不适用。
