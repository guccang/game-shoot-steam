# 红狼装备任务通路修复

## 原因与修改

接取红狼任务会报 `章节通路不合法：FLOWERS→KITCHEN、KITCHEN→POTTERY、LETTERS→MARKET、MARKET→RELAY`。七条装备支线共用的地点配置直接引用生活设施底座，厨房、集市、哨站的底座中心已属于实体建筑碰撞，导致导航终点不可达。

任务交接点统一放在设施前方 32 单位，导航、交互、人物及作业目标仍共用同一个站点。保留全部建筑、森林碰撞和接取校验，不调整寻路算法、不新增存档迁移。

## 验证

- `node --test tests/equipment-story-routes.test.mjs`：3 项通过。覆盖七条支线独立接取、真实门前落点、步行与红狼沿碰撞路径实际移动，以及恢复墙内端点后仍拒绝非法路线。
- `tests/equipment-quests.test.mjs` 中与本次直接相关的 4 项通过：切换故事、七条故事完整交付与保存失败重试、现场接取及碾树中途重载、取消任务归还借装。
- `node --test --test-name-pattern '护盾检测|护盾不足' tests/equipment-story-expansion.test.mjs`：2 项通过，确认哨站点位调整不影响检测流程。
- `tests/red-wolf-chapter-route-browser.cjs`：独立浏览器存档，真实点击邻里装备列表、接取、借装、交谈；真实键盘驾驶碾碎三棵任务树，进入 `CLEAR`，`roadCleared=true`，永久红狼所有权仍为 0，浏览器脚本错误 0。长距离移动使用站点定位夹具；真实路径移动由上述回归测试验证。
- 手机 390×844 白天、320×568 夜晚同屏截图已检查，人物、借车、交互和目标显示正常。截图：`output/playwright/red-wolf-chapter-route/day.png`、`night.png`、`timber-cleared.png`。
- `git diff --check` 通过；未运行全量测试。

## 原测试文件的独立旧断言

最初在未修改代码时运行 `tests/equipment-quests.test.mjs`，除通路错误外，还遇到“旧装备保留使用升级”的升级报价断言失败。修复通路后，“九项装备任务”测试继续暴露旧断言：它要求全部九项任务没有前置，而现行配置中的第四、第五主线章分别要求第三、第四章。两者均与本次站点修正无关，保留现行业务规则；新增测试只对实际独立的七条装备支线验证接取。没有将整个旧文件宣称为全绿。
