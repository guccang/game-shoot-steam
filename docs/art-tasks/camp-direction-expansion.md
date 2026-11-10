# 定向固定面积扩建与怪潮站牌搬迁

依据 [美术标准](../art-generation-standard.md) 与 [项目合同](../../AGENTS.md)，本轮为现有 Canvas/UI 动态交互开发，不生成图片。

目标：每次固定 3000 平方米，方向按钮和不可扩建原因中文展示；保留旧购地和原建筑坐标。怪潮站牌沿用原盾牌外形、脚底和世界分层，仅移动锚点与点击入口，战场位置保持原守门规则。

尺寸、风格：现有 UI 底板与 44px 触控；站牌原尺寸和森林绿奶油色保留，无新位图和动画。规划图复用木牌图标，实际世界复用 drawCampDefense。

验收目标：固定增量、四方向资格、水域保护、保存失败回滚、旧档迁移；手机短屏与昼夜正式站牌位置、点击一致。designCriterion 对应 uiFoundationCriterion 和 campDefenseCriterion。无新角色动作、PNG替换和独立桌面布局，本轮均不适用。验收结果见下节。

## 验收结果：通过
- 定向扩建核心与已有布局用例通过：固定增量、南侧避让小院、东侧禁扩、混合库存扣料、失败回滚、旧档面积与已摆放位置保留、读档恢复。
- 守门核心 7 项关联回归通过；正式手机页面西、南、北连续付款后准确增加 9000 平方米。
- 站牌从布局规划可选，真实保存迁至 (680,-80)，绘制脚底、候停入口和开战资格一致；页面真实打开。原战场规则、任务记录与原盾牌绘制保留。
- 手机 320×568、390×844、430×932、844×390 无横向溢出；实际白天与夜晚图像已复核，站牌与猫猫、邻近房屋和围栏同屏，轮廓及前后层级正常。
- 证据目录 output/playwright/camp-direction-expansion/：east-blocked.png、defense-selection.png、defense-day.png、defense-night.png、defense-open.png、layout-*.png、report.json、video/。
- 正式入口 createCampLayoutPanel、campDefenseObjects、drawCampDefense；设计目标对应 uiFoundationCriterion（手机中文界面）与 campDefenseCriterion（守门站牌及正式玩法），本次不重做站牌动画。
- 新增位图 0 字节；候选水面检查按地契缓存，道路网格仍有约五万格预算。围栏与地面使用真实新增地块，碰撞、清树和野外营地退场共用地契。PNG精修、角色动画与独立桌面布局不适用。
