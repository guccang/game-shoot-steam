# 武器与载具美术来源、静态和动态分工

审计日期：2026-10-23。范围：撤回 SVG 样板后的正式主线；未合并的四方向试验不在此清单内。

## 结论

当前 17 类武器、4 种车载原生武器、5 种载具的主体外形与机械部件均由 Canvas 程序绘制。猫猫身体使用外部真实视频连续帧图集，手、持枪、后坐和枪口继续独立绘制。这里区分的是运行时来源，不能从文件格式判断是否由美术人员设计。

上版 SVG 样板仅将苍隼和重坦原有 Canvas 图形导出为 SVG 部件，没有重新设计造型。已撤回资源、加载器和接入；单纯转换格式没有美术品质提升的保证。

## 当前来源清单

| 对象 | 静态外形来源 | 动态实现及正式入口 |
| --- | --- | --- |
| 松果手枪、萤火激光步枪、橡果散弹枪、星籽弹射枪、潮汐水枪、松雷榴弹枪、赤枫火焰喷射枪、苍隼狙击枪、雷霆重型脉冲枪、鸣雷电弧枪、霜枝冰晶枪 | 程序图元组合，未使用独立外部枪械图片 | [characters.js](../src/rendering/characters.js)；瞄准、枪栓、后坐、枪口反馈读取战斗状态 |
| 蜂群加特林 | 程序机匣和六根独立枪管 | [rotary-barrels.js](../src/rendering/rotary-barrels.js)：各管按旋转相位计算位置、深度排序和受热颜色；固定机匣与抱箍不随转子转动 |
| 松齿电锯 | 程序护罩、把手、链条 | [characters.js](../src/rendering/characters.js)：局部锯齿交错流动 |
| 星环浮游炮 | 控制器与炮体分别程序绘制 | [controller.js](../src/rendering/controller.js)、[funnel.js](../src/rendering/funnel.js)：控制器与外部炮体保持独立 |
| 蜂群无人机 | 控制器、无人机主体及旋翼程序绘制 | [characters.js](../src/rendering/characters.js)、[drone.js](../src/rendering/drone.js)：飞行位置和局部旋翼分开 |
| 机械核心、机械蜘蛛 | 控制器/核心、机械召唤物主体与肢体程序绘制 | [mechanical.js](../src/rendering/mechanical.js)、[mechanical-armed.js](../src/rendering/mechanical-armed.js)、[spider.js](../src/rendering/spider.js)、[spider-armed.js](../src/rendering/spider-armed.js)：肢体、母体和外挂武器分开 |
| 林卫车载机枪、125 毫米滑膛炮、六管火神炮、双联潮汐炮 | 四种均程序绘制 | [vehicle-armaments.js](../src/rendering/vehicle-armaments.js)：炮管后坐、转管、双喷口动作独立；火神炮复用六管旋转绘制 |
| 松果轮式战车 | 程序车体、装甲及车轮 | [pine-wheels.js](../src/rendering/pine-wheels.js)：车轮相位由移动驱动 |
| 重型主战坦克 | 程序车体、装甲、履带及悬挂 | [vehicle-models.js](../src/rendering/vehicle-models.js)：逐片履带流动，重炮冲量驱动车体与悬挂 |
| 飞行直升机 | 程序机身、起落架与主尾旋翼 | [vehicle-models.js](../src/rendering/vehicle-models.js)：主旋翼、尾旋翼分别运动 |
| 水陆两栖气垫船 | 程序船体、围裙和风扇 | [hovercraft.js](../src/rendering/hovercraft.js)：风扇、移动与水面尾迹分开 |
| 森林消防车 | 程序车身、水箱、轮胎和消防栓 | [fire-truck.js](../src/rendering/fire-truck.js)、[fire-rescue.js](../src/rendering/fire-rescue.js)：车轮、消防水流和独立武器架分开 |
| 武器升级件、载具装甲与引擎、改造件 | 按部件等级程序绘制 | [equipment-parts.js](../src/rendering/equipment-parts.js)、[workshop-parts.js](../src/rendering/workshop-parts.js)：组装及升级使用同一部件来源 |
| 猫猫身体（含驾驶员） | 外部视频抽帧 PNG 图集 | [cat-front 清单](../assets/cat-front/animations.json)、[cat-animation.js](../src/rendering/cat-animation.js)：同源连续帧、姿态匹配、脚底锚点与动作时钟；毛色等由程序处理 |

