// HP区域外圈表示换弹，圆内蓝色表示仓库负荷，中心复用原简洁载具图标。
import {vehicleLoad} from '../progression/load-weight.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {vehicleModel} from '../config/vehicles.js';
import {statusIcon} from './status-rings.js';
import {isSummonEnergy} from '../config/summon-energy.js';
// 驾驶与停驻共用车辆载荷；借用玩法不冒用永久车队负重。
export function vehicleLoadHudState(game){
 if(!personalFleet(game))return {available:false,fill:0,percent:0,tone:'borrowed'};
 const load=vehicleLoad(game),ratio=load.capacity>0?load.payload/load.capacity:0;
 return {available:true,fill:Math.max(0,Math.min(1,ratio)),percent:Math.floor(ratio*100+1e-7),tone:ratio>=1?'full':ratio>=.85?'heavy':'normal',weight:load.payload,capacity:load.capacity};
}
// 外圈只读取真实换弹计时；无武器与独立补给不虚构共享弹匣进度。
export function vehicleReloadHudState(magazine,weapon){
 if(!magazine||!weapon||weapon.independentSupply||isSummonEnergy(weapon))return {fill:0,state:'unavailable',remaining:0};
 const remaining=Math.max(0,magazine.remaining||0),reloading=remaining>0;
 return {fill:reloading?Math.max(0,Math.min(1,1-remaining/Math.max(.001,weapon.reloadTime))):1,state:reloading?'reloading':'ready',remaining};
}
// 与旧HUD使用同一图标分类和SVG路径，切换分类才替换图形节点。
function paintVehicle(node,index){
 const model=vehicleModel(index),kind=model.flying?'helicopter':model.amphibious?'hovercraft':'vehicle';
 if(node.dataset.vehicleArt===kind)return;
 for(const layer of node.querySelectorAll('.vehicle-load-art'))layer.innerHTML=statusIcon(kind);
 node.dataset.vehicleArt=kind;
}
// 固定按钮节点与数字层，不用HP或装填进度代替载荷，也不重建焦点。
export function updateVehicleLoadHud(node,game,{ammo,label,mark='',reload}){
 if(!node.querySelector('.vehicle-load-filled'))node.innerHTML='<span class="vehicle-load-picture" aria-hidden="true"><span class="vehicle-load-water"><span class="vehicle-load-filled"></span></span><span class="vehicle-load-art"></span><svg class="vehicle-reload-meter" viewBox="0 0 36 36"><circle class="vehicle-reload-track" cx="18" cy="18" r="16"/><circle class="vehicle-reload-value" cx="18" cy="18" r="16" pathLength="100"/></svg></span><span class="vehicle-ammo-count" aria-hidden="true"></span><span class="vehicle-hud-state" aria-hidden="true"></span>';
 const state=vehicleLoadHudState(game),loadText=state.available?`仓库负荷 ${state.percent}%${state.tone==='full'?'，载荷已满':''}`:'活动借用载具';
 node.dataset.load=String(state.percent);node.dataset.loadFill=state.fill.toFixed(4);node.dataset.loadTone=state.tone;node.title=label+' · '+loadText;node.setAttribute('aria-label',node.title);
 node.querySelector('.vehicle-load-filled').style.clipPath=`inset(${(1-state.fill)*100}% 0 0 0)`;node.querySelector('.vehicle-ammo-count').textContent=ammo;
 node.dataset.reloadState=reload.state;node.dataset.reloadFill=reload.fill.toFixed(4);
 node.querySelector('.vehicle-reload-value').style.strokeDasharray=`${reload.fill*100} 100`;
 node.querySelector('.vehicle-hud-state').textContent=state.tone==='full'?'!':mark;paintVehicle(node,game.vehicle.index);
}
