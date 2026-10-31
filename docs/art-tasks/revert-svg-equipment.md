# 撤回 SVG 样板与装备来源审计

依据：[美术生成标准](../art-generation-standard.md)和[美术任务单](../art-generation-brief.md)。

## 1 目标与范围
撤回 ab9cd44、005227c 引入的 SVG 样板运行代码、资源、预览与验收记录，恢复此前苍隼和重坦程序绘制。保留后续设置、消防返站音效和首页健康提示。审计所有当前武器、车载主炮与五种载具的静态、动态及外部美术来源。

## 2 造型与空间
恢复已有单方向森林绘本造型、原坐标、描边、调色与分层；不新增变体或改造剪影。地面、阴影、场景邻接、碰撞和通路保持原版。

## 3 技术交付
移除本次新增 equipment-svg 目录与加载缓存；恢复 Canvas 基础图元，逻辑尺寸及锚点与样板前源码一致。车后层、驾驶员、车前层、枪械与特效分开。无需新的图片倍率、透明裁切或图集；不增加资源或缓存预算。审计文档保存于 docs/equipment-art-audit.md。

## 4 动作
恢复原枪栓、枪械后坐、逐片履带与悬挂路径；保留现有真实猫动作图集。无新视频制作，帧数与抽帧不适用；暂停和减少动态沿用原代码。

## 5 制作指令
精确撤回 SVG 样板提交，不重置整个仓库。制作方式审计以正式绘制器与实际资源引用为准，不从文件扩展名推断是否有人工美术参与。

## 6 验收记录
结论：通过本轮还原验收；未进行新的造型设计或性能基准评测。

| 项目 | 结果与证据 |
| --- | --- |
| 源码还原 | characters.js、equipment-parts.js、vehicle-models.js、renderer.js 与 ab9cd44^ 逐文件一致（规范化换行）；应用准备流程和视觉合同仅移除 SVG 接入 |
| 后续更新 | 保留设置布局、消防返站音效和首页健康提示；旧四方向试验未合并 |
| 针对性测试 | recoil.test.mjs 与 tank-recoil.test.mjs 共 10 项通过；workshop-components.test.mjs 按名称筛选部件叠加、升级状态保留、车速与炮塔 3 项通过 |
| 正式运行检查 | [浏览器结果](../art-reference/revert-svg/browser-result.json)：猫图集 ready，枪栓、履带、悬挂、升级外形差异及暂停全部通过；控制台无 error/warn |
| 昼夜同屏 | [320白昼](../art-reference/revert-svg/field-320-day.png)、[320夜晚](../art-reference/revert-svg/field-320-night.png)、[390白昼](../art-reference/revert-svg/field-390-day.png)、[390夜晚](../art-reference/revert-svg/field-390-night.png)、[桌面白昼](../art-reference/revert-svg/field-1280-day.png)、[桌面夜晚](../art-reference/revert-svg/field-1280-night.png)：车、猫、敌人、地形及 UI 同屏，未见新增比例/层级错位；宽度在正式页面 iframe 中模拟，非物理手机 |
| 苍隼与组装 | [白昼](../art-reference/revert-svg/sniper-320-day.png)、[夜晚](../art-reference/revert-svg/sniper-320-night.png)、[机匣试装](../art-reference/revert-svg/gun-assembly-320.png)：真实场景试射正常，部件可独立拆出并显示前后等级；未重复全套施工验收，部件源码已精确恢复且相关状态测试通过 |
| 动作真实性 | [连续射击帧](../art-reference/revert-svg/continuous-fire.png)由正式 createWorkshopTrial/drawWorkshopTrial 连续推进采样；[驾驶记录](../art-reference/revert-svg/drive-result.json)经过真实更新与碰撞，四段行驶后相位约 48，履带、悬挂分别绘制 |
| 遮挡与通行 | 沿用原前后车体与驾驶员分层，尺寸/碰撞未更改；试验场实际移动和同屏遮挡无新增问题，未扩大为全地图巡检 |
| 预算与缺失资源 | 删除 SVG 样板及加载缓存，无新增运行图集；src/assets/index/visual-contract 已无该样板引用；无性能提升数值声明 |
| 正式入口 | src/rendering/characters.js#drawWeapon、vehicle-models.js#drawHeavyRear/#drawHeavyFront、equipment-parts.js#drawEquipmentPart；visual-review.js 保留正式采样路径 |
| designCriterion 对应 | tank-recoil：炮管急退复进、悬挂受力、履带贴地、炮口同源；workshop-components-weapons-8-rate：局部替换、等级结构可辨、正式绘制器同源；vehicle-tracks 为既有采样入口，履带目标同时由 tank-recoil 覆盖 |

[完整来源与后续优化分工](../equipment-art-audit.md)。本次工作依仓库规则独立 worktree 完成，整合主分支后清理工作树。

整合补记：主分支并行完成消防交接停车库功能（e4ec4ea）；已保留其全部修改。renderer.js 精确恢复比对记录针对整合前版本，最终版本在该基础上保留新停车库分层；相对 e4ec4ea 的运行源码差异仅为撤回 SVG 接入。视觉合同冲突仅移除 svgEquipmentCriterion，保留 fireGarageCriterion。
