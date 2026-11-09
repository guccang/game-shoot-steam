# 晴叶营地第一章美术生成任务单

依据：[游戏美术资源生成标准](../art-generation-standard.md)。制作前登记及实际运行复核日期：2026年10月22日。

## 1 目标与范围

| 字段 | 内容 |
| --- | --- |
| 名称与标识 | 晴叶巡护通讯牌、路标、中继站、补给箱与章节界面，sunleaf-01 |
| 类别用途 | 程序化交互摆件、任务UI；营地接取和南侧巡护路线 |
| 目标 | 玩家辨认目标、两路选择、中继站修复三段及回营变化 |
| 数量与变体 | 通讯牌1、路标2方向、中继站损坏/修复、补给箱未用/已用；结构区分木牌、双线圈设备和带盖木箱 |
| 保留项 | 真实猫动作、小手武器、主炮、履带和气垫船推进器、昼夜、山湖碰撞、原森林存档 |
| 路线与参考 | 复用Canvas有限平涂，参考rendering/camp-props.js、workshop.js和docs/art-reference/scene-clarity-day.png |

## 2 造型与空间

木牌由立柱、奶油色信封牌与绿边构成；中继站由木底座、并排线圈、独立灯和三段修复指示构成；箱体使用盖缝与扣带，不仅靠颜色区分状态。左上受光、右下冷影，底座接触影贴地。沿用原草地，不铺不透明地板；主体按脚底排序，交互标记在独立指引层。

主路160–176单位、近道128单位的临时巡护走廊，保留山湖与水界。章节复制树木后仅疏除走廊与明确遭遇空地内的采集树，退出恢复原森林；移除数量及路线通行实测写入报告，不默认把整个区域清空。

## 3 技术交付

逻辑尺寸：木牌46×60，中继站78×88，箱体48×32；底座中心为世界原点。正式Canvas绘制，无新增下载位图或外部资源。局部阴影、主体与状态灯分开，透明背景；纯装饰底座，任务目标碰撞仅用于敌人攻击，不阻止玩家穿行。昼夜共用结构、运行时调整材质亮度。性能复核后增加有界展示缓存：摆件16张112×128；薄荷真实待机39帧按144×160缓存，硬上限40张，逻辑展示72×80、脚底锚点36,64。总RGBA理论硬上限4.391 MiB，小于8 MiB预算，不重复解码源图集、不扩展原角色48帧毛色缓存；血条和动作时钟仍实时。UI使用原字体与奶油草木配色。

源文件位于src/rendering/story-props.js与src/styles/story.css，验收截图与录制在output/playwright/sunleaf/，确认的基准保存docs/art-reference/sunleaf-*.png。

## 4 动画补充

新摆件为静态结构，无新主体动作或源视频，不适用新增帧率和裁切。薄荷复用catSprites真实待机连续帧，按有效游玩时钟推进；暂停冻结、减少动态遵循已有规则。玩家和载具动作调用正式绘制器，禁止复制静帧、整图拉伸或旋转替代局部动作。

## 5 制作指令

延续二维森林绘本风格、森林绿描边、奶油与柔和草木色。保持原三分之四俯视比例，木牌、线圈设备、箱体分别以结构辨认。灯只占小范围，不增加满屏辉光。保留原角色、操枪、车辆动作、地图通行与昼夜。程序文字独立绘制，不生成烘焙文字或水印。

## 6 验收记录

| designCriterion | 正式入口与证据 | 结论 |
| --- | --- | --- |
| sunleaf-objective-readable | `ui/story.js`、`visual-review.js#inspectSunleaf`；[320×568](../art-reference/sunleaf/final-layout-320.png)、[390×844](../art-reference/sunleaf/final-layout-390.png)、[1440×1000](../art-reference/sunleaf/final-layout-1440.png)、[320守点](../art-reference/sunleaf/final-guard-320.png) | 通过；窄屏保留方向和来敌提示，纵向可滚动，无横向截断 |
| sunleaf-route-readable | `world/story-sites.js`、`ui/panels/map.js`；[路线选择](../art-reference/sunleaf/final-routes.png)、[路线地图](../art-reference/sunleaf/final-route-map.png) | 通过；实虚线及名称区分两路，19棵任务树疏除，正式碰撞采样与六次实战均通过 |
| sunleaf-relay-state | `story-props.js#drawStoryProp`、`core/story/story-manager.js`；[桌面白天](../art-reference/sunleaf/tide-arc-1280-day.png)、[手机夜间](../art-reference/sunleaf/frost-guard-390-night.png) | 通过；三段灯与HP来自规则，角色从设备后方通过时设备淡化 |
| sunleaf-loadout-identity | `renderer.js`、`characters.js`、`vehicle-armaments.js`；三套各有390/1280昼夜图，`motion-0.png`至`motion-7.png`为连续采样 | 通过；身体来自真实视频帧，枪与独立车炮、履带/推进器保持正式绘制；未制作新人体动作 |
| sunleaf-boss-warning | `combat/bosses.js`、`rendering/bosses.js`；[林线白天](../art-reference/sunleaf/final-boss-line-patrol-day.png)、[霜炮夜间](../art-reference/sunleaf/final-boss-frost-guard-night.png)，另有三套昼夜与`boss-windup/cast/recover.png` | 通过；已修复任务条遮住Boss血条，预警、冲锋、恢复均采样正式状态 |
| sunleaf-world-return | `storyObjects`、`claimStory`；[回营持久变化](../art-reference/sunleaf/final-restored-camp.png)，浏览器领奖后刷新验证 | 通过；通讯牌避开工坊入口文字，薄荷在营地独立可辨，原森林角色及供给恢复 |

实际操作：桌面键盘移动、点击对话/试射/重试；手机通过原生touchStart/touchMove/touchEnd驱动正式摇杆。边界镜像沿用`visibleBodies`，任务摆件按脚底参与正式深度排序。没有修改猫、怪物、车辆与Boss原动作；新增原片、请求及视频源时间不适用。薄荷展示缓存逐帧取同源真实待机，不复制单张静图代替动作。

代码、UI与规则复核通过；缓存与五分钟性能数据见[实施验收报告](../story-reports/sunleaf-01.md)和同目录JSON。最初的性能/遮挡问题已退回修订，最终证据以`final-*`截图及报告最终记录为准。真人剧情理解、首玩时长和低端手机实机仍待验，不将自动化或本机浏览器替代真人体验结果。
