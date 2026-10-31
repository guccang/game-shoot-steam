# 升级追赶报价反馈任务单

执行依据：[美术标准](../art-generation-standard.md)，沿用美术任务单的目标、空间、技术和验收结构。

## 1 目标与范围

- 标识：upgrade-price-feedback；类别：已有 UI 的报价文案与排版。
- 目标：追赶升级同时可见原价、折后价和“追赶3折”，普通升级不显示折扣。
- 数量与场景：武器/角色卡片、车体/炮塔按钮、正式工坊资源栏。
- 保留项：全部价格、取整、施工、动作、独立部件和存档；不生成或修改位图。
- 路线与参考：原生 HTML/CSS；参考 src/styles/resource-icons.css、workshop.css 和现有工坊。

## 2 造型与空间

- 原价使用较弱文字与删除线，实际价格保持主要字号；两行分开防止小屏挤压。
- 奶油底与森林绿沿用现有样式；主次由文字标签表达，不只依靠颜色。
- 剪影变体、地面衔接、邻接、通行空间、世界光照不适用：仅现有界面文字变化。

## 3 技术交付

- 尺寸：容器自适应，验收 1440、390、320 CSS 像素；无新像素图或倍率。
- 锚点：原有资源栏和升级按钮；分层：原有 DOM 对话框层。
- 透明背景、碰撞、纹理缓存不适用；没有新增图片、图集或解码内存。
- 昼夜：同一界面随正式场景同屏验证，不改变光照。
- 文件：src/ui/upgrade-price.js、现有界面/CSS；截图在 output/playwright，验收后保留代表图到 docs/qa。

## 4 动画任务补充

不适用：不修改动画、源视频、帧率、锚点、姿态衔接与独立操枪。

## 5 制作指令

沿用既有森林绿和奶油底；原价与折后价成对展示，折扣来自正式报价，不另写费用公式。实际扣费不变。

## 6 验收记录

- 系列一致与主次：沿用森林绿、奶油底及资源图标，原价删除线、折后金额加粗，已查看正式截图。
- 桌面 1440、手机 390/320 各白天/夜晚工坊：6 个案例全部无横向溢出，报价余额未被底部裁切。截图：[桌面白天](../qa/upgrade-price/workshop-1440-day.png)、[桌面夜晚](../qa/upgrade-price/workshop-1440-night.png)、[390白天](../qa/upgrade-price/workshop-390-day.png)、[390夜晚](../qa/upgrade-price/workshop-390-night.png)、[320白天](../qa/upgrade-price/workshop-320-day.png)、[320夜晚](../qa/upgrade-price/workshop-320-night.png)。
- 其他入口：320 宽[角色](../qa/upgrade-price/hero-320.png)、[车体](../qa/upgrade-price/vehicle-320.png)、[炮塔](../qa/upgrade-price/turret-320.png)原价、折后价及3折均可读；当前载具入口实际打开工坊。
- 交互：金币10、木材4时各显示缺1；正式施工1→2级，从1000/1000扣到989/995；随后2→3不再满足追赶，原价和折扣同时消失。
- 规则：3个新报价测试及3个既有针对性经济测试通过。涵盖四类隔离、部件排除、原版配置、封顶、候选折扣与扣费一致性。语法和差异格式检查通过。
- 资源完整：正式浏览器初始化成功，浏览器验收无页面错误；没有新增位图、图集或缓存。
- 遮挡、通行、动作真实性：本轮不修改世界/动画/光照；不重复验收其机械规则。昼夜截图用于检查正式场景背景下的 UI 文案与布局。
- 验收脚本：tests/upgrade-price-browser.cjs；绑定既有 inspectEconomyFeedback 正式 DOM 入口。

正式入口：src/ui/workshop.js#renderQuote、src/ui/inventory.js、src/ui/panels/vehicles.js。
designCriterion：economy-workbench-feedback（visual-contract.json）。
结论：通过。实际价格及经济参数保持不变；未运行与本轮无关的全量测试。
