// 农田热点只在语义状态改变时提交属性，避免静止田地反复触发浏览器样式计算。
import {FARM_CROPS,FARM_PLOT_SHAPE,farmPosition} from '../config/farm.js';
import {farmGrowth} from '../progression/farm.js';
import {sceneLayout} from './scene-layout.js';
import {placeSceneHit} from './scene-hit.js';
const states=new WeakMap();
const projections=new WeakMap();

// 每次刷新仍读取当前容器几何；仅在镜头、缩放、滚动和容器尺寸全相同时复用投影。
export function farmCellView(renderer,frame){
 const v=renderer.view;if(!v)return null;
 const {frame:r,canvas:c}=sceneLayout(renderer,frame);
 return [v.x,v.y,v.w,v.h,v.zoom,r.left,r.top,r.width,r.height,c.left,c.top].join(':');
}

// 静止镜头下不重复读取每块田的样式；移动、切图、增删地块后仍用统一热点投影。
export function placeFarmCell(node,plot,renderer,frame,view){
 const key=[view,plot.x,plot.y,plot.mapId,plot.id].join(':'),old=projections.get(node);
 if(view!==null&&old?.key===key&&old.hidden===node.hidden)return;
 placeSceneHit(node,farmPosition(plot),renderer,frame,{...FARM_PLOT_SHAPE,centered:true});
 if(renderer.view&&!node.hidden)for(const [name,value] of Object.entries(FARM_PLOT_SHAPE)){
  const property='--farm-plot-'+name,size=value*renderer.view.zoom+'px';
  if(node.style.getPropertyValue(property)!==size)node.style.setProperty(property,size);
 }
 projections.set(node,{key,hidden:node.hidden});
}

// 成熟边界逐帧读取真实时间；缓存仅保存展示状态，不缓存种植、收益或任务结算。
export function updateFarmCellState(node,plot,{tool,step,selected,now=Date.now()}){
 const mature=plot.crop!==null&&farmGrowth(plot,now)>=1;
 const key=[plot.id,plot.crop,plot.watered,mature,tool,step,selected].join(':');
 if(states.get(node)===key)return false;
 states.set(node,key);
 let label=`第${plot.id+1}块${tool==='remove'?'田：点击确认移除':plot.crop===null?(plot.watered?'湿润空田：选择种子':'空田：选择种子'):FARM_CROPS[plot.crop].name+(mature?'：成熟，点击收割':'：成长中'+(plot.watered?'，湿润':'')+(tool==='water'?'，点击浇水':'，点击查看成熟时间'))}`;
 if(step)label+='，农活第'+step+'步';
 node.setAttribute('aria-label',label);node.dataset.queued=String(!!step);node.dataset.farmStep=step?String(step):'';
 node.dataset.selected=String(selected);node.setAttribute('aria-pressed',String(selected||!!step));return true;
}
