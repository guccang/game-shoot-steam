# 沉浸式综合工坊美术任务单

依据：docs/art-generation-standard.md。由 docs/art-generation-brief.md 复制并按本次任务填写。

## 1 目标与范围

| 字段 | 内容 |
| --- | --- |
| 中文名与标识 | 综合工坊 / immersive-workshop-v01 |
| 类别与用途 | 营地建筑、装备独立部件、装配交互界面与靶场 |
| 目标 | 拖入套件后，主体外观、属性与费用立即变化；正式提交后战场呈现相同部件 |
| 数量与变体 | 1 栋建筑、15 型武器各 2 个互斥套件、4 辆车体及 13 类独立炮塔 |
| 保留项 | 原猫身份与真实动作、枪口坐标与后坐、履带/主尾旋翼、昼夜、资源规则和道路 |
| 制作路线 | 延伸现有 Canvas 程序化正式绘制器，HTML/CSS 实现工作台与拖拽 |
| 参考 | docs/art-reference/landscape-six-day.png、landscape-six-night.png；正式小屋、武器与载具绘制 |
| 使用场景 | 森林营地、综合工坊与隔离靶场；秘境保留原限制 |

## 2 造型与空间

| 字段 | 内容 |
| --- | --- |
| 主体剪影 | 原小屋屋顶与底座，开放维修门、门内工作台、侧墙工具架与武器标牌 |
| 结构差异 | 武器套件按机匣/枪管/喷嘴/弹仓/晶体/核心/线圈/芯片/锯齿独立绘制，两个分支改变数量、宽度或轮廓 |
| 主次关系 | 中央真实装备为主，左右货架与零件托盘为辅；移动端托盘位于工作台下方 |
| 地面衔接 | 使用原 (1010,580) 小屋踏石与道路、接触影和投影，不新增地板 |
| 活动空间 | 原 0.82 倍小屋占地，门前、麦田前方和桥头通路保留 |
| 邻接组合 | 北侧塔入口、西侧麦田、屋侧木堆与既有道路 |
| 光向明暗 | 左上亮面与右下冷影；建筑夜景走原 nightTexture 转换，室内界面保持可读性 |

## 3 技术交付

| 字段 | 内容 |
| --- | --- |
| 逻辑尺寸 | 建筑复用 180×164 图集逻辑画布，世界缩放 0.82；武器套件约 14–26×14–24 局部单位 |
| 像素尺寸倍率 | 建筑 360×328，2 倍；主预览 660×400、当前图 180×120、试射 840×405；小货架 150×100、套件 150×90 |
| 锚点 | 小屋底座 (1010,580)；图集 (90,148)；枪械原点不变，部件锚点由 workshopPart 统一提供 |
| 分层 | 复用地面影子、主体排序、独立枪械与部件；热点及费用属于 DOM 界面 |
| 透明背景 | 部件 Canvas 透明；建筑复用透明图集，不烘焙不透明地板 |
| 碰撞通行 | 沿用原小屋装饰规则，不新增碰撞；点击命中单独定义，不改变通行 |
| 昼夜处理 | 同一建筑形体生成日夜缓存；武器与载具沿用正式场景调色 |
| 文件 | 程序化模块位于 src/rendering；无新增位图、视频或生成服务记录；证据位于 output/playwright/immersive-workshop |
| 内存预算 | 工坊 UI 所有 Canvas 总计小于 5 MiB RGBA；建筑新增日夜缓存约 0.91 MiB，冬/绿两季最多 1.81 MiB；同时只保留一个试射会话，关闭释放 RAF 与状态 |

## 4 动画任务补充

| 字段 | 内容 |
| --- | --- |
| 动作与时长 | 拖拽跟手及吸附反馈；试射持续至点击结束，使用正式战斗时钟；驾驶中的履带和旋翼沿用正式运行时 |
| 帧率与帧数 | 无新增序列帧；试射固定最大 1/30 秒步长，RAF 驱动显示 |
| 源视频 | 不适用：没有新增猫或怪物动画，保留现有真实视频帧 |
| 裁切与缩放 | 装备统一缩放，不逐帧拉伸；部件与热点共享布局 |
| 起停与状态 | 关闭、切对象、切前后比较停止试射；后台与嵌套弹窗冻结；减少动态沿用用户偏好 |
| 真实动作 | 使用正式枪口、后坐、弹道、粒子、猫动画、独立炮体与旋翼 |
| 独立部件 | 手持枪、炮塔、浮游炮体和控制器仍为独立绘制；新增套件不替代这些主体 |

## 5 制作指令

延续森林绘本风格和既有三分之四视角。颜色以 #315C43、#90A875、#F4DCA0、#B68A51、#718672 为主。以真实可操作装备为主体，通过部件剪影及连接点说明用途，避免大段功能文字。不使用生成预览图代替正式运行效果，不复制帧、整体拉伸或旋转充当机械动作。

## 6 验收记录

