# 森林巡游美术生成任务单

本页保留首次入职的初版验收记录；当前氛围演出、头顶气泡与车库停车以[林间接班任务单](ranger-scenic-arrival.md)为准。

复制本任务单，为每批资源填写一份。执行依据为[游戏美术资源生成标准](../art-generation-standard.md)。未确定的尺寸、锚点或碰撞关系，应先对照现有同类资源核实。

## 1 目标与范围

- 标识：ranger-arrival；首次入职故事、电动车与老巡林员、工坊修复引导；综合工坊拆为武器、载具两处入口。
- 路线：既有猫身体真实连续帧 + 独立程序绘制帽子、眼镜、胡须、车轮、把手、交接物品。无新增位图或视频。
- 参考：docs/art-reference/landscape-six-day.png、landscape-six-night.png；characters.js、pine-wheels.js、workshop-building.js。
- 保留原主角、正面身体图集、独立小手与武器、昼夜转换、森林场景和通路。

## 2 造型与空间

- 电动车用窄踏板、双轮、长鞍座、前挡泥板与把手区别于装甲战车；不设炮塔和挂载点。
- 老猫沿用绿色猫身体帧，独立绘制巡林帽、圆眼镜与灰白胡须；青年乘客与驾驶员分开落点。
- 统一森林绿描边、奶油黄车壳、左上亮面；轮胎接触影贴地。
- 从营地南路缓慢驶至小屋前侧开阔地；下车及离开用位置插值和原身体步态；工坊入口及采集林缘保持通行。

- 载具工坊位于(285,650)，延续原小屋比例，宽卷帘、吊架和车轮区别于武器工作台，树冠留白由COTTAGES统一计算。

## 3 技术交付

- 电动车约90×70世界单位，老猫与主角均使用原0.8比例；车体原点为双轮间地面中心，人物使用原脚底锚点。
- 世界Canvas按地面投影、车后层、乘客/司机、车前层排序；交接图标和损坏工坊横板独立绘制。
- 程序路径：src/rendering/ranger-arrival.js、scooter.js；逻辑与数值分别位于core/config/progression。
- 不新增碰撞，使用原地形与树干；电动车按实际位移滚轮；普通骑乘仍受正式碰撞规则约束。
- 共用原昼夜后处理，不生成夜景副本。无新增纹理与解码内存；单个DOM故事卡，数组常数规模。

## 4 动画任务补充

- 骑行14秒、交接3秒、下车2秒、步行离开8秒；暂停冻结；对白玩家阅读后推进。
- 猫帧源、裁切、24FPS与锚点完全沿用assets/cat-front/animations.json；不重复生成。
- 轮辐随实际路程转动，停住保持轮角；身体待机/步态使用createCatMotion/updateCatMotion。
- 独立手与把手连接；交接电锯、钥匙和电动车所有权后，电动车留在营地，老人步行离开。

## 5 制作指令

延续森林绘本风格，以正式场景和猫身体为基础；不拉伸、旋转主体伪造动作，不替换主角，不将武器烘焙到车体。对白、目标、失败与按钮均进入语言表。

## 6 验收记录

2026-10-23，正式服务器隔离端口 4286，Chromium 实际运行。designCriterion：`ranger-arrival`（visual-contract.json）。

