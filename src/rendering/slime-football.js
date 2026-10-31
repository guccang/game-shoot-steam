// 正式比赛草坪与卡片共用球场绘制，尺寸读取规则配置。
import { FOOTBALL } from '../config/slime-football.js';
import { box, oval, outline } from './primitives.js';
import { drawSlime } from './enemies.js';
import { drawWeapon } from './characters.js';
// 木围边与草场是可走平台，计分矩形白线与碰撞判定共用锚点。
export function drawFootballGround(c,realm,time=0,reduced=false){const a=realm.arena,f=FOOTBALL.field;c.save();c.translate(a.x,a.y);
 oval(c,4,8,a.radius+7,a.radius+7,'#53684c55');oval(c,0,0,a.radius,a.radius,'#a99568',outline,3);oval(c,0,0,a.radius-9,a.radius-9,'#b8c795');
 // 内圈限球，外圈绕后道以土色和虚线明确表达，不增加实体围栏。
 c.strokeStyle='#d9cfaa';c.lineWidth=30;c.beginPath();c.arc(0,0,275,0,Math.PI*2);c.stroke();c.strokeStyle='#71867288';c.lineWidth=2;c.setLineDash([8,10]);c.beginPath();c.arc(0,0,FOOTBALL.ballRadius,0,Math.PI*2);c.stroke();c.setLineDash([]);
 box(c,f.x-8,f.y-8,f.width+16,f.height+16,8,'#638b59',outline,2);
 for(let i=0;i<8;i++)box(c,f.x+i*f.width/8,f.y,f.width/8,f.height,0,i%2?'#83aa68':'#91b575',null);
 c.strokeStyle=realm.goalFlash>0?'#fff6c9':'#f4efd2';c.lineWidth=3;c.strokeRect(f.x,f.y,f.width,f.height);c.beginPath();c.moveTo(0,f.y);c.lineTo(0,f.y+f.height);c.stroke();oval(c,0,f.y+f.height/2,30,30,null,c.strokeStyle,2);
 for(const side of [-1,1]){const x=side<0?f.x:f.x+f.width-34;c.strokeRect(x,f.y+45,34,70);}
 // 后侧球门网不盖住比赛单位，中央入口保持开放。
 box(c,-42,f.y-25,84,25,3,'#d9dfbd77','#f4efd2',3);c.strokeStyle='#71867288';c.lineWidth=1;for(let x=-30;x<=30;x+=12){c.beginPath();c.moveTo(x,f.y-24);c.lineTo(x,f.y);c.stroke();}
 for(const x of [f.x-12,f.x+f.width+12]){c.strokeStyle=outline;c.lineWidth=3;c.beginPath();c.moveTo(x,f.y+f.height);c.lineTo(x,f.y+f.height-28);c.stroke();c.fillStyle='#f4dca0';c.beginPath();c.moveTo(x,f.y+f.height-28);c.lineTo(x+16,f.y+f.height-21);c.lineTo(x,f.y+f.height-15);c.fill();}
 c.strokeStyle='#65835d77';c.lineWidth=4;for(const x of [-80,0,80]){c.beginPath();c.moveTo(x-9,-23);c.lineTo(x,-34);c.lineTo(x+9,-23);c.stroke();}
 c.setLineDash([8,9]);c.lineWidth=2;c.beginPath();c.ellipse(0,60,125,62,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
 c.restore();if(!reduced)for(const s of realm.rings||[])oval(c,s.x,s.y,18+(1-s.life/.7)*22,9+(1-s.life/.7)*11,null,`rgba(244,220,160,${s.life/.7})`,3);
}
// 卡片展示真实草场、翻滚史莱姆与独立武器，不加载缺失的替代插画。
export function drawFootballCard(c,time=0){c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.scale(c.canvas.width/480,c.canvas.height/320);c.fillStyle='#e9e5c5';c.fillRect(0,0,480,320);c.translate(240,200);c.scale(.7,.7);drawFootballGround(c,{arena:{x:0,y:0,radius:300},goalFlash:0},time,true);drawSlime(c,{x:-45,y:15,hp:1,maxHp:1,rank:0,biome:'meadow',phase:0,knockTime:.4,reactionTime:time,rollAngle:time*3},time);drawSlime(c,{x:63,y:-80,hp:1,maxHp:1,rank:0,biome:'meadow',phase:1},time);c.save();c.translate(-100,115);c.rotate(-1);drawWeapon(c,3,0,0,1.5,0,0,0,0);c.restore();c.restore();}