验收日期：2026-10-21。验收通过；使用隔离端口 4186，不读取或覆盖玩家正式端口存档。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 系列一致、变体可辨 | 15 型武器逐项采样原厂和两个套件，45 份正式绘制输出；每型三个输出互不相同。见 output/playwright/immersive-workshop/weapon-gallery-0.png 与 weapon-gallery-1.png；已人工复核结构、比例和锚点。 |
| 落地与前后遮挡 | 工坊保留原底座、投影和透显，实际 W/D/S 绕行录制见 scene-final.webm；屋后、屋侧、屋前截图见 walk-behind.png、walk-side.png、walk-front.png。 |
| 活动空间与真实边界 | 原营地树林留白及道路测试通过；建筑主体和门牌均可点击，门前至麦田、桥头留有通路。见 scene-390-day.png 与 scene-final.webm。 |
| 动作柔和与独立部件 | 所有 15 型枪械完成十秒正式逻辑试射测试；正式车体、猫、炮塔与怪物同屏运行；4 型载具连续采样，直升机额外验证旋翼连续帧。见 assembly-final.webm、desktop-trial.png、reduced-trial.png。 |
| 白天与夜晚可读 | 320、390 与 1280 宽各采样昼夜，场景同时包括猫、怪物、安装炮塔的战车、工坊与 HUD。见 scene-{宽度}-{day/night}.png；对应工作台见 workbench-{宽度}-{day/night}.png。 |
| 手机与桌面交互 | 鼠标拖拽、点击+键盘安装、320/390 真实触控拖拽、无效落点、取消触摸、横向浏览托盘、资源说明、追踪跳转、草稿保护和暂停恢复全部通过。见 mobile-320-drag.png、mobile-390-drag.png、assembly-final.webm。 |
| 资源与预算 | 载具工位画布合计 3,445,200 字节 RGBA 理论下界（3.29 MiB）；武器工位理论 3.35 MiB，均低于 5 MiB。连续开关 15 次只有一个工坊节点、没有悬浮残留；地面缓存不超过 32 块。正式猫图集加载验证通过，失败会明确阻止试射；浏览器无运行错误。 |

正式绘制器入口：src/rendering/characters.js#drawWeapon、src/rendering/vehicle.js#drawVehicleArmor、src/rendering/workshop.js#drawWorkshopEquipment / drawWorkshopTrial、src/rendering/scenery.js#drawScenery。

designCriterion：visual-contract.json 的 workshopCriteria / workshopCases，包含 workshop-building-day/night、workshop-weapon-0…14、workshop-vehicle-0…3。src/rendering/visual-review.js 直接绑定上述正式绘制器；建筑检查分别对应昼夜形体与落地，武器检查对应互斥部件结构和固定连接点，载具检查对应真实挂载与独立旋翼。

规则与交互验证：

- node --experimental-vm-modules scripts/check.mjs：212 个模块语法、分层、导入与无环检查通过。
- npm test：542 项通过，0 项失败；含 9 项新增工坊事务与试射测试。
- tests/immersive-workshop-browser.cjs：真实页面入口、鼠标/键盘/触控装配、扣费、存储失败回滚、重试、追踪与刷新恢复通过。
- tests/immersive-workshop-boundaries.cjs：无效放置、pointercancel、托盘横向触控、嵌套资源帮助、暂停归属和重复打开预算通过。
- tests/immersive-workshop-visual.cjs：昼夜实机场景、建筑绕行与点击、全部部件图鉴、车型连续帧和减少动态试射通过。

验收中修订：修复指针捕获吞掉普通点击；修复试射首帧 dt=0 提前结束；将试射放回工作台避免被底栏遮挡；放大武器与载具主体；热点直接使用部件连接点；触控横向浏览和垂直装配区分；升级费用与效果明确标注，避免混淆当前装配。

不适用：新角色源视频、抠像、序列帧裁切以及新增水界测试。本任务未生产这些资源，也未改变水域物理；沿用原有相关测试及资源。

结论：通过。无待修订项。

确认版本：immersive-workshop-v01；沿用标准 1.0。长期参考图：docs/art-reference/workshop-day-v01.png、workshop-night-v01.png、workshop-ui-v01.png。完整运行证据保留在 output/playwright/immersive-workshop/，不进入游戏运行包。

## 7 部件施工版本 v02（已验收）

目标：修复脉冲炮预览污染与页签切换，使用独立部件和拖工具按住施工取代升级按钮。覆盖 15 型武器、13 型独立炮塔、4 型车体；新增部件 5 级，伤害和装甲保留 20 级。

制作规格：沿用 v01 配色、中文字体、视角及 Canvas 尺寸；武器按攻击核心、机匣、储能/弹仓、供给接口、前管和稳定机构分层，每个部件有固定锚点；装甲和动力分别绘制。部件限制在原装备外包围附近，不缩放整体、改变碰撞或移动握持点和枪口。工具为独立透明 Canvas，扳手围绕紧固点转动，焊枪接触焊缝，施工 1.5 秒。旧件移出与新件插入各 0.2 秒，减少动态保留进度与静态定位。保留猫、怪物、履带、旋翼和现有套件。无新增位图、源视频和字体，工具/部件即时绘制，不缓存等级组合；UI Canvas RGBA 预算小于 5 MiB。

参考：v01 工坊与正式枪械/载具。地面、道路、水界及建筑不变，无新增碰撞；正式昼夜调色继续生效。桌面固定顶部与宽度，手机 320/390 保持装配起点和目标可见。

验收：v02 独立完成规则、浏览器、施工录制、逐级部件对照及昼夜实机复核，结果如下。v01 记录保留为历史，不作为本次验收依据。


### v02 验收结果与修订

日期：2026-10-21。使用独立端口 4186 和浏览器会话，不读取玩家正式存档。已按最新版美术标准复核，并同步 master 的季节天气、飘叶及世界坐标雪花变更。

