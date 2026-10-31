// 清缴生命版本与历史通用血量版本分开，保留剧情、秘境及其他地图原有规则。
import {CLEARING_BOSS_HEALTH_VERSION,clearingBossHealth} from '../config/clearing-boss.js';
import {clearingDifficulty} from '../config/clearing-difficulty.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
import {nextBoss} from '../config/bosses.js';
import {clearingSite} from './clearing-site.js';

// 有效在途领主即代表未结束的清缴；为缺失生活记录的旧档恢复接单与到场位置。
export function migrateClearingBossSession(progress){
 const challenge=progress.bossChallenge;
 if(progress.mapId!=='forest'||!challenge||challenge.bosses!==progress.bosses||progress.patrol?.bossHp==null||progress.story.run||progress.realms.run||progress.campDefense.run)return;
 progress.living.patrolActive=true;
 // 已有位置保留，缺失位置在创建战场与领主之前补齐，避免两者被放到不同地点。
 progress.living.position??={x:clearingSite(progress).x,y:clearingSite(progress).y};
}

// 老挑战仅换算一次生命与攻击，按剩余比例续接受伤状态；胜场、身份和奖励保持原值。
export function migrateClearingBossHealth(progress){
 const challenge=progress.bossChallenge;
 if(!challenge||challenge.bosses!==progress.bosses||challenge.clearingHealthVersion===CLEARING_BOSS_HEALTH_VERSION)return;
 const oldMax=challenge.maxHp;
 challenge.maxHp=clearingBossHealth(progress.bosses,progress);
 challenge.clearingHealthVersion=CLEARING_BOSS_HEALTH_VERSION;
 const scale=clearingDifficulty(progress.bosses).damage;
 challenge.damage=Math.round(GAMEPLAY_VALUES.boss.baseContactDamage*scale);
 challenge.blastDamage=Math.round(GAMEPLAY_VALUES.boss.baseBlastDamage*scale);
 // 旧快照可能保留通用波次加速，迁移后回到该领主固定移速。
 challenge.speed=nextBoss(progress).speed;
 if(progress.patrol?.bossHp!=null)progress.patrol.bossHp=Math.max(1,Math.min(challenge.maxHp,progress.patrol.bossHp/oldMax*challenge.maxHp));
}
