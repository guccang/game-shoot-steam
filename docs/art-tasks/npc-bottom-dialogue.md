# NPC 底部对话任务单

执行依据：[游戏美术资源生成标准](../art-generation-standard.md)。

> 后续修订：日常口头禅与援军短句已恢复头顶小气泡，见[验收任务单](npc-overhead-chatter.md)。以下保留最初验收记录，正式交谈与剧情继续使用底部布局。

## 1 目标与范围
- 标识：npc-bottom-dialogue；类别：既有对话UI的位置与说话者标注。
- 目标：邻里NPC交谈改为底部非模态对话；主线、入职、故事、闲聊及救援短句统一底部停靠，每段显示说话者姓名。
- 保留：现有配色、边框、字体、按钮、阅读计时和正式任务推进；邻里目录及非对话功能面板继续原入口。原猫、怪物、载具和独立武器绘制不改。
- 路线与参考：复用src/ui/speech-bubble.js、compact-speech.js、living-world.js及现有story.css/living-world.css，无生成素材。

## 2 造型与空间
- 保留奶油黄纸面、森林绿边框；长对白、短句和邻里请求仍沿用各自原样式，不新增造型变体。
- UI铺满游戏区域底部，对白期间隐藏其他战场UI，结束后自动恢复；不跟随人物头顶。去掉指向人物的尾角，姓名代替空间指向。
- 长内容限高滚动，姓名标题保留可读；前后遮挡仅涉及UI，地面、水界、建筑入口、世界碰撞和光照均不适用本次修改。

## 3 技术交付
- 使用原DOM节点，宽度等于游戏区域宽度；最大高度限制在屏幕下半部。锚点为游戏区域底边中心，无额外底部留白。
- 无新增位图、视频、纹理、画布或缓存，DOM复用既有节点；昼夜共用同一UI。
- 代码src/ui/npc-dialogue-layout.js及对应对话模块，CSS沿用story.css/living-world.css；验收截图output/playwright/npc-bottom-dialogue/。

## 4 动画任务补充
- 不适用：无动作资产修改。原人物动作与独立操枪保持；阅读暂停/继续/下一句、任务交付及关闭恢复必须检查。

## 5 制作指令
复用正式对话样式，调整到屏幕下方全宽并补全说话者；其他战场UI在对白期间隐藏，结束后恢复。不用居中遮罩弹窗承担NPC交谈，不改变正文、任务条件或奖励。

## 6 验收记录
- 计划：桌面1280、手机390/320昼夜实景；邻里交谈与任务推进、入职、主线、故事及短句；说话者姓名、下方位置、无横向溢出、按钮可点、Esc关闭、暂停恢复、奖励嵌套与旧目录入口。
- 正式入口：src/ui/npc-dialogue-layout.js及各正式对话模块；designCriterion：npc-bottom-dialogue。
- 结果：通过。正式邻里、主线、故事与入职对白在1280×900、390×844、320×568的昼夜共24组检查中，均贴底全宽、姓名可见、非模态且无横向溢出。其他战场UI隐藏；关闭NPC后菜单与暂停状态恢复。
- 交互：委托接取与推进、Esc关闭、嵌套奖励返回、主线暂停/继续、故事跳过、入职下一句与跳过旅程通过。正式NPC点击、闲聊姓名、正文点击已在本任务验证；后续全宽调整共用同一组件。
- 短句：援军与故事通讯在390/320手机昼夜共8组正式节点采样通过，短句仍使用原纸面字号；故事通讯以正式章节台词构造可重复提示状态，不代替完整章节通关测试。
- 短屏：320/364/390×296均检查全宽贴底、无横向溢出、菜单隐藏；364×296对应本次用户反馈尺寸。长内容滚动，按钮未被其他UI遮住。
- 针对性检查：主线暂停继续单测1项通过；新增布局和入职模块语法检查、git diff --check通过。未运行全量测试。
- 实景截图：output/playwright/npc-bottom-dialogue/下的living-dialog、mainline-speech、story-speech、arrival-speech各尺寸昼夜截图，以及camp-rescue-speech、story-chatter手机昼夜截图、menu-clear-364.png。长期参考见下图。
- 无新增美术资源、视频、图集或缓存；碰撞、地形通行、角色腿部与独立操枪动作未修改，本次不新增动作资产验收。实际场景保留原正式绘制器。

![主线底部全宽白天](../art-reference/npc-bottom-dialogue-day.png)
![邻里底部全宽夜晚](../art-reference/npc-bottom-dialogue-night.png)
![反馈尺寸底部全宽](../art-reference/npc-bottom-dialogue-short.png)


## 2026-10-27 邻里委托交接修复

- 目标与范围：怪物邻里委托的节点交接使用现有手机任务底板，避免受普通对白46%高度限制；固定标题、关闭与底部确认，正文独立滚动。
- 参考与保留项：docs/ui-foundation.md 的标准任务页；奶油底板、森林绿描边、文字、奖励和节点事务保留。纯闲聊仍沿用底部对白；节点提交后的回应保持本次任务页形态。
- 尺寸、锚点与分层：复用 ui-panel/ui-page 的480px上限及手机安全区居中规则；确认44px以上，正文可滚动。目录与闲聊隐藏确认栏，不残留布局。
- 无新增美术资源、变体、纹理或缓存；地形碰撞、通行、角色动作与独立武器均未修改，不适用动画/资源制作验收。仅使用正式DOM和场景绘制器检查昼夜同屏。
- 正式入口：src/ui/living-world.js#createLivingPanel、src/ui/mobile-panels.js#prepareMobilePanel；designCriterion：npc-bottom-dialogue（委托交接例外）与 mobile-ui-pages。
- 验收结论：通过。320×568、360×640、390×844、430×932、844×390的昼夜节点交接/回应共20组，三个委托末节点完成共3组，全部通过。正文有滚动空间、固定确认不被遮挡、提交后从回应顶部阅读；确认只关闭面板，不重复推进。
- 真实触摸交互：交付按钮推进阶段、最终完成及奖励关闭后仍保持暂停、确认后恢复游戏、闲聊/目录往返通过；浏览器无页面异常。测试设置前置进度并冻结随机世界，不声称完整自然游玩或实体手机验收。
- 针对性检查：tests/neighbor-confirm-layout-browser.cjs、修改模块语法检查及 git diff --check 通过；未运行全量测试。截图已检查标题、回应、滚动边界和底部确认；世界素材与动作未修改。
- 长期证据：[320白天](../verification/neighbor-confirm-layout/response-320-day.png)、[390夜晚](../verification/neighbor-confirm-layout/response-390-night.png)、[短横屏夜晚](../verification/neighbor-confirm-layout/response-844-night.png)。
