# 工坊紧凑费用区任务单

依据[美术生成标准](../art-generation-standard.md)、[任务单模板](../art-generation-brief.md)及[手机 UI 框架](../ui-foundation.md)。日期：2026-10-27。

## 1 目标与范围

武器升级费用底栏 / workshop-compact-cost。针对用户截图中金币木头分散、留白过多：材料靠左相邻排列，属性名称与变化同行，长按确认与费用并排。沿用森林绿、奶油色和浅草绿底板、原图标、正式报价及长按状态；只改武器升级草稿样式。参考上一轮 docs/art-reference/workshop-tap-preview.png 和用户费用区截图。

## 2 造型与空间

主体为武器预览；底栏以部件说明、属性变化、材料与确认三个层次紧凑排列。两种材料相邻，多材料单独一行，保证按钮可触达。地面衔接、邻接组合、世界活动空间均不适用：不改地形、实体或碰撞。底板明暗沿用统一 UI。

## 3 技术交付

HTML/CSS 原生布局，无新位图或画布；逻辑尺寸覆盖320×568、360×640、390×844、430×932和844×390；1280×900仅验证已有手机容器。锚点为原固定底栏，图标使用现有 SVG，44px触控区；DOM叠加层不改世界和武器绘制器。透明、图集、像素倍率不适用；无新增解码内存和缓存。源文件 src/styles/workshop-focus.css；证据保存 docs/art-reference 和 output/playwright/workshop-compact-cost。

## 4 动画补充

不新增或修改动画、连续帧、身体、武器或车辆；原试装、长按工具动画和暂停保留。仅检查本次布局是否影响按钮操作。

## 5 制作约定

使用原图标、原按钮材质和中文文案。减少资源格之间无意义间隔与属性纵向堆叠，不缩小触控面积，不裁切或隐藏属性/材料/不足提示；缺料与最多五种材料均需检查。

## 6 验收记录

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 减少空白、集中费用 | 常规两材料底栏112px；资源格间距8px，名称与属性变化同行；[费用区细节](../art-reference/workshop-compact-cost-detail.png) |
| 手机单屏完整 | 320×568、360×640、390×844、430×932、844×390和1280×900既有手机容器；22个正式界面样本通过，无内部滚动/裁切，触控区不小于44px |
| 三项属性与缺料 | 三项属性在窄屏换行，底栏133px；19级高价格与不足数量均完整显示；[高价格缺料](../art-reference/workshop-compact-cost-shortage.png) |
| 多资源容错 | 当前武器升级正式规则只收金币和木头；另用购买页五材料报价DOM作纯排版夹具，通过，不将其宣称为升级交易规则 |
| 点击与长按 | 金币、木头分别能打开来源说明，长按松手暂停不扣费，缺料禁用确认 |
| 昼夜与系列一致 | 人工查看[白天手机](../art-reference/workshop-compact-cost-day.png)、[夜晚手机](../art-reference/workshop-compact-cost-night.png)、横屏及宽屏原手机容器，沿用统一色彩与图标 |
| 动作、通行与预算 | 不修改动作或世界绘制；通行、绕行、实体遮挡不适用，无新增图集/画布/视频/缓存，浏览器无pageerror |

执行 `tests/workshop-compact-cost-browser.cjs`（22样本）和 `tests/workshop-compact-cost-edges-browser.cjs`（3个边界样本），均通过。只修改CSS，不运行业务单元测试或全量测试。手机为浏览器模拟，未声称物理设备验收。完整截图位于 output/playwright/workshop-compact-cost/。

正式入口：src/ui/workshop.js#createWorkshop、src/rendering/visual-review.js#inspectWorkshopFocus。
designCriterion：workshop-weapon-focus（紧凑费用区）。
结论：通过。


## 2026-10-27 补充：原页续升与点选长按确认

本轮仅调整交互状态及共用底栏，沿用原绘制器、森林绿与奶油色、手机框架、画布尺寸、锚点与独立部件；不生成或替换美术素材。目标：升级结束保留当前操作页，刷新已保存等级、下一次属性和费用；改装与挂载点选即试装，长按确认才提交。满级与已安装方案禁用确认；切换方案、关闭及未完成长按不扣费。世界通行、碰撞、视频动作与 PNG 精修不适用本轮。

已完成 24 个交互界面样本及 16 个布局样本（Chromium 手机模拟，非实体手机）：320×568、390×844、430×932、844×390，及1280×900既有手机容器；昼夜读取正式场景，控件至少44px，无详情滚动或裁切，无页面异常。保留原图集及画布预算，无新增运行资源或缓存。

- 原页续升：[武器完成后](../art-reference/workshop-hold-weapon-completed.png)。
- 点选后长按：[手机夜晚改装](../art-reference/workshop-hold-modify-320-night.png)、[载具挂载](../art-reference/workshop-hold-vehicle-mount-320-night.png)。
- 复用既有容器：[载具夜晚](../art-reference/workshop-hold-vehicle-upgrade-1280-night.png)、[横持改装](../art-reference/workshop-hold-weapon-modify-844-day.png)。

专项脚本：`tests/workshop-stay-hold-browser.cjs`、`tests/workshop-stay-hold-layout-browser.cjs`。默认4175已被占用，本轮在隔离工作树4178执行。30项相关单元检查通过，涵盖正式交易、保存失败、结果数值、生命周期和任务指引；修正旧测试中写死的初始载具和主线任务数量。不执行全量测试。

正式入口：`src/ui/workshop.js#createWorkshop`、`src/ui/workshop/construction.js#createWorkshopConstruction`；画布仍使用 `src/rendering/workshop.js#drawWorkshopEquipment`，验收仍使用 `src/rendering/visual-review.js#inspectWorkshopFocus`。

对应 `designCriterion`：`workshop-weapon-focus`、`workshop-vehicle-focus`。本轮交互与界面验收：通过；截图已人工复核，原始完整截图位于 `output/playwright/workshop-hold/`，长期参考为上述入库图。无本轮待修订项。
