# 任务距离与光点路线任务单

## 1 目标与范围
依据[标准](../art-generation-standard.md)和[模板](../art-generation-brief.md)。标识 quest-light-path，类型正式任务 HUD / Canvas 地面导航。参考现有 story-navigation 圆形箭头、story-guidance 目标圈。箭头下增加目标直线距离；地面以稀疏奶油光点指示实际可通行路线。保留任务表、目标圈、战斗圈、战斗与奖励数值、镜头和手动移动。

## 2 造型与空间
原44px箭头下增加11px距离标签，整组约60px高；不挤压任务正文。光点仅画近玩家约640世界单位路线，间距28、椭圆亮芯半径3.4×2.5、小范围柔光半径7.5×5，最多24点。沿现有森林绿边和奶油黄内芯，不画粗实线，不遮人物、战斗预警和地形。固定世界坐标，沿路线依次轻亮，减少动态时静止。

## 3 技术交付
HTML/CSS/JS与Canvas2D，正式目标和最近世界镜像；通行使用既有blocked、玩家12半径及飞行/两栖/战斗圈规则。寻路结果缓存、限频和搜索预算；没有可行路线时不绘制穿墙直线。无新增贴图、解码、实体或碰撞，路径仅为视觉提示。两种语言文案同步配置。

## 4 动画补充
光点位置固定，亮度按路径次序传递；使用游戏时钟，暂停停止、减少动态固定亮度。角色及载具原动画不变，路线位于实体与攻击预警下方。

## 5 制作指令
距离跟随当前任务目标实时更新，箭头仍指向目标；光点按通行路径指路。活跃任务移动时显示，进入对白、试射、暂停、切图、暂离/结束后隐藏；抵达交互范围后收起光点，保留距离/抵达提示。不增加自动行走或新玩法开关。

## 6 验收记录
结论：通过。designCriterion：`quest-light-path`（visual-contract.json）。正式入口：`src/ui/story-navigation.js`、`src/core/navigation/story-route.js`、`src/physics/quest-route.js`、`src/rendering/story-guidance.js#drawStoryGuidance`；取样使用 `src/rendering/visual-review.js#inspectQuestLightPath`。

- 相关测试：`node --test tests/quest-route.test.mjs tests/story-navigation.test.mjs`，8项通过。验证直线/树干绕行、桥梁与两栖/飞行通行、世界镜像、战斗圈、预算耗尽不穿墙、光点锚定与数量、目标变化及退出清理。未运行全量测试。
- 实机交互：`tests/quest-light-path-browser.cjs` 在隔离端口4247运行，通过正式游戏键盘移动，距离从234米减到200米；路中加入正式树对象后产生折线路线，逐段扫掠无碰撞。暂停、对白、抵达、目标切换及退出清理通过，无页面异常。
- 昼夜同屏：1280×900、390×844、320×568均实际检查，距离标签包含在任务面板内，无横向溢出；光点沿地面延伸，人物及场景物件在其上方，目标圈保留。截图：[桌面白天](../art-reference/quest-light-path/path-1280-day.png)、[桌面夜晚](../art-reference/quest-light-path/path-1280-night.png)、[390白天](../art-reference/quest-light-path/path-390-day.png)、[390夜晚](../art-reference/quest-light-path/path-390-night.png)、[320白天](../art-reference/quest-light-path/path-320-day.png)、[320夜晚](../art-reference/quest-light-path/path-320-night.png)。
- 遮挡与通行：[绕树截图](../art-reference/quest-light-path/tree-detour-320.png)；光点不新增碰撞实体、不改变玩家操作或镜头。远处路线仅展示近端640单位，实际取样7—8点，最多24点；搜索4096节点封顶，移动重算至少间隔0.5秒，直线路径不搜索网格。
- 动态：[减少动态截图](../art-reference/quest-light-path/reduced-320.png)使用正式减少动态分支固定亮度；正常分支使用游戏时钟。角色、怪物、武器、载具动画与美术资产未改动，其动作资产生产验收不适用于本次导航覆盖层。
- Boss面板补查：浅色血条底板内的距离改为森林绿，标签完整包含于血条内；[320像素截图](../art-reference/quest-light-path/boss-320.png)。
- 资源预算：无新贴图、视频或音频、无新游戏实体；仅CSS文字和有上限的Canvas椭圆绘制。实机报告：[browser-report.json](../art-reference/quest-light-path/browser-report.json)。


## 距离单位修正（2026-10-29）

寻路距离统一采用20个坐标单位=1米，显示时向上取整。主线、章节罗盘、剩余怪物指引、清缴面板、地图等级带与清缴地点、消防距离及野外遭遇范围说明共用 displayMeters。移动、路径、碰撞、交互半径和消防靠泊条件继续使用原坐标单位，不修改存档或地图尺寸。

新增距离专项2项通过，覆盖300→15米、非整米、零距离、环面最近镜像和交互阈值不变；尾怪专项4项通过，另1项使用旧地图宽度的既有测试失败，在未修改主分支复现同样失败。未运行全量测试。

正式浏览器导航一致性专项通过：390×844白天与320×568夜晚，每种尺寸覆盖主线、邻居、修复、主动访问、300坐标单位换算、关闭寻路和施工，共14组状态。距离显示、地面路线与终点保持一致，300坐标单位显示15米，页面异常0。旧浏览器夹具补记已完成首次小屋休息，避免新前置任务抢占时空塔目标。

截图 output/playwright/navigation-consistency/320-distance.png、390-distance.png 已人工核对。沿用原HUD、绘制器和字号，不新增美术资源或修改动画布局；PNG制作不适用。验收入口为正式 mainline HUD 和 worldNavigationObjective，结论：通过距离显示专项。


### 比例调整为10:1（2026-10-29）

按用户最新要求，统一显示比例调整为10个坐标单位=1米，覆盖上述全部寻路距离入口；300坐标单位显示30米，整米向上取整。更新距离专项及浏览器预期值。此次仅修改共用比例，已有导航、交互和绘制逻辑不变；距离专项2项通过，不重复运行前轮浏览器全流程。
