import {taskNavigationEnabled} from './task-navigation.js';
import {gameSource} from './game-source.js';
import {navigationBodyKey,takePreparedNavigation,playerNavigationBody,createPlayerNavigationIndex} from './prepared-navigation.js';
import {questLineClear,planQuestRoute} from '../physics/quest-route.js';
// 任务路线缓存按游戏实例保存，HUD与正式地面绘制读取同一任务站点。
import {storyDefinition,storySceneActive} from './story-definition.js';
import {worldDistance,visibleBodies} from '../world/coordinates.js';
import {createVisualRouteSession,advanceVisualRouteSession} from './visual-route-cache.js';
import {worldNavigationObjective} from './world-navigation.js';
import {inRestorationArea} from '../world/restoration-area.js';
const routes=new WeakMap();
// 诊断只查看已有缓存，绝不为采集日志启动搜索、重建碰撞或生成光点。
export function storyRouteDiagnostics(game){const cache=routes.get(gameSource(game)),s=cache?.session;return s?{key:cache.key,target:{...cache.target},settled:s.settled,searchStarts:s.searchStarts,localSearchStarts:s.localSearchStarts,points:s.points?.length||0,reachable:s.search?.result?.reachable??null,localPlanning:!!s.local}:null;}

// 伐木目标仍指向树本体，行走终点改到树旁可站立的脚底位置，不能要求走进树干。
function routeGoal(body,site,index){
 if(site.type!=='tree'||questLineClear(site,site,body,index))return site;
 const radius=(site.radius||0)+(body.navigationRadius??12)+8,options=[];
 for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,point={x:site.x+Math.cos(angle)*radius,y:site.y+Math.sin(angle)*radius};
  if(questLineClear(point,point,body,index))options.push(point);
 }
 options.sort((a,b)=>worldDistance(body,a)-worldDistance(body,b));return options[0]||site;
}

// 活跃任务才规划；目标、地图、会话与通行能力改变立即作废旧路线。
function resolveStoryRoute(game,view,prepare=false){
 game=gameSource(game);
 // 暂时隐藏只影响显示，不删除已验证路线；恢复后仍检查目标、角色和障碍版本。
 if(!taskNavigationEnabled(game)||game.state==='paused'&&!prepare||game.mainlineSpeech||game.story?.phase==='dialogue')return null;
 const run=game.story,main=!run?worldNavigationObjective(game):null;
 if(game.state!=='playing'&&!(prepare&&game.state==='paused')||run&&(run.phase!=='active'||run.trial||!storySceneActive(game))||!run&&(!main||main.site.mapId!==game.mapId)){routes.delete(game);return null;}
 const def=run?storyDefinition(game):{interaction:{radius:main.site.arrivalRadius??85}},objective=run?game.storyObjective():{site:main.key},site=run?def.world.sites[objective.site]:main.site;
 if(!site){routes.delete(game);return null;}
 const distance=worldDistance(game.player,site),near=site.repairArea?inRestorationArea(game.player,site.repairArea):distance<=def.interaction.radius;
 if(near){routes.delete(game);return {points:[],near:true,distance,site:objective.site,reachable:true};}
 const p=game.player,body=playerNavigationBody(game);
 const key=[run?.runId||main?.task.id,run?.stageId||main?.phase,objective.site,navigationBodyKey(body,{parking:false})].join('|');
 let cache=routes.get(game);
 if(!cache||cache.player!==p||cache.time>game.time||cache.key!==key||worldDistance(cache.target,site)>=12){
  const prepared=takePreparedNavigation(game,site,body);
  // 每次真正新建路线才读取树木；已有路线和进行中的搜索不监听树木变动。
  const index=prepared?.index||createPlayerNavigationIndex(game.trees);
  const goal=routeGoal(body,site,index);
  cache={key,player:p,time:game.time,index,target:{x:site.x,y:site.y},session:createVisualRouteSession(body,goal,index,game.time,prepared?.route)};routes.set(game,cache);
 }
 // 结算恢复是一笔显式状态切换：一次性完成新目标路线，正式绘制仍只走有界搜索。
 // 只消费成功且逐段验证的短边；已有完整路线直接复用，不在每帧同步重算。
 let state=advanceVisualRouteSession(cache.session,body,game.time,view);
 if(prepare&&state.planning){
  const route=planQuestRoute(body,cache.session.goal,cache.index,distance>1200?16000:4096,{shortEdges:true});
  if(route.reachable){cache.session=createVisualRouteSession(body,cache.session.goal,cache.index,game.time,route);state=advanceVisualRouteSession(cache.session,body,game.time,view);}
 }
 return {...state,near:false,distance,site:objective.site};
}

// 日常显示保持暂停隐藏和分帧预算，不能在绘制调用中阻塞完成全程搜索。
export function storyRouteState(game,view){return resolveStoryRoute(game,view);}

// 清缴结算关闭前准备当前目标；允许暂停期间计算，但不恢复游戏、不显示暂停路点。
export function prepareStoryRoute(game){return resolveStoryRoute(game,undefined,true);}

// 先按真实镜头裁剪，再应用同屏预算；接入搜索期间保留已知主路，不画穿墙连接。
export function visibleRouteDots(route,view,spacing=36,limit=96){
 const points=route?.points?.length?route.points:route?.routePoints||[];
 const dots=visibleBodies(storyRouteDots(points,spacing,Infinity,Infinity),view,18);
 const stride=Math.max(1,Math.ceil(dots.length/limit));return dots.filter((_,i)=>i%stride===0);
}

// 光点从目标端锚定等距位置，角色移动时不会整串沿路滑动；最多显示近端24点。
export function storyRouteDots(points,spacing=28,limit=24,reach=640){
 if(points.length<2)return [];
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0),dots=[];
 let distance=total%spacing;if(distance<20)distance+=spacing;let segment=0,offset=0;
 for(;distance<Math.min(total-12,reach)&&dots.length<limit;distance+=spacing){
  while(segment<lengths.length-1&&offset+lengths[segment]<distance)offset+=lengths[segment++];
  const a=points[segment],b=points[segment+1],t=(distance-offset)/Math.max(.001,lengths[segment]);
  // 箭头沿当前可通行线段；间隔从终点计算，玩家走动时不会在光点间跳换。
  dots.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,distance,
   angle:Math.atan2(b.y-a.y,b.x-a.x),arrow:Math.round((total-distance)/spacing)%3===0});
 }
 return dots;
}
