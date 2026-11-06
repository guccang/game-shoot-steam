// 开放怪物营地正式绘制器：有限平涂、脚底排序与独立火焰，不生成常驻位图缓存。
import {MONSTER_CAMPS,MONSTER_CAMP_RULES,campSignSite} from '../config/monster-camps.js';
import {monsterCampsAvailable,monsterCampObjects,monsterCampLevel} from '../core/monster-camps.js';
import {visibleBodies} from '../world/coordinates.js';
import {box,oval,poly} from './primitives.js';
import {drawSlime} from './enemies.js';
import {canvasFont} from './text-style.js';
import {campResidentHead} from '../config/camp-residents.js';
const EDGE='#365b43';
// 主体和棚各用独立深度锚点，人物绕行不会被整个营地强制盖住。
export function campRenderObjects(game,view){return monsterCampObjects(game,view).flatMap(item=>item.type==='monster-camp-fire'?[item,{...item,type:'monster-camp-shelter',y:item.y-80*MONSTER_CAMP_RULES.scale},{...item,...campSignSite(item),id:item.id,type:'monster-camp-sign'}]:[item]);}
// 地面只保留自然草土铺底，边缘由居民头顶预警表达，不绘制任何警戒圆圈。
export function drawMonsterCampGround(c,game,night,view){
 if(!monsterCampsAvailable(game))return;c.save();
 for(const camp of visibleBodies(MONSTER_CAMPS.filter(c=>c.mapId===game.mapId),view,400)){
  oval(c,camp.x,camp.y+5,115*MONSTER_CAMP_RULES.scale,82*MONSTER_CAMP_RULES.scale,night>.5?'#727b59':'#bfca8e');
 }
 c.restore();
}
// 低棚、锅架与火焰分开绘制；时间冻结时火焰也冻结，减少动态保留稳定火芯。
export function drawMonsterCampObject(c,item,game,night,reduced,deferHealthBar=false){
 if(item.type==='monster-camp-resident'||item.type==='monster-camp-npc'){
  drawSlime(c,item.type==='monster-camp-npc'?{...item,level:0}:item,game.time,reduced,null,deferHealthBar);
  // 驻足预警独立于攻击前摇，暖黄叹号不会触发冲锋或伤害。
  if(item.campState==='alert'){const head=campResidentHead(item);c.save();box(c,item.x-10,item.y-head,20,23,7,'#f4d681',EDGE,1.7);c.font=canvasFont(17);c.textAlign='center';c.fillStyle=EDGE;c.fillText('!',item.x,item.y-head+17);c.restore();}
  if(item.type==='monster-camp-npc'){c.save();c.font=canvasFont(12);c.textAlign='center';box(c,item.x-30,item.y-69,60,19,6,'#fff1c9',EDGE,1.5);c.fillStyle=EDGE;c.fillText(item.name,item.x,item.y-55);c.restore();}return;
 }
 // 场地用世界坐标拉开间距，摆件在各自锚点按原尺寸绘制。
 c.save();c.translate(item.x,item.y);c.lineJoin='round';c.lineCap='round';
 if(item.type==='monster-camp-sign'){
  // 单根歪木桩撑起有缺口的旧木板，低矮小巧；褪色牌面只写名称与等级。
  oval(c,1,3,28,5,'#344e3828');
  poly(c,[[-3,3],[3,3],[7,-40],[1,-40]],'#947c55',EDGE,1.5);
  poly(c,[[-53,-54],[50,-56],[48,-49],[53,-46],[50,-22],[-51,-20],[-48,-29],[-54,-32]],night>.5?'#a89e75':'#bcb084',EDGE,1.5);
  // 短裂纹留在边角，不干扰文字；不加边框、顶沿或装饰底板。
  c.beginPath();c.moveTo(-51,-45);c.lineTo(-39,-44);c.moveTo(50,-30);c.lineTo(37,-29);c.strokeStyle='#847953';c.lineWidth=1;c.stroke();
  c.textAlign='center';c.fillStyle='#455d43';c.font=canvasFont(12);c.fillText(item.name,0,-40);c.font=canvasFont(10);c.fillText(monsterCampLevel(MONSTER_CAMPS.find(camp=>camp.id===item.id))+'级',0,-26);
 }else if(item.type==='monster-camp-shelter'){
  oval(c,8,8,47,14,'#344e3828');box(c,-31,-42,5,45,2,'#b8935e',EDGE,2);box(c,29,-34,5,37,2,'#b8935e',EDGE,2);
  poly(c,[[-42,-47],[22,-54],[43,-23],[-34,-22]],night>.5?'#b5b68b':'#e2d7a3',EDGE,2);
  poly(c,[[-34,-22],[43,-23],[36,-15],[-31,-16]],'#aab47b',EDGE,2);
  box(c,-21,-6,32,13,3,'#b9905b',EDGE,2);box(c,14,-3,18,14,3,'#e0c792',EDGE,2);
 }else if(item.type==='monster-camp-cache'){
  oval(c,0,3,20,10,'#b4b19a',EDGE,2);oval(c,-5,0,10,5,'#7f8b76');box(c,5,-9,9,12,2,'#dac18a',EDGE,1.5);
 }else{
  const waiting=game.progress.monsterCamps.camps[item.id].mask===31,t=reduced?0:game.time;
  if(night>.5&&!waiting)oval(c,0,-4,48,25,'#e8b45d22');
  oval(c,0,2,27,13,'#857f60',EDGE,2);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;oval(c,Math.cos(a)*23,Math.sin(a)*10,6,4,'#b6b69b',EDGE,1.5);}
  poly(c,[[-17,0],[15,-8],[19,-2],[-13,6]],'#9e754c',EDGE,2);
  if(!waiting)for(let i=0;i<3;i++){const x=(i-1)*9,h=19+Math.sin(t*5+i*2)*5;poly(c,[[x-7,-3],[x-5,-13],[x+2,-h-8],[x+6,-12],[x+5,-3]],i===1?'#f3da89':'#d89757',EDGE,1.2);}
  if(item.style==='pot'){
   c.beginPath();c.moveTo(-31,4);c.lineTo(0,-56);c.lineTo(32,4);c.strokeStyle=EDGE;c.lineWidth=3;c.stroke();
   c.beginPath();c.moveTo(0,-54);c.lineTo(0,-32);c.stroke();oval(c,0,-24,16,10,'#718b68',EDGE,2);oval(c,0,-31,16,5,'#dbd0a3',EDGE,2);
  }else{box(c,43,-43,4,47,2,'#bb9562',EDGE,2);box(c,76,-43,4,47,2,'#bb9562',EDGE,2);box(c,39,-45,44,5,2,'#bb9562',EDGE,2);for(const x of [54,68]){c.beginPath();c.moveTo(x,-42);c.lineTo(x,-23);c.strokeStyle=EDGE;c.lineWidth=1.5;c.stroke();poly(c,[[x,-32],[x-6,-19],[x+5,-18]],'#a8bb74',EDGE,1.5);}}
 }
 c.restore();
}
