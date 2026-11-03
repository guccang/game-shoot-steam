// 地下墙体、水界与层边界共用可行走判定，地表碰撞不作用于地下坐标。
import {MINING,mineCell,mineKey} from '../config/mining.js';
import {mineBounds} from '../config/mine-ecology.js';
import {mineSurfaceAt} from '../world/mine-surface.js';
import {mineLayer} from '../progression/mine-layers.js';
// 车体需要更宽通道；重型战车至少挖宽两格，步行和矿车保持原脚底半径。
export function mineBodyRadius(game){return game.vehicle?.active?game.vehicle.index===1||game.vehicle.index===6?35:26:MINING.radius;}
// 圆周八点检查同时限制层边界、水面和未开掘岩壁，两栖只跨水不穿墙。
export function mineOccupancy(game,x,y,radius=mineBodyRadius(game),swim=!!(game.vehicle?.active&&(game.player.amphibious||game.player.flying))){
 const layer=mineLayer(game.progress.mining,game.cottage?.depth||1);if(!layer)return false;const b=mineBounds(layer);
 if(x-radius<b.left||x+radius>b.right||y-radius<b.top||y+radius>b.bottom)return false;
 for(let i=-1;i<8;i++){const angle=i*Math.PI/4,px=x+(i<0?0:Math.cos(angle)*radius),py=y+(i<0?0:Math.sin(angle)*radius),cell=mineCell({x:px,y:py}),key=mineKey(cell),surface=mineSurfaceAt(layer,px,py);if(!surface.open||!swim&&surface.water&&!layer.bridges?.[key])return false;}
 return true;
}
// 弹道与攻击不越过未开掘岩壁；水面不会阻挡空中投射物。
export function mineLineClear(game,a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12));for(let i=0;i<=n;i++)if(!mineOccupancy(game,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,0,true))return false;return true;}
