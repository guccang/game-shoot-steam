// 驿站以小路牌和踏石标记落脚点，正式实体排序保持猫猫前后遮挡。
import {box,oval,poly} from './primitives.js';
import {canvasFont} from './text-style.js';
export function waystationObjects(g){return g.mapId==='forest'&&!g.cottage&&!g.realm&&!g.story?(g.progress.waystations?.sites||[]).map(s=>({...s,type:'waystation'})):[];}
// 静态图形不创建图集；昼夜共用锚点和轮廓，文字与编号始终由存档实时绘制。
export function drawWaystation(c,s,night=0){
 c.save();c.translate(s.x,s.y);const edge='#365b46',wood=night>.5?'#93886a':'#c6a370',paper=night>.5?'#c8c7a5':'#fff0c5';
 oval(c,8,3,42,13,'rgba(45,69,45,.16)');oval(c,0,0,22,9,night>.5?'#929d8a':'#c3c8a8',edge,1.5);
 box(c,-4,-70,8,64,2,wood,edge);box(c,-35,-69,70,34,5,paper,edge,2);
 poly(c,[[-39,-68],[-29,-82],[26,-82],[39,-68]],night>.5?'#647b63':'#88a477',edge,2);
 c.fillStyle=edge;c.font=canvasFont(13);c.textAlign='center';c.fillText('驿站 '+s.id,0,-48);
 poly(c,[[-11,-23],[7,-23],[7,-28],[18,-20],[7,-12],[7,-17],[-11,-17]],paper,edge,1.5);
 c.restore();
}