武器和载具配置分别见 [weapons.js](../src/config/weapons.js)、[vehicle-armaments.js](../src/config/vehicle-armaments.js)、[vehicles.js](../src/config/vehicles.js)。库存和工坊装备图复用绘制器，不是一套独立绘制的装备原画。标题视频、秘境插画及环境状态 SVG 图标不属于武器/载具战斗主体。

`drawImage` 不等于导入美术：它也可能复制程序生成的离屏画布。当前装备审计以真实加载路径和绘制调用为证据。

## 静态、动态怎么分工合理

| 层 | 制作重点 | 适合当前项目的方式 | 验收重点 |
| --- | --- | --- | --- |
| 静态外形 | 剪影、猫车枪比例、厚度、顶面/侧面、材质和连接结构 | 先做设计稿，再按独立部件实现。现阶段可继续改 Canvas；有复杂手绘纹理时再选透明 PNG；平涂且需要矢量编辑时可选 SVG | 正常游戏尺寸下可辨认；与角色、场景昼夜同屏协调 |
| 局部机械动作 | 枪栓、枪管、轮胎、履带、旋翼、悬挂 | 用程序状态控制独立部件的位置、相位及层序；部件外形可来自程序或图片 | 支点正确、部件相连、停止姿态连续；不能整体拉伸/旋转假装局部运动 |
| 角色有机动作 | 呼吸、行走、身体起伏 | 保留真实猫视频连续帧 | 固定脚底、连贯动作与持枪锚点 |
| 战斗反馈 | 后坐、复进、枪口光、弹壳、烟尘、命中 | 程序绑定真实开火/命中事件，必要时混合短特效图集 | 弹药、枪口、弹道与效果同步，暂停冻结，不遮挡目标 |

静态部件也可以整体平移或围绕正确锚点摆动；“静态”描述的是部件图形，不代表游戏中完全不动。程序绘制同样需要美术设计，SVG 也能由程序驱动局部动作。应按具体效果选技术，不应把两者等同于“低品质”和“高品质”。

加特林应保留转管相位、单管深度和遮挡控制。将整束枪管当一张平面图片旋转，无法正确表达绕枪轴转动。若日后换为图集，需要固定视角下的完整旋转周期，并让启动、停转和热量状态继续由程序驱动。

## 下一轮品质优化建议

1. 先选一把枪做正常尺寸的静态设计对比，确认机匣/握把/枪管比例、统一描边、三层明暗和部件接合；不要先批量改文件格式。
2. 静态方案确定后，按原锚点拆分机匣、枪栓、枪管等，把现有后坐和装配系统接回；运动中检查接缝与穿插。
3. 再优化重坦的车体厚度、履带结构、炮座与驾驶位关系，保持当前视角和战斗构图。以车体后层→猫猫→前装甲及炮座→枪械/效果的正式层序复核。
4. 最后调整枪口光和烟尘的强弱、持续时间及后坐节奏；停止时检查姿态，开火时检查实际命中。
5. 每个样板经过桌面、320/390 宽度、昼夜、升级和移动/开火检查后再推广。

本轮只完成还原和来源审计，未开始上述造型重做。也未进行性能基准测试；不能声称 SVG 或 Canvas 在本游戏中天然更快。日后如增加复杂静态形状，可以在外观确定后评估离屏缓存；动态部件保持独立，结合真实同屏数量测量帧时间与内存。

## 本轮验证

四个核心绘制文件 characters.js、equipment-parts.js、vehicle-models.js、renderer.js 与 SVG 改造前 ab9cd44 的父提交一致（规范化换行后逐文件比对）。create-app.js、visual-review.js 和 visual-contract.json 仅移除 SVG 接入，保留后续设置、消防返站和首页健康提示更新。

针对性后坐测试 10 项、升级状态测试 3 项通过。浏览器的枪栓、履带、悬挂、等级差异和暂停检查通过；外部猫图集 ready。截图、连续帧及详细验收见 [还原任务单](art-tasks/revert-svg-equipment.md)。

整合补记：主分支并行完成消防交接停车库功能（e4ec4ea）；已保留其全部修改。renderer.js 精确恢复比对记录针对整合前版本，最终版本在该基础上保留新停车库分层；相对 e4ec4ea 的运行源码差异仅为撤回 SVG 接入。视觉合同冲突仅移除 svgEquipmentCriterion，保留 fireGarageCriterion。

后续样板：加特林已按[品质任务单](art-tasks/gatling-art-quality.md)改进静态造型，正式入口改为 gatling-art.js；仍是程序图元与独立六管动作，火神炮继续使用原 rotary-barrels.js。