| designCriterion / 目标 | 结果与证据 |
| --- | --- |
| workshop-components-weapons / turret：逐级可辨、真实局部替换 | 15 型武器、13 型独立炮塔与 4 型车体合计 1280 个等级采样通过；每个部件相邻等级图像不同。实际审阅 components-gallery-0/1/2.png，原厂、初次升级、全部满级保持型号识别与固定枪口。短手枪已修正通用机匣悬空，采用型号专属连接点和比例。 |
| workshop-components-vehicle：装甲、动力独立且保留机械动作 | 装甲采用带倒角的护板、分段加强及铆钉；动力采用轮毂、管线与散热结构。最终修订后额外逐级复核 100 帧。vehicle-parts-gallery.png 展示四车型原厂/首次/满级；履带、主尾旋翼与气垫船风扇沿用正式动画。 |
| workshop-construction-wrench / welder：接触施工与中断 | 扳手围绕紧固件转动，焊枪头接触连接点并产生局部焊点；两工具各 6 个连续时间采样均不同。assembly-final.webm 包含鼠标、键盘、真实触摸施工与试射；松开暂停，触摸取消及切换清零，不提前扣费。部件移出/插入采用正式装备的缺件绘制与同锚点部件层。 |
| workshop-ui-stability：直接切换、错误恢复和尺寸固定 | 四车体 × 13 炮塔共 52 组实际预览、脉冲炮后切电锯、连续页签切换通过。截图 chainsaw-after-pulse.png。绘制使用正式状态构造器并重置画布保存栈与裁剪；模拟一次绘制异常后选择新对象能恢复，错误有明确提示。桌面和两种手机宽度炮塔检修前后弹窗宽度、上沿及舞台高度不变。 |
| workshop-input-lifecycle：手机、键盘与草稿 | mobile-320/390-draft.png、mobile-320/390-turret.png；验证工具与连接点同屏、真实触控拖拽、无效落点恢复原草稿、pointercancel、键盘长按、关闭继续编辑/放弃、材料来源和目标追踪。切换装备或页签无二次拦截；关闭保留草稿提示。 |
| 场景比例、遮挡、道路及昼夜 | scene-{320/390/1280}-{day/night}.png、workbench-{宽度}-{day/night}.png 已实际审阅，升级装备、猫、怪物、工坊和 HUD 同屏；车体真实耐久与工作台一致。scene-verified.webm 与 walk-behind/side/front.png 留存屋前、屋侧、屋后走位。建筑、水界和碰撞未改变，门前道路仍开放。 |
| 资源、动画及缓存 | 正式猫图集加载成功，失败明确阻止试射；无新字体、位图、视频运行资源或组合图集。工坊全部 DOM Canvas 最大 4,799,392 字节（4.58 MiB），小于 5 MiB；连续打开/关闭 20 次仅 1 个实例、0 个残留拖拽物；地面缓存实测 8 块、不超过 32。关闭释放施工/试射/装卸 RAF，减少动态已操作验证。 |

证据根目录：output/playwright/workshop-components/。长期参考：docs/art-reference/workshop-components-ui-v02.png、workshop-components-weapons-v02.png、workshop-components-vehicles-v02.png。现场截图和录制仅作验收材料，不进入游戏运行包。

正式入口：src/rendering/characters.js#drawWeapon、src/rendering/equipment-parts.js#drawEquipmentPart / drawVehicleParts、src/rendering/funnel.js#drawFunnelArray、src/rendering/vehicle.js#drawVehicleArmor、src/rendering/workshop-tools.js#drawWorkshopTool；src/rendering/visual-review.js 直接绑定 workshop-components-* 与 workshop-construction-*，visual-contract.json 记录相应 designCriterion。交互正式入口为 src/ui/workshop.js#createWorkshop 与 src/ui/workshop/construction.js#createWorkshopConstruction。

验证：合入 master 更新后 node --experimental-vm-modules scripts/check.mjs 检查 224 个模块通过；npm test 561 项通过、0 失败。本任务新增 7 项规则测试，其中覆盖全目录每个部件的报价/提交/独立等级，以及旧档、保存失败回滚、重复提交、上限、资源不足、正式余弹与冷却、耐久比例、秘境隔离及试射。浏览器执行 workshop-components-browser/mobile/edges/visual/scene，以及更新后的 immersive-workshop-browser/boundaries；最终集成场景再次验证通过。

关键修订：脉冲炮预览补全蓄力/弹仓/后坐状态；异常后清空 Canvas 保存栈和裁剪；画布使用明确宽高避免内在尺寸撑大；短枪连接点按实际结构校正；无效拖动恢复旧热点，避免在另一个连接点施工；满级禁施工，施工完成抑制尾随点击，避免重复草稿。

不适用：新角色源视频、序列图集生成、地形或水界修改。本次没有改动这些资源；保留现有运行时和检查。结论：通过，无待修订项。确认版本 immersive-workshop-v02。

## 8 中央展示空间 v03（制作规格）

目标：响应中央武器展示面积过小的反馈，收紧两侧货架，将多余纵向留白分配给工作台。参考用户本轮无人机截图与 v02 工坊；沿用木框、森林绿描边、奶油底色和中文字体。只修改展示布局与展示镜头，正式战斗比例、部件轮廓、握持点、碰撞和养成规则保持。

规格：桌面弹窗最大宽度 1320px，货架 124px、托盘 148px，舞台高度按视口分配且切换装备/炮塔检修时不变；小屏使用横向货架及托盘，保留工具与连接点同屏。画布像素宽高匹配展示比例，主画布与施工层共享尺寸及连接点换算，每层最多 264000 像素，工坊总 Canvas 仍小于 5 MiB。无人机/浮游炮仅在展示镜头中拉近，原主体、控制器分层及真实动画保留。无新字体、贴图、视频或组合缓存。

