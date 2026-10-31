# 营地木牌交互入口

依据[美术标准](../art-generation-standard.md)、[任务模板](../art-generation-brief.md)和[手机框架](../ui-foundation.md)。本轮复用既有破木牌Canvas绘制，不新增图片。

## 目标与制作规格

- 外围故事入口直接覆盖木牌牌面，删除悬浮按钮的纸底、描边、阴影和重复文字。木牌只显示原名称等级，鼠标/触屏点击打开原小故事；键盘聚焦时显示焦点轮廓。
- 牌脚放到营地中心右10、上235，完整牌面位于预警范围外。导航观察点仍为左70、上240，距木牌约80，玩家能安全到达并点击。
- 绘制、交互判距和屏幕热点使用同一个 `campSignSite`。热点按镜头缩放贴住108×36牌面，触控尺寸至少44像素；离开交互距离或打开弹窗即收起。
- 保留具名居民现场交谈、灰堆、战斗、动画、存档和种子逻辑。原闲聊气泡只显示有内容的短句，不能展示空框。
- 正式入口：`src/rendering/monster-camps.js`、`src/ui/nearby-interaction.js`、`src/world/interaction-anchors.js`。新增运行位图及缓存为0，未修改独立动作；PNG替换不适用。

## 验收

- 通过：5项针对性检查覆盖11个营地完整牌面与牌脚在预警带外、位置不落水堵树、观察点可够到、牌脚判距、牌面锚点与绘制一致，以及共用镜头投影和其他建筑锚点。
- 通过：实际点击Canvas牌面投影中心打开原营地小故事；按住鼠标热点不偏移，键盘Enter/Esc和CDP触屏点击均可用，离开后热点隐藏。进入居民或灰堆附近，原可见交互按钮恢复。空白台词不会创建可见空框。
- 通过：320×568、390×844、1280×900昼夜实际游戏中，牌面与热点中心误差小于1像素，最小高度44像素；热点透明、无边框阴影、无额外文字。无人因外围阅读被激活为战斗敌人。
- 证据：[390白天](../art-reference/camp-sign-entry/sign-390-day.png)、[390夜晚](../art-reference/camp-sign-entry/sign-390-night.png)、[320白天](../art-reference/camp-sign-entry/sign-320-day.png)、[320夜晚](../art-reference/camp-sign-entry/sign-320-night.png)、[桌面竖版](../art-reference/camp-sign-entry/sign-1280-day.png)、[交互与投影记录](../art-reference/camp-sign-entry/browser-results.json)。正常非空闲聊气泡继续保留在居民头顶。
- 正式合同：`visual-contract.json#campSignEntryCriterion`。隔离存档与4189服务，保留原4175服务；浏览器模拟手机，未测试物理设备，未运行全量测试。未修改角色、怪物、武器或载具动作，本轮不另录动作视频。
