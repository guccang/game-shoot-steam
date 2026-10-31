# 故事战斗圈扩大与死亡冰冻圈清理

依据 [美术标准](../art-generation-standard.md) 与 [美术任务单](../art-generation-brief.md)。

## 1 目标与范围
- 标识：story-rings-death-cleanup；类别：已有地面战斗边界、怪物状态特效。
- 目标：故事普通圈半径220→330，Boss圈280→420（半径/直径扩大50%）；死亡怪物立即停止绘制冰冻白圈。
- 参考：用户两张实机截图；src/config/story.js、src/rendering/story-guidance.js、src/rendering/enemies.js。
- 保留：描边和配色、原碰撞/相机适配、怪物与载具真实动作、独立操枪、数值和奖励。
- 制作路线：配置与正式Canvas绘制逻辑修改，不生成位图；覆盖全部继承配置的故事。

## 2 造型与空间
- 轮廓：原双线圆环、刻度不变，只扩大世界半径。无新增变体，结构差异不适用。
- 地面：草地、沙地、树木、河岸仍用原地图，实际圆边界与绘制共用坐标。
- 角色和敌人都受新边界约束；出生点仍验证同岸可达、树干与玩家间距。
- 受冻白圈只在存活怪物身上显示；死亡爆裂与短暂残块继续保留。
- 光向、材质、邻接物均不变，昼夜仍由正式环境处理。

## 3 技术交付
- 逻辑直径：普通660、Boss840；像素尺寸随镜头变化，无独立图片倍率。
- 锚点：任务站点圆心、怪物脚底；边界在地面层，怪物状态随主体绘制。
- 背景透明，无新底板、纹理、图集、缓存或常驻内存。
- 碰撞继续读取同一个arena，天上/地面载具与怪物一致。
- 源文件见上，验收截图保存在docs/art-reference/story-rings-death-cleanup。

## 4 动画补充
- 不新增动画，源视频、裁切、帧数不适用；现有怪物死亡和受击动作不改。
- 只修正状态效果的绘制生命周期，不能删掉活怪冰冻反馈。

## 5 实施约束
沿用森林绘本风格、俯视比例、有限平涂；不改剧情步骤、战斗属性或奖励，不用移除整个死亡动画掩盖白圈问题。

## 6 验收记录
| 设计目标 | 实际验收（2026-10-23） | 结论 |
| --- | --- | --- |
| 同一画风、边界落地 | 仅改配置，保留双线与刻度；[桌面](../art-reference/story-rings-death-cleanup/ring-1280-day.png)、[390白天](../art-reference/story-rings-death-cleanup/ring-390-day.png) | 通过 |
| 实际空间扩大50% | 所有故事普通半径330、剧情Boss半径420；真实W键驾驶到圆心外288.07，超过原220；单位与碰撞共用arena | 通过 |
| 可通行与正常出怪 | 全部故事战斗站点在同岸圈内刷满6个名额；击退、飞行、清场、暂离与重试边界检查；第一章三套搭配和第六章机械核心用正式伤害完成守点 | 通过 |
| 白圈死亡即消失 | 正式冰晶命中后再致命命中，死亡残影0.6/0.35/0.08秒寿命各采普通/低动态模式，带chill与不带chill的Canvas像素差异均为0 | 通过 |
| 活怪反馈与死亡动画保留 | 活怪两种模式分别有4743/4827个通道值差异；0.5秒仍有死亡残影、0.7秒全部回收；[活怪冰冻](../art-reference/story-rings-death-cleanup/chilled-alive.png)、[死亡白圈消失](../art-reference/story-rings-death-cleanup/chilled-dead.png) | 通过 |
| 昼夜同屏和窄屏 | 1280×900、390×844、320×568各日夜实机采样，角色/怪物/坦克/场景/UI同屏，完整圆环可见，无横向溢出；[320夜间](../art-reference/story-rings-death-cleanup/ring-320-night.png) | 通过 |
| 预算与资源 | 无新运行图片/缓存，无页面异常；只保留验收PNG，主体动画、原资源和独立武器未改 | 通过 |

定向检查：story-battle-rings原8项、新增半径继承1项、story-guidance边界绘制1项，共10项通过；另运行tests/story-rings-death-browser.cjs进行正式绘制像素对比、生命周期、W键移动和昼夜采样。没有运行全量测试。
截图使用固定任务阶段和敌人位置夹具；死亡使用正式hit与updateEnemies，天然战斗守点由上述专项规则测试覆盖，未扩展到无关玩法。

正式入口：src/rendering/story-guidance.js#drawStoryGuidance、src/rendering/enemies.js#drawSlime、src/rendering/story-camera.js#storyBattleView。
designCriterion：visual-contract.json#storyRingCleanupCriterion；浏览器使用src/rendering/visual-review.js#inspectStoryBattleRing读取正式场景。
结论：通过。对白暂停时即使保留死亡残影，也不再有冰冻白圈；原死亡动作和数值奖励不变。
