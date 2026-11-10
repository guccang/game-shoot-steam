import {regionalDumpling,dumplingWaterFits} from '../../world/dumpling-habitats.js';
import {BIOME_DUMPLING_BY_ID} from '../../config/biome-dumplings.js';
import {updateBiomeDumpling} from '../../combat/biome-dumplings.js';
import {energyShieldMeleeTarget} from '../../combat/energy-shield-surface.js';
import {clearingEnemyDamage,clearingEnemyHealth} from '../../config/clearing-damage.js';
import {clearingOpeningPacing,clearingEnemyLevel,CLEARING_FODDER} from '../../config/clearing-difficulty.js';
import {CLEARING_STARTER_RULES} from '../../config/clearing.js';
import {livingForest} from '../../world/living-spaces.js';
import {advanceDumplingMotion} from '../../combat/dumpling-motion.js';
import {releaseSettlementOverlap} from '../../physics/settlement-pursuit.js';
import {campBarricadeTarget,hurtCampBarricade} from '../camp/camp-defense.js';
import { GAMEPLAY_VALUES } from '../../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../../config/gameplay-tables.js';
import {recordMainlineExperience} from '../../progression/story/mainline-experience.js';
import {clearingIdentity} from '../../config/clearing-enemies.js';
import { ARMORED, armoredSpawn, armoredIdentity } from '../../config/armored-enemies.js';
import {retreatLivingEnemy} from '../camp/living-safety.js';
import {recordLivingKill} from '../camp/living-world.js';
import {storyTarget} from '../story/story-definition.js';
import { rangedSpawn, rangedSpecies, rangedIdentity, RANGED_ENEMIES } from '../../config/ranged-enemies.js';
import { updateRangedAttack, updateEnemyBolts } from '../../combat/ranged-enemies.js';
import { companionTargets, companionEnemyTarget, damageCompanion } from '../../combat/companion-targets.js';
// 怪物管理统一负责出生、属性、移动攻击、死亡残块及远处回收。
import { drySpawn, stepBodies } from '../../physics/motion.js';
import { WORLD, nearest, worldDistance } from '../../world/coordinates.js';
import { biomeAt, enemyIdentity } from '../../world/biomes.js';
import { ENCOUNTER_DIFFICULTY } from '../../config/encounters.js';
import { waveDifficulty } from '../../config/waves.js';
import { flyingSpawn, flyingIdentity } from '../../config/enemies.js';
import { createEnemyAttack, updateEnemyAttack } from '../../combat/enemy-attack.js';
import { recordWaveKill, releaseWaveSlot } from './wave-manager.js';
import { arrivalRecycleRadius } from './enemy-arrival.js';
import { BOSS_SUPPORT } from '../../config/boss-combat.js';
import { hurtGoddess } from '../realms/realm-manager.js';
import { playerThreatRange } from '../../combat/threat-range.js';

