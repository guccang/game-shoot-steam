# 玩法配置清单

> 本文是上一轮广义配置目录的生成快照，包含技术与表现参数。内容数值请使用 [内容与成长数值表](content-balance-tables.md) 及 `content:export`；四类新 JSON 是正式编辑源，以下对应 JS 模块现为兼容入口。

此清单从正式源表生成。426 个新增键值、14 组玩法数据表；统一目录有 61 个来源和 5473 个数值路径。路径数含兼容和派生导出，不代表独立可编辑项数量。

## 已有配置来源

| 名称 | 文件 | 数值路径数 |
| --- | --- | --- |
| 玩法键值 | src/config/gameplay-values.js | 426 |
| 玩法数据表 | src/config/gameplay-tables.js | 85 |
| 重装敌人 | src/config/armored-enemies.js | 13 |
| 祝福摘要 | src/config/blessing-summary.js | 0 |
| 领主受击与援军 | src/config/boss-combat.js | 9 |
| 领主 | src/config/bosses.js | 33 |
| 镜头 | src/config/camera.js | 9 |
| 角色外观 | src/config/cat-appearance.js | 30 |
| 清缴 | src/config/clearing.js | 6 |
| 经济方案 | src/config/economy.js | 588 |
| 移动遭遇 | src/config/encounters.js | 11 |
| 飞行敌人 | src/config/enemies.js | 6 |
| 装备部件 | src/config/equipment-parts.js | 0 |
| 远征 | src/config/expedition.js | 48 |
| 消防救援 | src/config/fire-rescue.js | 21 |
| 浮游炮飞行 | src/config/funnel-flight.js | 5 |
| 浮游炮挂载 | src/config/funnel-loadouts.js | 1 |
| 加特林表现 | src/config/gatling-art.js | 34 |
| 守护敌人 | src/config/guardian-enemies.js | 24 |
| 守护装备 | src/config/guardian-equipment.js | 0 |
| 守护升级 | src/config/guardian-upgrades.js | 2 |
| 守护 | src/config/guardian.js | 24 |
| 角色 | src/config/heroes.js | 36 |
| 森林生活 | src/config/living-world.js | 88 |
| 主线门槛 | src/config/mainline-gates.js | 5 |
| 主线引导 | src/config/mainline-guide.js | 29 |
| 主线交互 | src/config/mainline-operations.js | 29 |
| 主线任务 | src/config/mainline.js | 176 |
| 材料与配方 | src/config/materials.js | 70 |
| 机械猫挂载 | src/config/mechanical-loadout.js | 9 |
| 怪物故事 | src/config/monster-stories.js | 314 |
| 远程敌人 | src/config/ranged-enemies.js | 58 |
| 新手入职 | src/config/ranger-arrival.js | 302 |
| 秘境与祝福 | src/config/realms.js | 19 |
| 居民对白 | src/config/resident-chatter.js | 0 |
| 森林奖励 | src/config/rewards.js | 2 |
| 过河任务 | src/config/river-crossing.js | 28 |
| 聚落 | src/config/settlements.js | 27 |
| 史莱姆比赛 | src/config/slime-football.js | 15 |
| 蜘蛛母巢挂载 | src/config/spider-loadout.js | 0 |
| 蜘蛛母巢 | src/config/spider.js | 8 |
| 章节目录 | src/config/story-campaign.js | 1500 |
| 剧情体验 | src/config/story-journey.js | 7 |
| 剧情告示牌 | src/config/story-posts.js | 18 |
| 剧情章节 | src/config/story.js | 473 |
| 召唤物行为 | src/config/summon-behavior.js | 19 |
| 召唤物能源 | src/config/summon-energy.js | 1 |
| 坦克后坐 | src/config/tank-recoil.js | 0 |
| 潮汐炮 | src/config/tide-cannon.js | 1 |
| 载具专属武器 | src/config/vehicle-armaments.js | 353 |
| 载具弹容量 | src/config/vehicle-capacity.js | 0 |
| 载具乘员 | src/config/vehicle-rider.js | 1 |
| 载具升级表现 | src/config/vehicle-upgrade-art.js | 32 |
| 载具 | src/config/vehicles.js | 50 |
| 尾怪导航 | src/config/wave-tail-navigation.js | 5 |
| 怪潮 | src/config/waves.js | 42 |
| 武器分类 | src/config/weapon-categories.js | 0 |
| 熟练度与改装 | src/config/weapon-mods.js | 93 |
| 武器升级表现 | src/config/weapon-upgrade-art.js | 28 |
| 武器 | src/config/weapons.js | 260 |
| 工坊施工 | src/config/workshop-parts.js | 0 |

## 成组玩法表

| 稳定字段 | 中文名称 |
| --- | --- |
| masteryRewards | 击杀类型熟练度奖励 |
| enemyAttacks | 普通与强壮怪物近战攻击表 |
| sporeOffsets | 蘑菇领主孢子落点偏移 |
| featherAngles | 飞羽领主散射角度 |
| enemyMassByRank | 怪物品级质量表 |
| enemyHealthByRank | 怪物品级生命倍率表 |
| enemyDamageByRank | 怪物品级伤害倍率表 |
| enemyRadiusByRank | 怪物品级碰撞半径表 |
| projectileProfiles | 弹丸型号运动参数表 |
| waveRecoveryRelief | 死亡续游前三波强度缓和 |
| waveEarlyHealth | 前三波生命减免 |
| environmentTimings | 环境默认时长（毫秒） |
| calendarTimings | 生活历法环境时长（毫秒） |
| dayPhases | 昼夜时段顺序与默认时长 |

## 键值字段

