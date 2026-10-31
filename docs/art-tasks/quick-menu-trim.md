# 快捷菜单入口精简

执行依据：[美术标准](../art-generation-standard.md)、[项目规范](../../AGENTS.md)。

## 目标与范围
- 标识：quick-menu-trim，现有手机 DOM 菜单优化。
- 参考：用户截图 `codex-clipboard-49671ae7-c4f1-4f1d-9961-4ae1f6716305.png`。
- 移除营地小故事、快递站、种子小屋、任务簿四个快捷入口及其独有刷新、点击监听和样式；保留场景入口、面板和玩法。

## 结构与技术
- 沿用奶油底、森林绿描边、现有双列网格和按钮尺寸；移除节点后自动紧凑排列，触控区保持原样。
- 菜单位置、HUD 层级、资源图标与背景场景不变。新增纹理、缓存和下载资源为零。
- 正式入口：`src/ui/farm.js`、`src/ui/mainline.js`、`src/ui/monster-camps.js`、`src/ui/seed-shop.js`；共用菜单 DOM `#field-menu-items`。
- 无新增建筑、地形或动画，碰撞、分层和真实连续帧调整不适用；不生成图片。

## 验收
- designCriterion：quick-menu-trim。
- 通过：320×568、390×844 昼夜四图已逐张核对，九个保留入口按双列连续排列，菜单无屏外溢出；每组均成功打开并关闭手机，浏览器 pageerror 为零。
- “任务”入口的既有修复条件仍生效；修复回信驿后，实机点击“任务→打开巡林簿”成功。种子小屋场景热点、快递站场景热点和营地现场对白继续保留原绑定代码。
- 截图：`output/playwright/quick-menu-trim/{390,320}-{day,night}.png`；复核脚本：`tests/quick-menu-trim-browser.cjs`。未执行全量测试。
- 资源预算与结论：无新增图片、字体或动画，删除四个节点及相应监听；本次 UI 精简通过。
