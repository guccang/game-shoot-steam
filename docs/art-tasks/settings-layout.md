# 设置页分组与返回操作任务单

依据[标准](../art-generation-standard.md)与[模板](../art-generation-brief.md)。

## 1 目标与范围
UI 标识 settings-layout。现有设置页控件混排、底部三个动作紧贴；改为操作与画面、声音、帮助与档案分组，存档与高级默认折叠。保持全部设置、存储、暂停、清空二次确认逻辑与原节点 ID。参考用户设置页截图及正式设置 DOM；无图片资源生成。

## 2 造型与空间
沿用森林绿 #365c49、文字 #304e3e、奶油 #fffef3、浅草 #f0f3e4、分隔 #d5dfc5、危险动作 #984b38。沿用系统中文字体：标题22、分组14、正文14、说明12。左对齐，以分组留白和分隔线取代连续大按钮堆叠。

结构：固定标题与关闭 / 可滚动的分组设置 / 固定底栏（左侧次要“保存并返回主菜单”，右侧主按钮“回到游戏”）。重新开始在折叠的存档与高级区中，独立红色轻量入口，展开后才显示说明。宽屏与手机均使用同一层级，避免底部动作随着长文滚走。

审查：奶油与森林色来自已有游戏合同；不增加装饰编号和无用图标。三个动作通过位置及主次区分，不新增提交设置操作。

## 3 技术交付
HTML/CSS/JavaScript，弹窗最大宽480px、高度不超过视口减28px；按钮触控44px以上。原生 dialog 顶层，内部滚动；零新增贴图与缓存。世界尺寸、锚点、地面衔接、碰撞、邻接和通行均不适用，本任务仅设置弹窗。

## 4 动画任务补充
不新增动画，不修改角色、武器、载具动作；沿用弹窗暂停规则。昼夜使用同一面板材质。

## 5 制作指令
按上述结构整理正式设置页。底栏两项保持固定可见、明确间隔；主页进入时只显示返回主菜单。重新开始保留取消优先的二次确认。保留手机区域摘要、秘境镜头控制、环境及档案嵌套弹窗和调试工具。

## 6 验收记录
2026-10-23 通过。正式入口 `index.html#settings-dialog`、`src/styles/settings-layout.css`、`src/ui/panels/settings.js`；验收读取器 `src/rendering/visual-review.js#inspectSettingsLayout`。designCriterion：`settings-layout`。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 分组与主次清楚 | 常用控制、声音及帮助分组；高级区默认关闭；清空入口和返回栏分离。人工复核不再出现原截图三个按钮紧贴混排。 |
| 标题与返回操作不随正文滚走 | 1280×900、390×844、320×568、740×360 的昼夜共8组，正文滚到底后底栏位置保持不变；无横向溢出，返回按钮均48px高。 |
| 昼夜和现有美术一致 | 已逐张查看正式运行截图，沿用森林绿及奶油材质，屏幕四周可见正式世界背景；未改变角色、载具、武器或场景绘制。 |
| 交互保持可用 | 音量、失焦暂停、环境/玩法说明/档案嵌套返回、Debug展开收起、返回游戏及保存返回主页通过；主页设置只显示返回主菜单。 |
| 清空操作与焦点 | 确认页默认聚焦取消，隐藏底部返回栏；取消与Esc不改进度；隔离测试档执行确认后成功重新开始。 |
| 重新打开与短屏 | 修复弹窗隐藏时无法重置滚动尺寸的问题，显示后回到顶部；高级区每次折叠。短横屏保持正文可滚、标题与返回按钮可见。 |
| 动作、碰撞与资源预算 | 不适用世界动作、通行及地面遮挡；无新增图集、解码或缓存资源。仅新增作用域内样式与一个原生toggle监听，沿用事件卸载。 |

仅运行 `tests/settings-layout-browser.cjs` 专项浏览器检查，结果通过、页面错误0；未执行全量测试。早期验收发现并修正重新打开的旧滚动位置、窄屏按钮文字换行。测试夹具重置为独立存档，避免复用上次死亡状态影响UI检查。

长期证据位于 [settings-layout](../art-reference/settings-layout/)：`settings-{1280,390,320,740}-{day,night}.png`、`advanced-320.png`、`reset-confirmation.png`、`browser-result.json`。完整 CLI 记录在主仓库 `output/playwright/settings-layout/`。

## Debug 满级按钮增补（制作前）

在原高级设置的Debug解锁区追加“一键武器满级”“一键载具满级”两个原生按钮，复用primary样式、中文状态提示和既有滚动容器，最小44像素触控区。全部武器及部件、全部车体及炮塔部件按正式目录上限免费升级，未拥有项一并解锁；不改变当前装备选择。无新增图像、动画、世界碰撞、锚点或缓存，相关资产制作项不适用。保留森林绿及奶油黄、设置暂停归属与默认折叠。正式入口index.html#debug-content、src/ui/panels/settings.js；designCriterion沿用settings-layout。验收覆盖三尺寸昼夜、按钮实点、存档刷新与失败不提交。

### Debug 满级验收结果

- 正式按钮实点通过：17种手持武器、6种车体和21种炮塔均达到当前20级上限；射速、容量、装填、射程、精度、协同及引擎分别按目录上限升级，未混用数值。成功后按钮改为“已全部满级”并禁用；刷新后保持。
- 9项针对性规则检查通过：目录满级、数据独立性、重复操作、武器与载具分离、资源不扣除、存储失败不提交、车体即时生效与耐久/冷却保留、资源上限回归。未运行全量测试。
- 实机模拟存储失败后原进度保持，恢复存储后原按钮重试成功；普通游戏暂停和恢复正常，pageerror为0。
- 1280×900、390×844、320×568昼夜共六张截图逐张复核；按钮高46像素、文案完整，设置内部滚动且返回栏固定，无横向溢出。世界继续使用正式渲染，设置面板遮挡中央角色符合既有模态行为；无新纹理、碰撞及动画资源。
- 入口：index.html#debug-content / src/ui/panels/settings.js，检查器src/rendering/visual-review.js#inspectSettingsLayout；designCriterion：settings-layout。结论：通过。
- 脚本：tests/debug-max-equipment-browser.cjs；完整证据output/playwright/debug-max-equipment；长期参考：[手机白昼](../art-reference/settings-layout/debug-max-day.png)、[窄屏夜晚](../art-reference/settings-layout/debug-max-night.png)。

## 2026-10-30 Debug解锁所有种子购买

- 在原Debug解锁区增加“解锁所有种子购买”，复用primary按钮与原滚动容器。只将正式目录的种子购买资格设为已解锁，原有种子库存、金币、清缴轮数、剧情与价格不变；保存成功后禁用按钮并显示“所有种子购买已解锁”。
- 正式入口index.html#unlock-seeds、src/ui/panels/settings.js、src/progression/player/debug-grants.js；designCriterion为settings-layout。无新增图像、动画、纹理或碰撞，锚点及资源制作项不适用。
- 8项相关单元检查通过。浏览器实际点击验证写盘失败不改变进度、恢复存储后可重试、刷新仍解锁17种购买资格；没有赠送种子或资源。390×844白天与320×568夜晚按钮均高46px，文案完整、无越界，页面错误0；为浏览器手机模拟。
- 已复核[白天按钮](../art-reference/settings-layout/debug-seeds-day.png)、[窄屏夜晚](../art-reference/settings-layout/debug-seeds-night.png)，结论通过。脚本tests/debug-seed-unlock-browser.cjs；完整记录output/playwright/debug-seeds/result.txt，单元结果output/debug-seed-tests.txt。
