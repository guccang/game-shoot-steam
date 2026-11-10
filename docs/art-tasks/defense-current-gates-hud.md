# 守门布局同步与状态栏任务单
## 目标与参考
依据美术生成标准与手机UI框架。参考本次两张截图：守门必须使用扩建、搬迁后的真实营门和围栏样式；状态栏紧贴HP下方，避开小地图。开发阶段程序实现，无新增图片。
## 造型与空间
沿用门、围栏、道路和奶油绿HUD。拒马、战区、出生点随当前门法向平移；站牌仍是独立玩法入口。窄屏内部换行，按钮保留44像素。
## 技术交付
世界坐标与已有门样式、地面层不变；当前营门由campBoundary读取。HUD按真实DOM边界布局。无新增位图与逐帧地图重建。
## 动画与生成
不修改角色/敌人/载具帧动画；不使用imagegen，沿用正式绘制器。
## 验收
- 8项针对性测试通过：tests/camp-defense.test.mjs与tests/defense-current-gates.test.mjs，涵盖北西门扩建搬迁、独立站牌、拒马/玩家位置、当前围栏碰撞、读档恢复、五波与救场结算。
- 正式手机浏览器320×568、390×844、430×932昼夜通过；HUD距离HP底边均6px，右端与小地图至少8px间隔，详情触控44px，无页面横向溢出，详情按钮点击成功。
- 正式画面同时包含猫猫、电动车、团子、拒马、当前石门围栏及道路；已目视检查390-day.png与320-night.png。窄屏内部两行，场景与HUD保留原配色和层次。
- 截图、报告与录制：output/playwright/defense-current-gates-hud/（尺寸-day/night.png、report.json、video/）。浏览器无页面错误。
- 正式入口：src/rendering/settlements.js（settlementObjects、drawSettlement）、src/rendering/camp-layout.js（drawCampLayoutRoads）、src/ui/camp-defense.js（positionHud）。designCriterion：campManagement、uiFoundationCriterion。
- 无新增图片、解码预算或动作素材，营门复用现有边界缓存，战区仅保存地契与布局引用；不影响角色/敌人/载具原动作时钟。静态布局调整不涉及PNG精修。
- 结论：开发阶段通过；无待修订项。
