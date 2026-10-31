# 剧情表驱动内容合同

第一章的故事内容统一在 [src/config/story.js](../src/config/story.js)。`STORY_CHAPTER` 汇总纯数据表，可以完整往返 JSON；不允许把函数、回调或脚本字符串塞进配置。正式执行器只理解任务类型和动作类型，不识别 `Q10`—`Q80`。

本次保留第一章、阶段与对白标识，`definitionVersion` 仍为 1，原检查点可以继续。现已通过 `src/config/story-campaign.js` 登记六章主线与两条委托，目录包含章节前置与完成记录。`storyDefinition(game/run/id)` 按显式上下文查询；无参数调用仍返回第一章，兼容原工具。详见[多章故事说明](forest-story-campaign.md)。

## 内容在哪里修改

| 表 | 负责内容 |
| --- | --- |
| `STORY_CHAPTER` | 章节标题、入口、交互距离/时间、成长上限、存档旗标、恢复目标和完成奖励 |
| `STORY_NODES` | 每个阶段的目标、任务、准备条件、装备权限、启动动作、面板、HUD、人物与临时提示 |
| `STORY_DIALOGUES` / `STORY_LINES` | 台词、发言者、整段结束动作；逐句和跳过执行同一条后续链 |
| `STORY_ACTORS` | 人物显示名、真实角色图集编号、头部高度、录音站点与侧让距离 |
| `STORY_PROPS` | 会话道具、位置、出现条件、修复状态和部件/生命值绑定 |
| `STORY_CLEANUP` | 换阶段、换波、领主死亡的清理字段；暂离/完成恢复森林；人物道具的会话生命周期 |
| `STORY_WORLD` / `STORY_SITES` | 世界站点、临时清树空地、主路/近道、守点通道、地图描线与通行检查 |
| `STORY_ROUTES` | 路线站点、逐站配额、同屏上限、重卫数量和一次性补给 |
| `STORY_ENCOUNTERS` / `STORY_DEFENSE` | 敌人模板、出生时序、守点波次、领主数值、边界和援兵编排 |
| `STORY_LOADOUTS` / `STORY_TRIAL` | 三套借用装备、试射布局、时限与玩法提示 |

`STORY_STAGES` 由阶段表键名生成。原有导出保留供既有测试和工具使用；运行器、界面与存档校验统一读取章节合同。

## 阶段与通用任务

每个阶段提供 `title`、`objective` 和 `task`。可选字段包括：

- `requiresLoadout`：旧存档恢复时是否必须拥有本次借用配置。
- `prepareWhen`：从检查点恢复时进入整备的条件；否则恢复为暂停中的活动任务。
- `loadout` / `trial` / `routeChoice`：允许换装备、试射或选择路线。
- `start`：玩家点击开始后按顺序执行的动作。
- `claimWhen`：最终领取条件，只有准备状态且满足条件才允许结算。
- `actors` / `props`：当前阶段出场项，离开此阶段后不再生成。
- `panel` / `hud`：准备页和任务提示；按面板或HUD类型渲染，不判断阶段编号。

| `task.type` | 行为 | 关键参数 |
| --- | --- | --- |
| `idle` | 等待准备或正式交互 | `objective.action`、`actionWhen` |
| `wave` | 靠近目标后生成一次遭遇 | `site`、`reach`、`wave` |
| `route` | 逐站遭遇，抵达终点后执行动作 | `reach`、`destination`、`arrivalRadius`、`after` |
| `defense` | 每波清场后完成修复计时，再进入下一波 | `site`、`waves`、`repairSeconds`、`after` |
| `boss` | 复用正式领主战，领主和支援清空后完成 | `boss`、`warning`、`after` |
| `travel` | 依序抵达路点，可要求真实飞行状态 | `points`、`radius`、`requires`、`after` |
| `landing` | 在落点范围内实际下机才完成 | `site`、`radius`、`after` |

攻击、物理、射击和装填仍使用原系统。这些通用机制留在代码中；新增一种此前不存在的任务机制仍需增加处理器，不能只填写一个未实现的类型名称。

## 条件、动作与绑定

条件支持 `true/false`、`{flag:'mint'}`、`{read:'ending'}`、`{stage:'Q50'}`、`{path:'combat.cleared',equals:true}`，以及 `all`、`any`、`not` 组合。路径只读会话自身字段，没有表达式执行或原型访问。

动作支持 `stage`、`phase`、`flag`、`move`、`dialogue`、`target`、`wave` 和 `boss`。动作按数组顺序执行，例如关闭广播：

```js
// 关闭广播后记录旗标、返回营地，并进入交付阶段。
after: [
  {type: 'flag', key: 'silenced'},
  {type: 'move', site: 'CAMP'},
  {type: 'stage', id: 'Q80'}
]
```

人物和道具使用 `site` 加 `dx/dy` 定位。人物以 `actor` 引用人物表；道具以 `kind` 选择既有正式绘制类型。`when` 控制出现条件；`bind` 支持常量、旗标、`{path:'relay.hp'}` 和 `{when:条件,then:值,else:值}`。需要新增外形时仍须实现对应正式绘制器并遵守美术标准。

## 清理、恢复与存档

- `cleanup.combat`：阶段切换、重试与试射切换时清空敌人、弹丸、预警、战场边界与瞬态会话字段。
- `cleanup.wave`：下一波开始前清理上一波的战斗实体。
- `cleanup.bossDeath`：清理领主和预警，记录配置中的完成旗标。
- `cleanup.exit`：暂离先保存检查点，完成已原子提交奖励；清除章节会话，并恢复原森林对象引用，保持原暂停行为。
- `cleanup.scene.lifetime: 'session'`：剧情人物和地图道具只在活动章节存在，完成或暂离后全部移除，重玩从新会话旗标生成外观。

