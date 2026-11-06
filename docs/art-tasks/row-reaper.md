# 单行推镰

依据[美术生成标准](../art-generation-standard.md)与[项目合同](../../AGENTS.md)。本轮制作常备农具 row-reaper 的可玩版本。

## 造型与交互目标

参照正式镰刀的钢色、锄头木柄及牛犁预览。玩家推动约 48×32 世界单位的双侧导轮割台，猫爪握柄，轮毂与锯齿刀片由实际行进距离驱动。刃口在玩家身前，预览指示同一行的田块。松手抬刀停走，摇杆可换行。目标与田块的脚底、取景和昼夜合成沿用现有世界坐标。

## 技术交付

菜单图标与场景农具共用 Canvas 2D 主体。车轮、割刀、木架分别绘制，地面预览位于作物下方。猫继续使用原正面连续帧。无新视频、位图、纹理或离屏缓存，无需生图及 PNG 替换。真实通行沿用玩家移动碰撞，不能穿越障碍远距收割。设计目标为 row-reaper-harvest。

## 本轮验收结果

- 正式绘制入口为 `src/rendering/farm-tools.js#drawFarmTool` 和 `src/rendering/farm.js` 的田块预览。连续动作按实际位移驱动，可通过 `src/rendering/visual-review.js#inspectRowReaper` 读取作业状态，对应 `designCriterion: row-reaper-harvest`。
- 在 4175 端口运行游戏，经种地菜单拿起推镰，以浏览器触屏事件完成掉头、按住收割、松手、再次按住、到行尾自动停和收起。收割期间实际移动超过 80 个世界单位。短屏底栏三个按钮可见，收割按钮触控高度至少 44px。
- 已检查[手机白天](../../output/playwright/row-reaper/field-390-day.png)、[短屏夜间](../../output/playwright/row-reaper/field-320-night.png)、[宽视口白天](../../output/playwright/row-reaper/field-1280-day.png)及[宽视口夜间](../../output/playwright/row-reaper/field-1280-night.png)。轮架接在猫爪前，奶油色描边区分当前行与邻行，底栏未遮挡田地。宽视口沿用手机画框。
- `tests/row-reaper.test.mjs` 验证偏移对齐、双向移动、只收成熟作物、松手制动、碰撞、保存失败和满载确认。`tests/row-reaper-browser.cjs` 验证实际操作入口。相关牛犁及收获负重回归通过。
- 本轮结果：动态交互阶段通过。复用农具图标画布，新增一枚同规格小图标，新增分发位图、图集与视频均为零。此任务以手推割台为主体，怪物攻击、载具旋翼及视频源交付不适用。
