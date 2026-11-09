# 守护女神：林间自由布防

复用主场景的随机干地区域、森林地形与跟随镜头。女神位于区域中央，周围有八个编号固定的预设方格。玩家可在准备阶段和波间移动布防；格位附近清出树木，会遮挡格位的房屋、帐篷等装饰仅在本局显示层隐藏，退出后原森林保持完整。

点击“建造”选择已拥有的武器或载具，再点空方格部署；也可先点空格再选武器。载具可选择已拥有的普通武器，浮游炮和无人机继续独立运行。成功放置后立即关闭大面板，只保留秘境币、女神生命及开波入口。再次点击已有格位，可查看等级、升级或回收；关闭详情不会重新弹出目录。触摸拖动不会误建，原生下拉框保留键盘选择。

怪物与每五波出现的领主从外围随机空地进攻中央女神，不再按固定道路或单一入口行军。刷新检查玩家距离、已有敌人和整段通道的树干碰撞；暂时没有安全落点就等待重试，不消耗波次名额。普通攻击、减速、击退、飞行和领主技能继续使用正式战斗状态机。

## 局内经济

- 开局 160 秘境币，武器部署 60，载具部署 100。
- 普通击杀获得 12，精英 25，领主 100；同一敌人只结算一次。
- 部署从 1 级开始，最高 10 级；每级增加 22% 基础伤害，升级消耗当前等级 × 40。
- 准备及波间可建造、升级和回收，回收返还全部局内投入；战斗期间可查看，不能调整。
- 波间保留修复女神、治疗和强化火力三选一，选择后开始下一波。
- 战中刷新回到当前波开始时的生命、秘境币和布防，波间刷新保留已结算收益。原存档按稳定格位编号保留装备和等级。
- 秘境币、部署和部署等级离开后清空，不写入永久装备等级；逐波森林材料奖励继续保留。

## 实现分层

数值及格位：`src/config/guardian.js`；随机入场：`src/core/battle/guardian-spawns.js`；选区和树木清理：`src/core/realms/realm-region.js`；部署事务及火力：`src/core/battle/guardian-defense.js`；建造栏：`src/ui/panels/guardian.js`；地面点击、镜头投影和收起状态：`src/ui/guardian-build.js`；正式绘制：`src/rendering/guardian.js`。

`visual-contract.json` 与 `src/rendering/visual-review.js` 使用 `guardian-field-day/night` 案例，调用正式绘制器采样。角色视频帧、武器弹道、载具旋翼与履带、浮游炮及无人机动作不变。

## 2026-10-21 验收

| designCriterion | 设计目标与验证 | 证据 |
| --- | --- | --- |
| guardian-panel-dismiss | 武器、载具、触摸部署后面板收起；再次点击、关闭详情、升级与回收正常；没有重复扣币。 | `tests/guardian-browser.cjs`、`tests/guardian-layout-browser.cjs` |
| guardian-random-arrival | 随机位置覆盖多个方向，所有候选选区均有普通怪和领主安全落点；封闭场景等待重试。 | `tests/guardian.test.mjs` |
| guardian-field-layout | 主场景森林中央女神与八格布防，无固定入侵道路；装饰不覆盖格位。 | `output/playwright/guardian/all-desktop-day.png` |
| guardian-ui-economy | 新手点击完成两类部署、自然第一波、升级、回收重建、刷新和退出；永久等级不变。 | `tests/guardian-browser.cjs`、`output/playwright/guardian/interaction.log` |
| guardian-world-build-hit-targets | 1280×900、1280×720、390×844、360×640、320×568 镜头逐格移动后，八格中心与内侧四角可点、目标至少 44px；真实触摸与原生下拉键盘通过，紧凑状态条无溢出。 | `tests/guardian-layout-browser.cjs`、`output/playwright/guardian/layout.log` |
| guardian-day-night | 桌面与手机昼夜同屏检查正式角色、怪物、武器、载具、女神、森林和 UI。 | `tests/guardian-visual-browser.cjs`、`output/playwright/guardian/all-*-*.png` |
| guardian-defense-motion | 昼夜工作台各连续采样八帧，旋翼动作由正式绘制器推进。 | `output/playwright/guardian/visual.log` |

逻辑改动后全项目 `npm test`：464/464 通过。浏览器使用本地隔离端口 4187，默认新手流程与全装备展示夹具分别验收；展示夹具不作为自然关卡难度证明。

同步 master 的时空之塔自动换层后，全量测试 467/467 通过，180 个模块检查通过；守护女神完整交互流程再次通过，浏览器错误为空。三种秘境移动、镜头、刷新及昼夜回归已通过。