正式入口：src/ui/workshop.js#createWorkshop、src/rendering/workshop.js#workshopLayout / drawWorkshopEquipment；designCriterion：workshop-stage-space。验收覆盖桌面及 320/390、原截图相近竖屏、部件拖入/工具施工/炮塔切换、窗口缩放后连接点及昼夜同屏。建筑、道路、水界未改动，沿用正式场景通过实际运行确认。

### v03 验收结果（2026-10-22）

结论：通过。designCriterion 为 workshop-stage-space，布局、画布比例及装配交互已在正式运行界面复核。

- 桌面 1024×1100 中央有效画布 635×630，1280×960 为 891×490，1920×1080 为 955×610；收紧两侧货架及参数卡，工作台使用原空白区。标题不再因定位货架而滚出上沿。preview-1024/1280/1920.png 已审阅。
- 手机 320/390 有效画布分别 261×209、331×209；托盘移到参数前，零件、工具与连接点同屏。draft-320/390.png、mobile-320/390-draft.png、mobile-320/390-turret.png 已审阅。实际触摸施工、取消、资源来源及退出草稿通过。
- 桌面鼠标和键盘施工、52 种车体/炮塔预览、反复页签切换、保存失败重试及试射通过。检修部件前后舞台宽高不变；保留试装从桌面缩到手机，画布和热点同步，键盘继续施工仅升级一次。interaction.webm 留存触摸操作，desktop-trial.png 留存试射。
- scene-{320/390/1280}-{day/night}.png 与 workbench-{宽度}-{day/night}.png 留存并复核正式猫、怪物、载具、工坊、场景和 UI。昼夜可读、屋前道路仍通畅；正式角色动作和战斗绘制未改动。复用旧场景脚本时将测试夹具的旧季节值 green 改为 summer，重新截图，避免测试直接赋值产生无效 HUD 标签。
- 项目 224 模块检查通过；16 项工坊规则测试通过；新增 workshop-stage-space 浏览器验收以及已有 workshop-components-browser/mobile 回归通过。隔离服务端口 4197，不读取或修改玩家正式存档。
- 主画布与施工层共用像素预算，每层不超过 264000 像素；布局验收最大 DOM Canvas 为 4,761,808 字节（4.54 MiB），小于 5 MiB，无新增运行图集、字体和组合缓存；地面缓存不超过 32 块。观察器随工坊实例销毁释放。

证据根目录：output/playwright/workshop-stage-space/。长期参考：docs/art-reference/workshop-stage-space-desktop-v03.png、workshop-stage-space-mobile-v03.png。正式入口与合同已登记。新源视频、动作图集、地形和水界修改不适用；本轮仅布局与 Canvas 尺寸同步。确认版本 immersive-workshop-v03。

## 9 可击毁试射靶标 v04（制作规格）

目标：修复靶标无限血量且每帧回血造成的持续攻击首靶。靶标固定 54 耐久，沿用五个原有靶位和正式攻击、致命命中特效、死亡回收与重新索敌；剩余靶位按固定编号保持。被击毁后从画面移除，底栏短标签显示击破数量；再次试射复原全部靶标。保留射程限制，不改变武器属性或远靶距离。靶标击毁不产生金币、木材、材料、熟练度或击杀奖励。

制作路线：仅会话规则和状态文案修改，不新增/修改位图、字体、程序化靶标轮廓、场景或动作。原有透明画布、锚点、分层、材质和配色不变；主画布及施工层仍各 264000 像素以内，无新缓存。正式入口 src/core/workshop/workshop-trial.js#createWorkshopTrial、src/rendering/workshop.js#drawWorkshopTrial、src/core/game.js#hit。designCriterion：workshop-trial-targets。验收需实际观察靶标消失、切换攻击目标与计数，并验证当前/试装隔离、重开重置和正式奖励仍正常。

### v04 验收结果（2026-10-22）

结论：通过。workshop-trial-targets 已登记到 visual-contract.json 的交互验收入口，绘制复用 src/rendering/workshop.js#drawWorkshopTrial 与正式命中特效；没有另做演示模型。

- 1280 桌面当前无人机、320 手机试装无人机、390 手机气垫船脉冲炮，十秒均击破 5/5；首靶消失后连续转向其余靶标。hit-1280/320/390.png、end-1280/320/390.png 和 targets.webm 留存。再次试射从 0/5 开始，当前/试装各自独立；正式资源、熟练度、弹药和击杀数前后相同。
- 新规则回归验证手枪、无人机、车载炮塔伤害跨帧累计、连续击破至少两个靶标、剩余靶位按编号不串位、不发放奖励、重新开始恢复耐久与十秒后停止。工坊 17 项测试通过，全项目 566 项测试通过；224 模块检查通过。
- 复用正式场景验收脚本，桌面与 320/390 昼夜同屏、建筑入口、暂停/恢复及缓存预算通过，证据为 scene-* 与 workbench-*。无轮廓、配色、字体、战场动作或碰撞修改，现有猫、怪物、载具、工坊和门前道路保留。画布预算仍小于 5 MiB，地面缓存不超过 32 块。
- 只增加每个试射会话最多 5 项靶位映射；关闭后随隔离会话释放，无运行图集或缓存增量。54 耐久对所有当前/试装方案一致，不根据升级提高靶标耐久，避免抵消升级效果；超出真实射程的远靶不会被强行命中。

证据：output/playwright/workshop-targets/，使用隔离端口 4197。长期参考 docs/art-reference/workshop-targets-hit-v04.png、workshop-targets-cleared-v04.png。新视频源素材、贴图生产、地形/水界及新动作资源不适用。确认版本 immersive-workshop-v04。

