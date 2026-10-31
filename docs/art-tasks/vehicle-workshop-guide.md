# 载具工坊与任务引导任务单

依据[美术标准](../art-generation-standard.md)、[任务单模板](../art-generation-brief.md)、[手机框架](../ui-foundation.md)。2026-10-27。

## 1 目标与范围
载具工坊统一点选操作 / vehicle-workshop-guide。左侧车型列表独立划动，右侧车体/炮塔预览；升级点选试装、预览属性费用、长按确认；挂载点选预览后确认。更新武器/载具主线引导，定位可见控件。参考 docs/art-reference/workshop-compact-cost-detail.png 和 workshop-tap-cards.png。

## 2 结构与保留项
沿用森林绿、奶油色、浅草绿底板与原按钮。购买、升级、挂载、成长分开；车体与武器部件显式切换，挂载目录分页，取消不扣费。保留正式交易、独立车体和主炮成长、武器绘制、试射、换乘与草稿保护。地形衔接、世界活动空间、通行和邻接组合不适用：不改世界实体或碰撞。

## 3 尺寸、锚点与分层
覆盖320×568、390×844、430×932、844×390；宽屏只验证现有手机容器。44px最小触控区；正式舞台及独立部件锚点不变，DOM按钮放在画布外。复用现有画布及SVG，无新图集、视频、缓存或运行资源。原双舞台各264000像素预算不增加。截图存 docs/art-reference，完整证据存 output/playwright/vehicle-workshop-guide。

## 4 动画与制作
复用正式独立部件替换和施工动画、车辆演练；不修改猫身体、履带、旋翼或战斗动作。HTML/CSS/JS 实现，不生成位图，不缩小整屏代替布局，不遮掉溢出内容冒充通过。引导保留真实交易，不自动替玩家付款。

## 5 验收计划
车体/专属主炮/挂载武器升级、取消和暂停、挂载与购买、无武器电动车、车型筛选、缺料、手机昼夜与横屏、主线任务连续步骤、演练返回及武器回归。

## 6 验收记录
使用 Chromium 的手机触摸环境实测；未接入实体手机。宽视口只验证现有手机容器，不新增桌面布局。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 统一布局、车型可辨 | 8 种车型的购买、车体部件、炮塔、挂载和成长共 80 个状态通过；[升级](../art-reference/vehicle-workshop-upgrade.png)、[挂载](../art-reference/vehicle-workshop-mount.png)。正式车型缩略图与整车保持独立比例。 |
| 手机单屏、触控与安全边界 | 320×568、390×844、430×932、844×390 与 1280×900 既有手机容器无详情滚动、内部溢出或屏外按钮；触控区至少44px。左侧目录允许独立划动。[横屏](../art-reference/vehicle-workshop-landscape.png)。 |
| 引导跟随真实控件 | 手机实际连续完成装甲、引擎、专属主炮、弹仓与供弹升级；错部件回到目录、完成摘要先提示继续升级；主炮入口不改变当前挂载或手持武器。[主炮引导](../art-reference/vehicle-workshop-guide-native.png)、[演练返回](../art-reference/vehicle-workshop-guide-trial.png)。 |
| 费用与正式交易 | 实际点选和触摸长按完成升级；付费购买挂载、已有武器免费挂载、取消不扣费；缺料禁用、满级禁用、空目录返回购买均通过。[缺料](../art-reference/vehicle-workshop-shortage.png)。 |
| 动作衔接与独立部件 | 保留现有替换动画、真实连接点与长按施工；触摸取消暂停并可继续操作，更换部件释放草稿。实测没有生成独立车辆动作或改动战斗动作，因此源视频、逐帧图集和驾驶动作重制验收不适用。 |
| 昼夜可读与同屏 | 正式场景设置白天/夜晚，保留角色、召唤车辆、生成怪物与环境运行绘制，工坊覆盖其上；[手机白天](../art-reference/vehicle-workshop-day.png)、[夜晚费用预览](../art-reference/vehicle-workshop-preview-night.png)、[宽容器白天](../art-reference/vehicle-workshop-wide-day.png)、[宽容器夜晚](../art-reference/vehicle-workshop-wide-night.png)已人工检查。战场被模态工坊遮挡的部分沿用既有行为。 |
| 遮挡与通行 | UI与画布分层保留，按钮未遮挡车型主体；不修改实体、碰撞、地形及移动边界，绕行/水界检查不适用。 |
| 资源预算 | 无新增运行图集、视频或缓存；复用原舞台、施工与缩略图画布。全部浏览器用例无页面异常；挂载单页4张画布，避免整目录常驻。截图仅作为文档证据。 |
| 武器回归 | 共用样式后，武器部件属性预览、套件点选安装与正式提交、成长页均通过。 |

验证命令：`node --test tests/operation-guide.test.mjs tests/workshop-catalog.test.mjs tests/workshop.test.mjs`，23项通过。隔离端口4310执行 `vehicle-workshop-layout-browser.cjs`（80状态）、`vehicle-workshop-guide-browser.cjs`（4截图状态及连续正式交易）、`vehicle-workshop-edges-browser.cjs`（14状态及边界交互），均无页面异常。完整截图保留于 `output/playwright/vehicle-workshop-guide/`。不运行全量测试。

正式入口：`src/ui/workshop.js#createWorkshop`、`src/ui/operation-guide.js#createOperationGuide`、`src/rendering/visual-review.js#inspectWorkshopFocus`；装备画布继续调用 `src/rendering/workshop.js#drawWorkshopEquipment`。

designCriterion：`workshop-vehicle-focus`（本轮）、`workshop-weapon-focus`（共用布局回归）、`workshop-function-tabs`（页面分区）。结论：通过本次界面与交互验收；长期参考图为上述入库截图。无待修订项。


