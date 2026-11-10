# 公共设施搬迁与营地外围布局

本轮复用既有正式建筑、桌台、栖架及消防站绘制器，按[美术标准](../art-generation-standard.md)检查搬迁后的真实场景；不生成新图片，不更改原尺寸、脚底、动作、昼夜材质及分层。新增行为为公共设施可选择、内外搬迁、外围100米上限和道路连接。

保留营地土地权限，外围建设不授予新地契；拦截水域、围栏、建筑、农田和树木。消防车库、侧门、上下车点跟随站房，生活居民依照新地点重新规划。手机 UI 复用原布局底板，触控保持44px。

验收目标：实际保存和回滚、读档、外围距离和水界、消防内外迁移、居民与碰撞同步；手机昼夜同屏和短屏页面。designCriterion 对应 uiFoundationCriterion、campManagement。无新增位图、动作或 PNG 精修项目。结果见下节。

## 验收结果：本次功能通过
- 新增公共设施与外围搬迁 3 项、布局及关联旧档 11 项、消防站专项 4 项通过；补充消防站从营地内放回原临河位置检查通过。保存失败不搬锚点，读档保留位置。
- 手机真实选择饭桌、栖架、旧哨站、消防站，方向按钮可用；外围保存后再次用触屏按钮移动饭桌并保存成功，消防站可由外侧移回内侧。
- 正式世界昼夜逐项复核四类设施，猫猫与建筑、围栏和支路同屏；消防库门及侧门形体保留，外围支路完整显示，公共道路与公交站受保护。未重做角色、车辆或建筑动作。
- 手机 320×568、390×844、430×932 页面无横向溢出；规划图包含外围设施，保留原图标和选择名称。无新 PC 布局。
- 证据：output/playwright/camp-public-facilities-outskirts/public-options.png、camp-day.png、camp-night.png、roost-day.png、roost-night.png、relay-day.png、relay-night.png、fire-day.png、fire-night.png、layout-320.png、layout-430.png、report.json、video/。
- 正式入口 createCampLayoutPanel、drawCampLayoutRoads、生活设施正式绘制器与消防站正式绘制器；designCriterion 为 uiFoundationCriterion 和 campManagement。新增位图 0 字节，沿用既有画笔；路网维持约五万格预算，消防缓存按布局失效。PNG精修与新增动画不适用。
- 已知基线问题：tests/fire-transit.test.mjs 的 5 项旧测试因消防任务对象为空失败，在未修改 main（2c55fa8）复现相同错误。本次不修改这些旧测试；新的消防站坐标、入库点及取水路径检查通过。
