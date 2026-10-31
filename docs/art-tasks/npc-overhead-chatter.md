# NPC 口头禅头顶气泡任务单

依据：[游戏美术资源生成标准](../art-generation-standard.md)。

## 2026-10-30 玩家短句与主线交谈提示稳定性

制作前约定：玩家章节短句从Canvas当前表现快照获取说话人坐标；主线NPC先更新本帧交谈热点，再定位操作提示和猫爪。保留原气泡尺寸、字体、材质、尾尖、屏幕边缘夹紧与HUD避让、读句时钟和真实点击资格，不增加独立平滑延迟。复用原DOM、相机、角色图集与动画，新增运行资源和画布为0；未修改地形与碰撞，相关通行条目不适用。

计划验收：25Hz逻辑/60Hz显示下玩家步行与骑乘的气泡投影；NPC交谈提示在移动、停止和间歇刷新时的同帧位置；手机昼夜实际画面。正式入口：story-chatter.js、mainline.js、createCompactSpeech、createOperationGuide；designCriterion=npc-overhead-chatter。

验收结果：通过。4项插值回归通过，覆盖居民、玩家步行、骑乘、移动停止与无快照回退。390×844浏览器触控视口中使用正式键盘移动及游戏循环，NPC昼夜各45帧、玩家步行和骑乘各60帧的气泡定位误差均为0；玩家实际移动约186/298世界单位，旧逻辑锚点与显示位置最大相差约4.94/5.93像素。浏览器运行错误为0。逐张复核下列四张截图，保留原样式、尾尖、HUD与边缘夹紧；本次为浏览器手机视口验证，非实体手机测试。

证据：[NPC白天](../art-reference/steady-speech-bubbles/npc-day.png)、[NPC夜晚](../art-reference/steady-speech-bubbles/npc-night.png)、[玩家步行](../art-reference/steady-speech-bubbles/player-walk.png)、[玩家骑乘](../art-reference/steady-speech-bubbles/player-vehicle.png)。浏览器回归脚本为tests/speech-bubble-stability-browser.cjs，使用Playwright CLI在4175端口执行，截图目录为output/playwright/steady-speech-bubbles/。没有新增运行素材、画布或独立平滑时钟。

相关操作指引单测8项通过、1项已有失败（“完成等级后由原任务条件切换操作，永久拥有控制器决定升级目标”期望damage、实际undefined）；已在未修改的master复现，和本次气泡定位无关。未运行全量测试。

## 本轮扩展：任务战斗短句（2026-10-26）

- 目标：图中薄荷的战斗反馈恢复头顶小气泡；复用居民与援军同一正式组件，最大168px、奶油纸面、森林绿细描边、真实头部锚点。
- 保留：正式长对白及其暂停/跳过操作、战斗和镜头、NPC身体与装备、已有短句与阅读时钟。只修改任务短句，不新增美术资源。
- 分层与边界：沿用z-index14的纯DOM显示层、不接收指针；避开HUD与底部操作区，画外或空间不足时隐藏且不消耗可见阅读时间。无碰撞或地图通行变更。
- 制作前计划：320/390手机与宽视口昼夜同屏检查，覆盖玩家、载具、NPC、怪物、场景与HUD；验证跟随、画外隐藏、预警避让和暂停恢复。
- 正式入口：src/ui/story-chatter.js → src/ui/compact-speech.js；designCriterion：npc-overhead-chatter。
- 验收结果：通过。10项浏览器检查通过，含整备返回出发、守点/领主实际创建及模拟继续、主动暂停和嵌套说明恢复、关闭后重新打开、正式长对白保留、镜头跟随、画外阅读计时冻结、冲锋预警避让与短屏隐藏。
- 实机视觉：320×568、390×844及1280×900现有竖版战场共六张昼夜截图逐张复核；玩家、载具、NPC、怪物、环境和HUD同屏，气泡最大168px、尾尖对应真实头顶，不覆盖角色面部或操作区。
- 证据：[手机白天](../art-reference/story-resume-bubbles/390-day.png)、[手机夜晚](../art-reference/story-resume-bubbles/390-night.png)、[短屏](../art-reference/story-resume-bubbles/320-day.png)、[完整结果](../art-reference/story-resume-bubbles/results.json)；同目录保存全部六张截图。
- 资源与动作：复用一个DOM节点，未新增素材请求、画布或纹理缓存；无浏览器运行错误。未修改身体动画、武器分层或碰撞，通行与动画生成专项不适用。

## 1 目标与范围
- 标识：npc-overhead-chatter；用途：居民口头禅及共用组件的援军短句。
- 目标：恢复原头顶小气泡，跟随实际说话者，不铺满底部、不隐藏其他HUD。
- 参考：src/ui/compact-speech.js历史原版及src/styles/living-world.css的compact-speech样式。
- 保留：原奶油黄纸面、森林绿描边、12px字号、尾角、短句内容与轮换时钟、角色连续动作、正式交谈和剧情底部布局。
- 路线：复用DOM与正式世界投影，无生成或新增素材；仅一个闲聊节点、一个援军短句节点。

