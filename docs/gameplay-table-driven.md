# 玩法数值与配置入口

> 口径更新：内容量、游戏时长和成长配置以 [内容与成长数值表](content-balance-tables.md) 为入口。本文的旧目录还包含物理、飞控与表现调优参数；这些不计入本次内容数值整理范围。任务、怪物、战车属性与成长的正式 JSON 来源见新文档。

本次把散落在战斗、成长、波次、秘境、生活任务和物理逻辑中的参数接到正式配置。现有武器、角色、载具、剧情、经济等表继续保留原文件和稳定 ID，避免再复制一套互相漂移的“总表”。

## 怎么修改

| 数据形态 | 正式来源 | 用途 |
| --- | --- | --- |
| 键值参数 | `src/config/gameplay-values.js` | 暴击、回血、等级上限、增长系数、出生配额、攻击间隔、交互距离、奖励系数、物理参数 |
| 成组玩法数据 | `src/config/gameplay-tables.js` | 怪物攻击档位、品质属性、弹道型号、领主技能点位、前期波次修正、环境时长 |
| 已有玩法表 | `src/config/gameplay-catalog-sources.js` 登记的源文件 | 武器、改装、角色、载具、材料配方、经济方案、剧情关卡、生活委托等 |
| 字段合同 | `src/config/gameplay-value-schema.js` | 中文名称、单位、数值类型、上下界；这些是编辑规则，不是第二份数值 |
| 校验 | `src/config/gameplay-validation.js` | 缺项、未知项、有限数字、整数、概率、数组预算及字段关系 |
| 工具目录 | `src/config/gameplay-catalog.js` | 导出来源、数据快照、数值路径与公式函数名 |

修改正式源文件后刷新页面生效。现阶段不提供热更新、文件回写接口或新数值编辑页面；模块初始化时生成的派生数据必须重新加载。改默认值也不会自动清除玩家已经保存的自定义环境设置。

```powershell
npm run config:check
npm run config:export -- --output output/gameplay-catalog.json
npm run config:export -- --candidate --output output/gameplay-candidate.json
npm run config:check -- --input output/gameplay-candidate.json
npm run config:audit -- --output output/gameplay-audit.json
```

输出目录须先存在。完整目录是**只读快照**，含兼容导出、派生结果及多处引用，不能整体回灌。候选 JSON 只包含 `{values, tables}`，校验不会保存或激活候选。已有经济工具仍通过 `validateEconomy`、`bindEconomy` 使用其独立合同。

例如调整普通暴击概率，修改 `combat.criticalChance`；调整首层怪物数，修改 `realm.firstCount`；调整品质血量倍率，修改 `enemyHealthByRank`；修改武器伤害、弹量或装填时间，继续编辑武器表中的对应行。无需修改结算函数。

## 玩法对应关系

| 玩法 | 原有表 | 新增统一参数或表 |
| --- | --- | --- |
| 角色、装备与成长 | heroes、weapons、weapon-mods、equipment-parts、economy | progress、growth、parts、masteryRewards |
| 射击、元素、榴弹与暴击 | weapons、vehicle-armaments、tide-cannon | combat、projectile、arc、grenade、weaponTurn、projectileProfiles |
| 森林怪物与怪潮 | waves、enemies、ranged-enemies、armored-enemies、encounters | enemy、wave、flying、ranged、armored、arrival、enemyAttacks、品质属性表 |
| 领主与援军 | bosses、boss-combat | boss、sporeOffsets、featherAngles |
| 远征、高塔和守护 | realms、expedition、guardian、guardian-enemies、guardian-equipment、guardian-upgrades | realm、guardian、blessings |
| 浮游炮、无人机、机械猫与蜘蛛 | funnel-loadouts、funnel-flight、mechanical-loadout、spider、spider-loadout、summon-behavior、summon-energy | funnel、flight、drone、mechanical、spider、companions |
| 载具和炮塔 | vehicles、vehicle-armaments、vehicle-capacity | vehicle、physics；读档弹量上限由部件成长推导 |
| 消防救援 | fire-rescue | fire；运行树组规模与恢复上限共用配置 |
| 史莱姆足球 | slime-football | football；得分奖励、出生属性与清场边距 |
| 主线、故事和生活委托 | mainline 系列、story 系列、living-world、resident-chatter、ranger-arrival | mainline、story、living |
| 环境和生活历法 | living-world、world/environment-timing | environmentTimings、calendarTimings；时段起点、日长、季长及日期显示共同推导 |
| 树木和物理运动 | biomes、现有世界定义 | forest、physics |

完整源文件目录与键值清单见 [配置清单](gameplay-config-inventory.md)，硬编码扫描范围及遗留项见 [审计说明](gameplay-config-audit.md)。

## 后续数值工具接口

`await loadGameplayCatalog()` 返回 `entries` 和 `fields`。用 `entry.id`、`field.path` 做树节点逻辑标识，用中文 `label` 展示。`field.source` 指向正式源文件；新增键值字段带 `constraint`。不要用中文名称关联数据，也不要因排序改变现有装备数组的索引。

新键值支持完整候选校验；新增玩法表同时提供结构和关系校验。已有源表目前只在目录导出时验证可序列化及数值有限性，**不代表全部既有表都具备完整业务 schema**。函数导出列在 `logicExports`，不序列化函数，也不让编辑器执行任意公式字符串。

建议编辑流程：读正式源 → 保留稳定路径的草稿 → 对应合同校验 → 展示差异 → 写正式源 → 刷新正式运行 → 检查受影响功能。不同字段使用不同合同，不能把完整目录所有数字都自动开放编辑。地图烘焙坐标、存档版本、装备固定索引和派生显示值需要专门处理。

## 维护约定

新增玩法参数先判断是表行、键值，还是数学/协议常量。表行沿用所属玩法源表；跨运行、界面和读档复用的键值放统一表。新增键值必须补中文字段合同、正式消费者和相关验证。

新增机制仍需要实现规则；配置能调已有机制，不替代状态机。调整参数后只检查相关链路，不默认运行全量测试。美术、碰撞形状或动作观感变化仍执行仓库美术标准；本次数值迁移保留默认值与原绘制器。
