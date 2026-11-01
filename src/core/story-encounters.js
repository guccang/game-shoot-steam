import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import {missionBossHealth} from '../config/mission-boss-balance.js';
// 章节遭遇只编排正式敌人与领主；没有第二套命中、装填或物理规则。
import {storyDefinition,storyNode,clearStoryState} from './story-definition.js';
import {recordStoryEvent} from './story-journey.js';
import { terrainLineClear } from '../physics/terrain-navigation.js';
import { blocked } from '../physics/motion.js';
import { createEnemyAttack } from '../combat/enemy-attack.js';
import { worldDistance } from '../world/coordinates.js';

// 出生点按固定角度轮询，拒绝水域、树干、贴身和重叠位置。
export function storySpawnPoint(game,center,ordinal,boss=false) {
  const def=storyDefinition(game),cfg=def.encounters.spawn,encounter=storyNode(game).encounter;
  const arena=!boss?game.player.arena:null,ring=encounter?.arena||def.encounters.arena;
  for(let i=0;i<cfg.attempts;i++){
    const formation=encounter?.formations?.[game.story.loadoutId]||encounter;
    const lanes=!boss&&formation?.lanes?.[game.story.group||0],defense=!!lanes;
    const angle=defense&&i<9?lanes[ordinal%lanes.length]+((i%9)-4)*.06:(ordinal*.9+i*Math.PI/12);
    const radius=boss?cfg.bossRadius:arena?arena.radius-ring.spawnInset-(i%3)*cfg.radiusStep:cfg.radius+(i%3)*cfg.radiusStep;
    const p={x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
    if(worldDistance(p,game.player)<(boss?cfg.bossPlayerDistance:arena?ring.playerDistance:cfg.playerDistance)||blocked(p.x,p.y,boss?GAMEPLAY_VALUES.boss.radius:GAMEPLAY_VALUES.story.spawnCollisionRadius,game.trees,{arena}))continue;
    // 同一战斗圈内只从目标可直接步行抵达的区域来敌，避免把地面怪刷到河对岸。
    if(arena&&!terrainLineClear(p,center,GAMEPLAY_VALUES.story.spawnCollisionRadius))continue;
    if(game.enemies.some(e=>e.hp>0&&worldDistance(e,p)<cfg.spacing))continue;
    return p;
  }
  return null;
}
// 复用正式芽团的攻击状态与质量；章节固定强度不跟随森林波次。
export function spawnStoryEnemy(game,center,ordinal,heavy=false,tutorial=false) {
  const spot=storySpawnPoint(game,center,ordinal);if(!spot)return false;
  const e=game.spawnEnemy(0,0,spot,{bossOwner:'story'});
  const kind=heavy?'heavy':tutorial?'tutorial':'normal';
  const spec=storyDefinition(game).encounters.enemies[kind],encounter=storyNode(game).encounter;
  // 阶段可单独覆盖生命，当前血量与上限同步，未配置的遭遇沿用章节数值。
  const hp=encounter?.enemyHp?.[kind]??spec.hp;
  Object.assign(e,{story:true,...storyDefinition(game).encounters.enemy,...spec,
    rank:heavy?1:0,tough:heavy,hp,maxHp:hp,arena:game.player.arena,
    assault:createEnemyAttack(),storyTarget:!!encounter?.target&&(heavy||ordinal%encounter.playerEvery!==encounter.playerEvery-1),bossOwner:null});
  return true;
}
// 战斗波只维护配额；下一段必须等待存活敌人清空。
export function beginStoryWave(game,site,total,cap,heavy=0) {
  const r=game.story;r.combat={site,total,cap,heavy,spawned:0,timer:storyNode(game).encounter?.delay??storyDefinition(game).encounters.wave.delay,cleared:false,blocked:0};
  clearStoryState(game,storyDefinition(game).cleanup.wave);
  const def=storyDefinition(game),arena=storyNode(game).encounter?.arena||def.encounters.arena;
  const center=def.world.sites[site],current=game.player.arena;
  if(!current||current.x!==center.x||current.y!==center.y||current.radius!==arena.radius)
    game.player.arena={...center,radius:arena.radius,terrain:arena.terrain};
  recordStoryEvent(game,'wave-start',{group:r.group||0});
}
// 返回清场状态供任务状态机消费，同一波清场不会重复增加进度。
export function updateStoryWave(game,dt) {
  const r=game.story,c=r.combat,cfg=storyDefinition(game).encounters.wave;if(!c)return false;
  if(c.spawned>=c.total&&!game.enemies.some(e=>e.hp>0)){c.cleared=true;if(storyNode(game).task.type!=='defense')delete game.player.arena;return true;}
  c.timer-=dt;
  if(c.timer>0||c.spawned>=c.total)return false;
  let alive=0;for(const enemy of game.enemies)if(enemy.hp>0)alive++;
  if(alive>=c.cap)return false;
  const node=storyNode(game);
  const batch=Math.min(node.encounter?.batch??cfg.batch,c.cap-alive,c.total-c.spawned);
  for(let i=0;i<batch;i++){
    const heavy=c.spawned>=c.total-c.heavy;
    const ordinal=c.spawned+Math.floor(c.blocked/GAMEPLAY_VALUES.story.retryRotationSeconds)*GAMEPLAY_VALUES.story.retryOrdinalOffset;
    if(spawnStoryEnemy(game,storyDefinition(game).world.sites[c.site],ordinal,heavy,!!node.encounter?.tutorial)){
      c.spawned++;c.blocked=0;c.timer=node.encounter?.interval??cfg.interval;
    }else{
      // 无可用出生点时停止本批并延后重试，不能把名额算作已出生。
      c.blocked+=cfg.retry;c.timer=cfg.retry;
      if(c.blocked>cfg.blockedLimit){r.error=cfg.blockedText;r.phase='failed';r.metrics.deaths++;game.state='story';game.syncStory();game.onEvent('story-change');}
      break;
    }
  }
  return false;
}
// 章节领主直接复用野猪的正式技能，不修改永久领主挑战记录。
export function spawnStoryBoss(game,id=storyNode(game).task.boss) {
  const spec=storyDefinition(game).encounters.bosses[id],center=storyDefinition(game).world.sites[spec.site],spot=storySpawnPoint(game,center,spec.ordinal,true);
  if(!spot)throw Error(spec.missing);
  const hp=missionBossHealth(spec.stats.maxHp);
  game.boss={id:game.nextId++,type:'boss',story:true,mapId:storyDefinition(game).mapId,...spot,...spec.stats,hp,maxHp:hp,
    flash:0,ai:{phase:'chase',elapsed:0},arena:{...center,...spec.arena}};
  game.player.arena={...center,...spec.arena};
  game.story.support={triggered:false,spawned:0,timer:0};recordStoryEvent(game,'boss-start');
}
// 援兵在半血时触发一次；Boss死亡后的剩余名额仍会入场供清关。
export function updateStoryBoss(game,dt) {
  const r=game.story,s=r.support,spec=storyDefinition(game).encounters.bosses[storyNode(game).task.boss],cfg=spec.support;
  if(!s)return false;
  // 决战援军即使统领被爆发击败也要清完，不能跳过最后的包围战。
  if(game.boss?game.boss.hp<=game.boss.maxHp*cfg.threshold:cfg.onDefeat)s.triggered=true;
  if(s.triggered&&s.spawned<cfg.total){s.timer-=dt;if(s.timer<=0){
    const e=spawnStoryEnemy(game,storyDefinition(game).world.sites[spec.site],s.spawned+cfg.ordinal);
    if(e){s.spawned++;s.timer=s.spawned%cfg.batch===0?cfg.gap:cfg.interval;}else s.timer=cfg.retry;
  }}
  return !game.boss&&!game.enemies.some(e=>e.hp>0)&&(!s.triggered||s.spawned===cfg.total);
}
