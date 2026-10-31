import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { i18nText } from "../i18n/index.js";
import { economyFor } from './economy.js';
// 无尽秘境配置：按层数增长的固定难度和周期领主，奖励继续服务森林装备成长。
export const REALM_BOSS_INTERVAL = 5;
// 爬塔通关后的自动传送等待时间，界面与存档共用秒数。
export const TOWER_REST_SECONDS = 5;
// 守护清波后留出二十秒布防，可通过战场倒计时按钮提前开波。
export const GUARDIAN_REST_SECONDS = 20;
export const REALMS = Object.freeze({
  race:{name:'森林运动会',subtitle:'林间跑步比赛',unit:'场',color:'#90a875',description:'与三位伙伴跑完两圈。方向键或摇杆移动，按住Shift或冲刺按钮加速；体力耗尽后先慢跑恢复。绕开草捆、避开泥地，踩绿色箭头获得1.8秒顺风加速，每条加速带每圈只能触发一次；对手也遵循相同规则。沿箭头通过八面旗标，逆跑和穿越中场不能抄近路。',reward:'完赛按名次获得金币、木材和零件，第一名奖励最多。提前退出或超时没有奖励；森林装备与供给不受影响。'},
  fire:{name:i18nText("config.realms.12658843f1"),subtitle:i18nText("config.realms.4887d0b9b9"),unit:i18nText("config.realms.172fb7e67b"),color:'#c76a55',description:i18nText("config.realms.01e3e2f92b"),reward:i18nText("config.realms.f30b39ad14")},
  football: { name:i18nText("config.realms.3e048c8268"),subtitle:i18nText("config.realms.2190ada37b"),unit:i18nText("config.realms.b6a993c256"),color:'#83a967',description:i18nText("config.realms.09378a3d6a"),reward:i18nText("config.realms.0b8a9f7cf7") },
  rogue: { name: i18nText("balance.app.6e50adbfab"), subtitle: i18nText("config.realms.062230e571"), unit: i18nText("config.realms.5d0ae622f6"), color: '#8e82b9',
    description: i18nText("config.realms.22531d0d7c"), reward: i18nText("config.realms.9db0d93be2") },
  tower: { name: i18nText("balance.app.7ef49da8c6"), subtitle: i18nText("config.realms.fd788db45b"), unit: i18nText("config.realms.b6fd20c013"), color: '#caa46b',
    description: i18nText("config.realms.692e5e18cb"), reward: i18nText("config.realms.90e245ef04") },
  guardian: { name: i18nText("balance.app.5a2d749d4b"), subtitle: i18nText("config.realms.865d346233"), unit: i18nText("config.realms.36d5d011d7"), color: '#65ada1',
    description: i18nText("config.realms.99c3512829"), reward: i18nText("config.realms.10fd430187") },
});
export const REALM_ARENA = Object.freeze({ x: 900, y: 700, radius: 310 });
// 新秘境按可活动面积扩大三倍；旧中心仅作为守护格位模板的相对坐标原点。
export const REALM_RADIUS = REALM_ARENA.radius * Math.sqrt(3);
// 存档层仅校验数据形状；进入场景时再匹配主场景中已验证的可用区域。
export function normalizeRealmArena(raw) {
  return raw && Number.isFinite(raw.x) && Number.isFinite(raw.y) && raw.x >= 0 && raw.y >= 0 && raw.radius === REALM_RADIUS
    ? { x: raw.x, y: raw.y, radius: REALM_RADIUS, terrain: 'forest' } : null;
}
export const BLESSINGS = Object.freeze({
  power: { name: i18nText("config.realms.a7c4490859"), text: `所有武器伤害 +${Number((GAMEPLAY_VALUES.blessings.powerPerStack*100).toFixed(2))}%`, mark: '✦' },
  haste: { name: i18nText("config.realms.e801b7c38d"), text: `射击、蓄能与装填耗时 −${Number((GAMEPLAY_VALUES.blessings.hastePerStack*100).toFixed(2))}%`, mark: '»' },
  vitality: { name: i18nText("config.realms.68f7f54bf8"), text: `生命上限 +${GAMEPLAY_VALUES.blessings.vitalityPerStack}，立即回复 ${GAMEPLAY_VALUES.blessings.vitalityPerStack}`, mark: '❧' },
  armor: { name: i18nText("config.realms.ee37066ac7"), text: `受到的伤害 −${Number((GAMEPLAY_VALUES.blessings.armorPerStack*100).toFixed(2))}%`, mark: '◇' },
  leech: { name: i18nText("config.realms.24eb89e8aa"), text: `每次击杀回复 ${GAMEPLAY_VALUES.blessings.leechPerStack} 点生命`, mark: '♡' },
  reach: { name: i18nText("config.realms.ad141a4980"), text: `所有武器射程 +${Number((GAMEPLAY_VALUES.blessings.reachPerStack*100).toFixed(2))}%`, mark: '⌖' },
  mend: { name: i18nText("config.realms.2906ddd63d"), text: `女神回复 ${GAMEPLAY_VALUES.blessings.mendHealth} 点生命`, mark: '❖' },
  heal: { name: i18nText("config.realms.753a57e16d"), text: `角色回复 ${Number((GAMEPLAY_VALUES.blessings.healRatio*100).toFixed(2))}% 最大生命`, mark: '+' },
});
export const ROGUE_BLESSINGS = ['power', 'haste', 'vitality', 'armor', 'leech', 'reach'];
// 手持枪、浮游炮挂载与载具炮塔复用同一祝福修正，不改写永久武器配置。
export function realmWeapon(weapon, buffs) {
  if (!weapon || !buffs) return weapon;
  const haste = Math.max(GAMEPLAY_VALUES.blessings.hasteFloor, 1 - (buffs.haste || 0) * GAMEPLAY_VALUES.blessings.hastePerStack);
  const range=weapon.range*(1+(buffs.reach||0)*GAMEPLAY_VALUES.blessings.reachPerStack);
  // 秘境射程祝福也同步到锯链外观，避免临时增益再次产生看不见的攻击距离。
  return { ...weapon,...(weapon.id==='chainsaw'?{parts:{...weapon.parts,sawRange:range}}:{}), interval: weapon.interval * haste, reloadTime: weapon.reloadTime * haste,
    ...(weapon.chargeTime ? { chargeTime: weapon.chargeTime * haste, cooldown: weapon.cooldown * haste } : {}),
    range };
}
export const ENCOUNTERS = Object.freeze({
  swarm: { name: i18nText("config.realms.471e33421f"), hint: i18nText("config.realms.bb5710f094"), speed: 1 },
  hunters: { name: i18nText("config.realms.b2ae8bda05"), hint: i18nText("config.realms.e0c5bdc476"), speed: 1.3 },
  elite: { name: i18nText("config.realms.c35ee37c4c"), hint: i18nText("config.realms.df5acbe5c8"), speed: 0.9 },
});
// 守护从手枪可应付的小队起步，逐波增加总量和同屏名额，补兵逐渐加快。
export const GUARDIAN_HORDE = Object.freeze({ firstCount: 12, countPerStage: 6, firstAlive: 4,
  alivePerStage: 2, maxAlive: 72, health: .55, firstSpacing: 1.8, spacingGrowth: .12, minSpacing: .35 });
