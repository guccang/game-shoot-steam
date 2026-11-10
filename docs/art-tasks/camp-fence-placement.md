# 建筑贴围栏放置

依据美术任务单记录本次规则与道路调整，沿用正式绘制器。

## 1 任务与目标

用户截图 c8429781 后续的 0b822c15-e5f6-4ab2-99df-dd69e4e2d7e3、330cb1e1-8935-4da5-b127-e0b9dee216dd 显示种子快递站与围栏间隔偏大。本次支持侧面和背面贴近围栏，保留实体不穿栏、门前空间和营门转弯保护。

## 2 造型与空间

原围栏判定复用建筑互相避让的侧边24、背面20单位缓冲。新增独立围栏占地，按实际宽高额外留6单位；围栏自身仍有5单位厚度。门前95单位保留，停车场、牛栏、消防站等特殊轮廓保持专用规则。快递站道路改为24单位细路，沿用其他服务设施规则。

## 3 技术交付

src/config/camp-layout.js 的 campFenceFootprints、src/core/camp/camp-layout.js 的 checkCampPlacement 分离围栏与建筑间距；src/config/camp-roads.js 将 delivery 登记为细路设施。正式绘制仍为原建筑、围栏和营地道路模块。
不新增PNG、尺寸、锚点、透明图、缓存或素材；建筑层与地面道路层保持原层级，夜色继续由正式灯光处理。资源内存新增0。地图、权限、水域、公共道路和门前避让不变。

## 4 动画任务

不适用：建筑静态空间规则与道路宽度调整，不修改角色或载具动作。

## 5 生成方式

无 imagegen，复用程序道路与既有建筑，未生成新美术资源，无精修后续项。

## 6 验收记录

- designCriterion：camp-management-decor 的摆放、通路和真实场景一致。
- tests/camp-fence-placement.test.mjs 通过：西围栏内侧与东围栏外侧贴近保存，细路24，穿栏与挡门拒绝。
- tests/camp-layout.test.mjs 中七项布局、保存、权限、坐标和道路检查通过；两项写死旧边界坐标的测试失败，已在未修改主分支复现，不属于本次引入。
- tests/camp-fence-placement-browser.cjs 通过：手机布局选择快递站，向围栏移动并保存，昼夜正式场景显示正常，无页面运行错误。
- 人工查看 day.png、night.png：站牌靠近围栏，细路从南侧入口接入；角色、UI与站牌无新增遮挡。证据位于 output/playwright/camp-fence-placement/，包含 layout.png、昼夜截图、report.json 和 video/。
- 未修改手机UI、桌面布局、动作、图片与资产加载，不扩展这些模块验收。通过本次范围验收，不宣称旧测试全部通过。
