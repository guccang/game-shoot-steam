// 数值工具字段合同：中文名称、类型、单位与约束独立于玩法数值。
export const GAMEPLAY_VALUE_SCHEMA = {
  "combat.criticalChance": {
    "label": "普通射击暴击概率",
    "type": "number",
    "min": 0,
    "max": 1,
    "unit": "概率"
  },
  "combat.criticalMultiplier": {
    "label": "普通射击暴击伤害倍率",
    "type": "number",
    "min": 1,
    "unit": "倍率"
  },
  "blessings.powerPerStack": {
    "label": "力量祝福每层伤害加成",
    "type": "number",
    "min": 0,
    "max": 10,
    "unit": "比例"
  },
  "player.invincibleSeconds": {
    "label": "玩家及载具受击无敌时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "blessings.vitalityPerStack": {
    "label": "生命祝福每层生命值",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "forest.treeRegrowSeconds": {
    "label": "树木再生等待时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "forest.treeRegrowSafeDistance": {
    "label": "树木再生避开玩家距离",
    "type": "number",
    "min": 0.001,
    "unit": "世界像素"
  },
  "player.regenEnemyDistance": {
    "label": "自然回血的怪物警戒距离",
    "type": "number",
    "min": 0.001,
    "unit": "世界像素"
  },
  "player.regenBossDistance": {
    "label": "自然回血的领主警戒距离",
    "type": "number",
    "min": 0.001,
    "unit": "世界像素"
  },
  "player.regenPerSecond": {
    "label": "自然回血速度",
    "type": "number",
    "min": 0,
    "unit": "生命/秒"
  },
  "combat.wetSeconds": {
    "label": "水弹湿润持续时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "combat.bossChillFactor": {
    "label": "领主冰冻速度倍率",
    "type": "number",
    "min": 0.01,
    "max": 1,
    "unit": "比例或系数"
  },
  "combat.defaultImpulse": {
    "label": "未指定武器的默认冲量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "combat.finishingImpulse": {
    "label": "致命重击冲量倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "combat.tidePushLimit": {
    "label": "潮汐水弹击退限速",
    "type": "number",
    "min": 0,
    "unit": "世界单位/秒"
  },
  "combat.heavyPushLimit": {
    "label": "重型弹丸击退限速",
    "type": "number",
    "min": 0,
    "unit": "世界单位/秒"
  },
  "combat.normalPushLimit": {
    "label": "普通击退限速",
    "type": "number",
    "min": 0,
    "unit": "世界单位/秒"
  },
  "combat.heavyFinishingLift": {
    "label": "重型弹丸致命腾空速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "combat.finishingLift": {
    "label": "致命重击腾空速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "fire.initialDispatchDelay": {
    "label": "初始消防派遣等待时间",
    "type": "number",
    "min": 0.001,
    "unit": "秒"
  },
  "progress.startCoins": {
    "label": "普通巡游初始金币",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "progress.startWood": {
    "label": "普通巡游初始木材",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "progress.maxEquipmentLevel": {
    "label": "角色、武器、炮塔与车体最高等级",
    "type": "integer",
    "min": 1,
    "max": 1000,
    "unit": "级"
  },
  "progress.counterCap": {
    "label": "资源与累计计数存档上限",
    "type": "integer",
    "min": 1,
    "max": 9007199254740991,
    "unit": "数量"
  },
  "progress.modUnlockLevel": {
    "label": "改装解锁所需熟练度等级",
    "type": "integer",
    "min": 1,
    "max": 5,
    "unit": "级"
  },
  "progress.masteryDamagePerLevel": {
    "label": "熟练度每级伤害加成",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "progress.maxCoordinationLevel": {
    "label": "机械猫协同最高等级",
    "type": "integer",
    "min": 1,
    "unit": "级"
  },
  "progress.maxPartLevel": {
    "label": "普通部件最高等级",
    "type": "integer",
    "min": 1,
    "unit": "级"
  },
  "parts.ratePerLevel": {
    "label": "射速部件每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "parts.capacityPerLevel": {
    "label": "弹容量部件每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "parts.reloadPerLevel": {
    "label": "装填部件每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "parts.rangePerLevel": {
    "label": "射程部件每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "parts.accuracyPerLevel": {
    "label": "精准部件每级散布缩减",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "parts.enginePerLevel": {
    "label": "动力部件每级速度增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "vehicle.ammoMultiplier": {
    "label": "载具通用武器弹容量倍率",
    "type": "number",
    "min": 0.01,
    "unit": "比例或系数"
  },
  "player.spawnX": {
    "label": "森林默认出生横坐标",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "player.spawnY": {
    "label": "森林默认出生纵坐标",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "forest.treeHealth": {
    "label": "树木生命值",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "forest.treeRadius": {
    "label": "树干碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "player.firstAttackDelay": {
    "label": "首次攻击等待时间",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "blessings.offerCount": {
    "label": "每轮祝福候选数量",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "realm.goddessHealth": {
    "label": "守护女神最大生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "blessings.mendHealth": {
    "label": "修复祝福恢复女神生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "blessings.healRatio": {
    "label": "治疗祝福恢复生命比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "blessings.maxStacks": {
    "label": "祝福最大叠加层数",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "blessings.leechPerStack": {
    "label": "吸血祝福每层击杀回血",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.towerClearHealRatio": {
    "label": "高塔通关回血比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.warningSeconds": {
    "label": "秘境开波预警时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "realm.bossHealthMultiplier": {
    "label": "秘境领主生命倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.bossRadius": {
    "label": "秘境领主碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.bossMass": {
    "label": "秘境领主质量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.bossFirstAttackDelay": {
    "label": "秘境领主首次攻击延迟",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "realm.bossSpeedCap": {
    "label": "秘境领主速度成长倍率上限",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.bossSpeedPerStage": {
    "label": "秘境领主每层速度成长",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "realm.bossContactMultiplier": {
    "label": "秘境领主接触伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.bossBlastMultiplier": {
    "label": "秘境领主技能伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.spawnBatchLimit": {
    "label": "守护每帧补兵上限",
    "type": "integer",
    "min": 1,
    "unit": "数量",
    "max": 1024
  },
  "realm.spawnRetrySeconds": {
    "label": "秘境找不到出生点的重试间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "realm.eliteHealthMultiplier": {
    "label": "秘境精英生命倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.eliteDamageMultiplier": {
    "label": "秘境精英伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "blessings.hasteFloor": {
    "label": "急速祝福间隔倍率下限",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "blessings.hastePerStack": {
    "label": "急速祝福每层间隔缩减",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "blessings.reachPerStack": {
    "label": "射程祝福每层加成",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.healthLinear": {
    "label": "秘境生命线性成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.healthQuadratic": {
    "label": "秘境生命二次成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.firstCount": {
    "label": "远征与高塔首层怪物数量",
    "type": "integer",
    "min": 1,
    "unit": "数量",
    "max": 1024
  },
  "realm.countPerStage": {
    "label": "远征与高塔每层新增怪物",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.maxAlive": {
    "label": "远征与高塔同屏怪物上限",
    "type": "integer",
    "min": 0,
    "unit": "数量",
    "max": 1024
  },
  "realm.firstAlive": {
    "label": "远征与高塔首层同屏怪物",
    "type": "number",
    "min": 0,
    "unit": "数量",
    "max": 1024
  },
  "realm.alivePerStage": {
    "label": "远征与高塔每层同屏增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "realm.towerBaseHealth": {
    "label": "高塔怪物基础生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.rogueBaseHealth": {
    "label": "远征与守护怪物基础生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.towerBaseDamage": {
    "label": "高塔怪物基础伤害",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.rogueBaseDamage": {
    "label": "远征与守护怪物基础伤害",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.damageLinear": {
    "label": "秘境伤害线性成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.damageQuadratic": {
    "label": "秘境伤害二次成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "realm.speedCap": {
    "label": "秘境怪物速度上限",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "realm.baseSpeed": {
    "label": "秘境怪物基础速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "realm.speedPerStage": {
    "label": "秘境怪物每层速度成长",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "realm.minSpacing": {
    "label": "远征与高塔补兵最小间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "realm.firstSpacing": {
    "label": "远征与高塔首层补兵间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "realm.spacingPerStage": {
    "label": "远征与高塔每层补兵间隔缩减",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.towerEliteInterval": {
    "label": "高塔精英间隔层数",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "realm.rewardTierCap": {
    "label": "秘境奖励阶级上限",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "realm.rewardTierStages": {
    "label": "秘境奖励每阶层数",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "player.collisionRadius": {
    "label": "玩家受击碰撞半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界像素"
  },
  "combat.wetSpeedFactor": {
    "label": "湿润状态移动速度倍率",
    "type": "number",
    "min": 0.01,
    "max": 1,
    "unit": "比例或系数"
  },
  "combat.defaultChillFactor": {
    "label": "冰冻状态默认速度倍率",
    "type": "number",
    "min": 0.01,
    "max": 1,
    "unit": "比例或系数"
  },
  "enemy.lungeOverlapRatio": {
    "label": "扑击终点碰撞体重叠比例",
    "type": "number",
    "min": 0,
    "max": 1,
    "unit": "概率"
  },
  "boss.baseBlastDamage": {
    "label": "森林领主基础技能伤害",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "boss.baseContactDamage": {
    "label": "森林领主基础接触伤害",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "boss.radius": {
    "label": "森林领主碰撞半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界像素"
  },
  "boss.contactPadding": {
    "label": "领主接触伤害距离余量",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.altarContactInterval": {
    "label": "领主接触祭坛伤害间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "boss.firstAttackDelay": {
    "label": "森林领主首次攻击延迟",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "boss.attackRange": {
    "label": "领主启动技能的最大距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.sporeTickInterval": {
    "label": "孢子持续伤害间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "boss.sporeRadius": {
    "label": "孢子伤害区域半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.featherSpeed": {
    "label": "羽刃速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "boss.featherRadius": {
    "label": "羽刃命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.featherLength": {
    "label": "羽刃轨迹长度",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "boss.waveStartRadius": {
    "label": "震波初始半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.waveSpeed": {
    "label": "震波扩散速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "boss.waveWidth": {
    "label": "震波厚度",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.slamRadius": {
    "label": "重砸命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.hazardLimit": {
    "label": "领主危险区域数量上限",
    "type": "integer",
    "min": 1,
    "unit": "数量",
    "max": 1024
  },
  "boss.baseHealth": {
    "label": "森林领主基础生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "boss.healthPerRound": {
    "label": "森林领主每次巡游胜场生命增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "boss.mass": {
    "label": "森林领主质量",
    "type": "number",
    "min": 0.000001,
    "unit": "数量"
  },
  "boss.spawnLeft": {
    "label": "森林领主出生横向偏移",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "boss.spawnDown": {
    "label": "森林领主出生纵向偏移",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arc.hitRadius": {
    "label": "电弧首次命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arc.hopDamageFactor": {
    "label": "电弧每跳伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "arc.wetDamageMultiplier": {
    "label": "电弧湿润目标伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "grenade.minFlightSeconds": {
    "label": "榴弹最短飞行时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "grenade.edgeFalloff": {
    "label": "榴弹爆炸边缘伤害衰减",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "weaponTurn.defaultRate": {
    "label": "默认转向角速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "weaponTurn.fireTolerance": {
    "label": "允许开火的对准误差",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "weaponTurn.tankRate": {
    "label": "坦克主炮转向角速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "weaponTurn.mountedRate": {
    "label": "通用炮塔转向角速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "weaponTurn.gatlingRate": {
    "label": "加特林转向角速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "weaponTurn.handheldRate": {
    "label": "普通手持武器转向角速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "enemy.eliteRollThreshold": {
    "label": "精英品级随机阈值",
    "type": "number",
    "min": 0,
    "unit": "数量",
    "max": 1
  },
  "enemy.toughRollThreshold": {
    "label": "强壮品级随机阈值",
    "type": "number",
    "min": 0,
    "unit": "数量",
    "max": 1
  },
  "enemy.levelNoiseCell": {
    "label": "怪物区域等级采样网格",
    "type": "integer",
    "min": 1,
    "unit": "级"
  },
  "enemy.zoneLevelSpan": {
    "label": "区域内怪物等级跨度",
    "type": "integer",
    "min": 1,
    "unit": "级"
  },
  "enemy.healthPerLevel": {
    "label": "怪物在同级攻击成长之外的每级耐久增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "enemy.baseHealth": {
    "label": "普通怪基础生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "enemy.baseDamage": {
    "label": "普通怪基础伤害",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "enemy.damagePerLevel": {
    "label": "普通怪每级伤害增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "enemy.baseSpeed": {
    "label": "普通怪基础速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "enemy.speedPerLevel": {
    "label": "普通怪每级速度增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "enemy.rankSpeedPenalty": {
    "label": "怪物每品级速度减量",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "enemy.baseReward": {
    "label": "怪物基础金币奖励",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "enemy.rewardPerZoneLevel": {
    "label": "怪物区域每级奖励增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "enemy.rewardPerRank": {
    "label": "怪物每品级奖励增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "enemy.spawnRadius": {
    "label": "怪物默认出生距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "enemy.meadowProtectionWaves": {
    "label": "草地新手保护波数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "enemy.protectionMinRadius": {
    "label": "新手出生保护最小半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "enemy.protectionMaxRadius": {
    "label": "新手出生保护最大半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "enemy.protectionFallbackRadius": {
    "label": "新手出生保护退让半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "enemy.supportRankCap": {
    "label": "领主援军品级随机值上限",
    "type": "number",
    "min": 0,
    "unit": "数量",
    "max": 1
  },
  "combat.collisionDamageSpeed": {
    "label": "碰撞伤害触发速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "combat.collisionDamageCap": {
    "label": "碰撞伤害上限",
    "type": "integer",
    "min": 0,
    "unit": "点"
  },
  "combat.collisionDamageFactor": {
    "label": "碰撞速度转伤害系数",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "enemy.fallbackToughReward": {
    "label": "未指定奖励的强壮怪金币",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "projectile.launchHeight": {
    "label": "弹丸初始高度",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "projectile.assistedGravity": {
    "label": "辅助瞄准弹丸重力",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "projectile.minImpulseRatio": {
    "label": "减速弹丸最低冲量比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "projectile.defaultHitRadius": {
    "label": "弹丸默认命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "projectile.laserHitRadius": {
    "label": "激光射线命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "projectile.pierceDamageFloor": {
    "label": "穿甲弹最低伤害比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "projectile.bounceRange": {
    "label": "弹射搜索及后续射程",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "projectile.bounceSpeedRatio": {
    "label": "目标弹射速度保留比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数",
    "max": 1
  },
  "projectile.bounceLift": {
    "label": "弹射后竖向初速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "projectile.defaultSpeed": {
    "label": "兼容弹丸默认速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "projectile.groundHeightRatio": {
    "label": "地面弹跳高度保留比例",
    "type": "number",
    "min": 0,
    "unit": "世界像素",
    "max": 1
  },
  "projectile.groundLiftRatio": {
    "label": "地面弹跳竖向速度保留比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数",
    "max": 1
  },
  "projectile.groundSpeedRatio": {
    "label": "地面弹跳水平速度保留比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数",
    "max": 1
  },
  "projectile.flameStartRadius": {
    "label": "火焰初始命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "projectile.flameRadiusPerDistance": {
    "label": "火焰每单位射程半径扩张",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "projectile.waterHitRadius": {
    "label": "水弹命中半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "blessings.armorFloor": {
    "label": "护甲祝福承伤倍率下限",
    "type": "number",
    "min": 0.01,
    "max": 1,
    "unit": "比例或系数"
  },
  "blessings.armorPerStack": {
    "label": "护甲祝福每层减伤比例",
    "type": "number",
    "min": 0,
    "max": 1,
    "unit": "比例或系数"
  },
  "wave.rewardBase": {
    "label": "后续波奖励份额基数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "wave.rewardPerWave": {
    "label": "后续每波奖励份额增量",
    "type": "integer",
    "min": 0,
    "unit": "比例或系数"
  },
  "wave.maxAlive": {
    "label": "森林怪潮同屏上限",
    "type": "integer",
    "min": 0,
    "unit": "数量",
    "max": 1024
  },
  "wave.minInterval": {
    "label": "森林怪潮最短补兵间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "wave.firstInterval": {
    "label": "森林怪潮初始补兵间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "wave.intervalDecay": {
    "label": "森林怪潮间隔每波衰减",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "wave.maxBatch": {
    "label": "森林怪潮单批补兵上限",
    "type": "integer",
    "min": 0,
    "unit": "数量",
    "max": 1024
  },
  "wave.firstBatch": {
    "label": "森林怪潮初始单批数量",
    "type": "integer",
    "min": 0,
    "unit": "数量",
    "max": 1024
  },
  "wave.batchGrowthWaves": {
    "label": "森林怪潮单批数量增长间隔",
    "type": "integer",
    "min": 1,
    "unit": "秒"
  },
  "wave.healthPerWave": {
    "label": "森林怪潮每波生命成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "wave.damageLinear": {
    "label": "森林怪潮伤害线性成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "wave.damageQuadratic": {
    "label": "森林怪潮伤害二次成长",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "wave.speedBonusCap": {
    "label": "森林怪潮速度增幅上限",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "wave.speedPerWave": {
    "label": "森林怪潮每波速度增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "wave.rankBonusCap": {
    "label": "森林怪潮品级增幅上限",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "wave.rankPerWave": {
    "label": "森林怪潮每波品级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "wave.firstRankCap": {
    "label": "首波品级随机上限",
    "type": "number",
    "min": 0,
    "unit": "数量",
    "max": 1
  },
  "wave.secondRankCap": {
    "label": "第二波品级随机上限",
    "type": "number",
    "min": 0,
    "unit": "数量",
    "max": 1
  },
  "wave.rankCap": {
    "label": "后续波品级随机上限",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "mechanical.capacity": {
    "label": "机械猫运行槽位上限",
    "type": "integer",
    "min": 1,
    "unit": "数量",
    "max": 1024
  },
  "mechanical.initialCooldownStep": {
    "label": "机械猫初始攻击错峰间隔",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "mechanical.radius": {
    "label": "机械猫碰撞半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界像素"
  },
  "mechanical.swingSeconds": {
    "label": "机械猫默认挥爪持续时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "mechanical.criticalChance": {
    "label": "机械猫挥爪暴击概率",
    "type": "number",
    "min": 0,
    "unit": "概率",
    "max": 1
  },
  "mechanical.criticalMultiplier": {
    "label": "机械猫挥爪暴击伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "mechanical.deployAttackDelay": {
    "label": "机械猫部署后攻击等待",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "mechanical.redeployAttackDelay": {
    "label": "手动召唤伙伴重部署攻击等待",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "mechanical.emergeSpeed": {
    "label": "伙伴默认出舱速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "mechanical.followSpeedRatio": {
    "label": "机械猫跟随速度倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "mechanical.meleeStandRatio": {
    "label": "机械猫近战站位距离倍率",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "mechanical.windupSeconds": {
    "label": "机械猫默认攻击前摇",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "mechanical.chasePadding": {
    "label": "机械猫追击距离余量",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "spider.spawnCost": {
    "label": "小蛛出舱能源消耗",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "spider.repairCost": {
    "label": "母巢修复能源消耗",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "spider.initialMinionHealth": {
    "label": "小蛛槽位初始生命上限",
    "type": "integer",
    "min": 0,
    "unit": "点"
  },
  "spider.motherHealth": {
    "label": "母巢生命上限",
    "type": "integer",
    "min": 0,
    "unit": "点"
  },
  "spider.motherRadius": {
    "label": "母巢碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "spider.motherRepairSeconds": {
    "label": "母巢死亡修复等待",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "spider.minionMeleeReach": {
    "label": "小蛛近战距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "spider.minionEmergeSpeed": {
    "label": "小蛛出舱速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "spider.minionImpulse": {
    "label": "小蛛近战冲量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "spider.minionImpactScale": {
    "label": "小蛛近战冲击倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "spider.minionWindupSeconds": {
    "label": "小蛛攻击前摇",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "spider.minionSwingSeconds": {
    "label": "小蛛挥爪时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "spider.minionGuardRadius": {
    "label": "小蛛警戒半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "spider.emergeSeconds": {
    "label": "小蛛出舱持续时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "spider.hatchAttackDelay": {
    "label": "小蛛出舱攻击等待",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "companions.aggroRange": {
    "label": "敌人选择伙伴目标的最大距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.aggroPadding": {
    "label": "伙伴相对玩家的仇恨距离余量",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "environment.maxTimingMs": {
    "label": "环境时长最大值",
    "type": "number",
    "min": 0.000001,
    "unit": "毫秒"
  },
  "environment.timingStepMs": {
    "label": "环境时长最小值及调整步长",
    "type": "number",
    "min": 0.000001,
    "unit": "毫秒"
  },
  "fire.minTrees": {
    "label": "消防事件所需最少候选树木",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "fire.groupCount": {
    "label": "消防起火林区数量",
    "type": "integer",
    "min": 1,
    "unit": "数量",
    "max": 1024
  },
  "fire.groupDistance": {
    "label": "消防两片林区最小间距",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "fire.treesPerGroup": {
    "label": "消防每片林区树木数量",
    "type": "integer",
    "min": 1,
    "unit": "数量",
    "max": 1024
  },
  "fire.initialLitPerGroup": {
    "label": "每片林区初始起火树木数",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "fire.emberHealth": {
    "label": "火苗怪生命",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "fire.emberDamage": {
    "label": "火苗怪伤害",
    "type": "number",
    "min": 0,
    "unit": "点"
  },
  "fire.emberSpeed": {
    "label": "火苗怪速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "fire.emberRadius": {
    "label": "火苗怪碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "fire.rewardBase": {
    "label": "消防完成基础金币",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "fire.rewardPerTree": {
    "label": "每棵扑灭树木金币",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "growth.catchupGap": {
    "label": "追赶折扣等级差",
    "type": "integer",
    "min": 0,
    "unit": "级"
  },
  "growth.advancedVehicleCostScale": {
    "label": "进阶车体升级费用倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "growth.legacyPartCoins": {
    "label": "旧经济部件每级金币基数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "growth.legacyPartWood": {
    "label": "旧经济部件每级木材基数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "growth.milestoneLevels": {
    "label": "成长里程碑间隔等级",
    "type": "integer",
    "min": 1,
    "unit": "级"
  },
  "growth.earlyWeaponPerLevel": {
    "label": "前期与临时武器每级伤害增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "growth.earlyHeroPerLevel": {
    "label": "前期角色每级伤害增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "growth.earlyHealthPerLevel": {
    "label": "前期角色每级生命增量",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "growth.legacyVehicleWood": {
    "label": "旧经济车体每级木材基数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "growth.linearThroughLevel": {
    "label": "线性成长结束等级",
    "type": "integer",
    "min": 1,
    "max": 1000,
    "unit": "级"
  },
  "guardian.ratePerLevel": {
    "label": "守护攻速每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "guardian.magazinePerLevel": {
    "label": "守护弹夹每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "guardian.reloadPerLevel": {
    "label": "守护装填每级增幅",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "flying.denseFromWave": {
    "label": "飞行怪密集配额起始波次",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "flying.denseEvery": {
    "label": "飞行怪密集配额间隔",
    "type": "integer",
    "min": 1,
    "unit": "秒"
  },
  "flying.unlockWave": {
    "label": "飞行怪起始波次",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "flying.earlyEvery": {
    "label": "飞行怪早期配额间隔",
    "type": "integer",
    "min": 1,
    "unit": "秒"
  },
  "flying.healthRatio": {
    "label": "飞行怪生命倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "flying.damageRatio": {
    "label": "飞行怪伤害倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "flying.speedRatio": {
    "label": "飞行怪移动速度倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "flying.massRatio": {
    "label": "飞行怪质量倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "ranged.unlockWave": {
    "label": "远程怪起始波次",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "ranged.every": {
    "label": "远程怪配额周期",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "ranged.ordinalRemainder": {
    "label": "远程怪配额周期余数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "ranged.denseFromWave": {
    "label": "远程怪高概率起始波次",
    "type": "integer",
    "min": 0,
    "unit": "概率"
  },
  "ranged.earlyChance": {
    "label": "远程怪早期出现概率",
    "type": "number",
    "min": 0,
    "unit": "概率",
    "max": 1
  },
  "ranged.lateChance": {
    "label": "远程怪后期出现概率",
    "type": "number",
    "min": 0,
    "unit": "概率",
    "max": 1
  },
  "ranged.healthRatio": {
    "label": "远程怪默认生命倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "ranged.speedRatio": {
    "label": "远程怪默认速度倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "arrival.outerAttempts": {
    "label": "视口外出生尝试次数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "arrival.outerMargin": {
    "label": "视口外出生基本余量",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arrival.marginStep": {
    "label": "每轮出生选点边距增量",
    "type": "number",
    "min": 0,
    "unit": "世界单位"
  },
  "arrival.playerDistance": {
    "label": "视口外出生最小玩家距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arrival.collisionRadius": {
    "label": "出生地形碰撞检测半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界像素"
  },
  "arrival.viewPadding": {
    "label": "视口外出生不可见余量",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arrival.treePadding": {
    "label": "出生点与树干间距",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "arrival.enemyPadding": {
    "label": "视口外出生点敌人间距",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "arrival.minRecycleRadius": {
    "label": "敌人最小回收距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arrival.recycleViewPadding": {
    "label": "敌人回收视口额外距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arrival.nearAttempts": {
    "label": "近处出生选点尝试次数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "arrival.pathRadius": {
    "label": "近处出生直达通路半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "arrival.nearEnemyPadding": {
    "label": "近处出生点敌人间距",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "living.lunchStartMs": {
    "label": "居民午餐开始时间（游戏日内）",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "living.directRouteDistance": {
    "label": "居民直接步行距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.waypointReach": {
    "label": "居民路点抵达距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.walkSpeed": {
    "label": "居民步行速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "living.interactDistance": {
    "label": "居民与委托交互距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.greetingDistance": {
    "label": "居民主动问候距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.battleKills": {
    "label": "邻里战斗委托击杀目标",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "living.battleSpawnRadius": {
    "label": "邻里战斗出生半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.journalLimit": {
    "label": "邻里日志最大条数",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "fire.lowWater": {
    "label": "消防低水量导航阈值",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "fire.refillDistance": {
    "label": "消防补水交互距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "fire.burnDistance": {
    "label": "燃烧树木伤害距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "fire.emberMinOffset": {
    "label": "第二只火苗怪最小出生距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "fire.emberMaxOffset": {
    "label": "第二只火苗怪最大出生距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.outerRingPadding": {
    "label": "外圈小蛛跟随额外半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.motherFollowRadius": {
    "label": "母巢默认跟随半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.mountedFollowRadius": {
    "label": "车载地面伙伴跟随半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.followRadius": {
    "label": "步行地面伙伴跟随半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.forceCatchupDistance": {
    "label": "伙伴强制追赶额外距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.ownerSpeedRatio": {
    "label": "伙伴追赶主人速度倍率",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "companions.catchupDistanceFactor": {
    "label": "伙伴追赶速度距离系数",
    "type": "number",
    "min": 0,
    "unit": "倍率"
  },
  "companions.flyingUrgentDistance": {
    "label": "飞行伙伴迫切归队距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "companions.flyingFastDistance": {
    "label": "高速移动飞行伙伴归队距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "football.coinsPerGoal": {
    "label": "每球金币奖励",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "football.woodPerGoal": {
    "label": "每球木材奖励",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "football.goalsPerPart": {
    "label": "每个零件所需进球",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "football.warningSeconds": {
    "label": "比赛开球预警时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "football.spawnWidth": {
    "label": "比赛球出生横向宽度",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "football.spawnOffsetY": {
    "label": "比赛球出生纵向起点",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "football.spawnHeight": {
    "label": "比赛球出生纵向范围",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "football.spawnSpacing": {
    "label": "比赛球最小出生间距",
    "type": "number",
    "min": 0,
    "unit": "世界单位"
  },
  "football.mass": {
    "label": "比赛球质量",
    "type": "number",
    "min": 0.000001,
    "unit": "数量"
  },
  "football.radius": {
    "label": "比赛球碰撞半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界像素"
  },
  "football.spawnRetry": {
    "label": "比赛球出生重试间隔",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "spider.deathFalloff": {
    "label": "小蛛自爆边缘伤害衰减",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "armored.unlockWave": {
    "label": "重装怪解锁波次",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "armored.every": {
    "label": "重装怪配额周期",
    "type": "integer",
    "min": 1,
    "unit": "数量"
  },
  "armored.ordinalRemainder": {
    "label": "重装怪配额周期余数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "armored.chance": {
    "label": "重装怪出现概率",
    "type": "number",
    "min": 0,
    "unit": "概率"
  },
  "wave.warningSeconds": {
    "label": "怪潮开场预警时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "wave.openingAlive": {
    "label": "怪潮开场同屏配额",
    "type": "integer",
    "min": 0,
    "unit": "数量",
    "max": 1024
  },
  "wave.alivePerSecond": {
    "label": "怪潮每秒展开配额",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "wave.spawnIntervalFloor": {
    "label": "怪潮实际出生间隔下限",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "boss.supportEnrageHealth": {
    "label": "领主援军加量生命比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "boss.enragedSupportBatch": {
    "label": "领主低血量援军批次",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "boss.supportBatch": {
    "label": "领主常态援军批次",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "boss.supportFullRetry": {
    "label": "领主援军满员重试时间",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "mainline.interactionRadius": {
    "label": "主线站点交互距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "mainline.safeEnemyDistance": {
    "label": "主线交付安全敌人距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "mainline.speechGap": {
    "label": "主线对白间隔",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "mainline.speechMinSeconds": {
    "label": "主线对白最短展示时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "mainline.speechSecondsPerCharacter": {
    "label": "主线对白每字展示时间",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "mainline.movementMaxStep": {
    "label": "主线行走进度单帧距离上限",
    "type": "number",
    "min": 0,
    "unit": "世界单位"
  },
  "mainline.visitRadius": {
    "label": "旅行站点抵达距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "story.speechMaxSeconds": {
    "label": "剧情提示最大存活时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "story.trialSpawnOffsetX": {
    "label": "剧情试射靶横向出生偏移",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.spawnCollisionRadius": {
    "label": "秘境普通怪出生检测半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "guardian.spawnAttempts": {
    "label": "守护出生选点尝试次数",
    "type": "integer",
    "min": 0,
    "unit": "数量"
  },
  "guardian.spawnRadiusRatio": {
    "label": "守护出生半径基础比例",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "guardian.spawnBandRatio": {
    "label": "守护出生环带宽度比例",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "guardian.spawnPlayerDistance": {
    "label": "守护出生玩家安全距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.normalRadius": {
    "label": "秘境普通怪碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "guardian.spawnEnemyPadding": {
    "label": "守护出生敌人间距",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "guardian.spawnBossPadding": {
    "label": "守护出生领主间距",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.goddessRadius": {
    "label": "守护女神碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "football.playerSpawnY": {
    "label": "比赛玩家出生纵向偏移",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.playerSpawnY": {
    "label": "秘境玩家出生纵向偏移",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.bossSpawnInset": {
    "label": "秘境领主出生边界内缩",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.enemySpawnInset": {
    "label": "秘境普通怪出生边界内缩",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.eliteRadius": {
    "label": "秘境精英碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.eliteMass": {
    "label": "秘境精英质量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.toughRadius": {
    "label": "守护强壮怪碰撞半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "realm.toughMass": {
    "label": "守护强壮怪质量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "realm.flyingMass": {
    "label": "守护飞行怪质量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "story.spawnCollisionRadius": {
    "label": "剧情怪物出生检测半径",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "story.retryRotationSeconds": {
    "label": "剧情出生失败更换方向间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "story.retryOrdinalOffset": {
    "label": "剧情出生重试方向序号偏移",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.retreatReach": {
    "label": "生活区敌人撤退抵达距离",
    "type": "number",
    "min": 0,
    "unit": "世界像素"
  },
  "living.retreatSpeed": {
    "label": "生活区敌人撤退速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "fire.routeRefreshSeconds": {
    "label": "消防路线刷新间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "fire.boardSeconds": {
    "label": "消防上车等待时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "fire.departSeconds": {
    "label": "消防出库等待时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "fire.exitSeconds": {
    "label": "消防下车等待时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "fire.transitWaitSeconds": {
    "label": "消防过渡默认等待时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "physics.bossPushLimit": {
    "label": "领主默认击退限速",
    "type": "number",
    "min": 0,
    "unit": "世界单位/秒"
  },
  "physics.bossPushDrag": {
    "label": "领主击退阻尼",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.driveAcceleration": {
    "label": "角色驱动速度响应系数",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "physics.bossImpulseScale": {
    "label": "领主默认冲量缩放",
    "type": "number",
    "min": 0,
    "unit": "倍率"
  },
  "physics.bossPushBoostSeconds": {
    "label": "领主重击限速增益持续时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "physics.impulseScale": {
    "label": "武器冲量转换为速度系数",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "physics.bossMinMass": {
    "label": "领主击退计算最小质量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.toughMass": {
    "label": "强壮怪默认质量",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.tumbleMinSpeed": {
    "label": "击退进入翻滚的速度阈值",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "physics.knockMaxSeconds": {
    "label": "击退失衡最大持续时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "physics.knockBaseSeconds": {
    "label": "击退失衡基础持续时间",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "physics.knockSpeedScale": {
    "label": "击退速度转换失衡时长系数",
    "type": "number",
    "min": 0.000001,
    "unit": "比例或系数"
  },
  "physics.maxLift": {
    "label": "普通击退腾空速度上限",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "physics.liftSpeedRatio": {
    "label": "击退速度转换腾空速度比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "physics.wallImpactMinSpeed": {
    "label": "撞墙反馈最小速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "physics.wallBlockedRatio": {
    "label": "撞墙阻挡位移比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "physics.wallBounceRatio": {
    "label": "撞墙水平速度保留比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数",
    "max": 1
  },
  "physics.bodyGravity": {
    "label": "战斗刚体重力",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.groundImpactMinSpeed": {
    "label": "落地碰撞触发速度",
    "type": "number",
    "min": 0,
    "unit": "世界像素/秒"
  },
  "physics.groundBounceRatio": {
    "label": "刚体落地弹跳比例",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "physics.airDrag": {
    "label": "战斗刚体空中阻尼",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.groundDrag": {
    "label": "战斗刚体地面阻尼",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.bodyImpactMinSpeed": {
    "label": "刚体相撞冲量阈值",
    "type": "number",
    "min": 0,
    "unit": "数量"
  },
  "physics.bodyRestitutionScale": {
    "label": "刚体碰撞冲量恢复系数",
    "type": "number",
    "min": 0,
    "unit": "比例或系数"
  },
  "player.aimHoldSeconds": {
    "label": "射击后保持瞄准时间",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "enemy.defaultDangerRange": {
    "label": "默认敌人警戒距离",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "ranged.fullSplashRadiusRatio": {
    "label": "远程敌人爆炸全伤半径比例",
    "type": "number",
    "min": 0,
    "unit": "比例",
    "max": 1
  },
  "ranged.edgeSplashDamageRatio": {
    "label": "远程敌人爆炸边缘伤害比例",
    "type": "number",
    "min": 0,
    "unit": "比例",
    "max": 1
  },
  "mechanical.redeployRangeRatio": {
    "label": "机械单位超距重部署倍率",
    "type": "integer",
    "min": 1,
    "unit": "倍率"
  },
  "combat.defaultThreatRange": {
    "label": "缺省武器威胁距离",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "football.treeClearPadding": {
    "label": "足球场清理树木边距",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "enemy.mapTravelSpawnRadius": {
    "label": "跨地图重布敌人基础半径",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "enemy.mapTravelSpawnRingStep": {
    "label": "跨地图重布敌人环间距",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "living.initialX": {
    "label": "恢复旧领主战的横坐标",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "living.initialY": {
    "label": "恢复旧领主战的纵坐标",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "funnel.fallbackReloadSeconds": {
    "label": "浮游炮缺省装填时间",
    "type": "number",
    "min": 0.001,
    "unit": "秒"
  },
  "funnel.deploySeconds": {
    "label": "浮游炮部署等待",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "funnel.fallbackAmmo": {
    "label": "浮游炮缺省能源容量",
    "type": "integer",
    "min": 1,
    "unit": "发",
    "max": 1000
  },
  "funnel.nativeRangePadding": {
    "label": "原生浮游弹行程补偿",
    "type": "integer",
    "min": 0,
    "unit": "世界单位"
  },
  "funnel.supplyDockRadius": {
    "label": "浮游炮允许补给的泊位半径",
    "type": "integer",
    "min": 1,
    "unit": "世界单位"
  },
  "funnel.fireStaggerSeconds": {
    "label": "浮游炮开火错峰间隔",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "funnel.firstLockSeconds": {
    "label": "浮游炮首次锁定等待",
    "type": "number",
    "min": 0,
    "unit": "秒"
  },
  "combat.clusterAimRangeRatio": {
    "label": "多目标合并瞄准的射程比例",
    "type": "number",
    "min": 0.01,
    "unit": "比例",
    "max": 1
  },
  "flight.maxRadius": {
    "label": "浮游炮最大活动半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "flight.fallbackRange": {
    "label": "浮游炮缺省射程",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "flight.meleeRangeRatio": {
    "label": "浮游近战首选距离比例",
    "type": "number",
    "min": 0.000001,
    "unit": "比例"
  },
  "flight.rangedRangeRatio": {
    "label": "浮游远程首选距离比例",
    "type": "number",
    "min": 0.000001,
    "unit": "比例"
  },
  "flight.minimumRangeRatio": {
    "label": "浮游远程最小距离比例",
    "type": "number",
    "min": 0.000001,
    "unit": "比例"
  },
  "flight.replanSeconds": {
    "label": "浮游炮重选射位间隔",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "flight.cruiseSpeed": {
    "label": "浮游炮巡航限速",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位/秒"
  },
  "flight.arrivalGain": {
    "label": "浮游炮到站减速系数",
    "type": "number",
    "min": 0.000001,
    "unit": "系数"
  },
  "flight.brakingAcceleration": {
    "label": "浮游炮制动加速度",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位/秒²"
  },
  "flight.steeringGain": {
    "label": "浮游炮速度响应系数",
    "type": "number",
    "min": 0.000001,
    "unit": "系数"
  },
  "flight.maxAcceleration": {
    "label": "浮游炮最大加速度",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位/秒²"
  },
  "flight.maxSpeed": {
    "label": "浮游炮实际速度上限",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位/秒"
  },
  "flight.departureSeconds": {
    "label": "浮游炮出击等待",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "flight.departureStagger": {
    "label": "浮游炮出击错峰",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "flight.targetMoveThreshold": {
    "label": "浮游炮目标位移重规划距离",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "flight.followVelocityRatio": {
    "label": "浮游炮跟随速度补偿比例",
    "type": "number",
    "min": 0.000001,
    "unit": "比例"
  },
  "flight.dockDistance": {
    "label": "浮游炮停靠距离阈值",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "flight.dockSpeed": {
    "label": "浮游炮停靠相对速度阈值",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位/秒"
  },
  "drone.shotsPerManeuver": {
    "label": "无人机每次变位所需发数",
    "type": "integer",
    "min": 0.000001,
    "unit": "发"
  },
  "drone.maneuverDelay": {
    "label": "无人机射后变位等待",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "drone.maxRadius": {
    "label": "无人机活动半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "drone.goalRadius": {
    "label": "无人机目标点安全半径",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "drone.headingGain": {
    "label": "无人机目标朝向响应",
    "type": "number",
    "min": 0.000001,
    "unit": "系数"
  },
  "drone.patrolPeriod": {
    "label": "无人机待机扫描周期",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "drone.followRatio": {
    "label": "无人机跟随惯性比例",
    "type": "number",
    "min": 0.000001,
    "unit": "比例"
  },
  "drone.deployStagger": {
    "label": "无人机展开错峰",
    "type": "number",
    "min": 0.000001,
    "unit": "秒"
  },
  "drone.separationRadius": {
    "label": "无人机间避让距离",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位"
  },
  "drone.separationGain": {
    "label": "无人机间避让强度",
    "type": "number",
    "min": 0.000001,
    "unit": "系数"
  },
  "drone.steeringGain": {
    "label": "无人机到点加速度响应",
    "type": "number",
    "min": 0.000001,
    "unit": "系数"
  },
  "drone.velocityDrag": {
    "label": "无人机速度阻尼",
    "type": "number",
    "min": 0.000001,
    "unit": "系数"
  },
  "drone.maxSpeed": {
    "label": "无人机最大速度",
    "type": "number",
    "min": 0.000001,
    "unit": "世界单位/秒"
  }
};
export const GAMEPLAY_TABLE_LABELS = {
  "masteryRewards": "击杀类型熟练度奖励",
  "enemyAttacks": "普通与强壮怪物近战攻击表",
  "sporeOffsets": "蘑菇领主孢子落点偏移",
  "featherAngles": "飞羽领主散射角度",
  "enemyMassByRank": "怪物基础质量兼容表（仅首项生效，不随阶级）",
  "enemyHealthByRank": "怪物品级生命倍率表",
  "enemyDamageByRank": "怪物品级伤害倍率表",
  "enemyRadiusByRank": "怪物品级碰撞半径表",
  "projectileProfiles": "弹丸型号运动参数表",
  "waveRecoveryRelief": "死亡续游前三波强度缓和",
  "waveEarlyHealth": "前三波生命减免",
  "environmentTimings": "环境默认时长（毫秒）",
  "calendarTimings": "生活历法环境时长（毫秒）",
  "dayPhases": "昼夜时段顺序与默认时长"
};