// 怪物从玩家周围出现；清缴使用统一基础强度，野外遭遇继续读取出生区域。
export function spawnEnemy(game, angle = game.random() * Math.PI * 2, radius = GAMEPLAY_VALUES.enemy.spawnRadius, arrival = null, context = null) {
  // 护送仅借用清剿编成与数值，ambient标记使它不计入清剿名额。
  const wave=context?.escortWave??game.wave,rounds=context?.escortRounds??game.progress.bosses;
  const clearing=!!context?.escortWave||!context?.ambient&&!context?.bossOwner&&!game.realm&&!game.story;
  const clearingStats=(clearing||!!context?.bossOwner)&&livingForest(game);
  let spot = arrival || drySpawn({
    mapId: game.mapId,
    x: game.player.x + Math.cos(angle) * radius,
    y: game.player.y + Math.sin(angle) * radius,
  });
  // 营地前三波避免环形刷怪误取邻区高等级，主动走进高等级区仍面对当地怪物。
  if (
    !context?.ambient && wave <= GAMEPLAY_VALUES.enemy.meadowProtectionWaves &&
    radius >= GAMEPLAY_VALUES.enemy.protectionMinRadius &&
    radius <= GAMEPLAY_VALUES.enemy.protectionMaxRadius &&
    biomeAt(game.player.x, game.player.y, game.mapId).id === 'meadow'
  ) {
    for (let i = 1; i <= 32 && biomeAt(spot.x, spot.y, game.mapId).id !== 'meadow'; i++) {
      const r = i <= 16 ? radius : Math.min(radius, GAMEPLAY_VALUES.enemy.protectionFallbackRadius),
        a = angle + (i * Math.PI) / 8;
      spot = drySpawn({ mapId: game.mapId, x: game.player.x + Math.cos(a) * r, y: game.player.y + Math.sin(a) * r });
    }
  }
  // 清缴使用统一等级后再叠加轮数成长；遭遇仍按实际区域取等级，保留营地保护。
  const origin = !context?.ambient && (arrival && wave <= GAMEPLAY_VALUES.enemy.meadowProtectionWaves && biomeAt(game.player.x, game.player.y, game.mapId).id === 'meadow')
      ? game.player : spot,
    difficulty = context?.ambient&&!context?.escortWave ? ENCOUNTER_DIFFICULTY : waveDifficulty(wave, game.recoveryRun),
    ground = enemyIdentity(
      origin.x,
      origin.y,
      context?.ordinaryDumpling||context?.bossSummon ? 0 : Math.min(context?.bossOwner ? GAMEPLAY_VALUES.enemy.supportRankCap : difficulty.rankCap, game.random() + difficulty.rankBonus),
      game.mapId,
      clearingStats ? CLEARING_STARTER_RULES.enemyLevel : null,
    ),
    // 召唤木卫固定使用地面基础身份，剧情脚本借用 bossOwner 的普通单位不受影响。
    baseIdentity = !context?.ordinaryDumpling&&!context?.bossSummon&&!clearing&&(context?.ambient ? game.player.flying : flyingSpawn(wave, context?.bossOwner ? game.nextId : game.waveSpawned + 1, game.player.flying))
      ? flyingIdentity(ground) : ground;
  // 清缴与移动遭遇共用远程配额；剧情、秘境和领主援军保持原有阵容。
  const stage = context?.rangedEncounter ? Math.max(GAMEPLAY_VALUES.ranged.unlockWave, ground.level) : wave;
  const ordinal = context?.escortOrdinal??(context?.rangedEncounter ? game.encounterSpawned + 1 : game.waveSpawned + 1);
  const eligible = !clearing&&(!context?.ambient || context?.rangedEncounter) && !baseIdentity.flying && !game.realm && !game.story && !context?.bossOwner && stage >= GAMEPLAY_VALUES.ranged.unlockWave && ordinal % GAMEPLAY_VALUES.ranged.every === GAMEPLAY_VALUES.ranged.ordinalRemainder;
  let identity = rangedSpawn(stage, ordinal, eligible ? game.random() : 1, game.enemies, !eligible)
    ? rangedIdentity(baseIdentity, rangedSpecies(stage, game.random())) : baseIdentity;
  // 重装只替换普通陆地近战，不抢远程和飞行配额，不进入脚本战斗。
  const heavyEligible=!clearing&&(!context?.ambient||context?.rangedEncounter)&&!identity.flying&&!RANGED_ENEMIES[identity.species]&&!game.realm&&!game.story&&!context?.bossOwner&&stage>=GAMEPLAY_VALUES.armored.unlockWave&&ordinal%GAMEPLAY_VALUES.armored.every===GAMEPLAY_VALUES.armored.ordinalRemainder;
  if(heavyEligible&&armoredSpawn(stage,ordinal,game.random(),game.enemies))identity=armoredIdentity(identity);
  // 清缴不叠加野外遭遇的独立抽签；从原始团子属性生成本波唯一的编成名额。
  if(clearing){
    identity=clearingIdentity(ground,wave,ordinal,game.enemies,game.random());
  }
  // 六类首领及各玩法的正式召唤物共用铁甲木卫实体、碰撞和盾击动作。
  if(context?.bossSummon)identity={...armoredIdentity(ground),name:'铁甲木卫'};
  // 地貌团子只进入森林普通战斗；剧情、秘境、重装及领主召唤保持身份。
  const regionalAllowed=(!context?.ambient||context?.rangedEncounter||context?.dumplingVariant)&&!game.fireActive&&!game.campDefense&&!game.workshopTrial&&game.mapId==='forest'&&!game.realm&&!game.story&&!context?.bossOwner&&!context?.ordinaryDumpling&&!context?.escortWave;
  const variant=regionalAllowed?(context?.dumplingVariant?BIOME_DUMPLING_BY_ID[context.dumplingVariant]:regionalDumpling(spot,game.nextId)):null;
  if(variant&&(context?.dumplingVariant||(identity.species||'slime')==='slime')&&(variant.habitat!=='lake'||dumplingWaterFits(spot.x,spot.y,30))){
    identity={...ground,species:'slime',flying:false,name:variant.name,dumplingVariant:variant.id,color:variant.color,aquatic:variant.habitat==='lake',amphibious:variant.habitat==='lake'};
  }
  // 正常森林清缴及领主援兵按已完成轮数成长；野外遭遇、剧情与秘境继续使用原规则。
  const baseDamage=identity.damage*(context?.bossOwner?BOSS_SUPPORT.damage:1);
  const damage=(clearing||context?.bossOwner)&&livingForest(game)
    ?clearingEnemyDamage(baseDamage,rounds,wave,game.recoveryRun)
    :Math.round(baseDamage*difficulty.damage);
  const health=(clearing||context?.bossOwner)&&livingForest(game)
    ?clearingEnemyHealth(rounds,wave,game.recoveryRun):difficulty.health;
  // 新手清缴重装不承担过长的弹匣消耗；野外、剧情、秘境及试玩不套用减免。
  const armorHealth=clearingStats&&!context?.bossSummon&&identity.species===ARMORED.id?clearingOpeningPacing(rounds).armoredHealth:1;
  // 清缴增量主要是脆皮团怪；野外遭遇、领主援军和特殊兵种不套用此减免。
  const fodder=clearingStats&&clearing&&!identity.flying&&!RANGED_ENEMIES[identity.species]&&identity.species!==ARMORED.id;
  const hp = Math.max(1,Math.round(identity.hp * health * armorHealth * (fodder?CLEARING_FODDER.health:1) * (context?.bossSummon ? BOSS_SUPPORT.summonHealth : context?.bossOwner ? BOSS_SUPPORT.health : 1))),
    enemy = {
      id: game.nextId++,
      type: 'enemy',
      mapId: game.mapId,
      ...spot,
      ...identity,
      // 清缴与领主援军显示本轮等级，属性与奖励仍来自独立清缴预算。
      level: clearingStats ? clearingEnemyLevel(rounds) : identity.level,
      hp,
      maxHp: hp,
      damage:Math.max(1,Math.round(damage*(fodder?CLEARING_FODDER.damage:1))),
      // 常驻清缴与领主援兵使用兵种基础移速，不随波次或胜场额外加速。
      speed: identity.speed * ((clearing||context?.bossOwner)&&livingForest(game)?1:difficulty.speed),
      wave: context?.bossOwner || context?.ambient ? 0 : wave,
      ...(context?.ambient ? { ambient: true } : {}),
      ...(context?.bossOwner ? { bossOwner: context.bossOwner } : {}),
      radius: identity.species===ARMORED.id ? ARMORED.radius : RANGED_ENEMIES[identity.species]?.bodyRadius || GAMEPLAY_TABLES.enemyRadiusByRank[identity.rank],
      flash: 0,
      phase: game.random() * 6,
      assault: createEnemyAttack(),
    };
  game.enemies.push(enemy);
  if (!context?.bossOwner && !context?.ambient) game.waveSpawned++;
  return enemy;
}