| 字段路径 | 中文名称 | 默认值 | 单位 | 类型 | 下限 | 上限 |
| --- | --- | ---: | --- | --- | ---: | ---: |
| arc.hitRadius | 电弧首次命中半径 | 3 | 世界像素 | number | 0 | 有限安全数值 |
| arc.hopDamageFactor | 电弧每跳伤害倍率 | 0.8 | 比例或系数 | number | 0 | 有限安全数值 |
| arc.wetDamageMultiplier | 电弧湿润目标伤害倍率 | 1.25 | 比例或系数 | number | 0 | 有限安全数值 |
| armored.chance | 重装怪出现概率 | 0.8 | 概率 | number | 0 | 有限安全数值 |
| armored.every | 重装怪配额周期 | 7 | 数量 | integer | 1 | 有限安全数值 |
| armored.ordinalRemainder | 重装怪配额周期余数 | 3 | 数量 | integer | 0 | 有限安全数值 |
| armored.unlockWave | 重装怪解锁波次 | 3 | 数量 | integer | 0 | 有限安全数值 |
| arrival.collisionRadius | 出生地形碰撞检测半径 | 28 | 世界像素 | number | 0.000001 | 有限安全数值 |
| arrival.enemyPadding | 视口外出生点敌人间距 | 42 | 数量 | number | 0 | 有限安全数值 |
| arrival.marginStep | 每轮出生选点边距增量 | 18 | 世界单位 | number | 0 | 有限安全数值 |
| arrival.minRecycleRadius | 敌人最小回收距离 | 720 | 世界像素 | number | 0 | 有限安全数值 |
| arrival.nearAttempts | 近处出生选点尝试次数 | 48 | 数量 | integer | 0 | 有限安全数值 |
| arrival.nearEnemyPadding | 近处出生点敌人间距 | 36 | 数量 | number | 0 | 有限安全数值 |
| arrival.outerAttempts | 视口外出生尝试次数 | 32 | 数量 | integer | 0 | 有限安全数值 |
| arrival.outerMargin | 视口外出生基本余量 | 110 | 世界像素 | number | 0 | 有限安全数值 |
| arrival.pathRadius | 近处出生直达通路半径 | 20 | 世界像素 | number | 0 | 有限安全数值 |
| arrival.playerDistance | 视口外出生最小玩家距离 | 440 | 世界像素 | number | 0 | 有限安全数值 |
| arrival.recycleViewPadding | 敌人回收视口额外距离 | 350 | 世界像素 | number | 0 | 有限安全数值 |
| arrival.treePadding | 出生点与树干间距 | 32 | 数量 | number | 0 | 有限安全数值 |
| arrival.viewPadding | 视口外出生不可见余量 | 80 | 世界像素 | number | 0 | 有限安全数值 |
| blessings.armorFloor | 护甲祝福承伤倍率下限 | 0.4 | 比例或系数 | number | 0.01 | 1 |
| blessings.armorPerStack | 护甲祝福每层减伤比例 | 0.12 | 比例或系数 | number | 0 | 1 |
| blessings.hasteFloor | 急速祝福间隔倍率下限 | 0.4 | 比例或系数 | number | 0 | 有限安全数值 |
| blessings.hastePerStack | 急速祝福每层间隔缩减 | 0.12 | 数量 | number | 0 | 有限安全数值 |
| blessings.healRatio | 治疗祝福恢复生命比例 | 0.6 | 比例或系数 | number | 0 | 有限安全数值 |
| blessings.leechPerStack | 吸血祝福每层击杀回血 | 3 | 数量 | number | 0 | 有限安全数值 |
| blessings.maxStacks | 祝福最大叠加层数 | 5 | 数量 | integer | 1 | 有限安全数值 |
| blessings.mendHealth | 修复祝福恢复女神生命 | 150 | 点 | number | 0 | 有限安全数值 |
| blessings.offerCount | 每轮祝福候选数量 | 3 | 数量 | integer | 1 | 有限安全数值 |
| blessings.powerPerStack | 力量祝福每层伤害加成 | 0.2 | 比例 | number | 0 | 10 |
| blessings.reachPerStack | 射程祝福每层加成 | 0.15 | 数量 | number | 0 | 有限安全数值 |
| blessings.vitalityPerStack | 生命祝福每层生命值 | 30 | 点 | number | 0 | 有限安全数值 |
| boss.altarContactInterval | 领主接触祭坛伤害间隔 | 0.65 | 秒 | number | 0.000001 | 有限安全数值 |
| boss.attackRange | 领主启动技能的最大距离 | 410 | 世界像素 | number | 0 | 有限安全数值 |
| boss.baseBlastDamage | 森林领主基础技能伤害 | 30 | 点 | number | 0 | 有限安全数值 |
| boss.baseContactDamage | 森林领主基础接触伤害 | 18 | 点 | number | 0 | 有限安全数值 |
| boss.baseHealth | 森林领主基础生命 | 850 | 点 | number | 0 | 有限安全数值 |
| boss.contactPadding | 领主接触伤害距离余量 | 15 | 世界像素 | number | 0 | 有限安全数值 |
| boss.enragedSupportBatch | 领主低血量援军批次 | 3 | 数量 | integer | 0 | 有限安全数值 |
| boss.featherLength | 羽刃轨迹长度 | 420 | 数量 | number | 0 | 有限安全数值 |
| boss.featherRadius | 羽刃命中半径 | 10 | 世界像素 | number | 0 | 有限安全数值 |
| boss.featherSpeed | 羽刃速度 | 300 | 世界像素/秒 | number | 0 | 有限安全数值 |
| boss.firstAttackDelay | 森林领主首次攻击延迟 | 2.2 | 秒 | number | 0 | 有限安全数值 |
| boss.hazardLimit | 领主危险区域数量上限 | 24 | 数量 | integer | 1 | 1024 |
| boss.healthPerRound | 森林领主每次巡游胜场生命增量 | 350 | 比例或系数 | number | 0 | 有限安全数值 |
| boss.mass | 森林领主质量 | 6 | 数量 | number | 0.000001 | 有限安全数值 |
| boss.radius | 森林领主碰撞半径 | 48 | 世界像素 | number | 0.000001 | 有限安全数值 |
| boss.slamRadius | 重砸命中半径 | 78 | 世界像素 | number | 0 | 有限安全数值 |
| boss.spawnDown | 森林领主出生纵向偏移 | 125 | 世界像素 | number | 0 | 有限安全数值 |
| boss.spawnLeft | 森林领主出生横向偏移 | 60 | 世界像素 | number | 0 | 有限安全数值 |
| boss.sporeRadius | 孢子伤害区域半径 | 58 | 世界像素 | number | 0 | 有限安全数值 |
| boss.sporeTickInterval | 孢子持续伤害间隔 | 0.85 | 秒 | number | 0.000001 | 有限安全数值 |
| boss.supportBatch | 领主常态援军批次 | 2 | 数量 | integer | 0 | 有限安全数值 |
| boss.supportEnrageHealth | 领主援军加量生命比例 | 0.5 | 比例或系数 | number | 0 | 有限安全数值 |
| boss.supportFullRetry | 领主援军满员重试时间 | 3 | 秒 | number | 0 | 有限安全数值 |
| boss.waveSpeed | 震波扩散速度 | 160 | 世界像素/秒 | number | 0 | 有限安全数值 |
| boss.waveStartRadius | 震波初始半径 | 22 | 世界像素 | number | 0 | 有限安全数值 |
| boss.waveWidth | 震波厚度 | 12 | 世界像素 | number | 0 | 有限安全数值 |
| combat.bossChillFactor | 领主冰冻速度倍率 | 0.82 | 比例或系数 | number | 0.01 | 1 |
| combat.clusterAimRangeRatio | 多目标合并瞄准的射程比例 | 0.7 | 比例 | number | 0.01 | 1 |
| combat.collisionDamageCap | 碰撞伤害上限 | 12 | 点 | integer | 0 | 有限安全数值 |
| combat.collisionDamageFactor | 碰撞速度转伤害系数 | 0.035 | 比例或系数 | number | 0 | 有限安全数值 |
| combat.collisionDamageSpeed | 碰撞伤害触发速度 | 110 | 世界像素/秒 | number | 0 | 有限安全数值 |
| combat.criticalChance | 普通射击暴击概率 | 0.13 | 概率 | number | 0 | 1 |
| combat.criticalMultiplier | 普通射击暴击伤害倍率 | 1.7 | 倍率 | number | 1 | 有限安全数值 |
| combat.defaultChillFactor | 冰冻状态默认速度倍率 | 0.6 | 比例或系数 | number | 0.01 | 1 |
| combat.defaultImpulse | 未指定武器的默认冲量 | 25 | 数量 | number | 0 | 有限安全数值 |
| combat.defaultThreatRange | 缺省武器威胁距离 | 260 | 世界单位 | integer | 0 | 有限安全数值 |
| combat.finishingImpulse | 致命重击冲量倍率 | 1.35 | 比例或系数 | number | 0 | 有限安全数值 |
| combat.finishingLift | 致命重击腾空速度 | 175 | 世界像素/秒 | number | 0 | 有限安全数值 |
| combat.heavyFinishingLift | 重型弹丸致命腾空速度 | 235 | 世界像素/秒 | number | 0 | 有限安全数值 |
| combat.heavyPushLimit | 重型弹丸击退限速 | 760 | 世界单位/秒 | number | 0 | 有限安全数值 |
| combat.normalPushLimit | 普通击退限速 | 520 | 世界单位/秒 | number | 0 | 有限安全数值 |
| combat.tidePushLimit | 潮汐水弹击退限速 | 620 | 世界单位/秒 | number | 0 | 有限安全数值 |
| combat.wetSeconds | 水弹湿润持续时间 | 1.2 | 秒 | number | 0.000001 | 有限安全数值 |
| combat.wetSpeedFactor | 湿润状态移动速度倍率 | 0.6 | 比例或系数 | number | 0.01 | 1 |
| companions.aggroPadding | 伙伴相对玩家的仇恨距离余量 | 90 | 世界像素 | number | 0 | 有限安全数值 |
| companions.aggroRange | 敌人选择伙伴目标的最大距离 | 260 | 世界像素 | number | 0 | 有限安全数值 |
| companions.catchupDistanceFactor | 伙伴追赶速度距离系数 | 1.5 | 倍率 | number | 0 | 有限安全数值 |
| companions.flyingFastDistance | 高速移动飞行伙伴归队距离 | 110 | 世界像素 | number | 0 | 有限安全数值 |
| companions.flyingUrgentDistance | 飞行伙伴迫切归队距离 | 210 | 世界像素 | number | 0 | 有限安全数值 |
| companions.followRadius | 步行地面伙伴跟随半径 | 105 | 世界像素 | number | 0 | 有限安全数值 |
| companions.forceCatchupDistance | 伙伴强制追赶额外距离 | 220 | 世界像素 | number | 0 | 有限安全数值 |
| companions.motherFollowRadius | 母巢默认跟随半径 | 108 | 世界像素 | number | 0 | 有限安全数值 |
| companions.mountedFollowRadius | 车载地面伙伴跟随半径 | 150 | 世界像素 | number | 0 | 有限安全数值 |
| companions.outerRingPadding | 外圈小蛛跟随额外半径 | 65 | 世界像素 | number | 0 | 有限安全数值 |
| companions.ownerSpeedRatio | 伙伴追赶主人速度倍率 | 1.25 | 比例或系数 | number | 0 | 有限安全数值 |
| drone.deployStagger | 无人机展开错峰 | 0.055 | 秒 | number | 0.000001 | 有限安全数值 |
| drone.followRatio | 无人机跟随惯性比例 | 0.65 | 比例 | number | 0.000001 | 有限安全数值 |
| drone.goalRadius | 无人机目标点安全半径 | 79 | 世界单位 | number | 0.000001 | 有限安全数值 |
| drone.headingGain | 无人机目标朝向响应 | 5 | 系数 | number | 0.000001 | 有限安全数值 |
| drone.maneuverDelay | 无人机射后变位等待 | 0.12 | 秒 | number | 0.000001 | 有限安全数值 |
| drone.maxRadius | 无人机活动半径 | 80 | 世界单位 | number | 0.000001 | 有限安全数值 |
| drone.maxSpeed | 无人机最大速度 | 230 | 世界单位/秒 | number | 0.000001 | 有限安全数值 |
| drone.patrolPeriod | 无人机待机扫描周期 | 3.2 | 秒 | number | 0.000001 | 有限安全数值 |
| drone.separationGain | 无人机间避让强度 | 700 | 系数 | number | 0.000001 | 有限安全数值 |
| drone.separationRadius | 无人机间避让距离 | 36 | 世界单位 | number | 0.000001 | 有限安全数值 |
| drone.shotsPerManeuver | 无人机每次变位所需发数 | 2 | 发 | integer | 0.000001 | 有限安全数值 |
| drone.steeringGain | 无人机到点加速度响应 | 180 | 系数 | number | 0.000001 | 有限安全数值 |
| drone.velocityDrag | 无人机速度阻尼 | 25 | 系数 | number | 0.000001 | 有限安全数值 |
| enemy.baseDamage | 普通怪基础伤害 | 8 | 点 | number | 0 | 有限安全数值 |
| enemy.baseHealth | 普通怪基础生命 | 36 | 点 | number | 0 | 有限安全数值 |
| enemy.baseReward | 怪物基础金币奖励 | 15 | 数量 | integer | 0 | 有限安全数值 |
| enemy.baseSpeed | 普通怪基础速度 | 44 | 世界像素/秒 | number | 0 | 有限安全数值 |
| enemy.damagePerLevel | 普通怪每级伤害增量 | 1.6 | 比例或系数 | number | 0 | 有限安全数值 |
| enemy.defaultDangerRange | 默认敌人警戒距离 | 320 | 世界单位 | integer | 0 | 有限安全数值 |
| enemy.eliteRollThreshold | 精英品级随机阈值 | 0.94 | 数量 | number | 0 | 1 |
| enemy.fallbackToughReward | 未指定奖励的强壮怪金币 | 22 | 数量 | integer | 0 | 有限安全数值 |
| enemy.healthPerLevel | 怪物每级生命倍率增量 | 0.2 | 比例或系数 | number | 0 | 有限安全数值 |
| enemy.levelNoiseCell | 怪物区域等级采样网格 | 90 | 级 | integer | 1 | 有限安全数值 |
| enemy.lungeOverlapRatio | 扑击终点碰撞体重叠比例 | 0.35 | 概率 | number | 0 | 1 |
| enemy.mapTravelSpawnRadius | 跨地图重布敌人基础半径 | 520 | 世界单位 | integer | 0 | 有限安全数值 |
| enemy.mapTravelSpawnRingStep | 跨地图重布敌人环间距 | 80 | 世界单位 | integer | 0 | 有限安全数值 |
| enemy.meadowProtectionWaves | 草地新手保护波数 | 3 | 数量 | integer | 0 | 有限安全数值 |
| enemy.protectionFallbackRadius | 新手出生保护退让半径 | 220 | 世界像素 | number | 0 | 有限安全数值 |
| enemy.protectionMaxRadius | 新手出生保护最大半径 | 450 | 世界像素 | number | 0 | 有限安全数值 |
| enemy.protectionMinRadius | 新手出生保护最小半径 | 250 | 世界像素 | number | 0 | 有限安全数值 |
| enemy.rankSpeedPenalty | 怪物每品级速度减量 | 4 | 世界像素/秒 | number | 0 | 有限安全数值 |
| enemy.rewardPerRank | 怪物每品级奖励增量 | 9 | 比例或系数 | number | 0 | 有限安全数值 |
| enemy.rewardPerZoneLevel | 怪物区域每级奖励增量 | 3 | 比例或系数 | number | 0 | 有限安全数值 |
| enemy.spawnRadius | 怪物默认出生距离 | 390 | 世界像素 | number | 0 | 有限安全数值 |
| enemy.speedPerLevel | 普通怪每级速度增量 | 0.7 | 比例或系数 | number | 0 | 有限安全数值 |
| enemy.supportRankCap | 领主援军品级随机值上限 | 0.76 | 数量 | number | 0 | 1 |
| enemy.toughRollThreshold | 强壮品级随机阈值 | 0.76 | 数量 | number | 0 | 1 |
| enemy.zoneLevelSpan | 区域内怪物等级跨度 | 3 | 级 | integer | 1 | 有限安全数值 |
| environment.maxTimingMs | 环境时长最大值 | 3600000 | 毫秒 | number | 0.000001 | 有限安全数值 |
| environment.timingStepMs | 环境时长最小值及调整步长 | 30000 | 毫秒 | number | 0.000001 | 有限安全数值 |
| fire.boardSeconds | 消防上车等待时间 | 0.3 | 秒 | number | 0.000001 | 有限安全数值 |
| fire.burnDistance | 燃烧树木伤害距离 | 44 | 世界像素 | number | 0 | 有限安全数值 |
| fire.departSeconds | 消防出库等待时间 | 0.45 | 秒 | number | 0.000001 | 有限安全数值 |
| fire.emberDamage | 火苗怪伤害 | 5 | 点 | number | 0 | 有限安全数值 |
| fire.emberHealth | 火苗怪生命 | 55 | 点 | number | 0 | 有限安全数值 |
| fire.emberMaxOffset | 第二只火苗怪最大出生距离 | 85 | 世界像素 | number | 0 | 有限安全数值 |
| fire.emberMinOffset | 第二只火苗怪最小出生距离 | 45 | 世界像素 | number | 0 | 有限安全数值 |
| fire.emberRadius | 火苗怪碰撞半径 | 17 | 世界像素 | number | 0 | 有限安全数值 |
| fire.emberSpeed | 火苗怪速度 | 45 | 世界像素/秒 | number | 0 | 有限安全数值 |
| fire.exitSeconds | 消防下车等待时间 | 0.45 | 秒 | number | 0.000001 | 有限安全数值 |
| fire.groupCount | 消防起火林区数量 | 2 | 数量 | integer | 1 | 1024 |
| fire.groupDistance | 消防两片林区最小间距 | 320 | 数量 | number | 0 | 有限安全数值 |
| fire.initialDispatchDelay | 初始消防派遣等待时间 | 75 | 秒 | number | 0.001 | 有限安全数值 |
| fire.initialLitPerGroup | 每片林区初始起火树木数 | 3 | 数量 | integer | 1 | 有限安全数值 |
| fire.lowWater | 消防低水量导航阈值 | 8 | 数量 | number | 0 | 有限安全数值 |
| fire.minTrees | 消防事件所需最少候选树木 | 8 | 数量 | integer | 1 | 有限安全数值 |
| fire.refillDistance | 消防补水交互距离 | 48 | 世界像素 | number | 0 | 有限安全数值 |
| fire.rewardBase | 消防完成基础金币 | 80 | 数量 | integer | 0 | 有限安全数值 |
| fire.rewardPerTree | 每棵扑灭树木金币 | 10 | 数量 | integer | 0 | 有限安全数值 |
| fire.routeRefreshSeconds | 消防路线刷新间隔 | 0.8 | 秒 | number | 0.000001 | 有限安全数值 |
| fire.transitWaitSeconds | 消防过渡默认等待时间 | 0.2 | 秒 | number | 0.000001 | 有限安全数值 |
| fire.treesPerGroup | 消防每片林区树木数量 | 4 | 数量 | integer | 1 | 1024 |
| flight.arrivalGain | 浮游炮到站减速系数 | 8 | 系数 | number | 0.000001 | 有限安全数值 |
| flight.brakingAcceleration | 浮游炮制动加速度 | 1600 | 世界单位/秒² | number | 0.000001 | 有限安全数值 |
| flight.cruiseSpeed | 浮游炮巡航限速 | 520 | 世界单位/秒 | number | 0.000001 | 有限安全数值 |
| flight.departureSeconds | 浮游炮出击等待 | 0.12 | 秒 | number | 0.000001 | 有限安全数值 |
| flight.departureStagger | 浮游炮出击错峰 | 0.08 | 秒 | number | 0.000001 | 有限安全数值 |
| flight.dockDistance | 浮游炮停靠距离阈值 | 12 | 世界单位 | number | 0.000001 | 有限安全数值 |
| flight.dockSpeed | 浮游炮停靠相对速度阈值 | 70 | 世界单位/秒 | number | 0.000001 | 有限安全数值 |
| flight.fallbackRange | 浮游炮缺省射程 | 420 | 世界单位 | number | 0.000001 | 有限安全数值 |
| flight.followVelocityRatio | 浮游炮跟随速度补偿比例 | 0.8 | 比例 | number | 0.000001 | 有限安全数值 |
| flight.maxAcceleration | 浮游炮最大加速度 | 2800 | 世界单位/秒² | number | 0.000001 | 有限安全数值 |
| flight.maxRadius | 浮游炮最大活动半径 | 270 | 世界单位 | number | 0.000001 | 有限安全数值 |
| flight.maxSpeed | 浮游炮实际速度上限 | 560 | 世界单位/秒 | number | 0.000001 | 有限安全数值 |
| flight.meleeRangeRatio | 浮游近战首选距离比例 | 0.7 | 比例 | number | 0.000001 | 有限安全数值 |
| flight.minimumRangeRatio | 浮游远程最小距离比例 | 0.72 | 比例 | number | 0.000001 | 有限安全数值 |
| flight.rangedRangeRatio | 浮游远程首选距离比例 | 0.58 | 比例 | number | 0.000001 | 有限安全数值 |
| flight.replanSeconds | 浮游炮重选射位间隔 | 0.35 | 秒 | number | 0.000001 | 有限安全数值 |
| flight.steeringGain | 浮游炮速度响应系数 | 13 | 系数 | number | 0.000001 | 有限安全数值 |
| flight.targetMoveThreshold | 浮游炮目标位移重规划距离 | 70 | 世界单位 | number | 0.000001 | 有限安全数值 |
| flying.damageRatio | 飞行怪伤害倍率 | 0.85 | 比例或系数 | number | 0 | 有限安全数值 |
| flying.denseEvery | 飞行怪密集配额间隔 | 4 | 秒 | integer | 1 | 有限安全数值 |
| flying.denseFromWave | 飞行怪密集配额起始波次 | 6 | 数量 | integer | 0 | 有限安全数值 |
| flying.earlyEvery | 飞行怪早期配额间隔 | 6 | 秒 | integer | 1 | 有限安全数值 |
| flying.healthRatio | 飞行怪生命倍率 | 0.75 | 比例或系数 | number | 0 | 有限安全数值 |
| flying.massRatio | 飞行怪质量倍率 | 0.8 | 比例或系数 | number | 0 | 有限安全数值 |
| flying.speedRatio | 飞行怪移动速度倍率 | 1.45 | 比例或系数 | number | 0 | 有限安全数值 |
| flying.unlockWave | 飞行怪起始波次 | 3 | 数量 | integer | 0 | 有限安全数值 |
| football.coinsPerGoal | 每球金币奖励 | 8 | 数量 | integer | 0 | 有限安全数值 |
| football.goalsPerPart | 每个零件所需进球 | 5 | 数量 | integer | 1 | 有限安全数值 |
| football.mass | 比赛球质量 | 0.8 | 数量 | number | 0.000001 | 有限安全数值 |
| football.playerSpawnY | 比赛玩家出生纵向偏移 | 155 | 世界像素 | number | 0 | 有限安全数值 |
| football.radius | 比赛球碰撞半径 | 17 | 世界像素 | number | 0.000001 | 有限安全数值 |
| football.spawnHeight | 比赛球出生纵向范围 | 85 | 世界像素 | number | 0 | 有限安全数值 |
| football.spawnOffsetY | 比赛球出生纵向起点 | 15 | 数量 | number | 0 | 有限安全数值 |
| football.spawnRetry | 比赛球出生重试间隔 | 0.15 | 秒 | number | 0 | 有限安全数值 |
| football.spawnSpacing | 比赛球最小出生间距 | 40 | 世界单位 | number | 0 | 有限安全数值 |
| football.spawnWidth | 比赛球出生横向宽度 | 210 | 世界像素 | number | 0 | 有限安全数值 |
| football.treeClearPadding | 足球场清理树木边距 | 160 | 世界单位 | integer | 0 | 有限安全数值 |
| football.warningSeconds | 比赛开球预警时间 | 2 | 秒 | number | 0.000001 | 有限安全数值 |
| football.woodPerGoal | 每球木材奖励 | 3 | 数量 | integer | 0 | 有限安全数值 |
| forest.treeHealth | 树木生命值 | 55 | 点 | number | 0 | 有限安全数值 |
| forest.treeRadius | 树干碰撞半径 | 22 | 世界像素 | number | 0 | 有限安全数值 |
| forest.treeRegrowSafeDistance | 树木再生避开玩家距离 | 100 | 世界像素 | number | 0.001 | 有限安全数值 |
| forest.treeRegrowSeconds | 树木再生等待时间 | 38 | 秒 | number | 0.000001 | 有限安全数值 |
| funnel.deploySeconds | 浮游炮部署等待 | 0.35 | 秒 | number | 0 | 有限安全数值 |
| funnel.fallbackAmmo | 浮游炮缺省能源容量 | 12 | 发 | integer | 1 | 1000 |
| funnel.fallbackReloadSeconds | 浮游炮缺省装填时间 | 3.2 | 秒 | number | 0.001 | 有限安全数值 |
| funnel.fireStaggerSeconds | 浮游炮开火错峰间隔 | 0.06 | 秒 | number | 0 | 有限安全数值 |
| funnel.firstLockSeconds | 浮游炮首次锁定等待 | 0.15 | 秒 | number | 0 | 有限安全数值 |
| funnel.nativeRangePadding | 原生浮游弹行程补偿 | 18 | 世界单位 | integer | 0 | 有限安全数值 |
| funnel.supplyDockRadius | 浮游炮允许补给的泊位半径 | 18 | 世界单位 | integer | 1 | 有限安全数值 |
| grenade.edgeFalloff | 榴弹爆炸边缘伤害衰减 | 0.45 | 比例或系数 | number | 0 | 有限安全数值 |
| grenade.minFlightSeconds | 榴弹最短飞行时间 | 0.25 | 秒 | number | 0.000001 | 有限安全数值 |
| growth.advancedVehicleCostScale | 进阶车体升级费用倍率 | 2 | 比例或系数 | number | 0 | 有限安全数值 |
| growth.catchupGap | 追赶折扣等级差 | 2 | 级 | integer | 0 | 有限安全数值 |
| growth.earlyHealthPerLevel | 前期角色每级生命增量 | 24 | 比例或系数 | number | 0 | 有限安全数值 |
| growth.earlyHeroPerLevel | 前期角色每级伤害增幅 | 0.1 | 比例或系数 | number | 0 | 有限安全数值 |
| growth.earlyWeaponPerLevel | 前期与临时武器每级伤害增幅 | 0.22 | 比例或系数 | number | 0 | 有限安全数值 |
| growth.legacyPartCoins | 旧经济部件每级金币基数 | 35 | 数量 | integer | 0 | 有限安全数值 |
| growth.legacyPartWood | 旧经济部件每级木材基数 | 15 | 数量 | integer | 0 | 有限安全数值 |
| growth.legacyVehicleWood | 旧经济车体每级木材基数 | 50 | 数量 | integer | 0 | 有限安全数值 |
| growth.linearThroughLevel | 线性成长结束等级 | 4 | 级 | integer | 1 | 1000 |
| growth.milestoneLevels | 成长里程碑间隔等级 | 5 | 级 | integer | 1 | 有限安全数值 |
| guardian.magazinePerLevel | 守护弹夹每级增幅 | 0.2 | 比例或系数 | number | 0 | 有限安全数值 |
| guardian.ratePerLevel | 守护攻速每级增幅 | 0.12 | 比例或系数 | number | 0 | 有限安全数值 |
| guardian.reloadPerLevel | 守护装填每级增幅 | 0.15 | 比例或系数 | number | 0 | 有限安全数值 |
| guardian.spawnAttempts | 守护出生选点尝试次数 | 48 | 数量 | integer | 0 | 有限安全数值 |
| guardian.spawnBandRatio | 守护出生环带宽度比例 | 0.23 | 世界像素 | number | 0 | 有限安全数值 |
| guardian.spawnBossPadding | 守护出生领主间距 | 60 | 数量 | number | 0 | 有限安全数值 |
| guardian.spawnEnemyPadding | 守护出生敌人间距 | 12 | 数量 | number | 0 | 有限安全数值 |
| guardian.spawnPlayerDistance | 守护出生玩家安全距离 | 180 | 世界像素 | number | 0 | 有限安全数值 |
| guardian.spawnRadiusRatio | 守护出生半径基础比例 | 0.62 | 世界像素 | number | 0 | 有限安全数值 |
| living.battleKills | 邻里战斗委托击杀目标 | 5 | 数量 | number | 0 | 有限安全数值 |
| living.battleSpawnRadius | 邻里战斗出生半径 | 90 | 世界像素 | number | 0 | 有限安全数值 |
| living.directRouteDistance | 居民直接步行距离 | 180 | 世界像素 | number | 0 | 有限安全数值 |
| living.greetingDistance | 居民主动问候距离 | 100 | 世界像素 | number | 0 | 有限安全数值 |
| living.initialX | 恢复旧领主战的横坐标 | 450 | 世界单位 | integer | 0 | 有限安全数值 |
| living.initialY | 恢复旧领主战的纵坐标 | 1000 | 世界单位 | integer | 0 | 有限安全数值 |
| living.interactDistance | 居民与委托交互距离 | 110 | 世界像素 | number | 0 | 有限安全数值 |
| living.journalLimit | 邻里日志最大条数 | 40 | 数量 | integer | 1 | 有限安全数值 |
| living.lunchStartMs | 居民午餐开始时间（游戏日内） | 480000 | 秒 | number | 0 | 有限安全数值 |
| living.retreatReach | 生活区敌人撤退抵达距离 | 4 | 世界像素 | number | 0 | 有限安全数值 |
| living.retreatSpeed | 生活区敌人撤退速度 | 65 | 世界像素/秒 | number | 0 | 有限安全数值 |
| living.walkSpeed | 居民步行速度 | 65 | 世界像素/秒 | number | 0 | 有限安全数值 |
| living.waypointReach | 居民路点抵达距离 | 5 | 世界像素 | number | 0 | 有限安全数值 |
| mainline.interactionRadius | 主线站点交互距离 | 85 | 世界像素 | number | 0 | 有限安全数值 |
| mainline.movementMaxStep | 主线行走进度单帧距离上限 | 80 | 世界单位 | number | 0 | 有限安全数值 |
| mainline.safeEnemyDistance | 主线交付安全敌人距离 | 180 | 世界像素 | number | 0 | 有限安全数值 |
| mainline.speechGap | 主线对白间隔 | 8 | 秒 | number | 0 | 有限安全数值 |
| mainline.speechMinSeconds | 主线对白最短展示时间 | 3 | 秒 | number | 0.000001 | 有限安全数值 |
| mainline.speechSecondsPerCharacter | 主线对白每字展示时间 | 0.1 | 秒 | number | 0 | 有限安全数值 |
| mainline.visitRadius | 旅行站点抵达距离 | 90 | 世界像素 | number | 0 | 有限安全数值 |
| mechanical.capacity | 机械猫运行槽位上限 | 10 | 数量 | integer | 1 | 1024 |
| mechanical.chasePadding | 机械猫追击距离余量 | 6 | 世界像素 | number | 0 | 有限安全数值 |
| mechanical.criticalChance | 机械猫挥爪暴击概率 | 0.08 | 概率 | number | 0 | 1 |
| mechanical.criticalMultiplier | 机械猫挥爪暴击伤害倍率 | 1.6 | 比例或系数 | number | 0 | 有限安全数值 |
| mechanical.deployAttackDelay | 机械猫部署后攻击等待 | 0.5 | 秒 | number | 0 | 有限安全数值 |
| mechanical.emergeSpeed | 伙伴默认出舱速度 | 85 | 世界像素/秒 | number | 0 | 有限安全数值 |
| mechanical.followSpeedRatio | 机械猫跟随速度倍率 | 1.15 | 比例或系数 | number | 0 | 有限安全数值 |
| mechanical.initialCooldownStep | 机械猫初始攻击错峰间隔 | 0.07 | 秒 | number | 0 | 有限安全数值 |
| mechanical.meleeStandRatio | 机械猫近战站位距离倍率 | 0.72 | 世界像素 | number | 0 | 有限安全数值 |
| mechanical.radius | 机械猫碰撞半径 | 9 | 世界像素 | number | 0.000001 | 有限安全数值 |
| mechanical.redeployAttackDelay | 手动召唤伙伴重部署攻击等待 | 0.3 | 秒 | number | 0 | 有限安全数值 |
| mechanical.redeployRangeRatio | 机械单位超距重部署倍率 | 2 | 倍率 | integer | 1 | 有限安全数值 |
| mechanical.swingSeconds | 机械猫默认挥爪持续时间 | 0.24 | 秒 | number | 0.000001 | 有限安全数值 |
| mechanical.windupSeconds | 机械猫默认攻击前摇 | 0.12 | 秒 | number | 0.000001 | 有限安全数值 |
| parts.accuracyPerLevel | 精准部件每级散布缩减 | 0.05 | 数量 | number | 0 | 有限安全数值 |
| parts.capacityPerLevel | 弹容量部件每级增幅 | 0.1 | 比例或系数 | number | 0 | 有限安全数值 |
| parts.enginePerLevel | 动力部件每级速度增幅 | 0.05 | 比例或系数 | number | 0 | 有限安全数值 |
| parts.rangePerLevel | 射程部件每级增幅 | 0.05 | 比例或系数 | number | 0 | 有限安全数值 |
| parts.ratePerLevel | 射速部件每级增幅 | 0.08 | 比例或系数 | number | 0 | 有限安全数值 |
| parts.reloadPerLevel | 装填部件每级增幅 | 0.08 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.airDrag | 战斗刚体空中阻尼 | 1.4 | 数量 | number | 0 | 有限安全数值 |
| physics.bodyGravity | 战斗刚体重力 | 460 | 数量 | number | 0 | 有限安全数值 |
| physics.bodyImpactMinSpeed | 刚体相撞冲量阈值 | 15 | 数量 | number | 0 | 有限安全数值 |
| physics.bodyRestitutionScale | 刚体碰撞冲量恢复系数 | 1.32 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.bossImpulseScale | 领主默认冲量缩放 | 0.6 | 倍率 | number | 0 | 有限安全数值 |
| physics.bossMinMass | 领主击退计算最小质量 | 6 | 数量 | number | 0 | 有限安全数值 |
| physics.bossPushBoostSeconds | 领主重击限速增益持续时间 | 0.4 | 秒 | number | 0.000001 | 有限安全数值 |
| physics.bossPushDrag | 领主击退阻尼 | 10 | 数量 | number | 0 | 有限安全数值 |
| physics.bossPushLimit | 领主默认击退限速 | 55 | 世界单位/秒 | number | 0 | 有限安全数值 |
| physics.driveAcceleration | 角色驱动速度响应系数 | 24 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.groundBounceRatio | 刚体落地弹跳比例 | 0.24 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.groundDrag | 战斗刚体地面阻尼 | 4.8 | 数量 | number | 0 | 有限安全数值 |
| physics.groundImpactMinSpeed | 落地碰撞触发速度 | 45 | 世界像素/秒 | number | 0 | 有限安全数值 |
| physics.impulseScale | 武器冲量转换为速度系数 | 5.5 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.knockBaseSeconds | 击退失衡基础持续时间 | 0.22 | 秒 | number | 0.000001 | 有限安全数值 |
| physics.knockMaxSeconds | 击退失衡最大持续时间 | 0.85 | 秒 | number | 0.000001 | 有限安全数值 |
| physics.knockSpeedScale | 击退速度转换失衡时长系数 | 650 | 比例或系数 | number | 0.000001 | 有限安全数值 |
| physics.liftSpeedRatio | 击退速度转换腾空速度比例 | 0.32 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.maxLift | 普通击退腾空速度上限 | 110 | 世界像素/秒 | number | 0 | 有限安全数值 |
| physics.toughMass | 强壮怪默认质量 | 1.65 | 数量 | number | 0 | 有限安全数值 |
| physics.tumbleMinSpeed | 击退进入翻滚的速度阈值 | 55 | 世界像素/秒 | number | 0 | 有限安全数值 |
| physics.wallBlockedRatio | 撞墙阻挡位移比例 | 0.3 | 比例或系数 | number | 0 | 有限安全数值 |
| physics.wallBounceRatio | 撞墙水平速度保留比例 | 0.22 | 比例或系数 | number | 0 | 1 |
| physics.wallImpactMinSpeed | 撞墙反馈最小速度 | 20 | 世界像素/秒 | number | 0 | 有限安全数值 |
| player.aimHoldSeconds | 射击后保持瞄准时间 | 0.15 | 秒 | number | 0 | 有限安全数值 |
| player.collisionRadius | 玩家受击碰撞半径 | 12 | 世界像素 | number | 0.000001 | 有限安全数值 |
| player.firstAttackDelay | 首次攻击等待时间 | 0.2 | 秒 | number | 0 | 有限安全数值 |
| player.invincibleSeconds | 玩家及载具受击无敌时间 | 0.8 | 秒 | number | 0.000001 | 有限安全数值 |
| player.regenBossDistance | 自然回血的领主警戒距离 | 200 | 世界像素 | number | 0.001 | 有限安全数值 |
| player.regenEnemyDistance | 自然回血的怪物警戒距离 | 150 | 世界像素 | number | 0.001 | 有限安全数值 |
| player.regenPerSecond | 自然回血速度 | 2 | 生命/秒 | number | 0 | 有限安全数值 |
| player.spawnX | 森林默认出生横坐标 | 900 | 世界像素 | number | 0 | 有限安全数值 |
| player.spawnY | 森林默认出生纵坐标 | 700 | 世界像素 | number | 0 | 有限安全数值 |
| progress.counterCap | 资源与累计计数存档上限 | 9999999 | 数量 | integer | 1 | 9007199254740991 |
| progress.masteryDamagePerLevel | 熟练度每级伤害加成 | 0.02 | 点 | number | 0 | 有限安全数值 |
| progress.maxCoordinationLevel | 机械猫协同最高等级 | 8 | 级 | integer | 1 | 有限安全数值 |
| progress.maxEquipmentLevel | 角色、武器、炮塔与车体最高等级 | 20 | 级 | integer | 1 | 1000 |
| progress.maxPartLevel | 普通部件最高等级 | 5 | 级 | integer | 1 | 有限安全数值 |
| progress.modUnlockLevel | 改装解锁所需熟练度等级 | 2 | 级 | integer | 1 | 5 |
| progress.startCoins | 普通巡游初始金币 | 60 | 数量 | integer | 0 | 有限安全数值 |
| progress.startWood | 普通巡游初始木材 | 30 | 数量 | integer | 0 | 有限安全数值 |
| projectile.assistedGravity | 辅助瞄准弹丸重力 | 12 | 数量 | number | 0 | 有限安全数值 |
| projectile.bounceLift | 弹射后竖向初速度 | 20 | 世界像素/秒 | number | 0 | 有限安全数值 |
| projectile.bounceRange | 弹射搜索及后续射程 | 190 | 数量 | number | 0 | 有限安全数值 |
| projectile.bounceSpeedRatio | 目标弹射速度保留比例 | 0.88 | 比例或系数 | number | 0 | 1 |
| projectile.defaultHitRadius | 弹丸默认命中半径 | 2 | 世界像素 | number | 0 | 有限安全数值 |
| projectile.defaultSpeed | 兼容弹丸默认速度 | 920 | 世界像素/秒 | number | 0 | 有限安全数值 |
| projectile.flameRadiusPerDistance | 火焰每单位射程半径扩张 | 0.16 | 世界像素 | number | 0 | 有限安全数值 |
| projectile.flameStartRadius | 火焰初始命中半径 | 4 | 世界像素 | number | 0 | 有限安全数值 |
| projectile.groundHeightRatio | 地面弹跳高度保留比例 | 0.45 | 世界像素 | number | 0 | 1 |
| projectile.groundLiftRatio | 地面弹跳竖向速度保留比例 | 0.55 | 比例或系数 | number | 0 | 1 |
| projectile.groundSpeedRatio | 地面弹跳水平速度保留比例 | 0.82 | 比例或系数 | number | 0 | 1 |
| projectile.laserHitRadius | 激光射线命中半径 | 5 | 世界像素 | number | 0 | 有限安全数值 |
| projectile.launchHeight | 弹丸初始高度 | 9 | 世界像素 | number | 0 | 有限安全数值 |
| projectile.minImpulseRatio | 减速弹丸最低冲量比例 | 0.35 | 比例或系数 | number | 0 | 有限安全数值 |
| projectile.pierceDamageFloor | 穿甲弹最低伤害比例 | 0.5 | 比例或系数 | number | 0 | 有限安全数值 |
| projectile.waterHitRadius | 水弹命中半径 | 6 | 世界像素 | number | 0 | 有限安全数值 |
| ranged.denseFromWave | 远程怪高概率起始波次 | 6 | 概率 | integer | 0 | 有限安全数值 |
| ranged.earlyChance | 远程怪早期出现概率 | 0.85 | 概率 | number | 0 | 1 |
| ranged.edgeSplashDamageRatio | 远程敌人爆炸边缘伤害比例 | 0.65 | 比例 | number | 0 | 1 |
| ranged.every | 远程怪配额周期 | 3 | 数量 | integer | 1 | 有限安全数值 |
| ranged.fullSplashRadiusRatio | 远程敌人爆炸全伤半径比例 | 0.55 | 比例 | number | 0 | 1 |
| ranged.healthRatio | 远程怪默认生命倍率 | 0.85 | 比例或系数 | number | 0 | 有限安全数值 |
| ranged.lateChance | 远程怪后期出现概率 | 0.95 | 概率 | number | 0 | 1 |
| ranged.ordinalRemainder | 远程怪配额周期余数 | 2 | 数量 | integer | 0 | 有限安全数值 |
| ranged.speedRatio | 远程怪默认速度倍率 | 0.85 | 比例或系数 | number | 0 | 有限安全数值 |
| ranged.unlockWave | 远程怪起始波次 | 2 | 数量 | integer | 0 | 有限安全数值 |
| realm.alivePerStage | 远征与高塔每层同屏增量 | 2 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.baseSpeed | 秘境怪物基础速度 | 44 | 世界像素/秒 | number | 0 | 有限安全数值 |
| realm.bossBlastMultiplier | 秘境领主技能伤害倍率 | 2.2 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.bossContactMultiplier | 秘境领主接触伤害倍率 | 1.6 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.bossFirstAttackDelay | 秘境领主首次攻击延迟 | 2.2 | 秒 | number | 0 | 有限安全数值 |
| realm.bossHealthMultiplier | 秘境领主生命倍率 | 8 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.bossMass | 秘境领主质量 | 6 | 数量 | number | 0 | 有限安全数值 |
| realm.bossRadius | 秘境领主碰撞半径 | 42 | 世界像素 | number | 0 | 有限安全数值 |
| realm.bossSpawnInset | 秘境领主出生边界内缩 | 65 | 数量 | number | 0 | 有限安全数值 |
| realm.bossSpeedCap | 秘境领主速度成长倍率上限 | 1.5 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.bossSpeedPerStage | 秘境领主每层速度成长 | 0.015 | 世界像素/秒 | number | 0 | 有限安全数值 |
| realm.countPerStage | 远征与高塔每层新增怪物 | 6 | 数量 | number | 0 | 有限安全数值 |
| realm.damageLinear | 秘境伤害线性成长 | 0.1 | 点 | number | 0 | 有限安全数值 |
| realm.damageQuadratic | 秘境伤害二次成长 | 0.006 | 点 | number | 0 | 有限安全数值 |
| realm.eliteDamageMultiplier | 秘境精英伤害倍率 | 1.5 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.eliteHealthMultiplier | 秘境精英生命倍率 | 3.5 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.eliteMass | 秘境精英质量 | 3 | 数量 | number | 0 | 有限安全数值 |
| realm.eliteRadius | 秘境精英碰撞半径 | 25 | 世界像素 | number | 0 | 有限安全数值 |
| realm.enemySpawnInset | 秘境普通怪出生边界内缩 | 35 | 数量 | number | 0 | 有限安全数值 |
| realm.firstAlive | 远征与高塔首层同屏怪物 | 18 | 数量 | number | 0 | 1024 |
| realm.firstCount | 远征与高塔首层怪物数量 | 24 | 数量 | integer | 1 | 1024 |
| realm.firstSpacing | 远征与高塔首层补兵间隔 | 0.24 | 秒 | number | 0.000001 | 有限安全数值 |
| realm.flyingMass | 守护飞行怪质量 | 0.8 | 数量 | number | 0 | 有限安全数值 |
| realm.goddessHealth | 守护女神最大生命 | 600 | 点 | number | 0 | 有限安全数值 |
| realm.goddessRadius | 守护女神碰撞半径 | 22 | 世界像素 | number | 0 | 有限安全数值 |
| realm.healthLinear | 秘境生命线性成长 | 0.14 | 点 | number | 0 | 有限安全数值 |
| realm.healthQuadratic | 秘境生命二次成长 | 0.012 | 点 | number | 0 | 有限安全数值 |
| realm.maxAlive | 远征与高塔同屏怪物上限 | 72 | 数量 | integer | 0 | 1024 |
| realm.minSpacing | 远征与高塔补兵最小间隔 | 0.12 | 秒 | number | 0.000001 | 有限安全数值 |
| realm.normalRadius | 秘境普通怪碰撞半径 | 17 | 世界像素 | number | 0 | 有限安全数值 |
| realm.playerSpawnY | 秘境玩家出生纵向偏移 | 45 | 世界像素 | number | 0 | 有限安全数值 |
| realm.rewardTierCap | 秘境奖励阶级上限 | 8 | 数量 | integer | 0 | 有限安全数值 |
| realm.rewardTierStages | 秘境奖励每阶层数 | 5 | 数量 | integer | 1 | 有限安全数值 |
| realm.rogueBaseDamage | 远征与守护怪物基础伤害 | 6 | 点 | number | 0 | 有限安全数值 |
| realm.rogueBaseHealth | 远征与守护怪物基础生命 | 32 | 点 | number | 0 | 有限安全数值 |
| realm.spacingPerStage | 远征与高塔每层补兵间隔缩减 | 0.008 | 数量 | number | 0 | 有限安全数值 |
| realm.spawnBatchLimit | 守护每帧补兵上限 | 8 | 数量 | integer | 1 | 1024 |
| realm.spawnCollisionRadius | 秘境普通怪出生检测半径 | 25 | 世界像素 | number | 0 | 有限安全数值 |
| realm.spawnRetrySeconds | 秘境找不到出生点的重试间隔 | 0.3 | 秒 | number | 0.000001 | 有限安全数值 |
| realm.speedCap | 秘境怪物速度上限 | 88 | 世界像素/秒 | number | 0 | 有限安全数值 |
| realm.speedPerStage | 秘境怪物每层速度成长 | 1.5 | 世界像素/秒 | number | 0 | 有限安全数值 |
| realm.toughMass | 守护强壮怪质量 | 1.65 | 数量 | number | 0 | 有限安全数值 |
| realm.toughRadius | 守护强壮怪碰撞半径 | 21 | 世界像素 | number | 0 | 有限安全数值 |
| realm.towerBaseDamage | 高塔怪物基础伤害 | 6.5 | 点 | number | 0 | 有限安全数值 |
| realm.towerBaseHealth | 高塔怪物基础生命 | 38 | 点 | number | 0 | 有限安全数值 |
| realm.towerClearHealRatio | 高塔通关回血比例 | 0.15 | 比例或系数 | number | 0 | 有限安全数值 |
| realm.towerEliteInterval | 高塔精英间隔层数 | 3 | 数量 | integer | 1 | 有限安全数值 |
| realm.warningSeconds | 秘境开波预警时间 | 3 | 秒 | number | 0.000001 | 有限安全数值 |
| spider.deathFalloff | 小蛛自爆边缘伤害衰减 | 0.45 | 比例或系数 | number | 0 | 有限安全数值 |
| spider.emergeSeconds | 小蛛出舱持续时间 | 0.85 | 秒 | number | 0.000001 | 有限安全数值 |
| spider.hatchAttackDelay | 小蛛出舱攻击等待 | 0.4 | 秒 | number | 0 | 有限安全数值 |
| spider.initialMinionHealth | 小蛛槽位初始生命上限 | 90 | 点 | integer | 0 | 有限安全数值 |
| spider.minionEmergeSpeed | 小蛛出舱速度 | 140 | 世界像素/秒 | number | 0 | 有限安全数值 |
| spider.minionGuardRadius | 小蛛警戒半径 | 140 | 世界像素 | number | 0 | 有限安全数值 |
| spider.minionImpactScale | 小蛛近战冲击倍率 | 0.6 | 比例或系数 | number | 0 | 有限安全数值 |
| spider.minionImpulse | 小蛛近战冲量 | 8 | 数量 | number | 0 | 有限安全数值 |
| spider.minionMeleeReach | 小蛛近战距离 | 21 | 世界像素 | number | 0 | 有限安全数值 |
| spider.minionSwingSeconds | 小蛛挥爪时间 | 0.32 | 秒 | number | 0.000001 | 有限安全数值 |
| spider.minionWindupSeconds | 小蛛攻击前摇 | 0.22 | 秒 | number | 0.000001 | 有限安全数值 |
| spider.motherHealth | 母巢生命上限 | 480 | 点 | integer | 0 | 有限安全数值 |
| spider.motherRadius | 母巢碰撞半径 | 24 | 世界像素 | number | 0 | 有限安全数值 |
| spider.motherRepairSeconds | 母巢死亡修复等待 | 6 | 秒 | number | 0.000001 | 有限安全数值 |
| spider.repairCost | 母巢修复能源消耗 | 12 | 数量 | integer | 0 | 有限安全数值 |
| spider.spawnCost | 小蛛出舱能源消耗 | 4 | 数量 | integer | 0 | 有限安全数值 |
| story.retryOrdinalOffset | 剧情出生重试方向序号偏移 | 11 | 世界像素 | number | 0 | 有限安全数值 |
| story.retryRotationSeconds | 剧情出生失败更换方向间隔 | 5 | 秒 | number | 0.000001 | 有限安全数值 |
| story.spawnCollisionRadius | 剧情怪物出生检测半径 | 18 | 世界像素 | number | 0 | 有限安全数值 |
| story.speechMaxSeconds | 剧情提示最大存活时间 | 30 | 秒 | number | 0.000001 | 有限安全数值 |
| story.trialSpawnOffsetX | 剧情试射靶横向出生偏移 | 110 | 世界像素 | number | 0 | 有限安全数值 |
| vehicle.ammoMultiplier | 载具通用武器弹容量倍率 | 1.5 | 比例或系数 | number | 0.01 | 有限安全数值 |
| wave.alivePerSecond | 怪潮每秒展开配额 | 8 | 数量 | integer | 0 | 有限安全数值 |
| wave.batchGrowthWaves | 森林怪潮单批数量增长间隔 | 3 | 秒 | integer | 1 | 有限安全数值 |
| wave.damageLinear | 森林怪潮伤害线性成长 | 0.16 | 点 | number | 0 | 有限安全数值 |
| wave.damageQuadratic | 森林怪潮伤害二次成长 | 0.015 | 点 | number | 0 | 有限安全数值 |
| wave.firstBatch | 森林怪潮初始单批数量 | 3 | 数量 | integer | 0 | 1024 |
| wave.firstInterval | 森林怪潮初始补兵间隔 | 0.66 | 秒 | number | 0.000001 | 有限安全数值 |
| wave.firstRankCap | 首波品级随机上限 | 0.76 | 数量 | number | 0 | 1 |
| wave.healthPerWave | 森林怪潮每波生命成长 | 0.12 | 点 | number | 0 | 有限安全数值 |
| wave.intervalDecay | 森林怪潮间隔每波衰减 | 0.9 | 比例或系数 | number | 0 | 有限安全数值 |
| wave.maxAlive | 森林怪潮同屏上限 | 96 | 数量 | integer | 0 | 1024 |
| wave.maxBatch | 森林怪潮单批补兵上限 | 8 | 数量 | integer | 0 | 1024 |
| wave.minInterval | 森林怪潮最短补兵间隔 | 0.36 | 秒 | number | 0.000001 | 有限安全数值 |
| wave.openingAlive | 怪潮开场同屏配额 | 12 | 数量 | integer | 0 | 1024 |
| wave.rankBonusCap | 森林怪潮品级增幅上限 | 0.16 | 比例或系数 | number | 0 | 有限安全数值 |
| wave.rankCap | 后续波品级随机上限 | 0.999 | 数量 | number | 0 | 有限安全数值 |
| wave.rankPerWave | 森林怪潮每波品级增幅 | 0.008 | 比例或系数 | number | 0 | 有限安全数值 |
| wave.rewardBase | 后续波奖励份额基数 | 36 | 数量 | integer | 0 | 有限安全数值 |
| wave.rewardPerWave | 后续每波奖励份额增量 | 8 | 比例或系数 | integer | 0 | 有限安全数值 |
| wave.secondRankCap | 第二波品级随机上限 | 0.94 | 数量 | number | 0 | 1 |
| wave.spawnIntervalFloor | 怪潮实际出生间隔下限 | 0.12 | 秒 | number | 0.000001 | 有限安全数值 |
| wave.speedBonusCap | 森林怪潮速度增幅上限 | 1.4 | 比例或系数 | number | 0 | 有限安全数值 |
| wave.speedPerWave | 森林怪潮每波速度增幅 | 0.055 | 比例或系数 | number | 0 | 有限安全数值 |
| wave.warningSeconds | 怪潮开场预警时间 | 3 | 秒 | number | 0.000001 | 有限安全数值 |
| weaponTurn.defaultRate | 默认转向角速度 | 10 | 世界像素/秒 | number | 0 | 有限安全数值 |
| weaponTurn.fireTolerance | 允许开火的对准误差 | 0.012 | 数量 | number | 0 | 有限安全数值 |
| weaponTurn.gatlingRate | 加特林转向角速度 | 8 | 世界像素/秒 | number | 0 | 有限安全数值 |
| weaponTurn.handheldRate | 普通手持武器转向角速度 | 12 | 世界像素/秒 | number | 0 | 有限安全数值 |
| weaponTurn.mountedRate | 通用炮塔转向角速度 | 6 | 世界像素/秒 | number | 0 | 有限安全数值 |
| weaponTurn.tankRate | 坦克主炮转向角速度 | 3.5 | 世界像素/秒 | number | 0 | 有限安全数值 |