## 2026-10-27 补充：原页续升与点选长按确认

本轮仅调整交互状态及共用底栏，沿用原绘制器、森林绿与奶油色、手机框架、画布尺寸、锚点与独立部件；不生成或替换美术素材。目标：升级结束保留当前操作页，刷新已保存等级、下一次属性和费用；改装与挂载点选即试装，长按确认才提交。满级与已安装方案禁用确认；切换方案、关闭及未完成长按不扣费。世界通行、碰撞、视频动作与 PNG 精修不适用本轮。

已完成 24 个交互界面样本及 16 个布局样本（Chromium 手机模拟，非实体手机）：320×568、390×844、430×932、844×390，及1280×900既有手机容器；昼夜读取正式场景，控件至少44px，无详情滚动或裁切，无页面异常。保留原图集及画布预算，无新增运行资源或缓存。

- 原页续升：[武器完成后](../art-reference/workshop-hold-weapon-completed.png)。
- 点选后长按：[手机夜晚改装](../art-reference/workshop-hold-modify-320-night.png)、[载具挂载](../art-reference/workshop-hold-vehicle-mount-320-night.png)。
- 复用既有容器：[载具夜晚](../art-reference/workshop-hold-vehicle-upgrade-1280-night.png)、[横持改装](../art-reference/workshop-hold-weapon-modify-844-day.png)。

专项脚本：`tests/workshop-stay-hold-browser.cjs`、`tests/workshop-stay-hold-layout-browser.cjs`。默认4175已被占用，本轮在隔离工作树4178执行。30项相关单元检查通过，涵盖正式交易、保存失败、结果数值、生命周期和任务指引；修正旧测试中写死的初始载具和主线任务数量。不执行全量测试。

正式入口：`src/ui/workshop.js#createWorkshop`、`src/ui/workshop/construction.js#createWorkshopConstruction`；画布仍使用 `src/rendering/workshop.js#drawWorkshopEquipment`，验收仍使用 `src/rendering/visual-review.js#inspectWorkshopFocus`。

对应 `designCriterion`：`workshop-weapon-focus`、`workshop-vehicle-focus`。本轮交互与界面验收：通过；截图已人工复核，原始完整截图位于 `output/playwright/workshop-hold/`，长期参考为上述入库图。无本轮待修订项。


## 2026-10-29 载具侧栏纯图标
目标：购买、升级、挂载及成长页的左侧车型目录移除可见名称和状态，只保留正式载具缩略图；图标从48×32同比放大30%至62.4×41.6 CSS像素。侧栏宽80像素容纳图标与滚动条，按钮至少60像素高，保留选中高亮、滚动和完整中文无障碍名称。右侧详情、正式交易及其他装备目录沿用原行为。复用原150×100画布和正式drawWorkshopEquipment，无新增资产、布局之外的绘制或缓存，无需PNG替换。对应workshop-vehicle-focus。计划在320短屏、390长屏及844横屏检查各页签、车型点选、昼夜画面与图标裁切。

验收通过：Chromium手机模拟320×568白天、390×844夜晚、844×390白天，各检查购买/升级/挂载/成长，共12个状态。侧栏可见文字为空，图标实测62.39×41.59像素（浏览器子像素取整），按钮73×60像素，图标未超出按钮，无横向溢出；逐页点击末项可正常选中，购买2辆及已拥有7辆共覆盖全部车型。武器页名称仍显示，页面异常0。人工复核短屏购买、长屏升级和横屏挂载画面，原车型轮廓与森林色系保留。截图与本次一次性验收脚本位于output/playwright/vehicle-sidebar-icons/，长期基准见[载具纯图标侧栏](../art-reference/vehicle-sidebar-icons.png)。本次仅检查所改目录及直接关联交互，未运行全量测试。默认4175占用，验收使用隔离工作树4176。

## 2026-10-30 当前战车属性与特性

目标：成长与升级页展示已保存车体的当前生命、动力和专属主武器属性；试装增量保留在底部预览。特性读取已生效规则：电动车玩家弹夹量 ×1.3、红狼树木可通行、气垫船河流湖泊可通行，并支持最多三条，不填充空槽。无特性车型明确显示暂无特殊特性。

沿用本任务单森林绿奶油色手机底板、既有正式车体画布、锚点与部件交互。信息区置于车体下方，短屏允许详情独立滚动，购买与武器页结构保持原规则。无新位图、动画、碰撞、世界通行或资源缓存；PNG替换和动作验收不适用此纯 DOM 展示改动。正式入口为 createWorkshop/renderStats、renderWorkshopStats、vehicleTraits，designCriterion 对应 workshop-vehicle-focus。验收通过：Chromium 320×568、390×844、844×390 × 昼夜 × 电动车/红狼/气垫船/金杯 × 升级/成长，共 48 个状态。属性与正式计算一致，特性不超过三条，详情无横向溢出且可滚动到底。试装不改变当前值，长按升级红狼装甲后当前耐久由1080刷新为1240，无旧比较残留。额外通过三词条窄屏、购买页和武器升级页回归，页面异常0。车型无熟练度门槛，成长说明缩为一行。默认4175占用，本轮使用隔离工作树4176；未运行全量测试。脚本保留于 output/playwright/vehicle-traits/，长期截图见下。

长期参考：[短屏升级](../art-reference/vehicle-stats-traits/upgrade-320-day.png)、[夜晚成长](../art-reference/vehicle-stats-traits/growth-390-night.png)、[三条词条布局](../art-reference/vehicle-stats-traits/three-traits-320.png)（三条示例仅为隔离内存验收，未给电动车增加通行能力）。
