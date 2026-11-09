// 故事战斗时长夹具：真实配装、出生、移动、命中、装填、领主技能与援兵全部使用正式规则。
import {Game,freshProgress} from '../../src/game.js';
import {STORY_CAMPAIGN} from '../../src/config/story-campaign.js';
import {storyPostForChapter,storyPostApproach} from '../../src/core/story/story-posts.js';
import {enterStory} from '../../src/core/story/story-manager.js';
import {spawnStoryEnemy} from '../../src/core/story/story-encounters.js';
// 固定随机种子保留实际暴击与物理随机数，便于改动前后对照。
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// 测试账号仅开放相关设施与章节前置，不添加武器成长或伤害增益。
export function pacingGame(chapterId,loadoutId,stageId,seed=42){
 const def=STORY_CAMPAIGN[chapterId],p=freshProgress();p.arrival=null;p.restoration.repaired.push('story','garage','neighbors');
 for(const id of def.requires||[])p.story.chapters[id].completed=true;
 const g=new Game(p,seeded(seed));g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,chapterId)));
 // 兼容旧邻里章节存档使用同一正式恢复运行器；新邻里入口已迁到常驻居民。
 if(!enterStory(g,null,chapterId))throw Error('无法进入章节 '+chapterId);g.advanceStoryDialogue(true);g.chooseStoryLoadout(loadoutId);
 Object.assign(g.story,{stageId,phase:'prepare',dialogue:null});return g;
}
// 仅发送移动输入追踪目标；冲锋时横向闪避，普通阶段保持合适交战距离。
function combatInput(g){
 const b=g.boss;if(!b)return {x:0,y:0};
 const dx=b.x-g.player.x,dy=b.y-g.player.y,d=Math.hypot(dx,dy)||1;
 if(['windup','cast'].includes(b.ai.phase)){const a=b.ai.angle??Math.atan2(dy,dx);return {x:-Math.sin(a),y:Math.cos(a)};}
 if(d>170)return {x:dx/d,y:dy/d};if(d<100)return {x:-dx/d,y:-dy/d};return {x:0,y:0};
}
// 从首次有效命中到Boss死亡计时；同时记录出生到死亡和支援清场，避免掩盖转场空耗。
export function measureStoryBoss(loadoutId,seed=42,focused=false){
 const g=pacingGame('sunleaf-01',loadoutId,'Q60',seed);g.startStoryStage();const boss=g.boss;
 // 专注输出档保留正式射击、装填、车炮和技能，用固定距离分离走位及援兵转火时间。
 if(focused){g.trees=[];g.hurt=()=>{};g.story.support.spawned=4;}
 let elapsed=0,first=null,death=null,hits=0;const hit=g.hit.bind(g);
 // 观测正式命中，所有原始结算与死亡事件完整执行。
 g.hit=(target,amount,...args)=>{if(target===boss){first??=elapsed;hits++;}return hit(target,amount,...args);};
 while(elapsed<90&&g.story.stageId==='Q60'&&g.story.phase==='active'){
  if(focused){Object.assign(g.player,{x:2800,y:1700,pushX:0,pushY:0});Object.assign(boss,{x:2920,y:1700,pushX:0,pushY:0});}
  g.update(1/60,focused?{x:0,y:0}:combatInput(g));elapsed+=1/60;if(!g.boss&&death===null)death=elapsed;
 }
 return {kind:'boss',loadoutId,seed,hp:boss.maxHp,seconds:death===null?null:+(death-first).toFixed(2),entrySeconds:death===null?null:+death.toFixed(2),clearSeconds:+elapsed.toFixed(2),hits,failed:g.story.phase==='failed',stage:g.story.stageId};
}
// 从真实任务出生位置单挑一个来敌，保留怪物移动和击退，停发其他名额以分离个体耗时。
export function measureStoryEnemy(loadoutId,heavy=false,seed=42){
 const def=STORY_CAMPAIGN['sunleaf-06'],g=pacingGame(def.id,loadoutId,'DEFEND',seed);g.startStoryStage();
 const center=def.world.sites.STATION;g.enemies=[];spawnStoryEnemy(g,center,0,heavy);const enemy=g.enemies[0];if(!enemy)throw Error('敌人出生失败');
 g.story.combat.spawned=g.story.combat.total;
 let elapsed=0,first=null;const hit=g.hit.bind(g);
 // 不改写手持武器、车炮、敌人位置或生命，仅记录首次受击。
 g.hit=(target,amount,...args)=>{if(target===enemy)first??=elapsed;return hit(target,amount,...args);};
 while(enemy.hp>0&&elapsed<25&&g.story.phase==='active'){g.update(1/30);elapsed+=1/30;}
 return {kind:heavy?'heavy':'normal',loadoutId,seed,hp:enemy.maxHp,seconds:enemy.hp>0?null:+(elapsed-first).toFixed(2),entrySeconds:+elapsed.toFixed(2),failed:g.story.phase==='failed'};
}
