# 七位猫伙伴的专属围巾

依据[制作标准](../art-generation-standard.md)及[项目合同](../../AGENTS.md)。当前阶段为连续帧上的布料、色样和织纹实现。

| 项目 | 制作目标 |
| --- | --- |
| 参考与范围 | 七位可出战角色，沿用两张 assets/cat-front 正面视频图集、栗子的片头围巾轮廓及品种头型。猫窝、剧情、战场与乘车共用角色身份。 |
| 造型与识别 | 栗子保留草绿色长巾，薄荷用湖青细巾，银豆用砖红格纹，摩卡用靛紫斜纹，雪团用莓粉绣花，墨墨用蜂蜜金菱纹，蓝哨用海军蓝和金杠。纹样在胸前可辨认。 |
| 尺寸与锚点 | 围领约 50×20 源像素，随每个 160×160 身体帧的颈线定位。布尾向侧后垂落，宽窄长短随款式变化。 |
| 分层与动态 | 布尾在身体后，领巾贴在上胸，脸和独立持枪层在前；制服保留肩线及警徽。车速、步态、暂停和减少动态沿用真实动作时钟。 |
| 材质与实现 | 双层平涂布料，深色收边，暖色点缀。直接复用 Canvas 与现有视频轮廓曲线，不生成新位图。装饰不参与碰撞或地形通行。 |
| 验收目标 | 正式绘制器 hero-breed-0 至 hero-breed-6，全员并排对照；手机与桌面竖版容器昼夜、按住移动与松手、武器前后遮挡。 |

## 验收记录

- [七位角色同倍率对照](../../output/playwright/hero-scarves/seven-cats.png)来自正式角色绘制器。栗子的叶纹、薄荷的水纹、银豆的格纹、摩卡的斜条、雪团的小花、墨墨的菱纹与蓝哨的双杠均可分辨。薄荷的领巾按圆脸下缘下移了六个源像素。蓝哨的胸章露在领尖外侧。
- 实际浏览器在 4175 端口完成[手机白天](../../output/playwright/hero-scarves/field-390-day.png)、[短屏夜间](../../output/playwright/hero-scarves/field-320-night.png)、[桌面竖版白天](../../output/playwright/hero-scarves/field-950-day.png)与[桌面竖版夜间](../../output/playwright/hero-scarves/field-950-night.png)检查。角色与怪物、车体、林地和 HUD 同屏；枪与前爪在领巾前。地面边界和触控区未参与此次改动。
- [摇杆行走图](../../output/playwright/hero-scarves/walking.png)来自单指按下并拖动。运行采样测得抬升超过 0.6，松手后回落到 0.1 以下。身体使用原清单两张 160 像素单帧图集，共用缓存上限 48 帧。本轮新增分发位图与解码图集均为零。
- 正式入口为 src/rendering/cat-animation.js 的 CatSpriteAtlas.draw、src/rendering/cat-scarves.js 的 drawScarfBib 和 src/rendering/title-scarf.js 的 drawTitleScarf。工作台使用 renderVisualCase 的七个 hero-breed 案例，对应 visual-contract.json 的 heroScarvesCriterion。验收脚本为 tests/hero-scarves-browser.cjs。
- 结论：七款围巾的动态效果开发通过。八项猫动作检查通过，含移动起停、乘车、暂停、减少动态与独立枪口。附带角色与警车回归中，另有四项交易/旧经济配置用例失败，分别涉及手动升级、警猫购买、警车升级及八车价格迁移。本轮没有交付新的 PNG 运行图集；截图用于验收。