合并复核：同步 master 的四季材质渐变与圆环计时后，226 模块检查通过；重新执行桌面/320/390 昼夜、建筑入口、暂停恢复及预算实机检查并审阅截图，未发现工坊或试射回归。

## 10 连续补靶 v05（制作与验收范围）

在 v04 可击毁靶标基础上，十秒试射期间每批五靶全部击破后，同帧在原位置补满一批；单靶死亡不提前补齐。使用新固定编号与相同 54 耐久，原靶位记录清空复用，最多记录五项。保留飞行中弹丸、弹药、装填、武器冷却、真实索敌及独立随机流。计数改为“第 N 批 · 累计击破 N”，重新试射归零，结束或关闭后不继续生成。

仅会话规则和短状态文案变化，无新增/修改美术资源、靶标轮廓、动画、锚点、画布、场景或碰撞。沿用 v04 配色与正式命中/靶标绘制，designCriterion 为 workshop-trial-targets；无需新图集和缓存，画布预算保持小于 5 MiB。正式入口为 src/core/workshop/workshop-trial.js#createWorkshopTrial、src/ui/workshop.js#createWorkshop 和原 src/rendering/workshop.js#drawWorkshopTrial。

### v05 验收结果（2026-10-22）

通过。18 项工坊规则测试、226 模块项目检查通过；新增回归覆盖单靶死亡不补齐、连续 20 批原位补满、固定新编号、累计击破、不补弹、不重置冷却、不结算奖励、十秒结束停止及重开归零。

实际浏览器：1280 桌面当前无人机第 4 批累计击破 18；320 手机试装无人机第 4 批累计击破 19；390 手机车载脉冲炮第 2 批累计击破 6。全部真实试射操作验证新一批出现后继续被攻击，正式资源、熟练度、弹药和击杀数未变化。refill-1280/320/390.png、end-1280/320/390.png 及 refill.webm 已留存，短状态栏在手机清晰可读。

本轮复用正式场景再次核对桌面与 320/390 昼夜、角色/怪物/载具/工坊/HUD 同屏、建筑入口及暂停恢复，结果通过；scene-*、workbench-* 留存，门前道路与原有动作保留。画布与地面缓存预算检查通过，无新绘制资源或组合缓存。地形、水界、源视频和新动画制作不适用。

证据根目录 output/playwright/workshop-refill/；长期参考 docs/art-reference/workshop-refill-v05.png。正式绘制入口及 workshop-trial-targets 合同已更新。确认版本 immersive-workshop-v05。

## 11 手机避让施工 v06（制作规格）

目标：手机按住位置移至工作台下方，手指不遮挡装备、紧固件与焊点。先拖工具到连接点就位，再按住下方“按住施工”；松手暂停，可继续。桌面保留连接点直接施工，键盘保留空格施工。无效放置、指针取消与切换不扣费。

沿用木色工具条、森林绿描边、奶油黄按钮及正式工具绘制，不增加图集、字体、画布或缓存。下方触控区至少 48px 高；舞台与工具连接点尺寸、锚点、分层保持，施工进度同时在工具及下方控制区表达。减少动态设置保持有效。正式入口 src/ui/workshop/construction.js#createWorkshopConstruction、src/rendering/workshop-tools.js#drawWorkshopTool，designCriterion：workshop-touch-construction。验收包括 320/390 真实触控、桌面鼠标、键盘、暂停续作/取消/切换、昼夜同屏与画布预算；地形、碰撞、角色动作和源视频制作不适用。

### v06 验收结果（2026-10-22）

结论：通过。手机先拖工具到连接点就位，再在工作台下方按住施工；触摸停留在装备连接点不会推进，手指可移开看清替换件和工具动作。下方按钮高度 48px，手机舞台与按钮间约 60px；进度环留在设备上，下方同步百分比和暂停状态。桌面原有鼠标连接点施工、连接点空格施工与新增下方空格施工均通过。

- 320/390 真实触摸分别完成武器与载具升级：无效放置不启用施工；松手保留进度且不扣费，续作只结算一次；指针取消清空进度，页签切换停止旧会话。扳手及焊枪均实操留图，减少动态模式保留位置和进度。新的下方按住区没有缩小原有工作台。
- tests/workshop-touch-construction.cjs、现有 workshop-components-mobile.cjs 浏览器回归通过，页面无异常；炮塔面板尺寸、资源说明、草稿关闭提示保持正常。同步 mechanical-core-browser.cjs 的触摸施工步骤。18 项工坊规则测试通过；同步 master 最新环境档案后 239 模块项目检查通过。
- tests/workshop-touch-scene.cjs 在桌面及 320/390 手机保存昼夜实际场景和工坊截图。角色、怪物、载具、工坊、道路与 UI 同屏复核通过，原有动作和建筑入口暂停/关闭恢复保持。正式复核入口 workshop-touch-construction 连续采样产生 3 个不同工具动作帧。
- 最大工坊 DOM Canvas 4,821,352 字节（约 4.60 MiB），小于 5 MiB；每个舞台层仍不超过 264000 像素，地面缓存不超过 32 块。无新增运行图集、字体、画布或组合缓存；仅新增按钮与会话状态。源视频、位图生成、地形和碰撞修改不适用。

