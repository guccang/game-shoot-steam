# 营地小故事对话

依据[美术标准](../art-generation-standard.md)、[任务模板](../art-generation-brief.md)和[手机框架](../ui-foundation.md)，承接用户营地见闻截图。本轮为程序界面开发，沿用既有浅色对白材质，不需要生成插画或替换PNG。

## 目标与规格

- 将大幅功能说明页改成底部居民对白：姓名、营地名、一段短故事、一个接话按钮及关闭入口；不显示战斗规则、统计、种子表和导航按钮。
- 沿用 `ui-dialogue` 和 `dockNpcDialogue`，宽度跟随游戏区域，高度不超过46%，正文独立滚动，触控至少44像素；不增加桌面专用布局。
- 11个营地各有三段小故事；三名具名居民有独立口吻，重复清空时改变开场。现场聊到线索才调用原事务，远处阅读不能领线索。灰堆保留独立现场探索。
- 保留营地地图种子来源、核心战斗、动作、存档、物品一次性领取和错误重试。对话暂停世界，关闭恢复；普通场景气泡仍使用原绘制器。
- 正式入口：`src/ui/monster-camps.js`，内容：`src/config/camp-stories.js`。新增运行位图与离屏缓存为0；世界资源、碰撞、枪械和动作未修改，序列帧及PNG替换不适用。

## 验收

- 通过：现场直接显示居民姓名与短故事，只有接话、关闭两个44像素按钮；去掉规则、计数、种子表、全部营地和导航按钮。地图原有种子来源与导航保留。
- 通过：逐句推进、中途离开不发线索、保存失败重试、现场听完获得线索、远处读故事不发线索、灰堆昼夜限制、物品防重、重复清空改变开场，以及关闭/Esc恢复暂停归属。三个相关核心事务测试通过。
- 通过：320×568、390×844、844×390、1280×900昼夜实际游戏截图复核，无横向溢出，焦点进入居民姓名。横屏压缩留白后正文至少52像素，当前两行故事无需滚动，较长段落仍可滚动。菜单短屏与横屏实际点击通过。
- 证据：[390白天](../art-reference/camp-stories/story-390-day.png)、[320夜晚](../art-reference/camp-stories/story-320-night.png)、[横屏](../art-reference/camp-stories/story-844-day.png)、[桌面竖版](../art-reference/camp-stories/story-1280-night.png)、[回访](../art-reference/camp-stories/revisit-390.png)、[交互记录](../art-reference/camp-stories/browser-results.json)。横屏最终紧凑留白数据见记录内 `landscape-result`，覆盖前一采样的阅读区高度。
- 正式实现绑定 `visual-contract.json#campStoriesCriterion`。脚本为 `tests/camp-stories-browser.cjs`、`tests/camp-stories-landscape.cjs` 和原菜单脚本；旧营地交互脚本已同步接话入口。
- 范围：隔离浏览器存档，独立4189服务，保留原4175服务；验证浏览器交互，未测试物理手机、未运行全量测试。本轮没有改动世界绘制、碰撞或角色动作，沿用原资源，不另录动作视频。
