// HP区域复用原有简洁SVG图标，载荷只改变填充高度，不改写车辆与弹药状态。
import {vehicleLoad} from '../progression/load-weight.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {vehicleModel} from '../config/vehicles.js';
import {statusIcon} from './status-rings.js';
// 驾驶时包含猫猫和背包，停驻时读取真实货舱；借用玩法不冒用永久车队负重。
export function vehicleLoadHudState(game){
 if(!personalFleet(game))return {available:false,fill:0,percent:0,tone:'borrowed'};
 const load=vehicleLoad(game),ratio=load.capacity>0?load.payload/load.capacity:0;
 return {available:true,fill:Math.max(0,Math.min(1,ratio)),percent:Math.floor(ratio*100+1e-7),tone:ratio>=1?'full':ratio>=.85?'heavy':'normal',weight:load.payload,capacity:load.capacity};
}
// 与旧HUD使用同一图标分类和SVG路径，切换分类才替换图形节点。
function paintVehicle(node,index){
 const model=vehicleModel(index),kind=model.flying?'helicopter':model.amphibious?'hovercraft':'vehicle';
 if(node.dataset.vehicleArt===kind)return;
 for(const layer of node.querySelectorAll('.vehicle-load-art'))layer.innerHTML=statusIcon(kind);
 node.dataset.vehicleArt=kind;
}
// 固定按钮节点与数字层，不用HP或装填进度代替载荷，也不重建焦点。
export function updateVehicleLoadHud(node,game,{ammo,label,mark=''}){
 if(!node.querySelector('.vehicle-load-filled'))node.innerHTML='<span class="vehicle-load-picture" aria-hidden="true"><span class="vehicle-load-art vehicle-load-empty"></span><span class="vehicle-load-art vehicle-load-filled"></span></span><span class="vehicle-ammo-count" aria-hidden="true"></span><span class="vehicle-hud-state" aria-hidden="true"></span>';
 const state=vehicleLoadHudState(game),loadText=state.available?`载荷 ${state.percent}%${state.tone==='full'?'，载荷已满':''}`:'活动借用载具';
 node.dataset.load=String(state.percent);node.dataset.loadFill=state.fill.toFixed(4);node.dataset.loadTone=state.tone;node.title=label+' · '+loadText;node.setAttribute('aria-label',node.title);
 node.querySelector('.vehicle-load-filled').style.clipPath=`inset(${(1-state.fill)*100}% 0 0 0)`;node.querySelector('.vehicle-ammo-count').textContent=ammo;
 node.querySelector('.vehicle-hud-state').textContent=state.tone==='full'?'!':mark;paintVehicle(node,game.vehicle.index);
}
