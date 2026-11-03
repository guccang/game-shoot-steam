// 世界图鉴复用正式作物图集、装备及生物绘制器，不生成替代图案。
import {drawCreaturePortrait} from './creature-portraits.js';
import {drawHarvestIcon,farmArtBudget} from './farm.js';
import {drawExpeditionSlot} from './expedition.js';
import {drawVehicleIcon} from './vehicle.js';
import {drawVehicleArmament} from './vehicle-armaments.js';
// 静态资料页使用固定姿态，画布保持原尺寸并独立缩放正式武器视口。
export function drawCodexPortrait(canvas,e){
 if(['fish','monster'].includes(e.category)){drawCreaturePortrait(canvas,e);return;}
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
 if(e.category==='vehicle'){drawVehicleIcon(c,e.index);return;}
 c.save();try{
  if(e.category==='crop'){if(!farmArtBudget().sheets)throw Error('作物图集尚未加载');drawHarvestIcon(c,e.index,canvas.width/2,canvas.height/2,canvas.height*.82);}
  else if(e.portrait==='armament'){c.translate(canvas.width*.35,canvas.height*.52);const scale=Math.min(canvas.width/210,canvas.height/150);c.scale(scale,scale);drawVehicleArmament(c,e,{reduced:true});}
  else {const scale=Math.min(canvas.width/240,canvas.height/150);c.translate((canvas.width-240*scale)/2,(canvas.height-150*scale)/2);c.scale(scale,scale);drawExpeditionSlot(c,'weapon',e.index);}
 }finally{c.restore();}
}
