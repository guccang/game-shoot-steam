# 波次与故事奖励精简任务单

依据 [美术生成标准](../art-generation-standard.md)，由 [任务单](../art-generation-brief.md)填写。

## 1 目标与范围
- 标识：story-reward-hud-simplify；类别：现有 DOM HUD 与奖励 UI；参考：用户截图及正式 wave-progress/story-rewards。
- 去掉普通波次的重复文字行，以节点、进度条和 Boss 图标呈现组进度；故事单篇与资源礼包至多三种资源。
- 保留节点状态、当前波次标题、倒计时/击杀数、Boss 点击入口、无障碍进度、剧情/秘境任务正文，以及装备赠礼。
- 制作路线：编辑现有 HTML/CSS/JavaScript 配置与呈现，无新增美术资产。

## 2 造型与空间
- 结构：标题下直接显示节点轨道，减少一行高度；奖励沿用原资源图标和数字。
- 配色、描边、层次：森林绿与奶油黄；不新增光照、剪影或世界变体。
- 地面衔接、邻接组合、场景碰撞不适用：仅 DOM UI，地图通行保持现状。

## 3 技术交付
- HUD 原 282px 宽及手机自适应，节点 23px，Boss 44px 触控区域；奖励使用原对话框。
- 锚点/分层：原屏幕 HUD 和弹窗层，不引入图片倍率、透明贴图或缓存。
- 检查 320/390/1280 宽昼夜同屏；普通波次隐藏正文，剧情和秘境仍可见。
- 运行资源增量为零；截图只进 docs/art-reference 与 output/playwright。

## 4 动画补充
不适用：不修改角色、怪物、载具及武器动作；沿用正式场景做同屏检查。

## 5 制作指令
第一章与营地礼包只保留金币、木材、零件，保留这三种现有数量。配置拒绝超过三种正数资源，奖励预览与实际结算一致；已入账资源不追扣。

## 6 验收记录
- 结论：通过；没有新增运行图片、视频、缓存或动画。
- 定向逻辑检查：story-resource-limit 的 2 项与 story-board-gifts 的 6 项通过，覆盖所有当前故事/礼包配置、第四种拒绝、零值、第一章真实交付、存档资源保留、失败重试与一次性规则。未运行全量测试或重复整章路线组合。
- 实机：隔离端口 4235，正式地图绘制器中保留猫猫、手持武器、松果战车、敌人和地形，320×568、390×844、1280×900 的白天/夜晚六种视口通过。面板无重复正文、无空白文字行、无横向溢出；已完成勾、当前节点、后续节点及 47% 进度对应同一正式状态；Boss 触控区保留 44px。
- 交互：最后一只普通怪死亡后按钮解锁，真实点击可进入 Boss；剧情和秘境任务正文依然可见。礼包界面显示三项，实际点击入账金币 1200、木材 400、零件 8，晶体和核心不增加也不追扣。
- 视觉：原奶油色节点、森林绿面板与资源图标一致，标题/计数下直接接轨道；未修改世界锚点、光照、遮挡、碰撞或运动，不需要新增绕行或动作素材检查。
- 截图：[390白天](../art-reference/story-reward-hud-simplify/wave-390-day.png)、[320夜晚](../art-reference/story-reward-hud-simplify/wave-320-night.png)、[桌面白天](../art-reference/story-reward-hud-simplify/wave-1280-day.png)、[三种礼包](../art-reference/story-reward-hud-simplify/gift-390.png)。其余昼夜截图及 Boss 就绪图在同目录，完整输出保留于主仓库 output/playwright/story-reward-hud-simplify/。
正式入口：updateWaveProgress / storyRewardMarkup / storyCollectionMarkup / inspectWaveProgress。
designCriterion：story-reward-hud-simplify。
