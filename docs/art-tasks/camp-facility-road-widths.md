# 营地建筑道路与设施细支路

按[美术标准](../art-generation-standard.md)延用正式 Canvas 道路材质、森林绿描边和奶油铺面；本轮修改程序道路几何，不生成位图。目标是提炼厂南侧站牌不再落在主路中央，房屋用56单位道路，站牌、桌台等小型设施用24单位支路。道路末端连接交互点，站牌底座保持干地。

保留建筑脚底、交互、存档、原土木石材质和昼夜处理。规划预览、正式路面、装饰与农田避让使用同一路宽。先接房屋及营门主路，再接小设施支路；不将玩家步行通行权限当作可铺路权限。

验收目标：提炼厂南侧站牌复现、宽窄道路连通与底座避让、三材质、手机昼夜及窄屏；designCriterion 对应 campManagement 与 uiFoundationCriterion。原角色车辆动画不改，新位图0字节。结果见下节。

## 验收结果：通过
- 布局原有9项、宽窄道路与底座避让2项通过；补充公共设施主路连通与怪潮站牌门口回归检查通过。
- 复现站牌 (-940,440) 位于提炼厂南侧，逐段按实际路面半宽检查没有覆盖站牌底座；房屋/营门56单位，小型设施24单位，广场和房屋保持正常尺度。
- 手机正式保存后，三种材质（土、木、石）昼夜各一张截图；宽主路从站牌旁绕行，细支路在站牌前收口，猫猫、房屋、站牌同屏，无新遮挡和动作变形。
- 320×568、390×844、430×932 规划预览无溢出，预览线宽与正式路面一致。独立桌面布局不适用。
- 证据 output/playwright/camp-facility-road-widths/：earth-day.png、earth-night.png、wood-day.png、wood-night.png、stone-day.png、stone-night.png、layout-*.png、report.json、video/。
- 正式入口 campLayoutRoads、drawCampLayoutRoads、drawCampRoadFinish、createCampLayoutPanel；designCriterion 对应 campManagement（营地铺面与占地）及 uiFoundationCriterion（手机规划页面）。
- 新位图0字节；同一有界洪泛路网，先主路后支路，不增加逐帧寻路；材质纹理按道路实际宽度收窄。保留原动画与独立操枪；PNG精修不适用。
