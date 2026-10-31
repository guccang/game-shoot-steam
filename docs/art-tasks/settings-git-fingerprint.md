# 设置 Git 指纹任务单

依据：[美术标准](../art-generation-standard.md)、[任务单](../art-generation-brief.md)。

## 目标与参考

在既有设置标题下显示 `Git 指纹` 与七位提交号，可核对当前运行版本。沿用森林绿文字、奶油底色和现有中文字体；未提交改动用短标签标识，不增加按钮或大段解释。

## 结构、尺寸与分层

既有 `.settings-heading` 标题流内增加一行 11px 信息，提交号使用系统等宽字体；允许状态标签换行，不撑宽 320/390 手机。标题与关闭按钮维持固定区域，内容区继续滚动。锚点为标题下方，DOM 层不涉及场景图层、碰撞、通行或实体遮挡。

## 保留项与技术交付

保留设置开关、存档、清空确认、嵌套档案、角色、怪物、载具、地形及既有动作。静态文字不适用动画、源视频、帧率与录制。新增图片、字体文件、Canvas、缓存均为零；每次页面初始化最多一个小型 JSON 请求，无逐帧工作。

服务端只提供指纹与改动状态；本地读取本项目 Git，发布包读取 `GAME_GIT_COMMIT` 或既有 `releases/<提交短号>-<批次>` 路径。无指纹明确显示“未提供”，失败显示“读取失败”，不编造版本号。主菜单和战场设置使用同一入口。

## 验收

正式入口：`src/ui/panels/build-fingerprint.js#createBuildFingerprint`；复核入口 `src/rendering/visual-review.js#inspectSettingsFingerprint`；设计目标 `settings-git-fingerprint`，绑定正式设置 DOM。

- 2026-10-25：规则测试 `node --test tests/build-fingerprint.test.mjs`，5 项通过，覆盖真实 Git、干净/修改状态、部署元数据、未知与失败、卸载后的迟到响应。
- 正式浏览器 `tests/build-fingerprint-browser.cjs`：主菜单设置、战场设置打开/关闭、键盘聚焦完整指纹；1280×900、390×844、320×740 的昼夜共 6 组通过，无页面异常、横向溢出或关闭按钮碰撞。
- 截图保存在 `output/playwright/settings-git-fingerprint/`：`menu-320.png`、`settings-<宽度>-<day/night>.png`、`field-<宽度>-<day/night>.png`，共 13 张。实看手机、桌面标题及昼夜角色/怪物/载具/地形同屏，指纹可读；新增行不遮挡设置操作，战场比例与通路不变。
- 资源预算：新增图片/字体/Canvas 为 0；指纹接口 `no-store`，每次页面初始化一次请求，无帧循环、图集和额外资源缓存。保留既有场景动作，不适用新增动作录制。
- 结论：通过。验收时工作树未提交，显示 `930e848 未提交修改`；提交并合并后读取对应实际 HEAD，不硬编码截图中的版本。
