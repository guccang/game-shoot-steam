# 内容与成长数值表

本任务的数值口径是：修改后能增加游戏内容、改变挑战和养成节奏、延长可玩的过程。怪物、装备、任务、波次、奖励和成长属于此范围；坦克后坐力、镜头、动画、导航采样和绘制锚点不属于内容数值。旧 `config:audit` 是全部数字字面量扫描，不能用它的数量代表待迁移的玩法参数数量。

## 正式编辑入口

以下 JSON 已接入正式运行，旧 JavaScript 导出只负责兼容引用。重载游戏后生效，不会即时改写已经生成的怪物和战斗快照。

| 内容 | 正式数据源 | 已接入的用途 |
| --- | --- | --- |
| 主线任务 | [mainline.json](../src/config/content/mainline.json) | 29 个任务的顺序、条件、对白、奖励、步骤、操作、装备解锁引用统一维护 |
| 战车属性 | [vehicles.json](../src/config/content/vehicles.json) | 6 种战车按稳定 ID 关联基础装甲倍率、装甲成长、移动倍率 |
| 怪物属性 | [monsters.json](../src/config/content/monsters.json) | 5 种远程怪、重装怪、飞行攻击、地区等级成长、阶级倍率、解锁与混编规则 |
| 成长键值 | [growth.json](../src/config/content/growth.json) | 起始资源、装备/部件/协调等级上限、成长倍率、熟练度阶梯、获取量、套件费用、守护成长 |

战车购买价格、材料、解锁战绩与升级费用仍以 [economy.js](../src/config/economy.js) 读取的经济方案为权威，战车表不再保存会被覆盖的价格。旧 `upgradeScale` 没有任何运行消费者，已删除，避免留下“改了但没有效果”的字段。原来两种远程怪误用了 `ranged.lateChance` 作为移动倍率，现已分离为各自的 `movement`；默认仍为 0.95。

主线新增任务可复用已有条件、NPC、地点和操作类型。任务的条件、展示文案和步骤应一起修改；例如把“探索 80 米”延长为 150 米，需要同时改 `goal` 中的门槛和对应文案。`tasks[].id` 是存档身份，已发布任务不能随意删除、重命名或重排；直接延长主线请在末尾追加。插入旧任务之间仍需要迁移旧存档。

熟练度 `masteryThresholds` 是从一级起的累计经验，首项必须为 0、后续严格递增；追加阶梯即可提高最高熟练度。永久装备等级由 `progress.maxEquipmentLevel` 控制，部件等级由 `progress.maxPartLevel` 控制；费用曲线还需配合经济方案的指数、阶段倍率和费用封顶检查。提高等级上限不等于自动获得均衡的新养成周期。

## 当前玩法的数据化状态与剩余限制

