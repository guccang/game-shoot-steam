# 地图静态底图预生成任务单

依据：[游戏美术资源生成标准](../art-generation-standard.md)。本任务由美术生成任务单复制栏目并按静态总览范围填写。

## 1 目标与范围

资源：地图总览底图 / map-preview；用于地图面板，森林春夏秋冬四张、九寨沟一张。目标为消除每次开图完整绘制世界的阻塞，保持现有图形、配色、坐标、遮挡顺序。制作路线为正式 Canvas 绘制器离线导出无损 PNG，不生成新美术形态。参考为修改前 GroundCache.drawMap。

## 2 造型与空间

保留世界地貌、道路、建筑与山体的原剪影、主次关系、地面衔接、入口留白、邻接组合、左上光照。四季结构沿用原画法，湖谷沿用独立世界尺寸。没有新的变体结构要求。纯 UI 总览，不改变战场实体、碰撞、活动空间及前后遮挡。

## 3 技术交付

逻辑/像素尺寸均为 720×560，左上原点；森林按 WORLD、湖谷按 ORIGINAL_WORLD 缩放。底图包含原地形、装饰、山体；文字、玩家、任务、生活道路与地点继续由正式面板实时绘制。底图不透明；夜晚沿用原面板的白天色彩图，不改变地图信息可读性。PNG 与 manifest 存入 assets/map-preview，生成脚本放 scripts。缓存最多两张解码图（约 3.08 MiB），生成/加载中的一张另约 1.54 MiB；退出释放。资源缺失明确显示加载失败，不以另一幅图替代。

## 4 动画任务补充

静态总览，动作/时长、帧率、视频、裁切、起停和独立部件均不适用。战场角色、怪物、载具和手持武器不在本轮修改范围。

## 5 生成指令

调用修改前总览的正式绘制顺序和参数：paintGround → drawSceneryMap → drawNaturalMap；湖谷 paintJiuzhaigou → drawJiuzhaigouWater。缩放到 720×560 后原样导出 PNG。禁止烘焙玩家或任务标记，禁止对底图新增文字、颜色调整、拉伸或替代资源。

## 6 验收记录

| 设计目标 | 证据与实际结果 |
| --- | --- |
| 系列一致、四季完整 | 五张PNG与原正式绘制序列逐像素对照，全部零差异；`output/playwright/map-open/pixels.log` |
| 落地、遮挡、通行保留 | 纯UI底图，无实体/碰撞/战场绘制修改；五图零差异。绕行和驾驶机制不在本轮范围，不以静态截图宣称动作验收 |
| 动作柔和且部件独立 | 不适用：没有新增动画或烘焙角色/武器；仅静态总览底图 |
| 昼夜可读 | 正式面板320/390昼夜截图与关闭后的战场对照；静态同屏夹具保留猫、怪物、载具、地形与HUD，不用于帧率测量 |
| 手机尺寸与中文 | 320×568正文滚动后地图完整可见，390×844地图在首屏；两尺寸无横向溢出，关闭按钮44×44。没有新增桌面布局 |
| 资源和预算 | 5张720×560 PNG，共3,159,447字节；两张解码缓存约3.08MiB，未完成加载另约1.54MiB。失败明确提示，重开恢复；13项相关单元检查通过 |
| 开图性能与信息更新 | 四次打开仅加载一张底图，地块与季节过渡不变；普通速度21–62ms，4倍CPU降速82–98ms。两处玩家位置标记读取实际坐标，复用同一底图；`after-final.log`、`panel.log` |

正式绘制器入口：`src/rendering/ground-cache.js#drawMap`、`src/ui/panels/map.js`；`src/rendering/visual-review.js#inspectMapPreview` 绑定正式缓存与面板。  
`designCriterion`：`map-preview-cache`。  
结论：通过本轮静态地图缓存与手机界面验收。未在真实Mate 50 Pro上复测30分钟温升。  
长期参考：[390白天地图](../art-reference/map-preview/390-day.png)、[320夜晚滚动地图](../art-reference/map-preview/320-night.png)、[白天战场](../art-reference/map-preview/390-day-battle.png)、[夜晚战场](../art-reference/map-preview/390-night-battle.png)。  
完整日志与其余截图：`output/playwright/map-open/`；维护步骤：[地图打开性能](../map-open-performance.md)。
