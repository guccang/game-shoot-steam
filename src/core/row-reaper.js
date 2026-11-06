// 单行推镰只锁定按下时的一行，跟随玩家实际位移结算，不建立松手后继续执行的队列。
import {ROW_REAPER as R} from '../config/farm-tools.js';
import {farmGrowth} from '../progression/farm.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {blocked} from '../physics/motion.js';

// 根据刀头寻找最近田格，并按朝向串起同一行；一格空隙可以跨过，独立田区另行对齐。
export function reaperLine(game){
 const r=game.farmWork.reaper,tip={x:game.player.x+r.facing*R.reach,y:game.player.y};
 const plots=game.progress.farm.plots.filter(p=>p.mapId===game.mapId);
 let first=null,best=R.startRange;
 for(const p of plots){const d=worldDistance(p,tip);if(d<best){first=p;best=d;}}
 if(!first)return [];
 const candidates=plots.map(plot=>({plot,...nearest(plot,first)}))
  .filter(p=>Math.abs(p.y-first.y)<=R.rowTolerance&&(p.x-first.x)*r.facing>0)
  .sort((a,b)=>(a.x-b.x)*r.facing);
 const line=[first];let last=first.x;
 for(const p of candidates){if(Math.abs(p.x-last)>R.maxGap)break;line.push(p.plot);last=p.x;}
 return line;
}
// 松手立即撤掉前进意图与惯性，当前超载询问仍由玩家明确确认或取消。
export function releaseReaper(game){
 const r=game.farmWork?.reaper;if(!r?.held)return;
 r.held=false;r.line=[];game.player.vx=game.player.vy=0;
}
// 每次按下按当前位置重新对齐，防止换行后仍追踪上一行。
export function engageReaper(game){
 const work=game.farmWork,r=work?.reaper;if(!r||work.job||work.autoCombat||r.held)return;
 const line=reaperLine(game);
 if(!line.some(p=>p.crop!==null&&farmGrowth(p)>=1)){work.result={ok:false,message:'请靠近成熟作物，或掉头对准要收的那一行。'};return;}
 r.held=true;r.line=line;r.mapId=game.mapId;r.last={x:game.player.x,y:game.player.y};
}
// 行进与单格收割共用正式移动和收货事务；满载只授权当前这格，后续必须重新按住。
export function driveReaper(game,input,farmAction){
 const work=game.farmWork,r=work.reaper,p=game.player,stop={x:0,y:0};
 if(work.job){
  const job=work.job;
  if(job.loadRequest)return stop;
  if(job.loadConfirmation){
   const live=game.progress.farm.plots.find(t=>t.id===job.id&&t.mapId===game.mapId);
   if(!live||live.crop!==job.crop||live.plantedAt!==job.plantedAt){work.job=null;return stop;}
   work.result=farmAction(game,'harvest',{plot:job.id,loadConfirmation:job.loadConfirmation});
   if(work.result.needsLoadConfirmation)job.loadRequest=work.result;
   else work.job=null;
  }
  return stop;
 }
 if(!r.held){if(Math.abs(input.x)>.15)r.facing=Math.sign(input.x);return input;}
 if(r.mapId!==game.mapId){releaseReaper(game);return stop;}
 r.travel+=worldDistance(r.last,p);r.last={x:p.x,y:p.y};
 const plot=r.line[0],point=nearest(plot,p);
 const dx=point.x-r.facing*R.reach-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy);
 if(d>4){
  const step=Math.min(10,d);
  if(blocked(p.x+dx/d*step,p.y+dy/d*step,12,game.trees||[],p)){
   releaseReaper(game);work.result={ok:false,message:'前方有障碍，换个位置再收割。'};return stop;
  }
  const scale=R.speed/Math.max(d,12);return {x:dx*scale,y:dy*scale};
 }
 // 刀口与田心之间的短距离也查碰撞，防止隔墙收割。
 for(let i=1;i<=4;i++)if(blocked(p.x+(point.x-p.x)*i/4,p.y+(point.y-p.y)*i/4,4,game.trees||[],p)){
  releaseReaper(game);work.result={ok:false,message:'割刀被挡住了，请换一侧收割。'};return stop;
 }
 const live=game.progress.farm.plots.find(t=>t.id===plot.id&&t.mapId===game.mapId);
 if(live?.crop!=null&&farmGrowth(live)>=1){
  work.result=farmAction(game,'harvest',{plot:live.id});
  if(!work.result.ok){
   if(work.result.needsLoadConfirmation)work.job={id:live.id,crop:live.crop,plantedAt:live.plantedAt,action:'harvest',point:live,loadRequest:work.result};
   releaseReaper(game);return stop;
  }
 }
 r.line.shift();if(!r.line.length)releaseReaper(game);
 return stop;
}
