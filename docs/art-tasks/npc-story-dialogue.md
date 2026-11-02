# NPC 分层交谈任务单

## 1 目标与参考
开发阶段的手机交互：点击伙伴，阅读随机生活对白，自愿继续聊天或打开原有事务。参考 `src/ui/monster-camps.js`、`src/ui/npc-dialogue-layout.js` 与 `docs/ui-foundation.md`，沿用森林绿描边、奶油纸面、原生按钮。不生成新插画，不替换人物或资产。

## 2 结构与空间
底部对白：姓名与职业为标题，正文为主，熟悉程度和线索提示为次，底栏为“再聊聊”和“说说正事”。关闭入口始终可见。正文独立滚动，320 / 390 手机宽度检查。没有新增地面物体、碰撞或道路占用。触控热点跟随原人物脚底投影，最小 44px；不贴屏伪造人物位置。

## 3 技术交付
逻辑尺寸与锚点沿用 `dockNpcDialogue`，宽度随游戏容器，竖屏最高占游戏区域 46%；小于 500px 的横屏允许最高 65dvh，保证正文多行可读。层级沿用 `ui-dialogue` 与 `npc-bottom-dialogue`。正式入口 `src/ui/npc-conversations.js`，内容 `src/config/npc-dialogue.js`。交情、线索、随机池属于程序；无图片、画布或纹理缓存新增。人物 ID、连续帧、独立武器、载具、场景光照和碰撞保留；昼夜共用正文纸面。缺失内容不得显示虚构占位对白。

## 4 动画与生成
不新增动画，不使用 imagegen。世界人物继续正式绘制器的活动与动作时钟；打开交谈沿用现有弹窗暂停规则，关闭继续游戏。无视频来源、裁切或 PNG 替换项。

## 5 验收计划
designCriterion：人物身份清楚、中文易读、触控不拥挤、聊天不强推任务、退出恢复探索。验证初识/熟悉/交心、保存失败、加载延续、不同 NPC 独立、秘密仅记录线索、原服务入口、手机短屏与昼夜同屏。截图位于 `output/playwright/npc-story-dialogue/`。验收结果见下。


## 6 实机验收记录

结论：通过。designCriterion = `npc-story-dialogue`。正式渲染路径为 `src/app/create-app.js` → `src/ui/npc-conversations.js` / 既有人物 Canvas 渲染。

| 项目 | 结果与证据 |
| --- | --- |
| 320×568、390×844 昼夜同屏 | `output/playwright/npc-story-dialogue/320-day.png`、`320-night.png`、`390-day.png`、`390-night.png`；实际查看截图，姓名、职业、正文与按钮清楚，保持奶油纸面 |
| 568×320 横屏 | `landscape-mainline.png`；首次检查正文过窄，调整后正文高度 75px，所有操作按钮至少 44px，位置在可视区内 |
| 交互 | `tests/npc-dialogue-browser.cjs`、`tests/npc-mainline-browser.cjs` 通过；真实触屏点击、接话、关闭、查看任务、读档保留与主线正事入口正常 |
| 手机探索 | `phone-clue.png`；第七段交谈后只记录对应线索，不获得车或部件 |
| 商店与脱战 | `shop-service.png`；从闲聊进入原购买服务，实际扣款。`tests/boss-disengage-browser.cjs` 通过脱战补给与续战流程 |
| 世界与动作 | 复用原人物脚底与正式绘制器，不新增实体、碰撞或动画资产；对白暂停后恢复探索，人物热点不重复叠加 |
| 资源预算 | 无新位图、纹理或视频；35 个独立身份、241 段作者对白，记录规模受目录约束，无外部生成请求 |
| 不适用项 | 桌面布局、新图片剪影、视频帧与新增车辆动作不在本轮范围；按当前仓库仅手机布局要求验收 |