// 怪物生命沿用现有成长；守护单独限制出场压力，其他秘境配额不变。
export function realmStageSpec(mode, stage, encounter = 'swarm') {
  const horde = mode === 'guardian' ? GUARDIAN_HORDE : null;
  const modifier = mode === 'rogue' ? ENCOUNTERS[encounter] : null;
  const n = Math.max(0, stage - 1), growth = 1 + n * GAMEPLAY_VALUES.realm.healthLinear + n * n * GAMEPLAY_VALUES.realm.healthQuadratic;
  return {
    total: Math.min(Number.MAX_SAFE_INTEGER, horde ? horde.firstCount + n * horde.countPerStage : GAMEPLAY_VALUES.realm.firstCount + n * GAMEPLAY_VALUES.realm.countPerStage),
    alive: horde ? Math.min(horde.maxAlive, horde.firstAlive + n * horde.alivePerStage) : Math.min(GAMEPLAY_VALUES.realm.maxAlive, GAMEPLAY_VALUES.realm.firstAlive + n * GAMEPLAY_VALUES.realm.alivePerStage),
    hp: Math.max(1, Math.round(Math.round((mode === 'tower' ? GAMEPLAY_VALUES.realm.towerBaseHealth : GAMEPLAY_VALUES.realm.rogueBaseHealth) * growth) * (horde?.health ?? 1))),
    damage: (mode === 'tower' ? GAMEPLAY_VALUES.realm.towerBaseDamage : GAMEPLAY_VALUES.realm.rogueBaseDamage) * (1 + n * GAMEPLAY_VALUES.realm.damageLinear + n * n * GAMEPLAY_VALUES.realm.damageQuadratic),
    speed: Math.min(GAMEPLAY_VALUES.realm.speedCap, GAMEPLAY_VALUES.realm.baseSpeed + n * GAMEPLAY_VALUES.realm.speedPerStage) * (modifier?.speed || 1),
    spacing: horde ? Math.max(horde.minSpacing, horde.firstSpacing / (1 + n * horde.spacingGrowth)) : Math.max(GAMEPLAY_VALUES.realm.minSpacing, GAMEPLAY_VALUES.realm.firstSpacing - n * GAMEPLAY_VALUES.realm.spacingPerStage),
    boss: stage % REALM_BOSS_INTERVAL === 0,
    elite: stage % REALM_BOSS_INTERVAL !== 0 && (mode === 'tower' ? stage % GAMEPLAY_VALUES.realm.towerEliteInterval === 0 : encounter === 'elite' && mode === 'rogue'),
  };
}
// 逐关即时结算；爬塔里程碑核心仅首通领取，远征与守护保留每次挑战的核心奖励。
export function realmReward(mode, stage, best, progress) {
  const c=economyFor(progress),r=c.realms;
  const scale=1+Math.min(GAMEPLAY_VALUES.realm.rewardTierCap,Math.floor((stage-1)/GAMEPLAY_VALUES.realm.rewardTierStages))*r.tierScale;
  return {coins:Math.round((r.coinsBase+stage*r.coinsStage)*scale),wood:Math.round((r.woodBase+stage*r.woodStage)*scale),
    parts:Math.ceil(r.parts[mode]*scale),crystal:Math.ceil(r.crystal[mode]*scale),
    core:stage%REALM_BOSS_INTERVAL===0&&(mode!=='tower'||best<stage)?r.core:0};
}
