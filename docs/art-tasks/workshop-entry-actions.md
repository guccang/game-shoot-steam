# 工坊升级入口与站立候门验收

沿用[美术任务单](../art-generation-brief.md)结构；本次复用已有按钮和倒计时绘制器，不生成或修改图集、插画、角色和建筑资源。

## 1 目标与范围

资源标识：`workshop-standing-entry`。武器和载具工坊附近各保留一个升级按钮；小屋、武器工坊、载具工坊下车后在门口站定三秒进入。升级页不会使角色进入室内。参考 `src/styles/ui-foundation.css`、`src/rendering/action-countdown.js`，保留森林绿与奶油配色、正式人物动作、建筑、碰撞、室内陈列、出口倒计时出门和点击休息。范围仅为营地交互提示。

## 2 造型与空间

升级按钮使用现有上下两行结构，标题为升级武器或升级载具，副标题为打开升级界面；仅文案随工坊变化，不新增轮廓变体。升级按钮锚定建筑屋顶上方，倒计时在角色头顶，门前主线气泡让位。地面衔接、邻接组合、建筑光向不变，不适用新建地形与剪影设计。

## 3 技术交付

按钮沿用最大宽200px和至少44px触控；倒计时68×34逻辑像素，DPR跟随正式画布，锚点为耳尖上方留白。按钮属于DOM层，徽记属于最终Canvas屏幕层；共用昼夜图形，不新增图片、昼夜副本或缓存。透明背景与碰撞不变，门口判定半径26世界单位，等待3秒，仅下车步行有效。源码为附近交互、房屋控制器与原倒计时绘制器；截图位于 `output/playwright/workshop-entry-actions/`。

## 4 动画任务补充

不生成动作帧、视频或身体资源，裁切缩放、操枪与独立部件均不适用。本轮只恢复原倒计时环，读取正式逻辑时间；移动、离开、驾驶取消，暂停不累计，出门后走离再靠近才重启。

## 5 制作指令

复用正式手机按钮及原候门徽记，仅修改触发状态和文案。取消点击入室按钮和小屋透明点击入室热点；停车完成不直接进屋或弹出工坊。不新增图像、字体、颜色或动画素材。

## 6 验收记录

| 目标 | 证据与结果 |
| --- | --- |
| 同系列可辨 | 两工坊升级标题与原按钮材质一致；`weapons-320-day.png`、`vehicle-390-night.png` |
| 昼夜可读与边界 | 320、360、390、430、844×390、1280×800，共24组；按钮≥44px，无页面溢出；建筑升级按钮与角色头顶徽记分离 |
| 真实通行 | 实际方向键从门前50单位走入候门范围，三栋建筑均在松开后进入；`weapons-countdown.png`、`vehicle-countdown.png`、`cottage-countdown.png` |
| 驾驶与暂停边界 | 驾驶门前等待超过3秒不进入，升级仍可打开；核心回归验证移动、暂停、未修复与战斗限制 |
| 页面与状态 | 点击升级、关闭、站立入室、出口候停出门均走正式控制器；升级不扣费、不移动角色 |
| 动作及资源预算 | 未修改身体、枪械、怪物、车辆资源，保留原绘制器；零新增位图与解码缓存 |

正式入口：`src/ui/nearby-interaction.js#createNearbyInteraction`、`src/core/cottage.js#updateCottage`、`src/rendering/player-action-countdown.js#drawPlayerActionCountdown`。

对应 `designCriterion`：`workshop-standing-entry`。专项脚本为 `tests/workshop-entry-actions.test.mjs` 和 `tests/workshop-entry-actions-browser.cjs`。最终截图替代本轮中途的双入口草案；结论：通过。

## 建筑锚点调整（2026-10-27）

升级按钮改为各自建筑的世界坐标投影，采用最近地图镜像。只有镜头变化会改变其屏幕位置，不读取角色坐标定位；屋顶靠近上沿时在资源栏、任务栏下方保留安全区。图形、颜色、触控尺寸不变。专项脚本 `tests/workshop-building-anchor-browser.cjs` 检查两建筑24组昼夜尺寸样本及左右走位后的建筑中心对齐；截图位于 `output/playwright/workshop-building-anchor/`。沿用 `workshop-standing-entry` 合同及正式附近按钮绘制入口。

## 一秒出门（2026-10-27）

小屋与两工坊出口统一候停1秒自动离开，沿用原头顶退出图标、数字与进度环，移开归零，暂停不累计；室内出生点位于范围外。移除固定出门按钮和附近点击出门提示，底部说明改为出口等待1秒、移开取消。无新增美术素材、图集、缓存和碰撞。专项核心测试 `tests/room-exit-countdown.test.mjs`，真实按键与昼夜截图 `tests/cottage-exit-browser.cjs`；证据目录 `output/playwright/room-exit-countdown/`。
验收结果：6项核心边界、3项原有针对性回归通过；三栋建筑真实按键进出、移开取消及18组昼夜尺寸截图通过，无页面错误。结论：通过。
