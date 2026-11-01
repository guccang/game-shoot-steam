import {recordMainlineCombat} from '../progression/mainline-combat.js';
import {awardCampXp} from '../progression/camp-level.js';
import {clearingDifficulty} from '../config/clearing-difficulty.js';
import {clearingBossHealth,CLEARING_BOSS_HEALTH_VERSION} from '../config/clearing-boss.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import {livingProtected,livingWaveAllowed} from './living-safety.js';
import {livingForest} from '../world/living-spaces.js';
import { economyFor, challengeProgress } from '../config/economy.js';
import { recordEconomy } from '../progression/economy-ledger.js';
// Boss 挑战管理独立维护难度快照，普通怪物波次重开不改变未击败领主的强度。
import { nextBoss } from '../config/bosses.js';
import { waveDifficulty, HEALTH_BALANCE_VERSION, rollWaveGroup, WAVE_REST_SECONDS } from '../config/waves.js';
import { drySpawn } from '../physics/motion.js';
import { createBossSupport } from './boss-reinforcements.js';

// 整组怪潮清空后自动挑战；剧情与秘境沿用各自调度。
export function summonBoss(game) {
  if(livingProtected(game)||!livingWaveAllowed(game))return false;
  if (game.state !== 'playing' || game.boss || game.story || game.realm || !game.bossReady) return false;
  const profile = nextBoss(game.progress),
    difficulty = waveDifficulty(Math.max(game.wave,1+Math.floor(game.progress.bosses*economyFor(game.progress).challenges.forestWavePerBoss)));
  // 首次挑战记录完整强度；死亡、低波次重试和刷新均沿用这份挑战记录。
  if (!game.progress.bossChallenge || game.progress.bossChallenge.bosses !== game.progress.bosses) {
    game.progress.bossChallenge = {
      bosses: game.progress.bosses,
      kind: profile.id,
      healthVersion: HEALTH_BALANCE_VERSION,
      // 通用地图保留原成长，常驻森林下方按独立清缴生命预算覆盖。
      maxHp: Math.round((GAMEPLAY_VALUES.boss.baseHealth + game.roundBosses * GAMEPLAY_VALUES.boss.healthPerRound) * difficulty.health),
      damage: Math.round(GAMEPLAY_VALUES.boss.baseContactDamage * difficulty.damage),
      blastDamage: Math.round(GAMEPLAY_VALUES.boss.baseBlastDamage * difficulty.damage),
      speed: profile.speed * difficulty.speed,
    };
    if(livingForest(game)){
      const rounds=game.progress.bosses;
      Object.assign(game.progress.bossChallenge,{
        maxHp:clearingBossHealth(rounds,game.progress),clearingHealthVersion:CLEARING_BOSS_HEALTH_VERSION,
        damage:Math.round(GAMEPLAY_VALUES.boss.baseContactDamage*clearingDifficulty(rounds).damage),
        blastDamage:Math.round(GAMEPLAY_VALUES.boss.baseBlastDamage*clearingDifficulty(rounds).damage),speed:profile.speed});
    }
  }
  // 开战只暂停后续随机刷怪，场上原有怪物继续战斗，不额外清场或结算。
  restoreBoss(game, game.progress.bossChallenge.maxHp);
  game.onEvent('boss', { name: profile.name, hint: profile.hint });
  return true;
}

// 恢复已存在的挑战，不重新扣资格、不生成新难度，也不重复触发召唤事件。
export function restoreBoss(game, health) {
  const stats = game.progress.bossChallenge;
  if (!stats || stats.bosses !== game.progress.bosses) return false;
  const profile = nextBoss(game.progress);
  game.boss = drySpawn({
    id: game.nextId++,
    type: 'boss',
    mapId: game.mapId,
    kind: profile.id,
    // 常驻世界的巡护对练采用训练投影，与正在生活的同名居民身份分开。
    livingChallenge:livingForest(game),
    support: createBossSupport(),
    ai: { phase: 'chase', elapsed: 0 },
    // 从左下方入场，窄屏仍能看到完整剪影，避开顶部信息与右侧按钮。
    x: game.player.x - GAMEPLAY_VALUES.boss.spawnLeft,
    y: game.player.y + GAMEPLAY_VALUES.boss.spawnDown,
    hp: Math.max(1, Math.min(stats.maxHp, health)),
    maxHp: stats.maxHp,
    radius: GAMEPLAY_VALUES.boss.radius,
    mass: GAMEPLAY_VALUES.boss.mass,
    flash: 0,
    attack: GAMEPLAY_VALUES.boss.firstAttackDelay,
    speed: stats.speed,
    damage: stats.damage,
    blastDamage: stats.blastDamage,
  });
  return true;
}

// 战胜当前领主才清除挑战快照，下一场按正常规则创建新强度。
export function defeatBoss(game) {
  const clearing=!!game.boss?.livingChallenge&&game.progress.living.patrolActive;
  // 援兵随领主败退，不触发击杀奖励；原有主线怪物仍留在战场。
  if (game.boss) game.enemies = game.enemies.filter(e => e.bossOwner !== game.boss.id);
  const previousTier=challengeProgress(game.progress).tier;
  const gained=clearing?awardCampXp(game.progress,'clearing'):0;
  game.roundBosses++;
  game.progress.bosses++;
  recordEconomy(game.progress,'challenge','forest:'+game.progress.bosses);
  game.progress.bossChallenge = null;
  game.bossKillsAt = game.kills;
  game.boss = null;
  game.bossReady=false;
  // 新组起点独立保存，休整尚未递增 wave 时也能正确展示空进度。
  game.waveGroupStart=game.wave+1;
  game.bossWave=game.wave+rollWaveGroup(game.random);
  game.waveRest=WAVE_REST_SECONDS;
  // 一份清缴到本组领主为止；结算是否可续接由轮次门槛统一判断。
  if(clearing){game.progress.living.patrolActive=false;recordMainlineCombat(game.progress,'clearing');}
  game.pendingClearingRound=clearing?game.progress.bosses:0;
  game.hazards = [];
  // 胜利保留受伤状态，回小屋休息才能恢复猫猫生命。
  game.onEvent('victory',{clearingComplete:clearing,clearingRound:clearing?game.progress.bosses:0,qualification:{...challengeProgress(game.progress),previousTier,gained}});
}