## 2 造型与空间
- 原圆角小纸面带尾尖；区别于底部对话的全宽面板，没有操作按钮。
- 锚点为实际NPC头顶；镜头边缘保留8px，头顶空间不足则隐藏，不钉在屏幕边缘或移动镜头。
- 气泡不接收指针事件，保留NPC点击、场景移动与其他UI；避开顶部信息栏和底部操作区。
- 光向、地面衔接、地形邻接与实体碰撞不适用：纯DOM信息，无地图、建筑或植被修改。

## 3 技术交付
- 宽度自适应正文、最大168 CSS像素，内边距6×9，原12px/1.4行高；不新增位图倍率或纹理。
- 原绝对定位z-index14；尾尖由实际投影横坐标确定。白天夜晚复用同一纸面。
- 单节点复用、无新增画布、图集、缓存或网络资源。代码src/ui/compact-speech.js；截图output/playwright/npc-overhead-chatter/。

## 4 动画任务补充
- 不适用新动画资产。既有人物身体、手持枪、起停及脚底保持不变；验证镜头位移时气泡跟随并正确隐藏。

## 5 制作指令
恢复正式头顶口头禅气泡，沿用原尺寸、样式、文本轮换；保留说话者无障碍名称。正式NPC交谈和剧情仍使用底部全宽布局。

## 6 验收记录
- 计划：320/390手机昼夜、宽视口同屏、头顶锚点、边缘隐藏、点击穿透、HUD保留、正式交谈底部布局回归。
- 正式入口：src/ui/compact-speech.js#createCompactSpeech、src/ui/resident-chatter.js、src/ui/camp-defense.js。
- designCriterion：npc-overhead-chatter。
- 结果：通过。居民口头禅与援军短句在320、390、1280宽视口昼夜共12组正式场景检查中，宽度不超过168px，尾尖对应NPC头顶投影，无横向溢出、无底部平铺，菜单保持可见。
- 跟随与遮挡：镜头位移后气泡随投影更新；320×296头顶空间不足时隐藏。pointer-events为none，不拦截原触控；气泡不覆盖本轮场景顶部资源与底部生命操作栏。
- 正式交谈回归：打开阿团交谈仍为390px底部全宽，闲聊自动让位；关闭按钮可正常操作。
- 资源与动作：无新增素材请求、纹理或缓存，浏览器无运行错误；原人物/怪物/救援载具与独立装备同屏保留。未改世界碰撞、地图边界与身体动画，因此不重新执行地形通行或动画生成验收。
- 记录：output/playwright/npc-overhead-chatter/共12张正式截图；测试tests/npc-overhead-chatter-browser.cjs通过，语法检查和git diff --check通过，未运行全量测试。
- 长期参考：[白天](../art-reference/npc-overhead-chatter-day.png)、[夜晚](../art-reference/npc-overhead-chatter-night.png)。


## 2026-10-29 移动时头顶气泡与人物同步
问题：居民本体使用固定步进之间的表现插值，闲聊气泡和交谈命中轮廓仍投影逻辑坐标；镜头移动或居民行走时产生错帧。目标：气泡、可见性判断和交谈轮廓读取同一帧居民位置，高度同步插值；保持权威交互距离、原气泡样式、台词轮换与身份，不新增平滑延迟。复用原图集、DOM与相机，无新增美术资产、画布或位图预算；对应npc-overhead-chatter。计划验证25Hz逻辑/60Hz表现的移动与停止、离地高度、读档新实体、静态目标及手机昼夜连续画面。

验收通过：6项针对性测试覆盖25Hz逻辑/60Hz表现、移动及停止、悬停高度、暂停、传送、周期边界、无快照回退及表现对象复用。390×844手机模拟中，正式自然闲聊随玩家移动的昼夜各75帧检查气泡投影误差为0，热点中心误差小于0.02像素。为稳定覆盖居民持续行走，另用正式createCompactSpeech实例固定说话人和台词、给真实居民设置行走路径，保持正式Game更新及键盘输入；昼夜各40帧全部处于居民移动状态，旧逻辑位置误差最高1.97像素，修复后气泡锚点误差0、实际DOM热点误差小于0.02像素；玩家分别移动166.84和60.53世界单位。页面异常0。通过截图及录像连续帧复核人物、气泡和场景的跟随关系，没有新增延迟或修改角色动画。

证据：output/playwright/npc-bubble-stability/保存自然闲聊day/night.png、固定说话人moving-day/night.png、连续帧motion-strip.png及一次性实机检查脚本check.cjs；最终录像video/page@52bed44fc3845ebcc4914f86acecebe0.webm。长期参考：[移动中的气泡](../art-reference/npc-bubble-stability.png)。本轮不新增UI布局，沿用原168像素气泡、手机触控与昼夜材质；正式入口增加src/ui/scene-resident.js供气泡、候选可见性和交谈轮廓共用。默认4175占用，使用隔离工作树4176。未运行全量测试，无新增运行资产。
