# 手机通用 UI 框架：林间告示板

样板入口：运行本地服务后打开 `/ui-foundation.html`。正式样式为 [ui-foundation.css](../src/styles/ui-foundation.css)，设置、任务、玩法和装备等正式页面已接入；旧页面的结构迁移由 [mobile-panels.js](../src/ui/mobile-panels.js) 和 [ui-mobile-pages.css](../src/styles/ui-mobile-pages.css) 负责。

## 视觉规则

仅面向手机，不设计 PC 或独立桌面浏览器布局。沿用游戏 HTML/CSS 与 Canvas 运行方式。覆盖窄屏、常规屏、大屏、短屏与横屏时的可用性；全屏形态预留刘海、侧边与底部安全区。

森林绿描边与标题、奶油内页、浅草绿操作区、麦穗黄标题分隔与焦点。沿用本地汉仪旗黑；标题 22px，正文 14px，辅助文字 12px。底板 3px 边框，22px 圆角；分区 12px 圆角；按钮 2px 边框、12px 圆角和 3px 底影。间距以 4px 为基础，内容常用 20px，小屏 14px。

不为新页面另写一套底板颜色或按钮阴影。玩法内容、稀有度与装备状态可有独立表达，但外层框架复用此合同。新页面的危险操作必须有文字语义及确认，不只靠颜色。禁用控件使用原生 `disabled`，关闭按钮提供中文无障碍名称。

列表滚动条沿用全局低对比样式：4px 圆角浅灰绿滑块、透明轨道，无两端箭头；不支持伪元素的浏览器使用标准细滚动条。页面不再单独设置 `scrollbar-width` 或 `scrollbar-color`，避免覆盖统一样式；触摸和滚轮继续使用原生滚动。

## 新页面模板

在业务样式之后依次引入 `/src/styles/ui-foundation.css`、`/src/styles/ui-mobile-pages.css`。沿用现有弹窗管理器的打开、暂停和关闭流程，不额外建立第二套游戏状态管理。

```html
<!-- 通用底板：标题和操作固定，只有内容区滚动。 -->
<dialog id="example-dialog" class="ui-panel" aria-labelledby="example-title">
  <header class="ui-panel__header">
    <div><h2 id="example-title">页面名称</h2><p>必要的简短说明</p></div>
    <button type="button" class="ui-close" aria-label="关闭页面">×</button>
  </header>
  <div class="ui-panel__body">
    <section class="ui-section"><h3>分区名称</h3><p>本页内容</p></section>
  </div>
  <footer class="ui-panel__footer">
    <button type="button" class="ui-button">返回</button>
    <button type="button" class="ui-button ui-button--primary">确认</button>
  </footer>
</dialog>
```

| 组件 | 用途 |
| --- | --- |
| `ui-panel` | 标准 480px 底板，移动端自动收窄 |
| `ui-panel--compact` | 360px 确认、提示底板 |
| `ui-panel--fullscreen` | 手机全屏页，固定标题与操作区，支持安全区 |
| `ui-panel__header / __body / __footer` | 标题 / 滚动内容 / 操作栏 |
| `ui-section / ui-inset` | 内容分组 / 辅助提示，不滥用嵌套 |
| `ui-button` | 次要操作 |
| `ui-button--primary` | 主要操作，每个操作栏通常一个 |
| `ui-button--danger` | 清空、放弃等危险操作 |
| `ui-close` | 44×44px 关闭入口 |
| `ui-page` | 功能页结构，搭配 `ui-panel` 固定标题和底部操作，正文单独滚动 |
| `ui-choice` | 目录或任务整行选择，轻边无厚影，区别于提交操作 |
| `ui-pause` | 居中紧凑暂停页，浅色标题、主操作与并列辅助操作 |
| `ui-dialogue` | 共用对白姓名、正文、阅读按钮；与 `npc-bottom-dialogue` 配合底部停靠 |

旧的 `.primary`、`.secondary`、`.danger-button`、`.close` 及首页主次按钮已兼容统一样式。24 个旧弹窗通过显式 `MOBILE_PANEL_CONTRACTS` 接入，保持原节点、ID、事件及动态列表容器。新页直接使用结构模板；旧页只在注册时组装一次。场景透明命中面、拖拽零件和实时 HUD 不属于纸页按钮，不能直接套用。

任务簿、任务说明和清缴页已接入 `ui-page`；暂停与主线、故事、到达对白共用底板和按钮材质。功能页采用深绿标题，正文为奶油纸，底部主操作固定；战场资源与生命信息使用 1px 叶灰边和短底影；对白使用 2px 森林绿边、浅色姓名和底部阅读操作，不使用功能页的大色块标题。层级通过结构和描边区别，配色、按钮圆角和文字颜色不另外定义。

金币与木材总量移入巡林手机正文顶部，采用两列资源卡，沿用正式图标、中文名称及万单位缩写；整卡可点击获取说明。主场景不常驻钱包，HP与设置共用顶部安全区。320窄屏三路弹药在生命卡内换行，避免与生命值重叠；手机资源卡触控高度至少64px。后续页面优先复用这些结构，不设计 PC 布局。

## 验收与扩展