| 玩法 | 现有表及参数来源 | 仍由代码决定的部分 |
| --- | --- | --- |
| 普通怪与远程/飞行/重装怪 | 新怪物表、[守护敌人表](../src/config/guardian-enemies.js)、[区域等级](../src/world/biomes.js) | 稳定物种的行为和绘制绑定；新增物种不能凭空获得新技能与美术 |
| 战车、手持与专属武器 | 新战车表、[武器表](../src/config/weapons.js)、[挂载表](../src/config/vehicle-armaments.js) | 固定目录编号关联所有权、存档和车体绘制；新车型或新攻击机制仍需接入代码 |
| 角色与部件成长 | 新成长表、[角色表](../src/config/heroes.js)、[部件规则](../src/config/equipment-parts.js)、经济表 | 乘法、线性、分段成长等公式结构仍由解释器实现 |
| 主线 | 新任务表，兼容入口为 [mainline.js](../src/config/mainline.js) | 新条件类型或新操作记录需要解释器与事件支持；当前条件接口中的控制器集合仍是固定编号 |
| 领主 | [bosses.js](../src/config/bosses.js)、通用玩法配置 | 领主技能阶段与行为分支；不能只加名称和血量就获得新技能 |
| 清缴波次 | [waves.js](../src/config/waves.js)、通用玩法配置 | 当前五波一组及 `% 5` 等索引、历史配额换算仍耦合；不可只修改组长度就宣称支持任意组长 |
| 远征、时空塔、守护 | [realms.js](../src/config/realms.js)、[guardian.js](../src/config/guardian.js)、经济表 | 现有模式及生成流程有机制分支；新模式不是增加表行即可实现 |
| 剧情章节 | [story-campaign.js](../src/config/story-campaign.js)、[story.js](../src/config/story.js)、[story-journey.js](../src/config/story-journey.js) | 已有条件和节点可以组合；新场景资源及新触发机制需接入 |
| 邻里、森林生活 | [living-world.js](../src/config/living-world.js)、[monster-stories.js](../src/config/monster-stories.js) | 新事件类型、记录字段与结算机制仍需代码 |
| 消防、足球、过河 | [fire-rescue.js](../src/config/fire-rescue.js)、[slime-football.js](../src/config/slime-football.js)、[river-crossing.js](../src/config/river-crossing.js) | 内容参数已有配置，玩法各自的行为流程仍由执行器实现 |
| 配方、产出、挑战门槛 | 经济表、[materials.js](../src/config/materials.js)、[rewards.js](../src/config/rewards.js) | 新资源类型还涉及存档、获得事件与界面支持 |
| 召唤物与挂载成长 | [funnel-loadouts.js](../src/config/funnel-loadouts.js)、[mechanical-loadout.js](../src/config/mechanical-loadout.js)、[spider-loadout.js](../src/config/spider-loadout.js) | 召唤物类别、技能行为、槽位语义仍有固定机制 |

因此，本次是明确内容口径、集中四类关键数据并接通验证，不是宣称全游戏所有内容都能任意新增行。下一步若继续扩大纯表扩展能力，应优先处理清缴编成/组长度与怪物、战车的模板注册，而不是再搬移后坐力等表现参数。

## 数值工具的统一入口

[content-catalog.js](../src/config/content-catalog.js) 提供四类可编辑数据及来源、稳定身份、扩展边界；既有玩法继续引用原正式表，避免重复真源。[content-validation.js](../src/config/content-validation.js) 提供同一个校验入口，游戏启动和命令行共用。

```powershell
npm run content:check
npm run content:export -- --output output/content-catalog.json
npm run content:export -- --candidate --output output/content-candidate.json
npm run content:check -- --input output/content-candidate.json
```

目录导出用于查看，不可直接作为候选回灌；`--candidate` 输出顶层为 `mainline/vehicles/monsters/growth` 的可验证候选。候选检查不会写回正式文件。它检查字段拼写、数值范围、任务 ID 重复、解锁引用、NPC/地点/装备存在性、步骤与条件数量、已实现操作、经验阶梯递增等。复杂剧情路径是否实际产生进度、选择器是否仍存在以及新增内容是否可通关，仍需对应运行验证，不能用结构检查替代。

旧 `config:*` 目录保留兼容，包含表现/技术参数和派生数据，不作为本任务内容编辑的默认目录。游戏不支持本次候选文件热重载。

## 验证记录

- 迁移前后正式数据比对：任务、怪物、成长和战车有效属性保持一致，仅移除了无消费者的 `upgradeScale`。
- 内容专项 15 项通过：包括仅修改数据、追加任务后读取旧主线完成进度、增加熟练度阶梯、改变战车装甲和怪物属性，以及非法候选拒绝。
- 原玩法配置兼容专项 11 项通过。
- 本次相关九个测试文件共 80 项：77 项通过；3 项在未改动主线上复测同样失败（守护测试仍预期首波 12 只，两个载具测试仍使用旧耐久/费用断言）。没有运行全量测试，也没有修改这些旧断言来掩盖失败。
- 本次未修改画面、动作、布局与默认平衡；不涉及美术资源生成与视觉调整。
