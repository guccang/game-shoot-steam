// 四位营地伙伴的轻量日常模拟；仅保存在会话内，不写入存档、任务或钱包。
import {MAINLINE_NPCS,MAINLINE_SITES,currentMainlineTask} from '../config/mainline.js';
import {CAMP_ROUTINES,CAMP_CHATS} from '../config/camp-routines.js';
import {arrivalPending} from '../config/ranger-arrival.js';
import {livingForest} from '../world/living-spaces.js';
import {calendarView} from '../world/living-calendar.js';
import {worldDistance,WORLD,nearest} from '../world/coordinates.js';
import {planQuestRoute} from '../physics/quest-route.js';
import {moveBody} from '../physics/motion.js';
import {createCatMotion,updateCatMotion} from './cat-motion.js';

// 人物在普通营地可见；独立故事和室内不复制一套居民。
export function campResidentsVisible(game){return !!game.progress?.mainline&&livingForest(game)&&!game.cottage&&!arrivalPending(game.progress);}
// 初次创建沿用当前委托的交谈地点，之后保持同一身体和动作时钟。
export function campResidents(game){
 if(!game.campActors)game.campActors=new Map();
 const task=currentMainlineTask(game.progress?.mainline);
 for(const [index,[id,npc]] of Object.entries(MAINLINE_NPCS).entries())if(!game.campActors.has(id)){
  const site=MAINLINE_SITES[task?.npc===id?task.site:npc.home];
  game.campActors.set(id,{...site,...npc,id,type:'camp-resident',kind:'mainline-npc',sceneNpcId:'mainline:'+id,actorHero:npc.hero,campResident:true,radius:12,navigationRadius:12,livingCollision:true,motion:createCatMotion(),clock:0,action:CAMP_ROUTINES[id].work,moving:false,path:[],remaining:7+index*4,stage:0,held:false});
 }
 return [...game.campActors.values()];
}
// 玩家主动追踪交谈时在原地等候，导航、交谈距离和头像热点读取同一位置。
export function campTalkSite(game,task){return game.campActors?.get(task?.npc)||MAINLINE_SITES[task?.site];}
// 换目的地时才搜索；不可达就留下休息，不瞬移或在每一帧重新搜索。
function walkTo(game,actor,goal){
 const route=planQuestRoute(actor,goal,game.trees);actor.path=route.reachable?route.points.slice(1):[];
 actor.remaining=55;actor.action='walk';return route.reachable;
}
// 结束聊天时清除双方路径，重新安排错开的日常节奏。
function endChat(game){
 const state=game.campRoutine;if(!state?.chat)return;
 for(const id of state.chat.spec.ids){const actor=game.campActors.get(id);actor.path=[];actor.action='rest';actor.remaining=6;actor.stage=1;}
 state.chat=null;state.next=state.time+45;
}
// 正常森林逐帧驱动作息；战斗、对白、暂停和切图期间不补算离线活动。
export function updateCampRoutines(game,dt){
 if(!campResidentsVisible(game)||game.state!=='playing'||game.player?.arena||game.mainlineSpeech)return;
 const people=campResidents(game),state=game.campRoutine??={time:0,next:25,index:0,chat:null};
 state.time+=dt;
 const run=game.progress.mainline,task=currentMainlineTask(run);
 const focused=!run.trackingPaused&&game.progress.taskTracking?.kind!=='none'&&run.phase!=='doing'?task?.npc:null;
 const night=calendarView(game.progress.living.calendar).id==='night';
 if(state.chat&&(state.chat.spec.ids.includes(focused)||state.time-state.chat.created>70))endChat(game);
 if(!state.chat&&state.time>=state.next){
  const spec=CAMP_CHATS[state.index++%CAMP_CHATS.length];state.next=state.time+45;
  if(!spec.ids.includes(focused)){
   const actors=spec.ids.map(id=>game.campActors.get(id));
   const goals=actors.map((actor,i)=>({...spec.at,x:spec.at.x+(i?28:-28)}));
   const reached=actors.map((actor,i)=>walkTo(game,actor,goals[i]));
   state.chat={spec,created:state.time,started:null,goals};
   if(reached.some(ok=>!ok))endChat(game);
  }
 }
 for(const actor of people){
  const before={x:actor.x,y:actor.y};actor.clock+=dt;
  if(actor.id===focused){actor.path=[];actor.action='rest';actor.held=true;}
  else{
   if(actor.held){actor.held=false;actor.remaining=0;actor.stage=1;}
   const chatting=state.chat?.spec.ids.includes(actor.id);
   actor.remaining-=dt;
   if(!chatting&&actor.remaining<=0){
    actor.stage=(actor.stage+1)%4;
    if(actor.stage===1)walkTo(game,actor,CAMP_ROUTINES[actor.id].stroll);
    else if(actor.stage===3)walkTo(game,actor,MAINLINE_SITES[actor.home]);
    else {actor.action=actor.stage===0?CAMP_ROUTINES[actor.id].work:'rest';actor.remaining=night?24:12;}
   }
   let distance=48*dt;
   while(actor.path.length&&distance>0){
    const point=nearest(actor.path[0],actor),dx=point.x-actor.x,dy=point.y-actor.y,length=Math.hypot(dx,dy);
    if(length<1){actor.path.shift();continue;}
    const step=Math.min(length,distance),x=actor.x,y=actor.y;
    moveBody(actor,dx/length*step,dy/length*step,WORLD,12,game.trees);distance-=step;
    if(Math.hypot(actor.x-x,actor.y-y)<step*.5){actor.path=[];break;}
   }
   if(!actor.path.length&&actor.action==='walk'){actor.action='rest';actor.remaining=2;}
  }
  const speed=dt>0?worldDistance(before,actor)/dt:0;actor.moving=speed>3;updateCatMotion(actor.motion,dt,speed,actor.moving);
 }
 const chat=state.chat;
 if(chat){
  const actors=chat.spec.ids.map(id=>game.campActors.get(id));
  if(chat.started===null&&actors.every((actor,i)=>!actor.moving&&worldDistance(actor,chat.goals[i])<5)){
   chat.started=state.time;for(const actor of actors){actor.path=[];actor.action='chat';}
  }
  if(chat.started!==null&&state.time-chat.started>=12)endChat(game);
 }
}
// 供唯一闲聊气泡读取，两人真实会面后轮流说话，离屏不排队补播。
export function campConversation(game){
 const state=game.campRoutine,chat=state?.chat;if(!chat||chat.started===null)return null;
 const index=Math.floor((state.time-chat.started)/6);if(index>1)return null;
 return {actor:game.campActors.get(chat.spec.ids[index]),text:chat.spec.lines[index]};
}
