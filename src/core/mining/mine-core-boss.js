// 首领唤醒只使用真实干燥洞厅；唯一身份归属各层，晶核库存统一保存在矿区根进度。
import {mineCell,mineKey,minePoint} from '../../config/mining.js';
import {mineCoreName} from '../../config/mine-specials.js';
import {mineAnimalStats} from '../../config/mine-ecology.js';
import {currentMineLayer} from './mine-layers.js';
import {mineOccupancy,mineLineClear} from '../../physics/mine-motion.js';
import {miningCommit,mineNotice} from './mine-transactions.js';

// 玩家自行开出或找到洞厅后唤醒；失败不挖地、不扣物品、不生成半只首领。
export function awakenMineCoreBoss(game){
 const room=game.cottage;
 if(room?.kind!=='mine'||game.state!=='playing'||room.ride||game.player.hp<=0)return mineNotice(game,'请在当前矿层停稳、下矿车后唤醒团王。');
 const depth=room.depth||1;
 if(game.progress.mining.coreClears?.[depth])return mineNotice(game,`本层团王已击败；${game.progress.mining.coreCrystals?.[depth]?'晶核已收纳，备齐施工资源即可开通下一层。':'晶核已用于开层，可从原坡道往返。'}`);
 const l=currentMineLayer(game),old=Object.values(l.animals).find(a=>a.kind==='coreking'&&a.hp>0);
 if(old){const cell=mineCell(old);return mineNotice(game,`矿心团王已在矿格 ${cell.x},${cell.y} 苏醒，请返回挑战。`);}
 const center=mineCell(game.player),[ex,ey]=l.entry.split(',').map(Number),entry=minePoint({x:ex,y:ey});let site=null;
 for(let y=-3;y<=3&&!site;y++)for(let x=-3;x<=3&&!site;x++){
  const cell={x:center.x+x,y:center.y+y},p=minePoint(cell),d=Math.hypot(p.x-game.player.x,p.y-game.player.y);
  if(d<110||d>210||Math.hypot(p.x-entry.x,p.y-entry.y)<320||l.animals[mineKey(cell)]?.hp>0||!mineLineClear(game,game.player,p))continue;
  let clear=true;for(let dy=-96;dy<=96;dy+=32)for(let dx=-96;dx<=96;dx+=32)if(!mineOccupancy(game,p.x+dx,p.y+dy,32,false))clear=false;
  if(clear)site={cell,p};
 }
 if(!site)return mineNotice(game,'请远离入口，在宽敞干燥洞厅唤醒团王；周围需留出约四格的战斗空间。');
 const key=mineKey(site.cell),spec=mineAnimalStats('coreking',depth);
 const result=miningCommit(game,(m,p,layer)=>{layer.animals[key]={key,kind:'coreking',depth,...site.p,hp:spec.hp,maxHp:spec.hp,clock:0,walk:0,phase:'recover',timer:2,respawn:0,death:0,cycle:0};},`第${depth}层矿心团王苏醒！击败可获得${mineCoreName(depth)}。`);
 if(result.ok){room.tool=null;room.autoDig=false;room.dig=null;room.shaftWork=0;room.combatWork=null;room.ecologyActors=Object.values(currentMineLayer(game).animals);}
 return result;
}