保持已有阶段/对白/路线标识可以兼容原档。删除或重命名已发布标识需要明确的存档迁移，不能直接更名后声称兼容。存档恢复只接受配置表自己的键，拒绝未知编号及原型属性名。

入口执行 `validateStoryDefinition()`：校验纯数据、任务与动作类型、阶段/对白/人物/站点等引用和基本波次参数。配置错误在冻结森林前明确报错，不静默跳过任务。

## 验证范围

专项命令：

```sh
node --test tests/story-table.test.mjs tests/story.test.mjs tests/story-props.test.mjs tests/story-guidance.test.mjs tests/story-navigation.test.mjs
```

`tests/fixtures/story-chapter-baseline.json` 来自重构前的 `9429ef3`，由 `tests/helpers/story-trace.mjs` 记录三套装备×两路线。比较阶段、目标、出生位置/数值、修复计时、道具、人物和奖励；轨迹采用显式击杀夹具，不冒充实际射击胜率测试。若后续有意修改玩法，应说明变化后再更新基准，不能为迁移失败直接重录。

另外验证全阶段改名、仅改表新增阶段、台词/人物/清理规则修改、原版本1检查点恢复、敌人攻击表中保护目标、未知配置拒绝，以及正式浏览器界面。实机记录见 [任务单](art-tasks/story-table-driven.md)。不运行其他玩法的全量回归。

浏览器专项使用隔离端口4222；先运行 `tests/story-table-browser.cjs`，完成结算后接着运行 `tests/story-table-map-browser.cjs` 验证重玩地图。两者均通过 Playwright CLI 的 `run-code --filename` 执行；不得用于日常游玩存档。


## 装备体验叙事（2026-10-23）

第一章内容现已按救援动机、路标发现、路线取舍、三段接线、躲开冲锋、通讯报平安、回营工坊的顺序调整。战斗数值与奖励不变；路标教学遭遇改为同向靠近，方便真实武器形成搭配效果。

- `src/config/story-journey.js` 提供 `experiences` 和 `followup`，由 `STORY_CHAPTER.journey` 汇总；仍是可完整往返JSON的纯数据。
- `experiences`：`event` 选择正式事件，`match` 支持相等或 `{min:数值}`；可选 `loadout` 限定当前搭配。`goal/success/feedback/speaker` 决定可选目标与一次性反馈；`advice/route/defense/boss` 决定各阶段建议。
- `nodes.*.experience` 为 `loadout` 时读取当前搭配目标，也可引用独立体验编号。目标永远不接入主线的交互、领取或完成条件，未达成仍可通关。
- `dialogues.*.variants` 按顺序匹配 `when`；`replace/line` 替换一行，`append` 追加短对白。首次开始对白时把分支编号写入 `dialogueChoices`，后续换装备不会重写日志。
- `nodes.*.cues` 监听 `wave-start/wave-clear/supply/boss-start`；`match` 读取事件参数，`when` 读取会话。`priority` 让来敌提示先播，`once:false` 允许重试再次提醒，`safeOnly` 等安全间隙再读；`experienceText` 可选当前搭配的 `defense/boss` 建议。
- 正式弹道发送 `laser-pierce.count`，命中入口发送 `impact.weaponIndex/wet/chill`，冲锋完整结束发送 `charge-end.hit/travel`。树木不算贯穿目标，无敌或装甲承伤的擦撞也不算躲避；计数不反向修改伤害、控制或技能计时。
- 短气泡使用独立DOM节点，不传入剧情镜头。画外普通反馈延后，安全间隙可显示为通讯；预警/冲锋时隐藏。空间不足或遮住玩家身体时暂缓显示，队列有上限，反馈不暂停战斗。
- 版本1存档新增白名单字段 `experiences/lastExperienceLoadout/seenCues/dialogueChoices`，旧档缺字段按空记录恢复。短气泡、队列和阅读计时为瞬态，会随阶段、重试、暂离和完成清理。
- 完成记录新增 `followupLoadout/followupDismissed`。优先定位最近真正触发搭配效果的装备，没有记录时定位最后借用配置；只打开现有工坊，不改变拥有状态，不代替玩家购买或装备。“以后再说”立即保存。

相关验证：`tests/story-journey.test.mjs`，以及端口4223的 `story-journey-browser.cjs` 和 `story-journey-layout-browser.cjs`。本轮黄金轨迹未重录，仅明确排除已授权更改的对白文本与Q20出生坐标；其他阶段坐标、配额、数值、修复时间、奖励等仍逐项对照。详见 [验收任务单](art-tasks/story-equipment-journey.md)。


## 多章选择与正式秘境连接

`requires` 是前置章节ID数组；解锁只读已完成记录。人物绘制、地图、目标导航、借用装备和存档校验均查询当前章节；全局无可变的“当前章”。每个章节定义必须完整可序列化。

`choices` 保存白名单选项，节点的 `choice` 与 `after` 声明叙事选择及后续动作；对白里的 `{companion}` 取选项显示名。选项ID随章节完成记录保存，不写入战斗属性。

节点 `excursion` 声明正式秘境模式、最低清关数、完成旗标、返回后动作和提示。`story-excursion.js` 在成功的正式祝福/布防事务后记录旗标，不修改秘境奖励或另建战斗。返回章节时按配置继续。`route` 配额为0表示纯通行路点；路线 `loadouts` 可限制水陆能力，正式碰撞仍由物理系统决定。
