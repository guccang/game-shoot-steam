# 百种鱼与鱼竿鱼饵任务单

依据：[美术标准](../art-generation-standard.md)、[任务模板](../art-generation-brief.md)和[统一合同](../../AGENTS.md)。

## 1 目标与范围
动态交互阶段：鱼扩展为100种；5档竿和6类饵控制候选鱼及概率；商店购买、装备、概率预览、图鉴与收鱼共用正式数据。保留已有3种鱼稳定ID、鱼护、收藏、营地、真实角色连续帧和独立操枪。程序绘制扩展原正式鱼体，不生成新位图；PNG精修后续阶段。参考现有湖中游鱼截图与 `src/rendering/outdoors.js`。

## 2 造型与空间
10个鱼体家族，按躯干宽高、头形、背鳍、须、尾鳍和纹样区分。有限平涂、森林绿描边；小鱼作湖面次景，不遮掩角色与攻击提示。保持原水域、岸线和桥头通行；不增加实体碰撞。夜色由正式场景处理。

## 3 技术交付
鱼身中心锚点(0,0)，逻辑范围保持原约36×22单位，尾鳍单独运动，大小受原水界余量约束。肖像沿用160×128/192×160透明画布。场景仍上限32条鱼；图鉴分页每页20项，避免100张同时绘制。源码入口为 `src/config/fish-catalog.js`、`src/config/fishing-tackle.js`、`src/core/fishing/fishing-tackle.js`、`src/rendering/outdoors.js`；缺失配置明确报错，不用假鱼替代。无新增纹理和解码预算。

## 4 动画任务补充
鱼尾沿正式游戏时钟独立摆动，路径与局部动画分离；暂停和减少动态沿用。图鉴静态肖像只用于资料页；角色、怪物、载具动作不修改。

## 5 生成指令
未调用imagegen：本次以正式Canvas鱼体的结构变体、现有统一手机底板实现功能与动态效果，尚未开展PNG精修。数值、概率、进度与交互继续由程序控制，不烘焙文字或动态效果。

## 6 验收记录
2026-11-03，designCriterion：`hundred-fish-tackle`，正式验收入口 `src/rendering/visual-review.js#inspectHundredFishTackle`。动态交互阶段通过；PNG精修仍为后续阶段。

| 设计目标 | 实际结果与证据 |
| --- | --- |
| 百鱼系列与变体 | 100个唯一ID/名称、10个结构家族。正式图鉴逐页检查全部100个肖像非空，搜索新增传说鱼成功；鱼体比例、鳍、触须、纹样与现有森林描边一致。长期证据见下方图鉴和甲鱼详情。 |
| 地形、遮挡与通行 | 正式水界采样测试保持鱼体在水中，地表与地下昼夜截图可见猫、湖岸、植物和游鱼；沿用水面之后、实体之前的绘制层，不新增碰撞或通行规则。本次未改载具、桥梁与人物的遮挡实现，不扩展为全地图通行测试。 |
| 独立动作 | 沿用游戏时钟、路径与独立摆尾；全流程脚本检查持续移动、暂停冻结、减少动态固定姿态。角色连续帧、独立手持武器和载具动作没有改动。 |
| 概率与可达性 | 3水域×5竿×6饵的90种组合全部归一化，联合可达全部100鱼；低阶竿不能越级。10万次分层抽样逐种与概率相符；地表和地下页面逐行概率与正式模型一致。 |
| 真正购买及钓获 | 正式商店柜台候停后通过触控购买5竿6饵、选择星辉竿与蚯蚓饵；真实蓄力、抛竿、扬竿、正式控线至传说鱼「流光长绫」上岸。保存失败不入护，重试弹介绍；换装和仅扣当前饵的记录重载保持。背包满载拒绝收鱼另在失败场景中观察到。 |
| 地下入口 | 新增「钓具」按钮，实测切换荧菌饵、显示地下40种候选鱼；进入面板暂停，关闭恢复。按钮与原「钓鱼」「工具」同屏，无重叠。 |
| 手机与既有容器 | Chromium触控模拟320×568、390×844、844×390；另核对1280×800既有竖版容器。正文可滚动、操作区在屏内、中文无横向溢出，主要按钮至少44px。未使用实体手机。 |
| 资源和预算 | 无新增位图、音视频或全屏画布。图鉴每页20张160×128缩略图，约1.56MiB RGBA像素，鱼获详情额外约0.12MiB；翻页替换旧画布。场景上限32条、地下缓存每层256格不变，水域候选表预计算。正式肖像缺失会明确报错。 |
| 回归 | `node --test tests/hundred-fish-tackle.test.mjs tests/outdoors.test.mjs tests/mine-fishing.test.mjs tests/fish-creature-codex.test.mjs`：30项通过；补无效购买ID保护后重跑新增6项通过。两份正式浏览器脚本均通过，页面错误0；主流程21张截图，地下入口补充5张截图。 |

长期截图：[鱼种分页](../art-reference/hundred-fish-tackle-fish-page-3.png)、[概率表](../art-reference/hundred-fish-tackle-odds-rows.png)、[短屏鱼获](../art-reference/hundred-fish-tackle-caught-320.png)、[甲鱼详情](../art-reference/hundred-fish-tackle-armor-detail.png)、[地表白天](../art-reference/hundred-fish-tackle-forest-day.png)、[地下夜晚](../art-reference/hundred-fish-tackle-mine-tackle-scene-night.png)。

完整截图和日志：`output/playwright/hundred-fish-tackle/`；最终通过录像 `video/page@8a84009747c8f7d7bd3e9468420bbdbb.webm`。脚本：`tests/hundred-fish-tackle-browser.cjs`、`tests/hundred-fish-mine-browser.cjs`。默认端口4175被既有服务占用，本次独立使用4176；未停止既有服务。

通过结论限本次Canvas动态、手机交互及数值功能。后续PNG精修需保留鱼种ID、包围尺寸、中心锚点、独立摆尾、概率与存档接口，并重新做对应视觉检查。
