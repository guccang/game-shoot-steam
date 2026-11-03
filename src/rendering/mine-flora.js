// 地下九景的实体层：原位根部、独立茎叶、菌伞暗面与矿物岩床，按实际脚底排序。
import {mineTerrain,MINE_ROCK} from '../config/mine-ecology.js';
import {mineEntrancePlatform} from '../world/mine-entrances.js';
import {mineLandscapeAnchor} from '../world/mine-surface.js';
import {drawNaturalFarmCrop} from './farm.js';
import {FARM_CROPS} from '../config/farm.js';
import {oval,poly} from './primitives.js';
const ink='#42634e',herbs=['lavender','spinach','daisy'].map(id=>FARM_CROPS.findIndex(c=>c.id===id));
// 根部不动，每条叶轴独立弯曲；叶片跟随轴线，避免整株图片摇晃。
function fern(c,x,y,size,time,seed,night){
 for(let i=0;i<5;i++){const side=i<2?-1:1,dx=(i-2)*size*.34,sway=Math.sin(time*1.3+seed+i)*1.9,top=y-size*(.65+(i%3)*.13);c.strokeStyle=night?'#a1b890':'#648b53';c.lineWidth=1.6;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.45,y-size*.43,x+dx+sway,top);c.stroke();
  for(let j=1;j<5;j++){const t=j/5,px=x+dx*t+sway*t*t,py=y+(top-y)*t,leaf=size*.16*(1-t*.45);for(const s of [-1,1]){c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+s*leaf,py-leaf*.75,px+s*leaf*.8,py-leaf*1.05);c.quadraticCurveTo(px+s*leaf*.12,py-leaf*.8,px,py);c.fillStyle=night?'#789770':side>0?'#91b372':'#6e9b5f';c.fill();}}
 }
}
// 菌柄固定根部，菌帽只随顶部小幅偏移；帽顶、褶片与高光分别成形。
function mushroom(c,x,y,size,time,seed,night){
 const bend=Math.sin(time*.85+seed)*1.6,top=y-size*.86,capX=x+bend,rx=size*.46,ry=size*.19;
 oval(c,x+5,y+3,size*.3,size*.1,'#294c3b2b');c.beginPath();c.moveTo(x-5,y);c.bezierCurveTo(x-7,y-size*.35,capX-3,top+6,capX-6,top);c.lineTo(capX+5,top);c.bezierCurveTo(capX+2,top+18,x+6,y-size*.2,x+7,y);c.closePath();c.fillStyle=night?'#b5b694':'#e2d4a6';c.fill();c.strokeStyle=ink;c.lineWidth=1.8;c.stroke();
 c.beginPath();c.moveTo(capX-1,top+8);c.quadraticCurveTo(x-1,y-size*.25,x+1,y-4);c.strokeStyle=night?'#d5d6ae':'#f6ebc2';c.lineWidth=2;c.stroke();
 oval(c,capX,top+4,rx,ry,night?'#8d9c79':'#c2b78a',ink,1.8);
 c.save();c.beginPath();c.ellipse(capX,top+4,rx-1,ry-1,0,0,Math.PI*2);c.clip();c.strokeStyle='#7e8a65';c.lineWidth=1;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(capX,top+3);c.lineTo(capX+i*rx/4,top+ry+6);c.stroke();}c.restore();
 c.beginPath();c.moveTo(capX-rx,top+2);c.bezierCurveTo(capX-rx*.82,top-ry*1.8,capX+rx*.45,top-ry*2.1,capX+rx,top+2);c.quadraticCurveTo(capX+rx*.1,top+ry*.5,capX-rx,top+2);c.fillStyle=night?'#819d82':'#a9bd8a';c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();
 c.beginPath();c.moveTo(capX-rx*.66,top-ry*.4);c.quadraticCurveTo(capX-rx*.1,top-ry*1.5,capX+rx*.45,top-ry*.6);c.strokeStyle=night?'#c8d5a6':'#dfdfaa';c.lineWidth=3;c.stroke();
 for(const [dx,dy,r] of [[-.3,-.46,3.5],[.15,-.7,2.7],[.54,-.16,2]])oval(c,capX+dx*rx,top+dy*ry,r,r*.58,night?'#d6dfb6':'#f1e6b8');
}
// 不规则叶缘组成相连的冠层，叶片高光跟随小枝摆动，避免规则椭圆叠盘。
function leafCrown(c,x,y,size,time,seed,night){
 const sway=Math.sin(time*.8+seed)*1.1;c.save();c.translate(x+sway,y);
 c.beginPath();c.moveTo(-size,.1*size);c.bezierCurveTo(-size*1.2,-size*.22,-size*.83,-size*.45,-size*.57,-size*.42);c.bezierCurveTo(-size*.6,-size*.77,-size*.13,-size*.83,size*.08,-size*.58);c.bezierCurveTo(size*.37,-size*.81,size*.75,-size*.5,size*.73,-size*.27);c.bezierCurveTo(size*1.11,-size*.25,size*1.15,size*.15,size*.81,size*.26);c.bezierCurveTo(size*.65,size*.55,size*.18,size*.49,0,size*.33);c.bezierCurveTo(-size*.37,size*.58,-size*.85,size*.41,-size,.1*size);c.closePath();c.fillStyle=night?'#597b63':'#6e9564';c.fill();c.strokeStyle=ink;c.lineWidth=1.8;c.stroke();
 for(let i=0;i<7;i++){const dx=Math.sin(seed+i*2.4)*size*.63,dy=-size*.22+Math.cos(seed+i*1.6)*size*.23,r=size*(.16+(i%3)*.035);c.beginPath();c.moveTo(dx-r,dy+2);c.quadraticCurveTo(dx-r*.3,dy-r*.8,dx+r,dy-r*.18);c.quadraticCurveTo(dx+r*.5,dy+r*.5,dx-r,dy+2);c.fillStyle=i%3===0?(night?'#a0b58b':'#c1cf95'):(night?'#7e9c79':'#9cba7e');c.fill();}
 c.restore();
}
// 根木有分叉枝、层叠叶团和压地根须，叶端局部运动而树干不整体旋转。
function rootTree(c,x,y,time,seed,night){
 oval(c,x+7,y+5,31,9,'#294d3b2b');poly(c,[[x-25,y+3],[x-9,y-5],[x-7,y-38],[x-15,y-60],[x-11,y-65],[x+1,y-47],[x+8,y-71],[x+14,y-70],[x+10,y-35],[x+18,y-45],[x+24,y-44],[x+12,y-24],[x+13,y-6],[x+31,y+4],[x+8,y],[x+3,y-8],[x-5,y+4]],night?'#8e8564':'#b09a70',ink,2);
 c.strokeStyle=night?'#b4ab7d':'#d4bc88';c.lineWidth=2;c.beginPath();c.moveTo(x-15,y);c.quadraticCurveTo(x+1,y-10,x-2,y-38);c.moveTo(x+6,y-28);c.lineTo(x+11,y-61);c.stroke();
 for(const [dx,dy,rx] of [[-21,-58,23],[17,-64,27],[1,-81,25],[30,-43,18],[-9,-42,19]])leafCrown(c,x+dx,y+dy,rx,time,seed+dx,night);
 fern(c,x-23,y+2,24,time,seed+3,night);
}
// 晶体嵌入共同岩床，透光面和背光面明确，不再像重复插在格心的小图标。
function crystal(c,x,y,seed,night){
 oval(c,x+4,y+3,30,11,night?'#637f70':'#93ac8e',ink,1.5);for(let i=0;i<5;i++){const xx=x-18+i*9,yy=y+(i%2)*4,h=22+((seed>>>(i*3))%35),w=7+(i%2)*3;poly(c,[[xx-w,yy],[xx-w,yy-h+9],[xx,yy-h],[xx+w,yy-h+8],[xx+w-2,yy+3]],night?'#81b2a9':'#b4d2b3',ink,1.7);poly(c,[[xx,yy-h],[xx+w,yy-h+8],[xx+w-2,yy+3],[xx,yy-4]],night?'#60978f':'#77b6a3',null);c.strokeStyle=night?'#d4e3c3':'#ecf0d2';c.lineWidth=1.6;c.beginPath();c.moveTo(xx-2,yy-h+8);c.lineTo(xx-w+2,yy-h+13);c.lineTo(xx-w+2,yy-6);c.stroke();}
}
// 钟乳石以层叠基座和不等高石柱组成，偏光面与细裂纹保持岩石体积。
function stalagmite(c,x,y,seed,night){
 oval(c,x+5,y+3,34,12,'#35534033');for(const [dx,dy,w,h] of [[-22,-4,14,36],[5,0,19,71],[28,6,14,43]]){const xx=x+dx,yy=y+dy;c.beginPath();c.moveTo(xx-w,yy);c.bezierCurveTo(xx-w*.7,yy-h*.22,xx-w*.25,yy-h*.94,xx+1,yy-h);c.bezierCurveTo(xx+w*.45,yy-h*.75,xx+w*.45,yy-h*.2,xx+w,yy);c.quadraticCurveTo(xx,yy+8,xx-w,yy);c.fillStyle=night?'#a1aa92':'#c5c4a8';c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();poly(c,[[xx+1,yy-h+5],[xx+w*.45,yy-h*.27],[xx+w-2,yy],[xx+2,yy+3]],night?'#7c927f':'#9eae92',null);c.strokeStyle=night?'#c2c7a4':'#e3dec0';c.lineWidth=1.7;c.beginPath();c.moveTo(xx-w*.4,yy-h*.3);c.quadraticCurveTo(xx-2,yy-h*.25,xx+w*.5,yy-h*.32);c.stroke();}
}
// 芦苇每根使用独立曲线和摆幅，岸边叶片分层，不把整簇当一张图片旋转。
function reeds(c,x,y,time,seed,night){
 oval(c,x+4,y+3,24,7,'#46674125');for(let i=0;i<6;i++){const xx=x-16+i*7,h=25+(seed>>>(i*2))%25,bend=Math.sin(time*1.25+i+seed)*2.5;c.strokeStyle=night?'#8dab80':'#678b51';c.lineWidth=2;c.beginPath();c.moveTo(xx,y);c.quadraticCurveTo(xx+5,y-h*.4,xx+bend,y-h);c.stroke();c.beginPath();c.moveTo(xx,y-9);c.quadraticCurveTo(xx+14,y-30,xx+12+bend,y-35);c.quadraticCurveTo(xx+3,y-23,xx,y-9);c.fillStyle=night?'#7f9c75':'#94b475';c.fill();oval(c,xx+bend,y-h-3,2.8,7,night?'#b4ad7b':'#d7bc7f',ink,1);}
}
// 温泉矿物叠台与缓升蒸汽使用不同层次，蒸汽消散不改变底座和通行边界。
function spring(c,x,y,time,night){
 for(const [dx,dy,rx,ry] of [[0,1,33,13],[-7,-5,23,10],[3,-13,15,7]]){oval(c,x+dx,y+dy,rx,ry,night?'#a7ad91':'#d0c7a3',ink,1.5);c.strokeStyle=night?'#c9cdb0':'#f1e3b8';c.lineWidth=2;c.beginPath();c.ellipse(x+dx-3,y+dy-2,rx*.7,ry*.65,0,Math.PI,Math.PI*1.9);c.stroke();}
 for(let i=0;i<3;i++){const p=(time*.12+i*.33)%1;c.save();c.globalAlpha=Math.sin(p*Math.PI)*.32;c.strokeStyle='#e4ead2';c.lineWidth=5;c.beginPath();c.moveTo(x-16+i*14,y-10-p*43);c.bezierCurveTo(x-23+i*14,y-19-p*43,x-3+i*14,y-23-p*43,x-10+i*14,y-34-p*43);c.stroke();c.restore();}
}
// 化石埋在破裂岩台中，螺壳、肋骨与碎片提供结构，避免只有一个圆形标记。
function fossil(c,x,y,night){
 poly(c,[[x-36,y-4],[x-28,y-24],[x-4,y-28],[x+29,y-17],[x+37,y+6],[x+19,y+15],[x-18,y+12]],night?'#9b9d80':'#c6b990',ink,2);poly(c,[[x-28,y-24],[x-4,y-28],[x+29,y-17],[x+19,y-11],[x-15,y-16]],night?'#bab796':'#e2cfa3',null);
 c.strokeStyle=night?'#ddd7b0':'#f2e3b8';c.lineWidth=4;c.beginPath();c.arc(x-10,y-6,12,.2,Math.PI*1.9);c.arc(x-10,y-6,6,Math.PI*1.9,.1,true);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(x+7,y+4);c.quadraticCurveTo(x+16,y-2,x+26,y-4);c.stroke();for(let i=0;i<4;i++){c.beginPath();c.moveTo(x+8+i*5,y+3-i*2);c.quadraticCurveTo(x+4+i*5,y-6-i*2,x+9+i*5,y-10-i);c.stroke();}c.strokeStyle='#7e8b6d';c.lineWidth=1.3;c.beginPath();c.moveTo(x+2,y+7);c.lineTo(x-4,y+12);c.lineTo(x-2,y+16);c.stroke();
}
// 九景正式实体入口；采集后留下幼芽或基座，恢复时沿原稳定锚点长回。
export function drawMineFlora(c,cell,layer,night,time,reduced=false,damage=null){
 // 已施工的轨道与路牌位置留白，车轮、分岔标识和玩家路线始终可辨。
 if(mineEntrancePlatform(cell,layer)||layer.rails?.[`${cell.x},${cell.y}`]||layer.decor?.[`${cell.x},${cell.y}`])return;const t=mineTerrain(cell,layer);if(!t.natural||t.safe||t.water)return;const {x,y}=mineLandscapeAnchor(cell,t.hash,layer),h=t.hash,harvested=(layer.harvested?.[`${cell.x},${cell.y}`]||0)>layer.age;
 if(!t.prop){if(t.biome.id==='moss'&&h%7===0)fern(c,x,y,18,time,h,night);return;}
 oval(c,x+3,y+3,26,9,'#355c3f25');
 if(t.biome.id==='moss'){fern(c,x-18,y,24,time,h,night);drawNaturalFarmCrop(c,herbs[h%herbs.length],x+5,y,time,h%7,night,reduced,harvested?0:2);return;}
 if(harvested&&t.biome.id==='stalagmite'){
  // 破坏后仅保留矮碎石，不把石柱替换为植株；原脚底和通道保持不变。
  for(const [dx,dy,w] of [[-18,2,11],[3,4,14],[23,1,8]])poly(c,[[x+dx-w,y+dy],[x+dx-4,y+dy-9],[x+dx+6,y+dy-6],[x+dx+w,y+dy+2]],night?'#829780':'#b2b99a',ink,1.5);
  return;
 }
 if(harvested){oval(c,x,y,13,5,night?'#7a8769':'#a6ad83',ink,1.4);fern(c,x-4,y,12,time,h,night);return;}
 switch(t.biome.id){
  case 'mushroom':mushroom(c,x-16,y-4,39,time,h+1,night);mushroom(c,x+8,y+3,68+(h%14),time,h,night);mushroom(c,x+28,y+8,27,time,h+2,night);break;
  case 'roots':rootTree(c,x,y,time,h,night);break;
  case 'crystal':crystal(c,x,y,h,night);break;
  case 'stalagmite':stalagmite(c,x,y,h,night);if(damage)drawMineRockDamage(c,x,y,damage,layer.age,night);break;
  case 'river':reeds(c,x,y,time,h,night);break;
  case 'lake':reeds(c,x-8,y,time,h,night);for(let i=0;i<3;i++){const px=x+Math.sin(time*.6+i*2+h)*27,py=y-26-i*13+Math.cos(time*.8+i)*3;oval(c,px,py,night?2.1:1.3,1.7,night?'#eee3a5':'#d5d9a2');if(night)oval(c,px,py,5,4,'#ece0a521');}break;
  case 'spring':spring(c,x,y,time,night);break;
  case 'fossil':fossil(c,x,y,night);break;
 }
}

// 受击裂纹按耐久递增，碎屑沿各自短抛物线运动，不旋转或拉伸整座山体。
function drawMineRockDamage(c,x,y,damage,time,night){
 const ratio=1-damage.hp/MINE_ROCK.hp,t=time-damage.hit;c.strokeStyle=night?'#e5d6aa':'#5c7258';c.lineWidth=1.8;
 c.beginPath();c.moveTo(x+5,y-52);c.lineTo(x+1,y-40);c.lineTo(x+9,y-30);c.lineTo(x+2,y-17);if(ratio>.5){c.moveTo(x-21,y-27);c.lineTo(x-16,y-18);c.lineTo(x-24,y-9);c.moveTo(x+9,y-30);c.lineTo(x+17,y-34);}c.stroke();
 if(t>=0&&t<.35){c.save();c.globalAlpha=1-t/.35;for(let i=0;i<5;i++){const dx=(i-2)*(5+t*45),dy=-18-t*85+t*t*240;poly(c,[[x+dx-3,y+dy],[x+dx,y+dy-4],[x+dx+4,y+dy+1]],night?'#d2d3ae':'#e1d5af',ink,1);}c.restore();}
}
