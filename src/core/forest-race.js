// 跑步比赛独立推进位置、体力与名次，不调用射击、怪物、采集及载具模块。
import {RACE,RACE_TURN,racePoint,raceReward,racePlace} from '../config/forest-race.js';
import {raceFeatures} from '../config/forest-race-track.js';
import {createRaceTrackState,tickRaceTrack,triggerRaceTrack,moveRaceRunner,raceRivalInput} from './forest-race-track.js';
import {createCatMotion,updateCatMotion} from './cat-motion.js';
import {creditResource} from '../progression/resource-wallet.js';
import {recordEconomy} from '../progression/economy-ledger.js';
import {awardCampXp} from '../progression/camp-level.js';
// 新局与读档重建跑者，身体时钟和比赛状态只属于此场比赛。
export function prepareRace(game){
 const r=game.realm;r.warning=RACE.countdown;r.elapsed=r.phase==='won'||r.phase==='lost'?r.elapsed||0:0;
 r.stamina=100;r.sprinting=false;r.exhausted=false;r.distance=0;r.rivals=RACE.rivals.map((spec,i)=>({...spec,...racePoint(Math.PI/2,r.arena,spec.lane),index:i,progress:0,finish:null,track:createRaceTrackState(),bodyAnimation:createCatMotion()}));
 r.features=raceFeatures(r.arena);r.track=createRaceTrackState();
 r.nextGate=1;r.place=r.place||0;r.remaining=RACE.duration;r.phase=['won','lost'].includes(r.phase)?r.phase:'build';
 Object.assign(game.player,{...racePoint(Math.PI/2,r.arena,78),arena:r.arena,flying:false,amphibious:false,vx:0,vy:0,bodyAnimation:createCatMotion()});
 game.enemies=[];game.projectiles=[];game.enemyBolts=[];game.hazards=[];game.stumps=[];game.aimLock=null;
 game.vehicles.forEach(v=>v.active=false);game.state='realm';
}
// 按钮和读档只允许从准备状态开赛，重复点击不会清空体力或重新计时。
export function startRace(game){const r=game.realm;if(r?.mode!=='race'||r.phase!=='build')return false;r.phase='combat';game.state='playing';return true;}
// 完赛先锁定阶段再入账；重复帧和重复结算都不会再发奖励。
export function finishRace(game,finished){
 const r=game.realm;if(r?.mode!=='race'||r.phase!=='combat')return false;
 r.place=finished?racePlace(r):0;r.phase=finished?'won':'lost';r.cleared=finished?1:0;r.sprinting=false;
 r.earnings=raceReward(r.place);game.state='realm';
 if(finished){
  const record=game.progress.realms.records.race;record.clears++;record.best=Math.max(record.best,5-r.place);
  const ms=Math.round(r.elapsed*1000);record.bestTimeMs=record.bestTimeMs?Math.min(record.bestTimeMs,ms):ms;
  for(const [key,n]of Object.entries(r.earnings))r.earnings[key]=creditResource(game.progress,key,n);
  awardCampXp(game.progress,'realm');recordEconomy(game.progress,'income','realm:race',r.earnings);
 }
 recordEconomy(game.progress,'challenge',`race:${r.place||'timeout'}`);return true;
}
// 跑者使用真实位移推进原猫身体连续帧；固定四人，不建立寻路网或随机刷怪。
export function updateRace(game,dt,input={x:0,y:0}){
 const r=game.realm;if(r?.mode!=='race')return false;
 if(dt<=0||game.state!=='playing'||r.phase!=='combat')return false;
 game.time+=dt;
 if(r.warning>0){r.warning=Math.max(0,r.warning-dt);updateCatMotion(game.player.bodyAnimation,dt,0,false);return false;}
 const p=game.player,before={x:p.x,y:p.y},length=Math.hypot(input.x,input.y);
 const boost=!!(input.sprint||r.sprinting)&&!r.exhausted&&r.stamina>0&&length>0;
 r.stamina=Math.max(0,Math.min(100,r.stamina+dt*(boost?-RACE.drain:RACE.recover)));
 if(r.stamina<=0)r.exhausted=true;if(r.stamina>=25)r.exhausted=false;
 const speed=RACE.speed*(boost?RACE.boost:1)*tickRaceTrack(r.track,p,r.features,dt),step=speed*dt/Math.max(1,length);
 const delta=moveRaceRunner(p,input.x*step,input.y*step,r.arena,r.features,r.track);r.distance+=delta;
 triggerRaceTrack(r.track,p,r.features,r.distance,delta);
 // 逆跑只能抵消原跑程，来回跨线不增加圈数；每圈八旗按顺序确认。
 if(r.distance>=r.nextGate*RACE_TURN/8)r.nextGate++;
 const actual=Math.hypot(p.x-before.x,p.y-before.y);if(actual>.01)p.angle=Math.atan2(p.y-before.y,p.x-before.x);
 p.walkPhase+=actual*.07;updateCatMotion(p.bodyAnimation,dt,actual/dt,actual>.01);
 r.elapsed+=dt;r.remaining=Math.max(0,RACE.duration-r.elapsed);
 for(const n of r.rivals){
  const old={x:n.x,y:n.y};
  if(n.finish===null){const input=raceRivalInput(n,r.arena,r.features),pace=n.speed*(1+.035*Math.sin(r.elapsed*1.6+n.index))*tickRaceTrack(n.track,n,r.features,dt);const delta=moveRaceRunner(n,input.x*pace*dt,input.y*pace*dt,r.arena,r.features,n.track);n.progress+=delta;triggerRaceTrack(n.track,n,r.features,n.progress,delta);if(n.progress>=RACE_TURN*RACE.laps){n.progress=RACE_TURN*RACE.laps;n.finish=r.elapsed;}}
  updateCatMotion(n.bodyAnimation,dt,Math.hypot(n.x-old.x,n.y-old.y)/dt,n.finish===null);
 }
 if(r.distance>=RACE_TURN*RACE.laps&&r.nextGate>RACE.laps*8)return finishRace(game,true);
 if(r.remaining<=1e-8)return finishRace(game,false);return false;
}
