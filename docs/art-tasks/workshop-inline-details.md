# 综合工坊原位用途与费用

## 2026-10-30 装备档案补充设计

本次整理武器、战车的介绍与获取提示。沿用森林绿、奶油纸色、草绿和麦穗黄及现有汉仪字体；名称旁设置 44px 问号入口。档案采用通用手机底板，正文单列，依次展示用途、打造者、故事，分区以细线区分；红狼保留较长故事，正文独立滚动。只有未拥有的装备显示正式获取来源。底部结算仅保留当前操作、效果和费用，不混入故事或领取委托说明。

文字是本次唯一新增资源；不新增贴图、动画、字体和画布，不改变世界锚点、碰撞、通路、装备数值和草稿事务。入口为 workshop.js、workshop/equipment-info.js、equipment-stories.js；designCriterion: workshop-inline-details。验收覆盖全部目录、所有页签、320/390 手机、短屏、昼夜、问号关闭焦点与未提交草稿。

### 本次验收结果

- 正式浏览器逐件打开 18 件手持武器、9 辆载具档案，名称、打造者、独立故事正确；6 种专属主武器有独立来历，单位测试覆盖编号隔离，浏览器验证狼牙主炮。红狼故事四段，围绕撤离、归来和种子发芽展开。
- 改装页复现原截图的萤火激光步枪／高频晶体，底部仅显示短效果和费用；购买、升级、改装、成长入口均可阅读。已拥有时隐藏来源，未拥有时显示正式故事委托进度。普通购买装备显示工坊购买提示。
- 320×640、390×844、480×740、640×360 实测均无横向溢出，关闭触控区 44px，长正文独立滚动；返回和 Esc 恢复问号焦点，真实试装草稿保持，装备、资源、领取进度未改变。浏览器无页面错误。
- 昼夜场景复核含正式角色、红狼、怪物及营地；本次未改动世界渲染、动作、遮挡与通路。只新增静态文字和按需构建的段落，无新增位图、画布及逐帧 DOM 工作。
- 定向执行 equipment-info、mastery、catalog 共 11 项测试通过，差异格式检查通过。测试场景夹具会累计在线时长，因此持久化只读检查单独比较装备、资源和故事字段；这不涉及生产逻辑变更。

正式入口：`src/ui/workshop.js#createWorkshop`、`src/ui/workshop/equipment-info.js#createWorkshopEquipmentInfo`。designCriterion：`workshop-inline-details`。结论：通过。

长期截图：`docs/art-reference/workshop-equipment-stories/` 内的 `modify-390.png`、`source-320.png`、`wolf-320-day.png`、`wolf-390-night.png`、`wolf-end-390-night.png`、`wolf-640-night.png`、`scene-day.png`、`scene-night.png`。复核脚本保留在 `output/playwright/workshop-stories/`。

## 1 目标与范围
UI 布局修正，标识 workshop-inline-details。点击部件、套件、炮塔立即在既有底栏显示短用途与正式报价；拖入不新开面板。参考用户两张实机截图与 immersive-workshop 任务。保留真实绘制、施工动画、未提交草稿与正式交易规则。

## 2 造型与空间
森林绿文字、奶油底色和木色分隔沿用。底栏左侧为用途及费用，右侧确认；手机按用途、费用、确认三行组织。桌面固定 118px、手机 154px，内容区独立滚动，详情不覆盖属性。中央舞台尺寸不变。地面衔接、变体剪影、光向不适用（仅 DOM 布局）；世界通路、碰撞和入口不变。

## 3 技术交付
CSS 逻辑像素；底栏锚定弹窗底边，采用普通 flex 子项占位，不叠加画布。沿用原 Canvas 与透明背景、昼夜场景，不新增贴图、字体、画布或缓存。入口 src/ui/workshop.js、src/ui/workshop/markup.js 与 src/styles/workshop.css；正式复核 inspectWorkshopDetails，designCriterion workshop-inline-details。截图录制在 output/playwright/workshop-inline-details。

## 4 动画任务补充
不新增动画，现有拆装、施工、角色、怪物、履带和旋翼保留；点击报价不修改装备和动画状态，实际拖入才试装。

## 5 制作指令
复用现有底栏，短用途与资源紧凑排列，预留固定高度；费用读取正式 quoteWorkshop，选择仅报价，不扣费、不启用确认。

## 6 验收记录
待实际浏览器检查：桌面、390/320，点击与拖放，前后底栏及舞台几何，属性滚动无覆盖，昼夜同屏、资源预算和规则回归。通过前不合并。

### 实际验收结果（2026-10-22）

| 设计目标 | 实际证据与结论 |
| --- | --- |
| 点击立即查看用途和报价 | 浏览器实际点击部件、套件、键盘选择脉冲炮塔及其部件，名称用途和正式费用同步；未创建草稿、未扣费。browser.log 无页面异常 |
| 拖放不遮挡属性 | 桌面1280、手机390/320实测底栏始终118/154/154px；工作台始终506/219.44/219.44px；滚到属性后全部卡片位于内容视口内，noOverlay与statsVisible均为true。*-selected.png 与 *-stats.png |
| 交互保留 | 鼠标和真实触摸拖放、键盘、无效落点、切换清草稿、资源不足锁定施工均通过；仅点击报价关闭无草稿拦截，正式存档未变化 |
| 施工反馈保留 | 既有 completion 浏览器回归通过：320武器伤害、390脉冲驱动、320车体装甲、390炮塔射程、1280动力及减少动态；工具收回、前后对照与真实属性一致。completion.log 与 interaction.webm |
| 昼夜与系列一致 | scene-{1440,390,320}-{day,night}.png 实际包含猫、怪物、载具、营地与UI；workshop-*.png 检查森林绿/奶油色、比例与可读性，通过。无新美术资源或动画替代 |
| 落地、遮挡及通路 | 不修改世界位置、碰撞或绘制层；实机场景保留工坊门前通路与角色/载具落地。工作台与底栏物理分区，通过 |
| 资源及预算 | 无新贴图、字体、画布或缓存；正式资源加载成功。工坊画布最大4,980,472字节，小于5 MiB既有预算 |
| 工程与规则 | 相关22项规则测试通过（报价、事务、旧档、保存失败、试射等）；项目模块检查与浏览器复核见执行记录 |

正式绘制器入口：src/ui/workshop.js#createWorkshop；src/rendering/visual-review.js#inspectWorkshopDetails。  
designCriterion：workshop-inline-details。  
结论：通过。长期参考：docs/art-reference/workshop-inline-details-phone.png、workshop-inline-details-desktop.png。