证据根目录 output/playwright/workshop-touch-construction/：active-320/390.png、wrench-320/390.png、vehicle-320/390.png、desktop.png、scene-*、workshop-*、construction.webm、construction.log、scene.log、mobile-regression.log、review.log。长期参考 docs/art-reference/workshop-touch-construction-v06.png、workshop-touch-vehicle-v06.png。正式绘制器仍为 src/rendering/workshop-tools.js#drawWorkshopTool，交互为 src/ui/workshop/construction.js#createWorkshopConstruction；visual-contract.json 和 src/rendering/visual-review.js 已登记 designCriterion：workshop-touch-construction。确认版本 immersive-workshop-v06。

## 12 清晰施工动作 v07（制作规格）

目标：扳手可辨认往复棘轮拧动与螺栓逐步紧固；焊枪喷嘴沿短焊缝移动，留下连续焊点；换件拆出、对齐、装入三个阶段清楚可辨。手机工具按屏幕逻辑尺寸绘制，约 60–75px，不再随内部画布缩成小图标。保留下方长按区、1.5 秒施工、暂停/取消与原子扣费。

换件约 1.1 秒，仅移动真实独立部件，主体与握持点固定。新增并排部件对照，使用正式 drawEquipmentPart 同角度、同倍率显示旧件与新件，点击查看整件施工前/试装后；提交成功后仍可比较，切换装备或新方案清理。本轮不改变部件数值、结构规则、战场动作或碰撞。

沿用森林绿描边、木色工具柄、奶油色高光、有限焊接火花（最多 6 条）、无全屏闪烁。减少动态时不摆动、不飞溅，保留阶段状态、焊缝进度和前后对照。透明施工层复用，两个 120×72 对照小画布增加 69120 字节，整个工坊仍低于 5 MiB，无图集/字体/缓存新增。正式入口 workshop-tools.js、workshop-assembly.js、workshop.js，designCriterion：workshop-construction-clarity。需 320/390/桌面真实拖动、按住、暂停及切换录制，实际昼夜同屏复核。位图生成、源视频、地图通行修改不适用。

### v07 验收结果（2026-10-22）

结论：通过。工具按屏幕逻辑尺寸绘制，手机扳手约 60px 高，明显受力/回程且螺栓仅向紧固方向转动；焊枪沿短缝推进并留下焊珠，最多 6 条短火花。松手保持姿势与进度，减少动态关闭摆动、喷嘴移动和火花，保留静态焊缝与进度环。插槽装饰在动作期间隐藏，保留命中区域与键盘焦点，避免遮住工具头。

- 换件从 0.4 秒改为 1.1 秒，分拆出、对齐、装入三阶段，真实旧件与新件分别移动，车体两侧护板成对替换，主体保持静止。部件对照使用正式结构同倍率绘制，手机固定两行短标签，整件前/后切换与对照一致；施工完成后仍可回看，选择新部件、换装备/页签或关闭即释放快照。
- tests/workshop-animation-browser.cjs 覆盖 320 手机武器扳手、390 手机武器焊枪、320 手机装甲、1280 桌面动力、390 手机脉冲炮塔焊接。检查阶段画面、连续工具帧、暂停姿态、前后图像差异，以及提交后旧图/新图与提交前各自完全一致；切换清理与减少动态通过，页面无异常。复用 workshop-touch-construction.cjs 的真实触摸、鼠标、键盘、取消、重复结算与可视区域回归通过。
- 昼夜实机：复用 workshop-touch-scene.cjs，在 320、390、1280 宽度保留 scene-* / workshop-*，实际同屏检查猫、怪物、载具、工坊、道路及 UI，建筑进入暂停和退出恢复均正常。正式 visual-review 入口 workshop-construction-clarity 连续采样 10 个不重复动作帧，已登记到 visual-contract.json 的可选案例及 designCriterion。
- 18 项工坊规则测试、240 模块语法/导入/分层/循环检查通过。新增两幅 120×72 局部对照画布共 69,120 字节；实测最大工坊 DOM Canvas 为 4,926,472 字节（约 4.70 MiB），小于 5 MiB。地面缓存不超过 32 块；没有新运行图集、字体或组合缓存，只保留一份本次施工前的内存快照，关闭清理。

修订记录：初次实机复核发现桌面对照区将施工按钮挤到底栏后，已改为对照与试射同排；手机插槽装饰遮住工具头，已在施工中隐藏；320px 标签拆行，已改为独立标题/等级两行。修订后重新实操检查通过。位图生成、源视频、地形/通行和战场动画修改不适用。

证据：output/playwright/workshop-animation/ 下 *-remove/insert.png、*-wrench-a/b.png、*-welder-a/b.png、*-complete.png、reduced.png、scene-*、workshop-*、construction.webm 与 interaction/input-regression/scene/review.log。长期参考 docs/art-reference/workshop-wrench-v07.png、workshop-welding-v07.png、workshop-replacement-v07.png。正式绘制入口 src/rendering/workshop-tools.js#drawWorkshopTool、workshop-assembly.js#drawWorkshopReplacement / drawWorkshopPartComparison；designCriterion：workshop-construction-clarity。确认版本 immersive-workshop-v07。

合并复核：同步 master 的自然历法累计改动后，241 模块项目检查通过；重新执行桌面及 320/390 昼夜实机、建筑暂停恢复与画布预算检查，全部通过。工坊交互与正式战场显示未发生回归。

## 13 施工完成反馈 v08（制作规格）

目标：提交成功后工具离开连接点并收回，随后以短暂描边收拢和静态角标突出刚升级的真实部件；手机同屏显示部件名称、等级变化及最多三项实际属性“旧值 → 新值”，无长段说明。沿用下方按住、旧件/新件对照及正式属性计算。失败或取消不得出现成功标记。