// 更新存活怪物与死亡残块，Boss 仅参与刚体碰撞，其技能仍归 Boss 战斗模块。
export function updateEnemies(game, dt, previousPlayer) {
  // 刷新碰撞前修正栏杆重叠，防止击退和挤压从无效起点反复撞墙。
  if(dt>0&&livingForest(game))for(const body of [...game.enemies,...(game.boss?[game.boss]:[])])releaseSettlementOverlap(body,game.trees);
  game.profiler?.start('logic.enemyPhysics');
  const bossOrigin = game.boss ? { x: game.boss.x, y: game.boss.y } : null;
  // 统一推进碰撞，死亡残块短暂保留动量；碰撞伤害不再额外注入能量。
  const bodies = [
    ...game.enemies.filter((e) => e.hp > 0),
    ...game.remnants,
    ...(game.boss ? [game.boss] : []),
  ];
  stepBodies(
    bodies,
    dt,
    WORLD,
    (a, b, speed) => {
      if (speed > 65) game.fx.add('smoke', a.x, a.y, 0.28, { size: 7, color: '#d6c5a1' });
      if (b && speed > GAMEPLAY_VALUES.combat.collisionDamageSpeed) {
        const point = nearest(b, a),
          d = Math.hypot(point.x - a.x, point.y - a.y) || 1,
          direction = { x: (point.x - a.x) / d, y: (point.y - a.y) / d };
        game.hit(b, Math.min(GAMEPLAY_VALUES.combat.collisionDamageCap, Math.ceil(speed * GAMEPLAY_VALUES.combat.collisionDamageFactor)), false, { direction, impulse: 0, statisticsSource:a.statisticsSource });
      }
    },
    game.trees,
  );
  // 冲锋途中受到小幅击退时，路线提示同步平移；方向与剩余技能时间保持锁定。
  if (bossOrigin && game.boss?.kind === 'boar' && game.boss.ai?.phase === 'cast') {
    for (const lane of game.hazards) {
      if (lane.owner !== game.boss.id || lane.kind !== 'charge') continue;
      lane.x += game.boss.x - bossOrigin.x;
      lane.y += game.boss.y - bossOrigin.y;
    }
  }
  game.profiler?.end('logic.enemyPhysics');
  game.profiler?.start('logic.enemyAI');
  const dangerRange = playerThreatRange(game), companions=companionTargets(game);
  updateEnemyBolts(game, dt, previousPlayer, companions);
  for (const corpse of game.remnants) corpse.life -= dt;
  game.remnants = game.remnants.filter((c) => c.life > 0);
  for (const enemy of game.enemies) {
    // 同一帧已被击杀的怪物不能继续扑击；玩家倒下后其他怪物停止攻击。
    if (game.state !== 'playing') break;
    if (enemy.hp <= 0) continue;
    const motionFrom={x:enemy.x,y:enemy.y};
    try {
    if(retreatLivingEnemy(game,enemy,dt))continue;
    enemy.livingRetreat=null;
    // 比赛球只被真实物理推动，不追人、不扑击，受击和翻滚仍正常推进。
    if(enemy.football){enemy.flash=Math.max(0,enemy.flash-dt);enemy.wet=Math.max(0,(enemy.wet||0)-dt);enemy.chill=Math.max(0,(enemy.chill||0)-dt);if(!enemy.chill)enemy.chillFactor=1;continue;}
    enemy.wet = Math.max(0, (enemy.wet || 0) - dt);
    enemy.chill = Math.max(0, (enemy.chill || 0) - dt);
    if (!enemy.chill) enemy.chillFactor = 1;
    const barricade=enemy.campDefense&&!enemy.campRaider&&campBarricadeTarget(game,enemy);
    const goddess = enemy.goddessTarget && game.realm?.mode === 'guardian' ? game.realm.goddess : null;
    const station = enemy.storyTarget ? storyTarget(game) : null;
    const companion = goddess || station ? null : companionEnemyTarget(game,enemy,companions);
    const victim = barricade || station || goddess || companion?.node || game.player;
    const previous = barricade || station || goddess || (companion ? companion.node.previous || companion.node : previousPlayer);
    const regional=!!enemy.dumplingVariant&&BIOME_DUMPLING_BY_ID[enemy.dumplingVariant].pattern!=='charge'&&!enemy.workshopTarget;
    if(regional)updateBiomeDumpling(game,enemy,victim,dt);
    const ranged = (regional||RANGED_ENEMIES[enemy.species]) && !enemy.workshopTarget;
    if (ranged&&!regional) updateRangedAttack(game, enemy, victim, dt);
    const damage = ranged ? 0 : updateEnemyAttack(enemy, victim===game.player?energyShieldMeleeTarget(game,enemy):victim, victim===game.player?energyShieldMeleeTarget(game,enemy,previous):previous, dt, WORLD, dangerRange);
    if (damage) {
      if(barricade)hurtCampBarricade(game,damage);
      else if (station) game.hurtStoryTarget(damage);
      else if (goddess) hurtGoddess(game, damage);
      else if(companion) damageCompanion(companion,damage);
      else game.hurt(damage,enemy);
    }
    enemy.flash = Math.max(0, enemy.flash - dt);
    } finally {advanceDumplingMotion(enemy,motionFrom,dt);}
  }
  game.profiler?.end('logic.enemyAI');
}

