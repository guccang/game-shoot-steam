// 驿站以小路牌和踏石标记落脚点，正式实体排序保持猫猫前后遮挡。
import {box,oval,poly} from './primitives.js';
import {canvasFont} from './text-style.js';
import {WAYSTATION_SIGN as SIGN,waystationPurpose} from '../config/waystations.js';
// 场景只保留能读清的短名，手机列表仍展示存档全名，避免文字溢出木牌。
function signName(c,name,width){
 const letters=Array.from(name||'林间驿站');let text=letters.join('');
 while(letters.length&&c.measureText(text).width>width){letters.pop();text=letters.join('')+'…';}
 return text;
}
// 所有标牌仍以真实落脚点进入原有实体排序，不新增碰撞。
export function waystationObjects(g){return g.mapId==='forest'&&!g.cottage&&!g.realm&&!g.story?(g.progress.waystations?.sites||[]).map(s=>({...s,type:'waystation'})):[];}
// 静态图形不创建图集；昼夜共用锚点和轮廓，文字与编号始终由存档实时绘制。
export function drawWaystation(c,s,night=0){
 c.save();c.translate(s.x,s.y);const edge='#365b46',wood=night>.5?'#93886a':'#c6a370',paper=night>.5?'#c8c7a5':'#fff0c5';
 oval(c,8,3,42,13,'rgba(45,69,45,.16)');oval(c,0,0,22,9,night>.5?'#929d8a':'#c3c8a8',edge,1.5);
 box(c,-4,-70,8,64,2,wood,edge);box(c,-SIGN.width/2,SIGN.top,SIGN.width,SIGN.height,5,paper,edge,2);
 poly(c,[[-SIGN.roofWidth/2,SIGN.top+1],[-39,SIGN.roofTop],[38,SIGN.roofTop],[SIGN.roofWidth/2,SIGN.top+1]],night>.5?'#647b63':'#88a477',edge,2);
 const width=SIGN.width-12,purpose=waystationPurpose(s.purpose),detail=`${s.id}号 · ${purpose.name}`;
 c.fillStyle=edge;c.font=canvasFont(12);c.textAlign='center';const name=signName(c,s.name,width);c.fillText(name,0,-56);
 c.font=canvasFont(10);if(c.measureText(detail).width>width)c.font=canvasFont(9);c.fillText(detail,0,-39);
 poly(c,[[-11,-23],[7,-23],[7,-28],[18,-20],[7,-12],[7,-17],[-11,-17]],paper,edge,1.5);
 c.restore();return {id:s.id,name:s.name,purpose:purpose.id,labels:[name,detail],width:SIGN.roofWidth,top:SIGN.roofTop};
}
