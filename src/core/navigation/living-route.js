import {taskNavigationEnabled} from './task-navigation.js';
import {clearingCombatActive} from '../camp/living-safety.js';
import {gameSource} from '../game-source.js';
import {navigationBodyKey,playerNavigationBody,createPlayerNavigationIndex} from './prepared-navigation.js';
// 当前追踪委托共用正式碰撞规划器，阶段与移动居民始终读取实时目标。
import {worldNavigationObjective} from './world-navigation.js';
import {trackedLivingRequest} from './task-tracking.js';
import {livingForest} from '../../world/living-spaces.js';
import {livingRequestTarget} from '../camp/living-world.js';
import {worldDistance,nearest} from '../../world/coordinates.js';
import {questLineClear} from '../../physics/quest-route.js';
import {createVisualRouteSession,advanceVisualRouteSession} from './visual-route-cache.js';
const caches=new WeakMap();

// 对话与暂停只隐藏，离开常驻森林才清理；未接和完成的委托不产生导航。
export function livingRouteStates(game,view){
  game=gameSource(game);
  // 主动关闭或驿站接管释放邻里搜索；清缴显示期间不让旧委托接替主路线。
  if(!taskNavigationEnabled(game)){caches.delete(game);return [];}
  if(game.state==='paused'||game.mainlineSpeech||clearingCombatActive(game))return [];
  // 修复前置、临时访问与入职目标优先时，不再叠画邻里旧路线和终点。
  if(!livingForest(game)||game.state!=='playing'||game.progress.restoration?.build||game.progress.arrival?.phase==='repairing'||worldNavigationObjective(game)){caches.delete(game);return [];}
  let cache=caches.get(game);
  if(!cache||cache.player!==game.player||cache.time>game.time){cache={player:game.player,time:game.time,routes:new Map()};caches.set(game,cache);}
  // 邻里与主线都按规划开始时的树木绕行；生长、砍伐及树数组替换不打断搜索。
  const active=new Set(),results=[],p=game.player,body=playerNavigationBody(game);
  const tracked=trackedLivingRequest(game);
  for(const spec of tracked?[tracked]:[]){
    const record=game.progress.living.requests[spec.id],target=!record.completed&&livingRequestTarget(gameSource(game),spec);
    if(!target)continue;
    active.add(spec.id);
    const distance=worldDistance(p,target),base={id:spec.id,target,distance,near:distance<100};
    if(base.near){cache.routes.delete(spec.id);results.push({...base,points:[],reachable:true});continue;}
    const key=[record.stage,navigationBodyKey(body,{parking:false})].join('|');
    let route=cache.routes.get(spec.id);
    if(!route||route.key!==key||worldDistance(route.target,target)>=12){
      const index=createPlayerNavigationIndex(game.trees);
      // 居民贴近工作台时指向可交谈的落脚处，不能把终点画进实体底座。
      let goal=nearest(target,p);
      if(!questLineClear(goal,goal,body,index)){
        const options=[];
        for(let i=0;i<16;i++){const angle=i*Math.PI/8,point={x:goal.x+Math.cos(angle)*72,y:goal.y+Math.sin(angle)*72};if(questLineClear(point,point,body,index))options.push(point);}
        options.sort((a,b)=>worldDistance(p,a)-worldDistance(p,b));goal=options[0]||goal;
      }
      route={key,target:{x:target.x,y:target.y},session:createVisualRouteSession(body,goal,index,game.time)};
      cache.routes.set(spec.id,route);
    }
    results.push({...base,...advanceVisualRouteSession(route.session,body,game.time,view)});
  }
  for(const id of cache.routes.keys())if(!active.has(id))cache.routes.delete(id);
  return results;
}
