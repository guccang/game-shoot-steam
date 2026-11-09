# 森林巡游美术生成任务单

复制本任务单，为每批资源填写一份。执行依据为[游戏美术资源生成标准](../art-generation-standard.md)。未确定的尺寸、锚点或碰撞关系，应先对照现有同类资源核实。

## 1 目标与范围

| 字段 | 填写内容 |
| --- | --- |
| 资源中文名称与稳定标识 | 四境疏林与冬日积雪 / forest-winter-biomes |
| 类别和用途 | 树木、地表、山体、湖岸、建筑 |
| 本轮目标 | 各生态区只使用一种主树；整体雪后冬景，可在设置切回原景 |
| 数量和变体 | 四区主树为阔叶、松、枫、柏；保留六树种生成目录 |
| 保留项 | 保留猫视频动作、独立操枪、碰撞水界、道路及活动空间 |
| 制作路线 | 沿用 Canvas 程序图元及按需图集 |
| 参考与同类资产 | docs/art-reference/landscape-six-day.png、landscape-six-night.png 与现有绘制器 |
| 使用场景 | 仅四境森林；九寨沟不受季节影响 |

## 2 造型与空间

| 字段 | 填写内容 |
| --- | --- |
| 主体剪影 | 阔叶宽冠、松树层枝、枫树分叉冠、柏树细长冠 |
| 与其他变体的区别 | 冠宽、分枝及原有叶色；积雪覆盖朝上面，不遮住暗部 |
| 主次关系 | 每区单一主树，林下装饰减量；主路与岸边不增实体 |
| 地面衔接 | 连贯雪地与山脚雪坡，沙岸保留暖沙，湖水保持可辨认蓝色 |
| 活动空间 | 营地、桥头、田前与沿岸保持现有空间 |
| 邻接组合 | 沿用当前山湖沙林组合及位置 |
| 光向与明暗 | 左上暖白雪面，右下蓝灰雪影 |

## 3 技术交付

| 字段 | 填写内容 |
| --- | --- |
| 逻辑尺寸 | 沿用树木128×160、山体和建筑动态尺寸 |
| 像素尺寸与倍率 | 树图集256×320（2倍）；地块384加2像素边缘 |
| 锚点与原点 | 树根(64,145)，建筑/山体原底座不变 |
| 分层 | 地面雪与大影在地面；雪冠随主体排序；手枪及特效独立 |
| 透明背景 | 透明树木及实体图集；地面不透明 |
| 碰撞与可通行性 | 视觉季节不增加阻挡；水面不冻结为可走地面 |
| 昼夜处理 | 共用形体的夜色转换及原局部灯光 |
| 文件格式与位置 | src/rendering、src/world、环境设置；截图 output/playwright/forest-winter |
| 内存与缓存预算 | 分块沿用可视范围上限；切换季节释放旧地块，图集有限两套 |

## 4 动画任务补充
静态美术修改，不生成动作；原风摆、脚底锚点、猫连续帧与独立枪械保持原逻辑。

## 5 生成指令
以现有森林绘本风格绘制雪后场景，积雪落在受雪顶面，露出树冠底部及树干。四区各有主树，降低林下小景密度，不新增碰撞或填充活动区。原景切换仅切换季节，统一树种布局两季共享。

## 6 验收记录

2026-10-21：按标准执行正式运行、静态图鉴和真实按键绕行验收；结论通过。

| 设计目标 / designCriterion | 实际结果 | 证据 |
| --- | --- | --- |
| 分区统一 / forest-biome-coherence | 每棵树与所在区域的主树和色板一致；林团位置、疏密算法和道路排除保持原值；四区轮廓明确，六类生成目录仍保留 | `tests/landscape-varieties.test.mjs`；[冬景组合白天](../art-reference/forest-winter-day.png) |
| 雪层与明暗 / winter-snow-surfaces | 树冠上缘暖白、底缘蓝灰，保留绿色/暖色暗部和树干；山顶有雪檐，山脚衔接雪坡，麦穗薄霜、屋顶和河岸覆雪；暖沙与蓝水仍清楚 | [白天](../art-reference/forest-winter-day.png)、[夜晚](../art-reference/forest-winter-night.png)；`camp-day-1100.png`、`pine-day-390.png` |
| 原景切换 / winter-season-roundtrip | 设置→环境与景色→四境森林，冬日积雪/原景色均可保存刷新；切季不改变玩家位置、生命与波次；旧分块释放；九寨沟两季像素完全一致 | `tests/forest-winter.test.mjs`、`browser.log`、`settings-320.png`、`settings-390.png`、`original-restored.png` |
| 落地、遮挡与空间 / preserved-gameplay | 实际按键从树后绕至右侧、再到前方；后方树冠透显，树根维持原阻挡，沿外围可走通；不新增实体，湖水及桥头仍用原碰撞 | `depth-back.png`、`depth-side.png`、`depth-front.png`；[绕树录像](../../output/playwright/forest-winter/video/page@1b07bfcc3542b427e7c731c14a1209e0.webm) |
| 动作和独立部件 / preserved-gameplay | 本轮不生成动作；实按键移动后 moveTime 推进，停下时 moveWeight 回落至0.024；上车后继续实按键移动；猫视频帧加载成功，手枪及小手沿原正式绘制链 | `depth.log`、`interaction-day.png`、`interaction-vehicle.png`；已有动作与载具回归通过 |
| 昼夜同屏 / preserved-gameplay | 营地、雾松、古林、禁林与湖岸的昼夜实机场景均包含猫、怪物、载具及HUD；夜间雪层呈冷蓝，深色树冠可辨 | `camp/pine/amber/deep/lake-{day,night}-{1100,390}.png` |
| 手机与桌面 / preserved-gameplay | 320、390像素手机与1100像素桌面截图复核，设置无横向溢出；已有通行与按键输入保持 | `camp-{day,night}-320.png`、设置截图及实机截图 |
| 完整性、接缝与缓存 | 533项测试通过，201模块语法/导入/分层/循环检查通过，浏览器错误0；雪地块接缝显著差异0、世界镜像差异0；六次切季树缓存数量稳定44 | `acceptance.json`、`tests.log`、`browser.log` |