// 只保留正式死亡动作与动量；演练可复用而不触发奖励或任务统计。
export function leaveEnemyRemnant(game, target, impact) {
  const duration = impact?.power > 1 ? 1.05 : 0.6;
  game.remnants.push({
    ...target,
    flash: 0,
    life: duration,
    duration,
    burstDelay: impact?.power > 1 ? 0.18 : 0,
    reactionTime: 0,
    burst: true,
  });
  if (game.remnants.length > 20) game.remnants.shift();
}

// 命中结算确认死亡后仅调用一次，统计与波次配额分离维护。
export function defeatEnemy(game, target, impact) {
  recordLivingKill(game,target);
  leaveEnemyRemnant(game,target,impact);
  game.kills++;
  recordWaveKill(game, target);
  recordMainlineExperience(game, 'enemy-defeat', target, impact);

  return target.reward ?? (target.tough ? GAMEPLAY_VALUES.enemy.fallbackToughReward : GAMEPLAY_VALUES.enemy.baseReward);
}

// 回收不再参与战斗的怪物，保留正在扑击或击退中的单位。
export function recycleEnemies(game) {
  if (game.realm || game.story || game.campDefense) {
    game.enemies = game.enemies.filter(e => e.hp > 0);
    return;
  }
  const recycleRadius = arrivalRecycleRadius(game);
  // 两类怪都可远处回收；只有波次怪退还名额，遭遇怪不影响波次，也不算击杀。
  game.enemies = game.enemies.filter((e) => {
    if (e.hp <= 0) return false;
    if(e.fireEvent||e.livingRequest||e.monsterCamp)return true;
    if (
      worldDistance(e, game.player) < recycleRadius ||
      e.knockTime > 0 ||
      (e.assault && e.assault.phase !== 'chase')
    )
      return true;
    releaseWaveSlot(game, e);
    return false;
  });
}