完成工具收回约 0.35 秒，局部强调约 0.8 秒后停止动态，保留细描边；车体左右成对部件同时标记。主体不缩放、不移动，不盖住部件。减少动态直接显示静态描边和数值。完成摘要置于工作台下方、前后对照上方，手机 320/390 无需滚动可见，字体沿用现有字体，森林绿/奶油黄配色。切换、关闭、试射清理动画；查看旧外观不画新件高亮。

复用施工透明层，不新增画布/图集/缓存；工坊画布预算仍低于 5 MiB。仅内存保存本次升级结果，提交仍一次校验扣费，反馈不触碰战斗、存档或随机状态。正式入口 src/rendering/workshop-completion.js、src/ui/workshop/completion.js、src/ui/workshop/results.js，designCriterion：workshop-completion-feedback。验收需武器/炮塔/载具、触摸/键盘、收回/高亮/静态结果、失败/重复/切换、减少动态及昼夜同屏。地图边界、源视频、位图和战场动作制作不适用。

### v08 验收结果（2026-10-22）

结论：通过，确认版本 immersive-workshop-v08。保存成功后先收回工具，再用奶油黄衬底、森林绿角框标出实际升级位置，最终停帧保留；车体成对部件同时强调。部件内的结构保持完整可见，主体尺寸和工作台位置不变。结果卡仅显示部件、等级及正式属性旧值→新值；320 像素脉冲炮三项属性改为三行，390 和桌面保留并排，避免数字挤压。施工前后局部与整件切换继续有效。

- 实际触控完成 320 武器伤害、390 脉冲射速、320 装甲、390 独立炮塔射程和桌面动力升级；已人工审阅收回与完成截图。320 三项精确数值、结果卡和整件外观同屏可见；键盘焦点不再用插槽外圈盖住完成高亮。减少动态直接显示静态结果。
- tests/workshop-completion-browser.cjs、tests/workshop-completion-edges.cjs、既有 tests/workshop-touch-construction.cjs 浏览器检查通过，页面异常为零。覆盖真实触摸/鼠标/空格、松手暂停、无效放置、指针取消、保存失败保留草稿且零扣费、重复完成零二次扣费、完成后松键不擦除描边、前后回看，以及完成动画期间切换清理。边界脚本使用独立进度，可单独重跑。
- 18 项既有工坊规则与 4 项完成摘要测试通过；同步 master 的自然进度续接后，244 模块语法/导入/分层/循环检查通过，另 9 项自然时钟集成规则通过。摘要验证炮塔独立等级、脉冲三个正式时钟、容量/装填/射程/精度/协同模块、指定车型动力/耐久和小数精度。
- src/rendering/visual-review.js#renderVisualCase 的 workshop-completion-feedback 正式入口在 0、0.16、0.4、0.7、1.2 秒连续采样获得 5 个不同画面，连接点由正式布局及部件定义计算。实际交互录制 construction-feedback.webm 同时保留收回过程、触摸完成与回看。
- 桌面 1280×960、手机 320×844/390×844 昼夜实际场景和工坊共 12 张截图已复核，正式角色、怪物、载具、建筑与 HUD 比例及遮挡保持；道路、入口暂停/退出恢复通过。工作台没有扩大碰撞或改变地形与战斗动作。
- 工坊 Canvas 峰值 4,926,472 字节（约 4.70 MiB），低于 5 MiB；舞台两层仍各不超过 264000 像素，地面缓存不超过 32 块。新增三个运行模块共 5583 字节源文本；没有新位图、字体、画布、等级组合缓存或常驻动画，完成表现约 1.2 秒后停表。

证据目录：output/playwright/workshop-completion/（browser.log、edges.log、touch.log、formal.log、scene.log、收回/完成及昼夜截图、construction-feedback.webm）。长期参考：docs/art-reference/workshop-completion-v08-phone.png、workshop-completion-v08-vehicle.png、workshop-completion-v08-desktop.png。对应 designCriterion：workshop-completion-feedback；正式绘制 src/rendering/workshop-completion.js#drawWorkshopCompletion、交互 src/ui/workshop/completion.js#createWorkshopCompletion、属性 src/ui/workshop/results.js#workshopResultChanges。

## 原位用途及费用预览（2026-10-22）
点击部件/套件/炮塔即在原底栏显示用途与正式报价，免费选择不创建草稿。底栏固定占位，拖放后不再增高遮挡属性。规格、手机/桌面昼夜截图和回归结果见 [原位详情任务单](workshop-inline-details.md)，designCriterion 为 workshop-inline-details。


## 持续试射修正（2026-10-22）

本次只移除试射会话的十秒时限，沿用现有正式绘制器与全部美术素材；伤害、冷却、弹药、每批五靶、54耐久、原位整批补靶和独立随机流不变。计时显示改为累计秒数，点击“结束试射”撤销动画回调并释放会话；关闭工坊、切换装备的既有清理保留，后台及嵌套弹窗继续暂停。此前版本记录中的十秒停止为历史行为，以本节为准。

验证：19项工坊/部件规则测试及249模块语法、导入、分层检查通过。三级机械蜘蛛连续运行30秒，十秒后仍增加击破和批次；零步长冻结，来源进度不变。整批补靶跨过十秒后仍不补弹、不重置冷却。

实际浏览器：1280桌面机械蜘蛛从10秒14次击破继续到13秒18次；320手机试装蜘蛛从17继续到21；390手机车载炮塔从6继续到8。三种场景均验证点击结束后计时停止且面板关闭、再次试射归零，正式资源/熟练度/弹药/击杀前后相同，页面异常为零。截图确认持续计时与结束按钮可见。证据：output/playwright/continuous-trial/continuous-result.json 与 end-1280/320/390.png。此次无图元或动作制作变更。

