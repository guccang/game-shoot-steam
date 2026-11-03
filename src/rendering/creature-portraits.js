// 图鉴肖像绑定正式鱼类、怪物、地下生物和领主绘制器，不复制另一套美术。
import {drawOutdoorFish} from './outdoors.js';
import {drawSlime,drawBossIcon} from './enemies.js';
import {drawMineAnimal} from './mine-ecology.js';
// 图鉴是静态资料页，固定休息姿态，避免暂停页面仍播放战斗动作。
export function drawCreaturePortrait(canvas,entry){
 if(entry.portrait==='boss'){drawBossIcon(canvas,entry.id);return;}
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.translate(canvas.width/2,canvas.height*.74);const scale=Math.min(canvas.width/110,canvas.height/100);c.scale(scale,scale);
 if(entry.portrait==='fish')drawOutdoorFish(c,0,-20,-.16,0,entry.color,1.65);
 else if(entry.portrait==='mine')drawMineAnimal(c,{kind:entry.id,x:0,y:0,hp:1,clock:0,walk:0},0);
 else drawSlime(c,{species:entry.id,x:0,y:0,hp:1,maxHp:1,rank:0,phase:0,biome:'meadow',flying:entry.id==='leaf-bat',vx:0,vy:0},0,true);
 c.restore();
}
