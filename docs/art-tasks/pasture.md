# 牛羊牧栏与田边召唤

依据[美术生成标准](../art-generation-standard.md)。沿用成年耕牛和现有脚底比例，羊以卷毛、短尾和深色小蹄区别；牧栏约 260×104 世界单位，正面留门，栅栏前后按深度排序。正式 Canvas、存档与移动时钟控制进场和驻留；不增加位图。设计目标 pasture-herding。

## 定稿与验收

- 退回首轮侧身、毛发写实的方案。最终将 [猫猫原始参考](../../assets/cat-front/source/cat-0-reference.png) 直接传给 ImageGen，以同一画法生成正面两只动物。耕牛用奶油色双角、宽鼻区分，绵羊用云形羊毛和垂耳区分；两者采用猫猫的棕色轮廓、椭圆眼、桃色面颊和草绿色领巾。
- 首帧生视频采用 Seedance 2.5。原始生成图、蓝幕首帧、两段 10 秒原片及请求和回执位于 source/pasture，最终版本以 front-v2 标记。真实 24 FPS 原片按 12 FPS 连续采样，同一只动物共用一个固定变换和脚底锚点 (96,152)。运行包使用 assets/pasture/manifest.json 和两张透明 WebP 图集，无视频和源记录。解码尺寸每格 192×160。工具为 scripts/extract-pasture-frames.py。
- 帧数（动物、待机、迈步、图集总帧、文件字节）：[["ox",24,19,43,177198],["sheep",24,14,38,157720]]。共用一张图集处理昼夜和全部走向。动画切换采用最近姿态索引。转弯、牵行和召唤使用同一正面迈步，掉头时脚底沿半圆连续行走，木架、犁铧和猫保持独立。源码入口为 src/rendering/livestock-atlas.js 的 drawLivestock。
- 牧栏领养一牛一羊、栏门附近喂食、牵牛出门、田边手机召唤、按住开田、松手、停车、再次牵牛及中间掉头姿态，使用正式手机触控路径验证。猫安全站位、耕牛与犁头的通行检测分别核验。预览和正式开垦沿最近 300 世界单位内同图田块对齐，横距 56、行距 52。测试只针对牛犁、农田依赖和本次新增交互。未使用实体手机。
- 正式画面：[牧栏白天](../../output/playwright/ox-plow/pasture.png)、[牧栏夜间](../../output/playwright/ox-plow/pasture-night.png)、[掉头途中](../../output/playwright/ox-plow/front-turn.png)、[320 宽夜间](../../output/playwright/ox-plow/farm-320-night.png)、[桌面竖版](../../output/playwright/ox-plow/farm-1280-day.png)。上述两张运行图集作为本轮最终资产，验收目标 pasture-herding 和 ox-plow-row 通过。

## 野外驯牛扩展

目标为在牧栏东南草地找到甜穗草与野牛。沿用正面牛图集及固定蹄底、待机时钟，野牛无挽具。草丛约 48×38 世界单位，以根部为原点，三支奶黄色穗头和长叶区别于普通草皮。野牛和草各按脚底排序，不加碰撞；小背包图标采用相同穗形。沿用昼夜合成，无新增位图、离屏画布或视频。制作后从手机采草、读说明、喂牛到牧栏验证，并复核昼夜遮挡与触控。

### 野外驯牛验收

- 正式绘制入口为 `src/rendering/pasture.js` 的 `drawPasture` 和 `drawSweetGrass`，牛沿用正面待机连续帧，蹄底按世界纵坐标与猫、树、田地排序。草和牛均可绕行；选址跳过道路、水面、建筑、树干、既有田块和生产设施。整组最多两个排序对象，共享原牛图集，无新增纹理和解码预算。
- [390 宽白天](../../output/playwright/wild-pasture/meadow-390-day.png)、[320 宽夜间](../../output/playwright/wild-pasture/meadow-320-night.png)、[桌面竖版白天](../../output/playwright/wild-pasture/meadow-1280-day.png)、[桌面竖版夜间](../../output/playwright/wild-pasture/meadow-1280-night.png)复核了穗色、牛蹄、地形、前景及按钮。使用浏览器手机触控模拟；未使用实体手机。
- `tests/wild-pasture-browser.cjs` 验证空手提示、采集、喂牛、回牧栏登记、点牛牵犁；`tests/wild-pasture.test.mjs` 覆盖对白、读档、失败重试、重复点击和满载拦截。`visual-contract.json` 的 `wild-ox-forage` 对应 `inspectWildPasture`。本次野外发现与互动验收通过，复用的动物图集无替换项。

## 种地工具栏召牛

动态实现目标为点击牛头图标后，已领养的耕牛从画面边缘步行进场，到玩家身旁停下供牵引。参照牧栏成年牛的奶油色双角、棕色口鼻和农具栏的图文按钮，用 32 × 32 内联矢量图显示牛头，触区至少 44 像素。牛体保留既有比例、蹄底锚点、动作时钟、地形碰撞与昼夜场景分层。以 pasture-herding 为验收目标，检查手机触控及既有桌面竖版容器里的入口、步行与停靠。

本轮通过。正式入口为 createFarmPanel 中的 farm-summon-ox，牛体由 drawOxPlow 与 drawLivestock 绘制，沿用 pasture-herding。浏览器触控验证了手机旧入口移除、点击牛头、途中禁止重复召唤、到达后点牛身牵犁。实测从屏外走入画面，以每秒 68 世界单位行走，停在离猫 48 世界单位处。图标为透明内联 SVG，新增位图和图集缓存为零。

[步行入场](../../output/playwright/farm-ox-call/walking.png)、[390 宽白天](../../output/playwright/farm-ox-call/390-day.png)、[320 宽夜晚](../../output/playwright/farm-ox-call/320-night.png)、[桌面白天](../../output/playwright/farm-ox-call/1280-day.png)与[桌面夜晚](../../output/playwright/farm-ox-call/1280-night.png)均在正式场景取样。窄屏显示两行工具，入口与右下菜单分开。手机采用触控模拟。
