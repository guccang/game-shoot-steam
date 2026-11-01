// 载具HUD复用正式车型轮廓，载荷只改变填充高度，不改写车辆与弹药状态。
import {vehicleLoad} from '../progression/load-weight.js';
import {personalFleet} from '../core/vehicle-repair.js';
import {drawVehicleIcon} from '../rendering/vehicle.js';
import {canvasRecoveryRevision} from '../rendering/canvas-recovery.js';
// 驾驶时包含猫猫和背包，停驻时读取真实货舱；借用玩法不冒用永久车队负重。
export function vehicleLoadHudState(game){
 if(!personalFleet(game))return {available:false,fill:0,percent:0,tone:'borrowed'};
 const load=vehicleLoad(game),ratio=load.capacity>0?load.payload/load.capacity:0;
 return {available:true,fill:Math.max(0,Math.min(1,ratio)),percent:Math.floor(ratio*100+1e-7),tone:ratio>=1?'full':ratio>=.85?'heavy':'normal',weight:load.payload,capacity:load.capacity};
}
// 车型或告警状态变化才重画，透明边界裁切让25%填充对应车体高度的四分之一。
function paintVehicle(node,index,tone){
 const key=index+':'+tone+':'+canvasRecoveryRevision();if(node.dataset.vehicleArt===key)return;
 const source=node.ownerDocument.createElement('canvas');source.width=source.height=96;const c=source.getContext('2d');drawVehicleIcon(c,index);
 const pixels=c.getImageData(0,0,96,96).data;let left=96,top=96,right=0,bottom=0;
 for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(pixels[(y*96+x)*4+3]>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 const width=Math.max(1,right-left+1),height=Math.max(1,bottom-top+1),scale=30/Math.max(width,height),picture=node.querySelector('.vehicle-load-picture');Object.assign(picture.style,{width:width*scale+'px',height:height*scale+'px',left:(44-width*scale)/2+'px',top:(30-height*scale)/2+'px'});
 for(const canvas of node.querySelectorAll('.vehicle-load-art')){canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(source,left,top,width,height,0,0,width,height);if(canvas.classList.contains('vehicle-load-filled')){ctx.globalCompositeOperation='source-atop';ctx.fillStyle=tone==='full'?'#b95745a8':tone==='heavy'?'#c39b4788':'#6c965b66';ctx.fillRect(0,0,96,96);ctx.globalCompositeOperation='source-over';}}
 node.dataset.vehicleArt=key;
}
// 固定按钮节点与数字层，不用HP或装填进度代替载荷，也不重建焦点。
export function updateVehicleLoadHud(node,game,{ammo,label,mark=''}){
 if(!node.querySelector('.vehicle-load-filled'))node.innerHTML='<span class="vehicle-load-picture" aria-hidden="true"><canvas class="vehicle-load-art vehicle-load-empty" width="96" height="96"></canvas><canvas class="vehicle-load-art vehicle-load-filled" width="96" height="96"></canvas></span><span class="vehicle-ammo-count" aria-hidden="true"></span><span class="vehicle-hud-state" aria-hidden="true"></span>';
 const state=vehicleLoadHudState(game),loadText=state.available?`载荷 ${state.percent}%${state.tone==='full'?'，载荷已满':''}`:'活动借用载具';
 node.dataset.load=String(state.percent);node.dataset.loadFill=state.fill.toFixed(4);node.dataset.loadTone=state.tone;node.title=label+' · '+loadText;node.setAttribute('aria-label',node.title);
 node.querySelector('.vehicle-load-filled').style.clipPath=`inset(${(1-state.fill)*100}% 0 0 0)`;node.querySelector('.vehicle-ammo-count').textContent=ammo;
 node.querySelector('.vehicle-hud-state').textContent=state.tone==='full'?'!':mark;paintVehicle(node,game.vehicle.index,state.tone);
}
