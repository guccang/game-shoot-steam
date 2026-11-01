// 地面木材使用已有资源图标，先于车体和角色绘制，图形本身不修改库存。
import {drawResourceIcon} from './resource-icons.js';
import {oval} from './primitives.js';
import {visibleBodies} from '../world/coordinates.js';
import {personalFleet} from '../core/vehicle-repair.js';
// 只绘制当前地图和视口内的木捆，剩余数量直接读取正式掉落存档。
export function drawGroundWood(c,game,view,night=0){
 if(!personalFleet(game)||game.cottage)return;
 const piles=(game.progress.woodDrops?.piles||[]).filter(d=>d.mapId===game.mapId&&d.count>0);
 c.save();
 for(const pile of visibleBodies(piles,view,40)){
  oval(c,pile.x,pile.y+5,15,5,'#34492d42');drawResourceIcon(c,'wood',pile.x,pile.y-4,32);
  c.textAlign='center';c.font='bold 12px sans-serif';c.lineWidth=3;c.strokeStyle=night?'#304a3c':'#f3eccd';c.fillStyle=night?'#fff0c9':'#365c44';c.strokeText('×'+pile.count,pile.x,pile.y+22);c.fillText('×'+pile.count,pile.x,pile.y+22);
 }
 c.restore();
}