全部运行证据目录：`output/playwright/forest-winter/`，完整脚本为 `tests/forest-winter-browser.cjs`、`tests/forest-winter-depth.cjs`，可在隔离的4174端口复现。长期昼夜参考图已随仓库提交；录像和完整运行日志保存在主工作区输出目录。

实测缓存：四区昼夜检查地块峰值35.14 MiB，未超过当次可视分块上限；切季后旧地块即时释放。往返后树图集13.75 MiB、场景图集9.80 MiB、山体图集15.69 MiB、猫动画16.80 MiB。季节图集按固定两套形态懒加载，不预热随机组合；六次往返树图集始终44张，不逐次累积。本轮为新增雪季接受有限双套图集成本，地面仍沿用原分块预算。

正式绘制器入口：`Renderer.draw` → `GroundCache.setSeason/get` → `paintGround`，以及 `drawForestTree/drawTreeSprite`、`drawMountain/rockColumn`、`drawScenery`；雪形在 `winter-art.js#snowCap/drawWinterMeadow/drawScenerySnow`。小地图同步同季。

`visual-contract.json` 已登记上述四项 designCriterion，`renderVisualCase` 新增六组 `landscape-group-{0..5}-winter[-night]` 并绑定正式渲染，不使用独立示意图。

结论：通过。验收期间已修订麦田重复白点和山顶雪檐；当前版本无待修订项。

## 扩图后的远林景观

目标是在手机一屏内能辨认疏林、花地、石群或林下倒木，同时保留驾车穿行的草地。以公交亭树组和正式森林植被为参照，远林采用大小不一的树组，低景按地脚分组，沿用花、石、倒木的正式图集与四季着色。树木保持原有碰撞和采集，低景只参与脚底排序。道路、驻怪区和手工场景保留净空。检查昼夜手机和大视口、跨区连续性、局部查询及常驻树木预算。

验收通过。正式入口为 `forestLayout` 和 `Renderer.draw → forestUnderstory → drawScenery`。全图树位 13,317 个。抽样 160 个 390×600 世界单位的视野，其中 150 个包含树或低景。林下摆件复用三种既有图集，按镜头取格，缓存上限 256 格。昼夜实机检查中，猫、坐骑、树干、倒木和花石按脚底落位，手机触控向右骑行约 258 世界单位。野怪驻地、木牌和候车路线的留白检查通过。两套风格的地图预览已刷新并核对依赖指纹。

对应 designCriterion 为 `forest-biome-coherence` 和 `preserved-gameplay`。截图在 `output/playwright/forest-landscape-density/forest-{day,night}-{390,1100}.png`。动作与资源替换项不适用，本轮仅布置既有运行素材。

## 野外营地与生态带

制作阶段为正式 Canvas 布景。以玩家提供的全图截图为对照，远林沿连续的松岭、枫坡和幽林形成长短不一的林带，林带之间留花甸；营地沿林缘与开阔地聚散。地图底色、树种、林下伴生物、营址共用世界坐标。保留近营地手工区域、路桥、站牌、营地存档 ID 和距离等级表。核验全图、手机与大视口昼夜场景、营门距离、树冠净空、所有等级与地图接缝。

验收通过。森林有 185 个营地。按 320 × 300 米统计，180 个样区中有 67 个没有营地，17 个有三个或更多。近郊 14 处支营也已错开。全部营地的木牌、观察点、居民与冷灰堆经正式碰撞检查可达，距离等级覆盖 1–20 级。手机地图实按“前往圈外”后，导航目标与迁移后的观察点一致。

| designCriterion | 正式入口与结果 | 实机证据 |
| --- | --- | --- |
| forest-biome-coherence | `forestHabitat → biomeAt / forestLayout / forestUnderstory`。花甸圆冠树、松岭石蕨、枫坡菌丛、柏林倒木沿同一生境场分布。正式地图与实景共享地色；图例列出各区地表特征。 | `output/playwright/forest-habitats/overview-full.png`、`{meadow,pine,amber,deep}-{day,night}-390.png` |
| preserved-gameplay | `frontierCamps / campVisitorSite`。保留营地账本 ID、种子来源和距离难度；手机点击实测导航成功。角色、怪物、坐骑和小景的地脚关系已复核。 | 同目录 `pine-{day,night}-320.png`、`amber-{day,night}-1080.png`、`comparison.jpg` |
| winter-snow-surfaces | `drawBiomeGroundSteps → drawHabitatGround`；积雪仅轻染地色，蕨、菌使用已有的植物画法和雪帽。两套风格四季底图从正式绘制器导出。 | `assets/art-styles/{classic,clear}/map-preview/forest-winter.png` |
| 资源与地貌 | 地色缓存 242 × 182 像素，约 172 KiB。正式森林有 11,617 处树位。景观目录检查发现部分种子的泉边山丘试位耗尽，已补同景点的有界试位，六类景观形态、1,296 种搭配以及湖山避让专项通过。 | `tests/map-expansion.test.mjs`、`tests/landscape-varieties.test.mjs`、`tests/natural-terrain.test.mjs` |

本轮复用已有角色、树冠及地表素材，新增的是布局与局部画法；角色视频、载具部件和武器动作资源替换项不适用。
