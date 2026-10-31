# 委托板统一赠礼任务单

依据[美术生成标准](../art-generation-standard.md)，按[任务单](../art-generation-brief.md)记录。

## 1 目标与范围
- 标识：story-board-gifts；类别：现有故事目录与奖励UI。
- 目标：所有委托板在全部故事交付后均有一次性赠礼，清晰展示条件、奖励、进度与领取状态。
- 配置：晴叶回信驿八篇完成后，霜枝冰晶枪或巡护补给礼包二选一；怪物邻里板保留原装备二选一。
- 保留：单篇剧情、首通奖励、原装备图片和数值、怪物板旧领取记录、故事地点与交互距离。
- 参考：用户两张委托板截图及正式 storyCollectionMarkup；沿用HTML/CSS，复用资源图标。

## 2 造型与空间
- 结构：相同奶油黄整组赠礼框、进度、奖励卡和状态按钮；标题显示当前委托板。
- 武器/载具卡说明永久拥有；资源卡列全每种资源及数额，不能以装备文案描述资源。
- 场景地面、光向和主体剪影不适用；不新增地图资产，不改变通路。

## 3 技术交付
- 延续现有580px上限对话框和手机单列卡片，按钮至少44px，可滚动查看。
- 锚点/分层：原DOM对话框层，文本与图标独立；无需新透明贴图。
- 资源/预算：仅增加配置与DOM文字，复用SVG资源图标，无新图集、缓存或动画。
- 昼夜共用界面配色，验证320/390与桌面同屏和奖励卡可读性。

## 4 动画补充
不适用：不修改动作、武器、履带或镜头。

## 5 制作指令
统一每板一份的领取模型，支持武器、载具和资源包。未知或缺失奖励配置明确失败。所有奖励先保存再入账；旧档已完成可领、已领不重置，连点不重复。

## 6 验收记录
- 结论：通过。正式入口：storyCollectionMarkup / claimStoryCollection / createStoryPanel；designCriterion：story-board-gifts，visual-review.inspectStoryBoardGifts 读取正式 DOM。
- 逻辑：仅运行 story-posts 的 6 项、story-board-gifts 的 6 项、monster-stories 中直接关联领取和 UI 的 4 项，共 16 项通过。没有运行全量测试。
- 实机：Playwright CLI、隔离端口 4234，两个委托板 × 1280×900 / 390×844 / 320×568 × 白天/夜晚，共 12 种目录布局。正式地图入口可打开；板名、进度和领取状态正确，无横向溢出，按钮高度至少 44px；小屏纵向滚动可读完五种资源。
- 交互：模拟旧档八篇均已交付，真实点击资源礼包；保存失败后仍可重试，成功入账金币 1200、木材 400、机械零件 8、能源晶体 4、首领核心 1，两项按钮同时锁定。刷新后保留领取记录。暂离营地故事后，怪物板仍显示自己的标题、目录和赠礼。
- 验收脚本曾把刷新后的“继续巡游”当作新档“开始”，以及在暂离夹具的暂停状态按 E，已修正脚本并仅续验失败段；这两处不涉及产品修改。
- 合并期间 master 新增了主菜单。保留其键盘门禁与返回首页按钮，领取专项脚本同步改用首页的继续入口；额外实测“领奖→保存返回主菜单→继续→刷新→继续→查看委托板”，资源和已领记录正确、按钮保持锁定。未扩大到首页全量用例。
- 视觉复核：沿用奶油黄卡片、森林绿描边与正式资源图标；昼夜背景下文字清晰，资源数额单独列示。地图入口、角色、敌人和地形沿用现有绘制器，界面没有改变场景通行、镜头或遮挡规则。
- 动作真实性：本次不改角色、怪物、车体或武器动作，不新增动作资产；资源预算：零新增运行时图片，截图只保存在文档参考目录，不打入运行资源。
- 截图：见 [390px 白天](../art-reference/story-board-gifts/board-sunleaf-post-390-day.png)、[390px 夜晚](../art-reference/story-board-gifts/board-sunleaf-post-390-night.png)、[320px 礼包](../art-reference/story-board-gifts/prizes-sunleaf-post-320-night.png)、[桌面营地板](../art-reference/story-board-gifts/board-sunleaf-post-1280-day.png)、[桌面怪物板](../art-reference/story-board-gifts/board-monster-neighbors-1280-night.png)、[已领取](../art-reference/story-board-gifts/claimed-resources.png)。
- 完整截图及故障段续验脚本：本地 output/playwright/story-board-gifts/（归档工作树前复制至主仓库同路径）。
