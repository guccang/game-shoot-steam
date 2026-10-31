# 猫耳问询徽章任务单

依据：[美术生成标准](../art-generation-standard.md)、[任务单模板](../art-generation-brief.md)、[AGENTS](../../AGENTS.md)。

## 1 目标与范围

本轮为代码原生 SVG 图标开发：统一替换装备档案、熟练度、清缴、守门、秘境和故事说明的文字问号。采用森林绿、奶油黄、浅金色；沿用截图中的紧凑排版和装备名称。保留按钮 ID、说明内容、事件、暂停归属、键盘及读屏名称。
一套图案，无不同用途的造型变体。参考现有环境 SVG、工坊奶油底板和猫角色；目标为正常手机尺寸可辨的问询入口。后续 PNG 精修不在本轮范围，当前无需位图生成。

## 2 造型与空间

圆润猫耳徽章轮廓，中心用手绘曲线表达问询，底部金色圆点；相较旧文字增加猫耳剪影与独立底色。外沿深绿、内部奶油平涂，右下轻阴影，左上细亮边。图标为 HUD 装饰，不涉及地面、通行、世界遮挡或角色动作；不增加世界实体。

## 3 技术交付

SVG viewBox 40×40，显示32×32，居中于至少44×44触控区；锚点为按钮中心。分层为小阴影、底板、问询线条。透明外围，无碰撞。昼夜共用同一图案以保留可读性。
正式资源 assets/ui/help-emblem.svg；模板 src/ui/help-emblem.js；样式 src/styles/help-emblem.css。程序继续负责原点击和状态。共用一个小型 SVG 请求，不增加画布、帧循环或昼夜位图副本。加载失败由实际浏览器检查暴露，不用文字兜底掩盖。

## 4 动画任务补充

静态说明图标，无自动动画、视频、动作时钟和运动部件；悬停与键盘焦点由按钮样式表达。

## 5 生成指令

本轮直接使用原生 SVG 路径，适合32像素 UI 徽章；不调用图片生成，不使用字体问号。统一一份资源供静态页面与动态模板使用。

## 6 验收记录

已通过：320×568、390×844手机和1280×900既有竖版容器；白天与夜晚清缴同屏；装备、熟练度、故事、赠礼、秘境、清缴和守门的实际帮助弹窗打开与关闭；全部按钮44×44、图片加载成功、保留读屏名称，无文字问号及页面横向溢出。原生键盘按钮和既有焦点处理保留。视觉复核去掉了故事及熟练度按钮的旧弧形阴影，定向复测通过。地形通行、角色连续动作及 PNG 替换不适用，因为仅替换 HTML 按钮内部图案。

正式检查入口：src/rendering/visual-review.js#inspectHelpEmblem。
designCriterion：help-emblem。当前结论：通过。

长期参考：[工坊](../art-reference/help-emblem/vehicle-390.png)、[熟练度](../art-reference/help-emblem/mastery-390.png)、[白天清缴](../art-reference/help-emblem/wave-390-day.png)、[夜晚清缴](../art-reference/help-emblem/wave-320-night.png)、[故事](../art-reference/help-emblem/story-320.png)、[守门](../art-reference/help-emblem/camp-320.png)。完整验收脚本 tests/help-emblem-browser.cjs，浏览器无 pageerror。共用SVG小于2KB，无新增画布或持续动画。

测试端口：4175已由现有服务占用，本次隔离使用4177，不影响原服务。