| 设计目标 | 实际检查和结果 | 证据 |
| --- | --- | --- |
| 原猫与老巡林员慢速同乘至小屋、交接和告别 | 原玩家真实连续帧保留；14 秒沿路行驶，轮辐随路程滚动，停车保留轮角；司机独立帽子、眼镜、胡须和手；交接钥匙/电锯后两人下车，老猫步行离开，原车留在门前 | `../art-reference/ranger-arrival/arrival.webm`、`ride.png`、`leave.png`、`diagnostics.txt` |
| 自由游戏由真实劳动开始 | 实际输入移动，正式电锯攻击采集 24 木材；走到门前点击修复（16 木材）、制造（8 木材）；装备松果手枪后才出现第一波敌人。演出、采集和施工中敌人数为零 | `chopped.png`、`repaired.png`、`first-wave.png`；三段 ranger-arrival 浏览器脚本与 8 项规则测试 |
| 两种工坊有独立建筑、入口、标题和清单 | 西侧卷帘/吊架/车轮是载具工坊，东侧工作台是武器工坊；世界门牌分别打开正确类别，无综合分类切换；电动车不显示挂载选择，核心也拒绝挂载和骑乘开火 | `battle-desktop-day.png`、`weapons-320.png`、`vehicle-320.png`；ranger-workshops、ranger-battle 浏览器脚本 |
| 桌面、手机、昼夜同屏美术和阅读 | 1280×900、390×844、320×740；中英文最长对白在昼夜均无横向溢出，继续按钮可见，角色不被对白遮挡；正式战场同时检查玩家、电动车、怪物、树、建筑和 HUD；门牌避开玩家身体 | `dialogue-zh-390-day.png`、`dialogue-en-320-night.png`、`battle-390-day.png`、`battle-320-night.png`；完整矩阵存于本地 output/playwright/ranger-arrival |
| 遮挡与通行 | 两个工坊底座、门前和树冠留白通过专项断言；实际走近工作台、骑车和上下车成功；世界层排序沿用正式 renderer，未新增碰撞体 | ranger-arrival.test.mjs 最后一项、ranger-arrival-craft-browser.cjs、ranger-battle-browser.cjs |
| 动作和中断恢复 | 暂停不推进阶段；对白、采集与施工恢复；完成不重播；保存失败不赠送或扣料，重试一次结算；真实骑乘时车轮随位移变化 | ranger-arrival.test.mjs、ranger-arrival-visual-browser.cjs、连续录屏 |
| 资源和执行预算 | 新增运行位图、视频、图集均为 0，纹理解码预算增量为 0；沿用 cat-front 原图集且状态 ready；老猫一个独立动作时钟，单张 DOM 故事卡，目标搜索单次线性扫描；截图/录屏仅放 docs 验收目录，不加入运行清单 | `diagnostics.txt`；src/rendering/scooter.js、ranger-arrival.js |
| 国际化和可访问性 | 全部新增显示文本维护中英文，完整句子用参数插值；故事 section 有标题关联，按钮描述关联当前对白，更新播报只在文本变化时触发；两个工坊入口有各自可访问名称 | npm run check:i18n：2581 条文案、2 个语言包通过；双语浏览器矩阵 |

以上图片、录屏的相对路径均基于 `docs/art-reference/ranger-arrival/`，完整浏览器输出复制至主工作区 `output/playwright/ranger-arrival/`。

正式绘制器入口：`src/rendering/renderer.js#draw`、`src/rendering/ranger-arrival.js#drawArrivalObject`、`src/rendering/scooter.js`、`src/rendering/workshop-building.js`；采样入口：`src/rendering/visual-review.js#inspectRangerArrival`。

本次直接相关检查通过：入职规则、工坊事务、重置、载具清单/武装/驾驶/成长、猫帧/轮转相关检查和国际化专项；合入最新工坊展示改动后，入职 + 工坊 20 项再次通过。未运行全量 npm test。

已知基线问题：既有 `camp-building-layout.test.mjs` 的消防站 `fire` 地形通行断言在未修改的 master 同样失败；本次不更改该站点。两个新增/拆分工坊的专项通行检查通过。此问题不计作本次验收通过项。

不适用：没有生成新角色源视频、PNG、图集或音乐，不涉及新资源分发、主尾旋翼、履带或领主动作修改；这些原有绘制器均保留。没有浏览器外的实体手机性能测量，本记录的手机验收为 Chromium 320/390 视口实际运行与交互。

结论：本任务设计目标通过；保留上述消防站基线问题和测试设备范围说明。

## 门牌移动与死亡续游修复（2026-10-23，规格）

参考用户营地双工坊及波次轨道截图。门牌保留现有奶油底、森林绿描边、中文名称、世界投影、玩家避让位置和44像素触控高度；仅将指针拖动交给正式战场摇杆，短按仍进入对应工坊，键盘Enter仍可打开。门牌不新增地形碰撞；正常HUD和弹窗按钮仍独立。死亡提示改为“进度已保留”，轨道保留组节点、当前波和部分清怪，不重抽领主位置。

