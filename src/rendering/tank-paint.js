// 坦克染色只替换指定填色，原有轮廓、动作、反冲、命中闪光和材质明暗保持不变。
import {TANK_PAINTS} from '../config/legendary-workshop.js';
import {style} from '../art-styles/config.js';
const contexts=new WeakMap();
// 将预设底色按原材质亮暗分层，不修改全局美术风格对象。
function shade(color,amount){return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(color.slice(i,i+2),16)+amount)).toString(16).padStart(2,'0')).join('');}
// 每个画布缓存当前配色代理，原生方法绑定真实上下文，避免每帧分配大量包装函数。
export function tankPaintContext(c,progress,index,section){
 const design=progress?.legendaryWorkshop?.unlocked&&progress.legendaryWorkshop.designs[index];
 if(![1,6].includes(index)||!design)return c;
 const palette=new Map(),put=(key,colors)=>{const color=TANK_PAINTS[design[key]]?.color;if(color)colors.forEach(([original,delta])=>palette.set(original,shade(color,delta)));};
 if(section==='rear'){
  put('tracks',[[style.vehicleModels.drawHeavyRearColor,-35],[style.vehicleModels.drawHeavyRearColor2,30],['#60775b',-12],['#3f5149',-35],['#899886',30],['#596b5b',-12]]);
  put('hull',[[style.vehicleModels.drawHeavyRearColor3,-15],['#afbd85',18],['#b3bc8a',8],['#a95045',-12],['#d68266',25],['#cc7860',18],['#bc604f',0],['#e7ad7d',40]]);
 }else if(section==='front')put('hull',[[style.vehicleModels.drawHeavyFrontColor,0],['#cbd2a0',35],['#bb5c4b',0],['#df9271',30],['#954c43',-25]]);
 else put('turret',[[style.vehicleArmaments.drawVehicleArmamentColor,0],[style.vehicleArmaments.drawVehicleArmamentColor2,-20],[style.vehicleArmaments.drawVehicleArmamentColor3,15],['#b45a49',0],['#e0a17c',35],['#984e44',-20],['#bd6a50',10],['#ad5e4b',-8]]);
 if(!palette.size)return c;
 const key=JSON.stringify([...palette]),slot=section+index;let slots=contexts.get(c);if(!slots){slots=new Map();contexts.set(c,slots);}const entry=slots.get(slot);if(entry?.key===key)return entry.proxy;
 const methods=new Map(),proxy=new Proxy(c,{get(target,name){const value=Reflect.get(target,name,target);if(typeof value!=='function')return value;if(!methods.has(name))methods.set(name,value.bind(target));return methods.get(name);},set(target,name,value){Reflect.set(target,name,name==='fillStyle'?(palette.get(value)||value):value,target);return true;}});
 slots.set(slot,{key,proxy});return proxy;
}
// 徽记是独立的前甲贴花，不遮挡驾驶员与真实炮口。
export function drawTankBadge(c,progress,index){
 const badge=progress?.legendaryWorkshop?.unlocked&&progress.legendaryWorkshop.designs[index]?.badge;if(!badge)return;
 c.save();c.translate(0,index===6?22:18);c.fillStyle='#f5dfa2';c.strokeStyle='#315747';c.lineWidth=1.6;c.beginPath();c.arc(0,0,10,0,Math.PI*2);c.fill();c.stroke();
 c.beginPath();if(badge===1){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3:7;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fillStyle='#b45a49';c.fill();}
 else{c.moveTo(0,7);c.lineTo(0,-4);c.moveTo(0,2);c.quadraticCurveTo(-9,-4,-5,-6);c.quadraticCurveTo(0,-6,0,2);c.moveTo(0,-1);c.quadraticCurveTo(1,-9,7,-6);c.quadraticCurveTo(7,0,0,-1);c.stroke();}c.restore();
}