工坊附近只保留「升级武器／升级载具」按钮，固定在对应建筑上方，说明为「打开升级界面」；打开与关闭页面不会改变世界位置或驾驶状态。小屋和两座工坊均在下车后走到门前、站定三秒自动进入，复用原有头顶倒计时；移动、离开或驾驶会取消，暂停不累计，未修复建筑不会触发。停车完成不再立即进入室内或打开工坊页面。走到室内出口等待1秒自动出门，移开取消；室内陈列继续使用点击操作。相关回归为 `tests/workshop-entry-actions.test.mjs` 和 `tests/workshop-entry-actions-browser.cjs`，截图保存在 `output/playwright/workshop-entry-actions/`。

新页面检查 320×568、360×640、390×844、430×932 与横屏 844×390，触控、无障碍焦点、禁用和长文滚动；战场页检查昼夜。读取正式 DOM 的验收入口为 `inspectUiFoundation`，对应 [美术任务单](art-tasks/ui-foundation.md) 和 `visual-contract.json` 中的 `uiFoundationCriterion`。预览页仅说明框架，不能代替真实游戏验收。自动验收使用隔离的移动端运行环境，不触碰用户存档；物理刘海和系统栏仍需后续安装包在真机检查。

## 已迁移的页面与差异

| 层级 | 页面与行为 |
| --- | --- |
| 功能页 | 装备/角色、秘境载具收藏、地图、环境、档案、秘境、巡林主线、装备目标、营门防守、消防、入职工坊：深绿标题，正文滚动，主要操作固定 |
| 装配页 | 综合工坊、浮游炮、机械与蜘蛛配置：保留正式画布、拖拽槽位、报价与业务流程，手机单列与横向零件托盘 |
| 轻说明 | 玩法、秘境、材料、兽潮、熟练度、难度：浅色标题、相同纸材与触控标准 |
| 轻确认 | 新巡林、小屋休息：窄底板、清晰选项，取消不遮挡正文 |
| 对话与奖励 | 邻里目录和委托板共用左侧分类页签，右侧从目录进入单项详情，NPC闲聊仍底部停靠；委托节点交接使用标准任务底板、滚动正文及唯一当前行动，移除重复确认；回应与奖励直接显示，提交后突出下一目标；奖励收据保持独立倒计时与自动关闭 |

消防和秘境阶段会重新生成内容，使用 `layoutMobileActions` 将当前直接操作放入固定底栏，仍在原事件委托容器内。不要把委托按钮移到容器外，也不要用观察器或每帧重建结构。`dialogs.open` 重置正文滚动；关闭嵌套说明不会重置底层内容或提前恢复战斗。

旧场景容器的定位规则只匹配直属标题/底栏，避免影响内部弹窗。44px 是手机触控下限，长按钮允许换行；选中项用深绿浅字，未选项用浅草绿深字。工坊拖拽对象和透明场景热点保留专用样式。

本轮验收入口 `inspectMobileUiPages`、[任务单](art-tasks/mobile-ui-pages.md)、`visual-contract.json#mobileUiPagesCriterion`；脚本为 `tests/mobile-ui-pages-browser.cjs`。不扩展 PC 布局。

修复入口与工坊升级入口共用建筑上方锚点：角色靠近时显示对应建筑名称、材料与修复按钮，附近移动时按钮始终绑定建筑。首次武器工坊和营门多个修复实体使用各自真实位置；屏幕边缘保留触控边距并避让顶部HUD。仍须点击才扣料，离开区域隐藏。验收脚本：`tests/building-overhead-ui-browser.cjs`。

修复、升级及营门入口统一用奶油底、深绿字与浅叶灰描边，底边位于完整建筑/标牌上方。短屏空间不足时只将提示移入资源栏和任务卡下方的屏幕安全区，镜头始终沿用正常跟随与倍率。世界锚点、目标ID及距离校验不变；离开交互范围隐藏提示。建筑附近保留任务卡；保存失败仍显示重试入口。按下不改变锚点，触控至少44px。验收脚本为`tests/building-overhead-ui-browser.cjs`与`tests/gate-repair-ui-browser.cjs`。

营地建筑提示不得触发镜头平移、缩放或回弹。按钮优先贴屋顶投影，遇屏幕边缘或顶部任务卡时按真实DOM尺寸避让，并为底部状态栏留白；短横屏中提示避让角色身体，必要时移到旁边或下方。当前专项验收见 [稳定营地镜头任务单](art-tasks/stable-camp-camera.md)。

武器工坊购买页使用全宽单列货架，逐行显示枪械小图、完整名称和正式资源报价，选中后在固定底栏结算；列表独立滚动，购买后移除已拥有项。升级、改装与成长继续沿用原工作台。验收见 [购买列表任务单](art-tasks/weapon-purchase-list.md)。

## 浅色手绘纸页变体

巡林手机使用 `ui-panel--sketch`，在同一底板结构上采用杏黄标题、奶油正文、浅草绿主操作、轻描边与短阴影。深色作为文字和图标描线，不作为大块底色。手机功能卡可使用低饱和杏黄、草绿、桃粉、淡蓝分组，颜色不代替按钮名称或状态语义。正式实现仍在 `ui-foundation.css`，保留原安全区、触控与滚动合同；其他页面不自动换色。本变体按用户新要求覆盖此前该页“深绿标题”的规定。