无新增美术资源、图元、DOM画布或缓存，分层及角色/载具/怪物/树木动作保留；源视频、尺寸、锚点、碰撞体和图集生成变更不适用。本次正式显示入口 src/ui/world-workshop.js、src/ui/wave-progress.js、src/ui/hud.js；正式复核 inspectWorkshopPatrol，designCriterion：workshop-labels-wave-revive。需实际检查桌面、320/390昼夜、鼠标和触摸拖动/短按/取消、死亡复活与存档重载，结果验收后补记。

### 门牌与复活验收结果

通过。37项针对性规则测试覆盖输入归属/取消、普通死亡、连续死亡与反复刷新、已完成配额、部分清怪、组节点、领主重试、胜利休整、旧档恢复与清档。旧清档断言同步为现有首次入职存档，生产清档流程未修改。复活会重建未击败怪物并保留已击杀数量；领主只在原节点满状态重试，不重发奖励。

实际Chromium桌面1280及手机390/320宽度、昼夜共6组回归通过，每组分别从两个门牌上用鼠标或真实触摸拖动，角色发生正式位移且不打开工坊；短按、Enter进入对应工坊成功。额外CDP触摸取消后摇杆清理、短按进入验证通过。六次死亡复活均保持前两节点完成、第三波7次击杀、原五节点组，死后保存刷新再继续仍一致；页面异常0。手机中文死亡提示无溢出。原门牌尺寸、避让位置和地图边界保持，因此无新增视觉资源/画布/缓存预算；只新增输入状态中的单个节点引用，释放或取消后清理。

已人工检查门牌、复活轨道、昼夜角色/怪物/载具/建筑同屏截图。正式入口 inspectWorkshopPatrol，designCriterion：workshop-labels-wave-revive。证据目录 output/playwright/workshop-labels-wave-revive/：browser.txt、rules.txt、touch.txt；weapons/vehicle/revived-{1280,390,320}-{day,night}.png、combined-day/night.png、death.png。输入与战斗专项通过后未扩大到全量测试；新增/修改模块语法、JSON及差异空白检查通过。

合并复核：主分支同期调整开局配额为12、18、26等逐波递增；保留该配置及其旧档迁移检查，只移除旧回退函数。25项死亡/波次/组进度/存档集成测试通过（merged-rules.txt），未重复运行不受合并影响的输入和浏览器检查。

## 骑乘购买首枪（2026-10-28）

目标：移除修复完成后的下车任务与车辆按钮提示，修好后直接指向工坊购买第一把手枪。旧存档的下车阶段续到购枪阶段，保存失败可以重试，骑乘状态保留。

本轮仅调整任务状态和中文提示，不新增或替换美术资源。任务卡、工坊入口、字体、锚点、分层与44px触控目标沿用原实现；不增加画布、纹理或动画。正式入口为`src/core/camp/ranger-arrival.js`、`src/ui/ranger-arrival.js`、`src/ui/arrival-workshop-guide.js`，对应`ranger-arrival`。

验收范围：实际点击上车、采木、修复及骑乘购枪；320/390手机和横屏昼夜检查任务与提示位置；旧阶段存档续接和交易单次结算。

验收结论：通过。26项针对性单元测试通过，覆盖修复后直接购枪、骑乘刷新、旧阶段迁移及保存重试；`tests/arrival-scooter-guide-browser.cjs`实际点击上车、采木、修复、购买成功，购枪完成仍保持骑乘，浏览器错误为零。320×568、390×844、844×390昼夜检查任务卡和入口均未越界。人工复核[白天](../art-reference/mounted-pistol/day.png)与[夜晚](../art-reference/mounted-pistol/night.png)，任务标题与提示已移除下车要求，原车身、猫猫及工坊显示正常。完整截图在`output/playwright/arrival-scooter/`。本次无新增美术资产，PNG精修和资源分发预算不适用。