## 工作台右上角操作 v09（2026-10-23，制作规格）

目标：将试射与驾驶（武器页为装备）移到中央预览右上角；原厂恢复、召唤配置等操作保留原区域。参考用户红框，沿用奶油底、森林绿边与现有字体；两个按钮横排，最小触控区44×44，手机缩小字距和内边距。锚点为工作台内容盒右上角，按钮层级3、试射层级4，保持左上当前/试装标签和中央插槽可见。空操作行收起，属性更靠近预览。

纯 DOM/CSS 排版：不新增插画、字体、Canvas、缓存或动画；正式装备形体、动作、碰撞、道路、战斗数值与存档不变，因此源视频、图集制作及通行修改不适用。正式入口 src/ui/workshop/markup.js、src/styles/workshop.css；复核入口 inspectWorkshopStageActions，designCriterion 为 workshop-stage-actions。

验收计划：桌面、390/320手机昼夜截图；鼠标/触摸/键盘试射及结束、驾驶、草稿禁用、工坊关闭和切换；检查顶角定位、标签和插槽无遮挡、无横向溢出。结果待实际运行填写。

### v09 验收结果

通过。1280×900桌面、390×900及320×900手机昼夜共6组实机检查，按钮位于舞台右上角且同行，左侧状态标签与中央插槽无遮挡，无横向溢出；手机两个触控区均为44×44，桌面48×44。人工复核正式坦克、武器及昼夜场景截图，保持装备比例与地图中角色、怪物、车辆、建筑关系。试射时操作入口隐藏并退出键盘焦点顺序，结束后恢复。

针对性回归 tests/workshop-stage-actions-browser.cjs 通过：鼠标与CDP真实触摸启动试射、键盘结束/启动、免费试装禁用驾驶、切换取消草稿、正式上下车关闭工坊、已装备状态；页面异常0。首次脚本误用“武器部件”页签寻找挂载项，改为现有“挂载武器”入口后完成验证，未修改页签功能。修改模块及浏览器脚本语法、JSON解析、git diff空白检查通过，不运行无关全量测试。

证据：output/playwright/workshop-stage-actions/ 内 result.txt、scene-{1280,390,320}-{day,night}.png、workshop-{1280,390,320}-{day,night}.png、weapon-320.png。正式复核 inspectWorkshopStageActions；designCriterion：workshop-stage-actions。Canvas峰值5,046,352字节（约4.81MiB），低于5MiB，无新增画布、运行素材或缓存；仅新增DOM容器与定位样式。静态按钮迁移无需动作素材或连续帧制作。


## 2026-10-24 熟练度可见性与提升指引

制作目标：装备名称下增加紧凑熟练度条，区分装备等级与熟练等级；明确当前经验、下级门槛、套件2级解锁及缺口，问号展开实际获得途径。普通车载枪显示自身型号的共享熟练度，车体和专属主炮明确无需熟练度，不新增养成规则。

设计规格：沿用森林绿／奶油黄与现有字体；常驻信息最多三行，说明使用独立二级弹窗。HTML进度条与文字沿工作台文档流布局，不覆盖画布或属性、不改变舞台绘制锚点；问号触控区至少44像素。保留草稿、主弹窗暂停归属、手持枪及载具全部动作。新增贴图、音频、画布和缓存预算均为0；桌面、390/320宽度检查进度、锁定提示及嵌套弹窗的焦点和关闭行为。

### 本轮验收结论：通过

- 正式入口：`src/ui/workshop/mastery.js`、`src/ui/workshop/markup.js`、`src/styles/workshop.css`；`visual-contract.json`与`src/rendering/visual-review.js#inspectWorkshopMastery`登记 `workshop-mastery-guidance`。
- 27项针对性规则通过：`node --test tests/workshop-mastery.test.mjs tests/mastery-mods.test.mjs tests/workshop.test.mjs tests/workshop-lifecycle.test.mjs`。覆盖0/16/39/40/120/280/550经验、共享炮塔、正确型号、专属炮与车体无门槛、套件锁定差额、基础部件不被拦截、试装零经验、旧档、真实击杀归属及保存事务。
- 浏览器实际操作：键盘选套件并试装，16/40时确认禁用且提示缺24点；真实触摸打开问号，Esc关闭后焦点回到问号，保持工坊暂停与相同草稿；切换枪械、车载枪、专属主炮、电动车、满级状态，关闭工坊恢复游戏。
- 1280×900、390×844、320×844昼夜：信息条紧随装备名、说明弹窗无溢出；问号触控区44×44，画布及资源栏保持原有布局，详细规则只在二级说明显示。复核期间修正移动端信息条排在装备名前及帮助按钮未套用配色的问题。截图 `output/playwright/workshop-mastery/weapon-{1280,390,320}-{day,night}.png`、`help-{1280,390,320}-{day,night}.png`、`turret-320.png`、`native-320.png`。
- 角色、怪物与载具的正式昼夜同屏：`scene-{1280,390}-{day,night}.png`；没有改动碰撞、通路、姿态、武器或载具绘制。此项为回归观察，不声称生产了新动作。
- 浏览器 `tests/workshop-mastery-browser.cjs`，结果 `output/playwright/workshop-mastery/browser-report.txt`，无页面异常。界面不新增动画，减少动态沿用原样；没有新增素材、画布、位图缓存或常驻世界实体。
- `git diff --check`通过。项目总检查仍被原有`config/living-world.js → world/paths.js`依赖错误阻塞；本轮未运行全量测试。
