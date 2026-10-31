# 营地休养血条

依据[美术标准](../art-generation-standard.md)、[任务模板](../art-generation-brief.md)和 [AGENTS.md](../../AGENTS.md)。

## 1 目标与范围

- 稳定标识：camp-healing-bar；类别：怪物头顶状态进度；阶段：程序动态效果开发。
- 目标：营地怪物回到驻地休养时，以绿色血条展示真实 HP 缓慢增加，满血或死亡隐藏；追击与返程保留战斗血条。
- 参考：正式 `src/rendering/enemies.js` 血条及 `campResidentHead` 预警锚点。所有八类营地兵种共用规则。
- 保留：怪物物种、名字、等级、预警、独立动作、攻击、返营及每秒3%回血规则。
- 路线：延伸既有 Canvas 血条，不生成图片；动态数值适合程序绘制，无需 PNG 精修。

## 2 造型与空间

- 小横条、森林绿底、柔和草绿填充，无额外文字或按钮；用绿色与原紫色战斗血条区分。
- 血条依兵种身高定位，放在预警标记上方，底部名字和等级保持原位。
- 纯状态覆盖，不改变营地、树木、建筑、通路、碰撞或落地影；无新增光源。

## 3 技术交付

- 休养血条36×6逻辑单位，盾卫42×6；脚底世界坐标向上 `campResidentHead + 10`，随正式镜头缩放。
- 正式入口：`src/rendering/enemies.js#drawSlime`，绘制数据：`enemyHealthBarView`；营地经 `renderer.js` 在实体绘制结束后调用 `drawEnemyHealthBar`，不被相邻盾卫或棚子遮住，也不重复绘制。
- 当前 HP / 最大 HP 为唯一进度来源，不另建计时动画；满血后无底框残留。
- 暂停与减少动态沿用正式 HP；图层透明，昼夜共用形体和场景处理。
- 新增运行位图、画布、缓存均为0；仅每个受伤怪物两次矩形绘制。
- 必需资源沿用原怪物图集；不新增资源加载或回退接口。

## 4 动画与交互

- 填充随模拟步进自然增长，暂停冻结，再次战斗恢复原战斗配色。
- 原脚步、翅膀、履带、操枪保持正式动作；本轮不生成序列帧或修改身体动画。
- 纯展示，无新增点击目标；通过真实游戏受伤、离屏返营、近距离观察验收。

## 5 生成指令

不调用 imagegen：本次为已有血条的状态、位置及进度绘制，不需要新增位图。

## 6 验收记录

- 通过：2项血条检查覆盖八类兵种与预警避让、真实比例、死亡/满血/NPC隐藏和战斗配色；4项回血逻辑检查与21项已有营地回归通过。分层修改后重新执行受影响的血条与营地检查，未跑全量测试。
- 通过：真实应用内五只20级居民受击后脱离追击、回到驻地，以正常帧时间从约43.8%恢复到约50.8%，随后推进正式模拟至满血，全部血条隐藏，浏览器无脚本错误。
- 通过：320×568、390×844、1280×900既有游戏容器的昼夜截图，无页面溢出；绿色填充和深色底在昼夜可辨，位于预警上方。320短屏底部既有玩家HUD仍可能盖住场景最下方居民，未扩改既有HUD。
- 证据：[白天](../art-reference/camp-healing-bar/healing-390-day.png)、[夜晚](../art-reference/camp-healing-bar/healing-390-night.png)、[短屏](../art-reference/camp-healing-bar/healing-320-night.png)、[桌面原布局](../art-reference/camp-healing-bar/healing-1280-day.png)、[恢复前](../art-reference/camp-healing-bar/progress-before.png)、[恢复后](../art-reference/camp-healing-bar/progress-after.png)、[满血隐藏](../art-reference/camp-healing-bar/full-health.png)、[实测记录](../art-reference/camp-healing-bar/browser-results.json)。
- 通行与遮挡：纯状态覆盖、不修改实体几何；营地血条在实体后绘制，避免相邻高个怪物遮住进度；身体动作、战斗及返营检查通过。无新增触控操作，无需增加按钮触控区。
- 正式案例：`visual-contract.json#campHealingBarCriterion`；程序动态效果验收通过，PNG替换不适用。沿用原4175服务，隔离工作树4189验收；使用真实浏览器模拟手机尺寸，未使用物理手机。
