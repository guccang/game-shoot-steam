// 点选田格锁定整行，跟随真实步行与刀头接触逐格结算，手动操作可随时接管。
import {farmAutoStep} from './farm-auto-route.js';
import {ROW_REAPER as R} from '../../config/farm-tools.js';
import {farmGrowth} from '../../progression/farming/farm.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
import {blocked} from '../../physics/motion.js';

// 根据刀头寻找最近田格，并按朝向串起同一行；一格空隙可以跨过，独立田区另行对齐。
export function reaperLine(game){
 const r=game.farmWork.reaper,tip={x:game.player.x+(r.axis==='column'?0:r.facing*R.reach),y:game.player.y+(r.axis==='column'?r.facing*R.reach:0)};
 const plots=game.progress.farm.plots.filter(p=>p.mapId===game.mapId);
 let first=null,best=R.startRange;
 for(const p of plots){const d=worldDistance(p,tip);if(d<best){first=p;best=d;}}
 return first?farmRowFrom(plots,first,r.facing,r.axis):[];
}
// 推镰和条播机共用田垄宽度、相邻间距与跨地图接缝投影。
export function farmRowFrom(plots,first,facing,axis='row'){
 const along=axis==='column'?'y':'x',across=axis==='column'?'x':'y';
 const candidates=plots.map(plot=>({plot,...nearest(plot,first)}))
  .filter(p=>Math.abs(p[across]-first[across])<=R.rowTolerance&&(p[along]-first[along])*facing>0)
  .sort((a,b)=>(a[along]-b[along])*facing);
 const line=[first];let last=first[along];
 for(const p of candidates){if(Math.abs(p[along]-last)>R.maxGap)break;line.push(p.plot);last=p[along];}
 return line;
}
// 停止立即撤掉自动计划与惯性，当前超载询问仍由玩家明确确认或取消。
export function releaseReaper(game){
 const r=game.farmWork?.reaper;if(!r)return;
 r.held=false;r.auto=false;r.route=null;r.line=[];game.player.vx=game.player.vy=0;
}
// 从离玩家更近的田头进入；点击空田或未熟田也能选中同一行的成熟作物。
export function queueReaperRow(game,plotId){
 const work=game.farmWork,r=work?.reaper;
 if(!r||work.autoCombat||work.job)return {ok:false,message:'请先处理当前收获提示。'};
 const plots=game.progress.farm.plots.filter(p=>p.mapId===game.mapId),anchor=plots.find(p=>p.id===plotId);
 if(!anchor)return {ok:false,message:'请点选要收割的田格。'};
 const row=farmRowFrom(plots,anchor,-1,r.axis).reverse().concat(farmRowFrom(plots,anchor,1,r.axis).slice(1));
 if(!row.some(p=>p.crop!==null&&farmGrowth(p)>=1))return {ok:false,message:'这一行还没有成熟作物。'};
 const facing=worldDistance(game.player,row.at(-1))<worldDistance(game.player,row[0])?-1:1;
 if(facing<0)row.reverse();
 releaseReaper(game);Object.assign(r,{auto:true,held:true,facing,line:row,mapId:game.mapId,last:{x:game.player.x,y:game.player.y}});
 return {ok:true,message:'已安排自动收割，完成这一'+(r.axis==='column'?'列':'行')+'后停下。'};
}
// 保留旧驱动接口供手动对齐与回归；手机操作使用点格自动队列。
export function engageReaper(game){
 const work=game.farmWork,r=work?.reaper;if(!r||work.job||work.autoCombat||r.held)return;
 const line=reaperLine(game);
 if(!line.some(p=>p.crop!==null&&farmGrowth(p)>=1)){work.result={ok:false,message:'请靠近成熟作物，或掉头对准要收的那一行。'};return;}
 r.held=true;r.line=line;r.mapId=game.mapId;r.last={x:game.player.x,y:game.player.y};
}
// 行进与单格收割共用正式移动和收货事务；满载只授权当前这格，后续需要重新点格安排。
export function driveReaper(game,input,farmAction,dt=.04){
 const work=game.farmWork,r=work.reaper,p=game.player,stop={x:0,y:0};
 if(r.auto&&Math.hypot(input.x,input.y)>.05){releaseReaper(game);return input;}
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
 if(!r.held){const along=r.axis==='column'?input.y:input.x;if(Math.abs(along)>.15)r.facing=Math.sign(along);return input;}
 if(r.mapId!==game.mapId){releaseReaper(game);return stop;}
 r.travel+=worldDistance(r.last,p);r.last={x:p.x,y:p.y};
 const plot=r.line[0],point=nearest(plot,p);
 const dx=point.x-(r.axis==='column'?0:r.facing*R.reach)-p.x,dy=point.y-(r.axis==='column'?r.facing*R.reach:0)-p.y,d=Math.hypot(dx,dy);
 if(d>4){
  if(r.auto){
   const step=farmAutoStep(game,r,{x:p.x+dx,y:p.y+dy},dt,R.speed);
   if(step.failed){releaseReaper(game);work.result={ok:false,message:'暂时走不到这行田，请靠近或清理障碍后再试。'};}
   return step.input;
  }
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
 r.route=null;r.line.shift();if(!r.line.length)releaseReaper(game);
 return stop;
}
