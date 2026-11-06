# 双格水壶 · 开发任务单

依据[生成标准](../art-generation-standard.md)。目标是在农具页比较两格试验田，并在真实田地看到一次动作分流至两株作物。参照既有水壶与农田 HUD。保留猫、握点、水壶轮廓与动作时钟；两格横向中心间隔 56 世界单位。水滴以壶口为起点，末端各自落在作物中心。复用手机按钮与原水滴，无新纹理、地形、碰撞、图集或离线照料。PNG 精修和新角色动作不适用。

正式入口为 src/rendering/farm-water-tool.js 的 drawWatering，设计目标沿用 farm-water-stream。

## 验收结果

- 设计目标 `farm-water-stream`。试浇共用正式选格函数；正式排队、走近、落水、保存、湿土与生长反馈均使用游戏原入口。每次最多两个目标、每股最多八滴，减少动态时每股三滴。没有新增位图或派生画布。
- 手机触控模拟从农矿生产进入农具，切换两种水壶、点击左田比较、花费 4 矿石、回到农田一次浇湿两株。试验田不会写入农田存档。交互通过。
- 已检查 390×844 的试验页、320×568 夜间和 390×844 白天农田、1280×900 既有竖版容器昼夜。两个田块的湿土与“已浇灌 2 块田”反馈可辨。短屏内容可滚动。本轮未增加障碍物、怪物或车辆动作，相关通行与战斗数值不适用。
- [农具试验页](../../output/playwright/double-watering-can/tools-390.png)、[手机白天](../../output/playwright/double-watering-can/farm-390-day.png)、[手机夜晚](../../output/playwright/double-watering-can/farm-320-night.png)、[桌面昼](../../output/playwright/double-watering-can/farm-1280-day.png)、[桌面夜](../../output/playwright/double-watering-can/farm-1280-night.png)。测试入口为 tests/double-watering-can-browser.cjs。
- 旧档、扣料回滚、重复改造、邻格筛选与重复浇水已由针对性测试检查。范围内开发验收通过；未使用实体手机，4 矿石价格待游玩反馈。
