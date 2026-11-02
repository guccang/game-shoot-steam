# HP 下方紧凑经验条

依据 [美术标准](../art-generation-standard.md)、[仓库合同](../../AGENTS.md) 与 [手机框架](../ui-foundation.md)，由美术任务单复制填写。

## 1 目标与范围
本轮为已有 HUD 的程序 UI 调整。参考用户截图中的“经验 60/100”行，改为 HP 条正下方的细经验条，取消可见经验文字，减少整块生命面板高度。正常、驾驶、清缴与独立弹药布局共用，保留名称、生命数字、HP颜色、弹药及载具按钮。使用现有 HTML/CSS 与正式经验数据，无 imagegen 或新 PNG。

## 2 结构与空间
主体仍是原森林绿描边、奶油底板。HP 与经验放在同一列上下排列，经验条 3px，间隔 3px，以青绿色与生命条区分。仪表列保留44px触控；底板整体宽度、左上锚点和安全区不变。地面、光源、邻接、碰撞和角色轮廓不适用：本轮仅信息条，世界主体原样保留。

## 3 技术交付
正式入口 index.html、src/ui/hud.js、src/styles/ui-foundation.css。经验仍读取 heroExperience(game.progress)，零经验显示空槽，升级后显示本级进度，满级显示满条。原生 progress 保留中文无障碍名称及数值描述，屏幕上不显示数值。保留 hero-experience-hud 稳定 ID。生命与经验容器共用原布局，清缴不隐藏细经验条。无图片、画布、图集或缓存新增；已有字体与皮肤继续使用。

## 4 动画
不新增动画，不改变人物、武器、怪物、载具连续帧和动作时钟；只按正式 HUD 刷新经验比例。视频帧、裁切、局部部件及来源记录不适用。

## 5 实现路线
纯程序排版，无生成图片提示词、PNG替换或精修项。低影响样式调整只做针对性的真实浏览器布局、经验更新、手机昼夜与触控检查。

## 6 验收
设计标识 designCriterion = compact-xp-bar。计划检查320×568、390×844，白天/夜晚、驾驶/步行、清缴/独立弹药、0/60/升级后/满级经验；确保条位于HP下方、不增加隐式网格行，原按钮仍不小于44px。运行证据保存 output/playwright/compact-xp-bar/。验收结果如下。


| 设计目标 | 实际结果与证据 |
| --- | --- |
| 紧凑且易读 | 普通驾驶HUD在320/390手机上均为52px高；HP为6px，经验为3px，两者间隔3px，不显示经验数字或满级文字 |
| 昼夜一致 | 320-day.png、320-night.png、390-day.png、390-night.png；正式角色、载具与营地同屏，人工复核背景及进度条可读 |
| 动态经验 | 0经验为空条；60/100为60%；通过awardHeroXp跨级后60/200为30%；换猫读取该猫80/100；满级满条，中文读屏描述正确 |
| 触控与清缴 | independent-320.png、independent-390.png；三路弹药、载具按钮和问号猫猫不重叠，原操作按钮不小于44px；清缴保留细经验条 |
| 既有主体与通行 | 不改世界素材、碰撞、人物或载具动作，仅原HUD DOM与CSS；无新增纹理、画布和缓存 |
| 检查范围 | node --check src/ui/hud.js、git diff --check通过；output/playwright/compact-xp-bar/check.cjs浏览器专项通过，页面异常0；未运行无关全量测试 |

正式入口：src/ui/hud.js 的 createHud，index.html 的 player-bars，src/styles/ui-foundation.css。证据均位于 output/playwright/compact-xp-bar/。designCriterion = compact-xp-bar。最终结论：通过；不涉及PNG替换，不新增桌面布局。
