# 中央广场与免费节日标志物

本轮为程序绘制与交互开发，遵循[美术标准](../art-generation-standard.md)。参考用户截图：扩大原铺地并沿用森林绿描边、奶油色铺砖；原有节日道具使用正式绘制器，不生成新位图。

广场由 200×100 扩大为 300×160，按地面底边作为建筑规划锚点，可通行但不可与建筑重叠。纳入布局规划；旧布局被占用时在已购土地内选择邻近空位，不移动玩家建筑。节日标志物按游戏日历免费展示，皮肤购买只控制其他换装。保留角色、节庆动作、照明及脚底分层。

验收目标：双向建筑冲突校验、广场搬迁和旧布局兼容、未购全部十二节日陈列、手机昼夜与短屏可读。对应 uiFoundationCriterion、campFestivals。新位图零字节，PNG精修及新动画不适用。验收记录见下节。

## 验收记录：通过
- 广场面积由 20000 增至 48000 逻辑平方单位（2.4 倍），正式铺地、规划图标、摆放保护使用同一尺寸，保持地面可通行。
- 布局原有 9 项、广场新增 2 项及节日相关 5 项检查通过；涵盖双向建筑冲突、旧维修中心占地避让、保存失败回滚与读档、十二种节日未购皮肤陈列。
- 手机浏览器正式运行，空皮肤库存、日常换装模式下春节醒狮灯笼和圣诞树礼物均显示；未扣金币、未发放皮肤。真实保存广场搬迁后坐标一致。
- 白天与夜晚同屏复核：广场铺地、节日道具、猫猫、工坊、停车区无建筑重叠；原醒狮局部步态绘制保留，不新制动作素材。
- 320×568、390×844、430×932 布局页面无横向溢出，可选择中央庆典广场。独立桌面布局不适用。
- 证据 output/playwright/camp-plaza-landmark/：spring-day.png、spring-night.png、christmas-day.png、christmas-night.png、plaza-selection.png、layout-320.png、layout-430.png、report.json、video/。
- 正式入口 drawCampPlaza、campFestivalObjects、drawFestivalLion、drawCampDecoration、drawCampLayoutIcon；designCriterion 对应 campFestivals（游戏日历节庆与正式场景）、uiFoundationCriterion（手机中文界面）。
- 新位图 0 字节，既有图元与材质复用；广场位置按布局、地契及占地状态缓存。PNG精修不在本轮范围，结论通过。
