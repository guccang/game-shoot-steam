# 营地房屋猫爪点击提示任务单

依据：[美术标准](../art-generation-standard.md)、[AGENTS](../../AGENTS.md)。

## 1 目标与范围

动态效果开发：将靠近营地房屋时的文字按钮、材料长说明以及地面“到达后点击修复”提示，替换为同一奶油色猫爪。保留玩家主动点击后的功能页、修复材料核验及施工倒计时。复用 index.html 中 Boss 教学的 SVG，不新增图片，不调用 imagegen；没有待精修位图。

## 2 造型与空间

沿用已有五指猫爪、粉色肉垫与森林绿描边，旋转朝向房屋屋顶。建筑、角色、道路、碰撞、修复区轮廓均不改变。一次只提示最近目标，按现有布局避开任务栏、角色和右下角状态栏。房屋入口、告示牌、工坊和已修复小屋共用样式；床、泊位等非建筑动作保留语义按钮。

## 3 技术交付

SVG viewBox 0 0 52 60，图形44×48 CSS像素，点击区域48×52像素。锚点使用正式 interaction-anchors.js，仍由镜头世界投影定位；DOM覆盖层不改变世界镜头。透明背景，新增图片和解码缓存为0。复用既有必需SVG模板，缺失时不使用替代图片。角色动画、武器、车辆和环境资源保持原有接口。

## 4 动画

猫爪1.5秒轻点循环，只在自身范围内移动3像素；减少动态设置关闭动画。提示随场景资格隐藏，弹窗开启、农具模式、施工中不叠加提示。文字留在无障碍名称中，原单次点击及目标变化防误触逻辑保留。

## 5 生成指令

没有图像生成；直接复用既有SVG。正式入口：src/ui/nearby-interaction.js、src/ui/operation-guide.js、src/styles/ui-foundation.css；修复区正式绘制入口 drawRestorationArea。

## 6 验收记录

设计目标：nearby-click-interaction，使用正式DOM和绘制器；验证移动、目标切换、昼夜、320/390手机尺寸、桌面既有竖版容器、点击进入及施工。

验收结果：通过。`tests/camp-house-paw-browser.cjs` 使用独立浏览器存档与4177隔离服务（4175已有用户服务），覆盖320×568、390×844、1280×900既有竖版容器，载具工坊、小屋、清缴告示牌的昼夜共18组画面。正式DOM无可见长文字，点击区48×52、无越界，移动不弹窗，主动点击打开修复页，已修复工坊打开升级页；减少动态关闭轻点动画，浏览器无异常。

人工复核：[工坊白天](../../output/playwright/camp-house-paw-garage-390-day.png)、[小屋窄屏夜晚](../../output/playwright/camp-house-paw-cottage-320-night.png)。猫爪与屋顶对应，原有角色、车位、任务栏、道路和建筑招牌可见；短屏优先收进安全区。其余16张证据同在 `output/playwright/camp-house-paw-*.png`，合并前复制至主工作区保存。

逻辑检查：interaction-anchors、workshop-entry-actions、town-restoration共27项通过。赠送电动车停车坐标旧测试失败（150与450不符），在未修改master上复现，和显示改动无关。未改变修复范围或施工流程。

PNG精修：不适用，复用已确认图形。新增资源预算：0张位图、1个复用SVG节点。动态效果开发结论：通过；本轮没有新增建筑或角色资产，无需新增序列帧或碰撞验收。


## 后续调整：移除房屋猫爪（2026-10-29）

目标：移除场景房屋的悬浮猫爪和重复文字指示，直接点击建筑本体。保留修复、升级、入屋、购种及场景拖动；停车和床边休息仍使用原操作按钮。原有屋顶猫爪入口改为贴合建筑本体的透明热点，复用 scene-hit 的投影和输入规则，不新增素材或改变建筑、动画、镜头。清理专用猫爪节点、动画、避让函数及重复按钮样式；同步更新验收脚本。范围不包含面板内操作教学与 Boss 挑战提示。

验收通过：`tests/camp-house-interaction-browser.cjs` 替换旧猫爪显示验收，独立触摸上下文覆盖320×568和390×844、白天/夜晚、车库/小屋/清缴告示牌共12张画面，猫爪节点不存在、无可见指示文字、热点跟随建筑本体且至少44px。正式触摸验证修复详情、工坊升级、种子购买、小屋进入和床边休息均正常；从透明热点切换到床边按钮无样式残留，移动目标不自动弹窗，页面错误0。用于画面采样的角色位置由夹具设置，未宣称完成自然移动全流程。

人工复核 `output/playwright/camp-house-interaction-garage-390-day.png` 与 `output/playwright/camp-house-interaction-cottage-320-night.png`，建筑、角色、道路、招牌和任务卡正常，房屋上方无猫爪；共12张证据复制到主工作区。正式入口 createNearbyInteraction、placeSceneHit、inspectNearbyInteraction；designCriterion 为 nearby-click-interaction。

清理：删除专用 building-hint-layout.js 及其失效布局测试，移除猫爪克隆节点、data-paw/data-house、循环动画、安全区避让变量，合并重复按钮配色，更新镜头验收与合同引用。本次只复用既有 scene-hit 投影，无新增图片、动画或绘制缓存；PNG精修不适用。

针对性逻辑检查11项通过。另1项旧镜头夹具报 this.recoverContext is not a function，在未修改主分支运行同一项确认同样失败，本次未改该夹具与Renderer。语法、差异空白检查通过；没有运行全量测试。
