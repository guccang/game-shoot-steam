import {activeGardeningLesson} from '../progression/mainline-gardening.js';
import {currentMainlineTask} from '../config/mainline.js';
import {gameSource} from './game-source.js';
// 营地生活与战斗分离：只有追击居民进入敌人列表，沿用正式攻击和死亡动作。
import {MONSTER_CAMPS,CAMP_CHARACTERS,MONSTER_CAMP_RULES as RULES,campCharacterSite,campCacheSite} from '../config/monster-camps.js';
import {arrivalView} from './enemy-arrival.js';
import {groundPursuit} from '../physics/ground-pursuit.js';
import {enemyIdentity} from '../world/biomes.js';
import {nearest,worldDistance,WORLD} from '../world/coordinates.js';
import {moveBody} from '../physics/motion.js';
import {advanceDumplingMotion} from '../combat/dumpling-motion.js';
import {createEnemyAttack} from '../combat/enemy-attack.js';
import {grantSeedReward} from '../progression/seed-reward.js';
import {FARM_CROPS} from '../config/farm.js';
import {validateProgress} from '../progression/progress.js';
import {calendarView} from '../world/living-calendar.js';
import {campResidentIdentity,campResidentHead,CAMP_RESIDENT_CHAT} from '../config/camp-residents.js';
const sessions=new WeakMap();
// 同一游戏重开时玩家对象会替换，旧运行时不能复活在新的存档里。
function session(game){game=gameSource(game);let s=sessions.get(game);if(!s||s.player!==game.player){s={player:game.player,runs:new Map(),retry:0,error:''};sessions.set(game,s);}return s;}
// 营地仅属于普通大世界，室内、剧情、预览、活动均不推进。
export function monsterCampsAvailable(game){return ['forest','jiuzhaigou'].includes(game.mapId)&&!game.realm&&!game.story&&!game.cottage&&!game.workshopTrial&&!game.livingPreview&&!game.campDefense&&!game.fireActive&&!game.arrivalCinematic&&!game.arrivalPending;}
// 等级从正式出生属性取值，地图目录与实战不维护第二套数值。
export function monsterCampLevel(camp){return enemyIdentity(camp.x,camp.y,0,camp.mapId).level;}
// 警戒边界为真实世界圆，跨世界接缝也使用最近距离。
export function insideMonsterCamp(game,camp){return !!camp&&monsterCampsAvailable(game)&&game.mapId===camp.mapId&&worldDistance(game.player,camp)<=RULES.radius;}
// 五个名额分成两只和三只，保留生活小组之间的通路。
function home(camp,slot){const offsets=[[-65,-30],[-95,10],[55,-25],[90,12],[55,62]];return {x:camp.x+offsets[slot][0]*RULES.scale,y:camp.y+offsets[slot][1]*RULES.scale};}
// 追击只在完整离开实际视口后解除，留出身体和头顶预警的余量。
export function campActorVisible(game,actor){const v=arrivalView(game),p=nearest(actor,game.player),x=p.x-game.player.x,y=p.y-game.player.y;return x>=v.left-48&&x<=v.right+48&&y>=v.top-24&&y<=v.bottom+campResidentHead(actor)+12;}
// 命中资格跟随真实追击状态，退到营地外仍可战斗；生活和预警居民不参与命中。
export function canHitCampActor(game,actor){return monsterCampsAvailable(game)&&actor.mapId===game.mapId&&actor.campState==='chasing'&&game.enemies.includes(actor);}
// 状态切换重置攻击前摇与旧冲量，不重置脚底、步态时钟或剩余血量。
function setCampState(actor,state){if(actor.campState===state)return;actor.campState=state;actor.assault=createEnemyAttack();actor.pushX=actor.pushY=0;actor.knockTime=0;actor.campUnseen=0;}
// 事务保存失败保留原进度，未提交死亡稍后重试，避免重复掉落。
function commit(game,change){const next=validateProgress(structuredClone(game.progress));change(next);try{if(game.livingPersist&&game.livingPersist(next)!==true)return false;}catch{return false;}game.progress=next;game.onEvent?.('monster-camp-change');return true;}
// 只处理已登记的本轮实际死亡；清空与固定种子在同一事务提交。
export function settleMonsterCampKill(game,enemy){
 const camp=MONSTER_CAMPS.find(c=>c.id===enemy.monsterCamp),run=session(game).runs.get(camp?.id);
 if(!camp||!run||enemy.hp>0||!run.actors.includes(enemy))return false;
 const before=game.progress.monsterCamps.camps[camp.id],bit=1<<enemy.campSlot;
 if(before.mask&bit)return true;
 const complete=(before.mask|bit)===31,rewards=[];
 const ok=commit(game,p=>{const r=p.monsterCamps.camps[camp.id];r.mask|=bit;if(!complete)return;r.clears=Math.min(999999,r.clears+1);r.cooldown=RULES.respawn;
  for(const crop of camp.seeds){if(FARM_CROPS[crop].rounds>p.bosses)continue;const bonus=CAMP_CHARACTERS.some(n=>n.camp===camp.id&&n.seed===crop&&p.monsterCamps.items.includes(n.id));const reward=grantSeedReward(game,p,crop,bonus?2:1);rewards.push(reward.message);if(reward.count){const wanted=currentMainlineTask(p.mainline)?.gardening?.crop,lesson=activeGardeningLesson(p,'drop',wanted);if(lesson&&wanted===crop)lesson.seedDrops=1;}}
 });
 session(game).error=ok?'':'营地记录保存失败，正在重试；本轮种子尚未领取。';
 if(ok&&complete){game.float?.(camp.x,camp.y-60,'营地清空 · '+(rewards.join('、')||(camp.seeds.some(i=>FARM_CROPS[i].rounds<=game.progress.bosses)?'种子库存已满':'种子品种尚未开放')),'#f5e6b5');game.onEvent?.('monster-camp-cleared',{name:camp.name,rewards});}
 return ok;
}
// 外围观察时暂停随机遭遇，避免偷听被身后随机刷怪打断；原有敌人仍需玩家处理。
export function observingMonsterCamp(game){return monsterCampsAvailable(game)&&MONSTER_CAMPS.some(c=>c.mapId===game.mapId&&worldDistance(c,game.player)<RULES.observe);}
// 居民依次经历生活、警觉、追击和返营；视口外失去目标后沿正式地形走回原位。
export function updateMonsterCamps(game,dt){
 const s=session(game);if(game.state!=='playing')return;
 if(!monsterCampsAvailable(game)){game.enemies=game.enemies.filter(e=>!e.monsterCamp);for(const run of s.runs.values()){run.active=false;for(const actor of run.actors)setCampState(actor,'returning');}return;}
 s.retry=Math.max(0,s.retry-dt);
 for(const camp of MONSTER_CAMPS){
  const record=game.progress.monsterCamps.camps[camp.id],distance=camp.mapId===game.mapId?worldDistance(camp,game.player):Infinity;
  if(record.cooldown>0)record.cooldown=Math.max(0,record.cooldown-dt);
  if(record.mask===31&&record.cooldown<=0&&distance>RULES.observe){record.mask=0;s.runs.delete(camp.id);}
  let run=s.runs.get(camp.id);
  if(!run&&distance>RULES.observe+200)continue;
  if(!run){run={actors:[],active:false};s.runs.set(camp.id,run);for(let slot=0;slot<RULES.count;slot++){if(record.mask&(1<<slot))continue;const identity=campResidentIdentity(enemyIdentity(camp.x,camp.y,0,camp.mapId),camp,slot);run.actors.push({...identity,...home(camp,slot),id:game.nextId++,type:'enemy',mapId:camp.mapId,monsterCamp:camp.id,campSlot:slot,campState:'idle',campUnseen:0,maxHp:identity.hp,wave:0,ambient:true,reward:0,phase:slot*1.3,flash:0,assault:createEnemyAttack()});}}
  const inside=insideMonsterCamp(game,camp),alert=distance<=RULES.warningRadius;
  for(const actor of run.actors){
   if(actor.hp<=0){if(!(record.mask&(1<<actor.campSlot))&&s.retry<=0&&!settleMonsterCampKill(game,actor))s.retry=3;continue;}
   if(camp.mapId!==game.mapId){setCampState(actor,'returning');continue;}
   if(inside)setCampState(actor,'chasing');
   if(actor.campState==='chasing'){
    actor.campUnseen=inside||campActorVisible(game,actor)?0:(actor.campUnseen||0)+dt;
    if(actor.campUnseen>=RULES.unseenDelay)setCampState(actor,'returning');
   }else if(actor.campState!=='returning')setCampState(actor,alert?'alert':'idle');
   // 警觉只改变脸部朝向，既不靠近玩家，也不启动攻击前摇。
   const player=nearest(game.player,actor),lookDistance=Math.hypot(player.x-actor.x,player.y-actor.y)||1,blend=1-Math.exp(-dt*10),watch=actor.campState==='alert';
   actor.campLookX=(actor.campLookX||0)+((watch?(player.x-actor.x)/lookDistance:0)-(actor.campLookX||0))*blend;
   actor.campLookY=(actor.campLookY||0)+((watch?(player.y-actor.y)/lookDistance:0)-(actor.campLookY||0))*blend;
   if(actor.campState==='chasing')continue;
   const before={x:actor.x,y:actor.y},base=home(camp,actor.campSlot),beat=(game.time||0)*.35+actor.phase;
   if(actor.campState==='returning'&&worldDistance(actor,base)<10)setCampState(actor,alert?'alert':'idle');
   // 真正回到驻地后才缓慢恢复；追击和返营途中不回血，警觉驻足仍可休息。
   if(actor.campState==='idle'||actor.campState==='alert')actor.hp=Math.min(actor.maxHp,actor.hp+actor.maxHp*RULES.healPerSecond*dt);
   if(actor.campState!=='alert'){
    const returning=actor.campState==='returning',destination=returning?{...base,mapId:camp.mapId}:{x:base.x+Math.sin(beat)*12,y:base.y+Math.cos(beat*.7)*8};
    const target=returning&&!actor.flying?groundPursuit(actor,destination,dt).goal:nearest(destination,actor),d=Math.hypot(target.x-actor.x,target.y-actor.y),step=Math.min(d,(returning?Math.max(65,actor.speed):40)*dt);
    if(d>1)moveBody(actor,(target.x-actor.x)/d*step,(target.y-actor.y)/d*step,WORLD,actor.radius);
   }
   // 生活与返营也按真实位移转动车轮、迈重靴，警觉驻足不空转。
   const walked=worldDistance(before,actor);actor.rangedWalk=(actor.rangedWalk||0)+walked/7;actor.armoredWalk=(actor.armoredWalk||0)+walked/9;
   actor.flash=Math.max(0,actor.flash-dt);advanceDumplingMotion(actor,before,dt);
  }
  // 单只追兵离开视野时独立返营，其他仍可见的追兵继续追击，远离营地也不被回收。
  const fighters=run.actors.filter(e=>e.hp>0&&e.campState==='chasing'&&camp.mapId===game.mapId);
  game.enemies=game.enemies.filter(e=>e.monsterCamp!==camp.id||fighters.includes(e));
  for(const actor of fighters)if(!game.enemies.includes(actor))game.enemies.push(actor);
  run.active=fighters.length>0;
  const settled=run.actors.every(e=>e.hp>0||game.progress.monsterCamps.camps[camp.id].mask&(1<<e.campSlot));
  // 受伤居民必须保留到自然回满，避免离屏销毁后再次靠近直接刷新成满血。
  const recovered=run.actors.every(e=>e.hp<=0||e.hp>=e.maxHp);
  if(settled&&recovered&&(camp.mapId!==game.mapId||distance>RULES.observe+200&&run.actors.every(e=>e.hp<=0||e.campState==='idle'&&!campActorVisible(game,e))))s.runs.delete(camp.id);
 }
}
// 正式绘制器只取得附近的非战斗居民与营地摆件；具名人物永不登记敌人。
export function monsterCampObjects(game){
 if(!monsterCampsAvailable(game))return [];
 const s=session(game),items=[];
 for(const camp of MONSTER_CAMPS){if(camp.mapId!==game.mapId)continue;items.push({...camp,type:'monster-camp-fire'});
  const run=s.runs.get(camp.id);if(run)for(const actor of run.actors)if(actor.hp>0&&actor.campState!=='chasing')items.push({...actor,type:'monster-camp-resident'});
  const npc=CAMP_CHARACTERS.find(n=>n.camp===camp.id);if(npc)items.push({...enemyIdentity(camp.x,camp.y,0,camp.mapId),...campCharacterSite(camp),type:'monster-camp-npc',campNpc:true,kind:'dumpling',name:npc.name,npc:npc.id,phase:1,hp:1,maxHp:1});
  if(CAMP_CHARACTERS.some(n=>n.destination===camp.id&&game.progress.monsterCamps.clues.includes(n.id)))items.push({...campCacheSite(camp),type:'monster-camp-cache'});
 }return items;
}
// 同一轮闲聊先抛话再接话，按次数穿插亲戚和邻营传闻。
export function monsterCampChatter(game){
 if(!monsterCampsAvailable(game))return null;
 const s=session(game),camp=MONSTER_CAMPS.find(c=>c.mapId===game.mapId&&worldDistance(c,game.player)<RULES.observe);if(!camp)return null;
 const run=s.runs.get(camp.id),alive=run?.actors.filter(e=>e.hp>0);if(!alive?.length)return null;
 if(run.active||alive.some(e=>e.campState==='alert'))return null;
 const beat=Math.floor((game.time||0)/5),record=game.progress.monsterCamps.camps[camp.id],other=MONSTER_CAMPS.filter(c=>c.id!==camp.id).sort((a,b)=>game.progress.monsterCamps.camps[b.id].clears-game.progress.monsterCamps.camps[a.id].clears)[0];
 let text=camp.lines[Math.floor(beat/2)%camp.lines.length];
 if(beat%2)text=['小点声，锅都听见了。','这话你上回已经说过，饭还没熟。','先记账，等头领洗完碗再投诉。'][Math.floor(beat/2)%3];
 if(record.clears>0&&beat%6<2)text=beat%2?'我家亲戚说这叫热门景点，咱们叫加班。':record.clears>=5?`又来？都第${record.clears}回了！举报那个爱刷营地的家伙是个漏洞！`:`咱家被打了${record.clears}回，锅比头领还坚强。`;
 else if(game.progress.monsterCamps.camps[other.id].clears>0&&beat%6===2)text=`听说${other.name}被打了${game.progress.monsterCamps.camps[other.id].clears}回，我表弟就在那儿当锅盖。`;
 const actor=alive[beat%alive.length];if(beat%6===4&&CAMP_RESIDENT_CHAT[actor.species])text=CAMP_RESIDENT_CHAT[actor.species];
 return {actor,text};
}
// 交谈必须到具名人物身旁；线索只领一次，后续回访仍有回应。
export function talkCampCharacter(game,id){
 const npc=CAMP_CHARACTERS.find(n=>n.id===id),camp=MONSTER_CAMPS.find(c=>c.id===npc?.camp);
 if(!npc||!monsterCampsAvailable(game)||!['playing','paused'].includes(game.state)||game.mapId!==camp.mapId||worldDistance(game.player,campCharacterSite(camp))>RULES.interact)return {ok:false,message:'请到营地里的具名居民身旁交谈。'};
 if(!game.progress.monsterCamps.clues.includes(id)&&!commit(game,p=>p.monsterCamps.clues.push(id)))return {ok:false,message:'线索保存失败，请重试。'};
 return {ok:true,message:game.progress.monsterCamps.items.includes(id)?npc.reply:npc.clue};
}
// 冷灰堆要求已听线索、正确时段与现场距离，特殊物品及奖励永不重复。
export function inspectCampCache(game,id){
 const npc=CAMP_CHARACTERS.find(n=>n.id===id),camp=MONSTER_CAMPS.find(c=>c.id===npc?.destination),p=game.progress.monsterCamps;
 if(!npc||!monsterCampsAvailable(game)||!['playing','paused'].includes(game.state)||game.mapId!==camp.mapId||!p.clues.includes(id)||worldDistance(game.player,campCacheSite(camp))>RULES.interact)return {ok:false,message:'先听取线索，再走到对应营地圈外的冷灰堆。'};
 if(p.items.includes(id))return {ok:false,message:'这里已经找过了，物品收在营地见闻里。'};
 if(calendarView(game.progress.living.calendar).id!==npc.phase)return {ok:false,message:npc.phase==='night'?'等到夜晚，灰里的东西才会露出来。':'等白天再来，才能看清灰里的刻痕。'};
 if(npc.requiresClear&&!p.camps[camp.id].clears)return {ok:false,message:'先完整清空这里一回，信封还被拿去垫锅。'};
 const ok=commit(game,next=>next.monsterCamps.items.push(id));return {ok,message:ok?`获得「${npc.item}」！${npc.reply}`:'物品保存失败，请重试。'};
}
// 检查与界面读取同一运行时错误，不能把保存失败伪装成成功。
export function monsterCampError(game){return session(game).error;}
