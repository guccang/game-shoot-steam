// 水袋在正式地表水界旁补水，所有进度跟随游戏时钟，不使用独立定时器。
import {WATER_BAG,isWaterBag} from '../../config/water-bag.js';
import {finiteSupply} from '../../combat/supply-ammo.js';
import {isWaterBlocked} from '../../world/river-geometry.js';
import {isLakeWater} from '../../world/natural-terrain.js';
import {valleyBlocked} from '../../world/jiuzhaigou.js';

// 查询真实水界，室内与活动场景不能借用同坐标的地表水源。
export function nearWaterBagSource(game){
 if(game.cottage||!finiteSupply(game))return false;
 const {x,y}=game.player,r=WATER_BAG.shoreRadius;
 return game.mapId==='forest'?(isWaterBlocked(x,y,r)||isLakeWater(x,y,r)):game.mapId==='jiuzhaigou'?valleyBlocked(x,y,r):false;
}
// 战斗与受击不会中断取水；离岸和换枪保留整数水量，小数积累仅用于连续补水。
export function updateWaterBag(game,dt){
 if(game.state!=='playing'||dt<=0)return;
 const weapon=game.weapon(),mag=game.magazines[game.loadout.weapon];
 for(const m of game.magazines){m.waterFilling=false;m.waterComplete=Math.max(0,(m.waterComplete||0)-dt);if(m!==mag){m.waterFraction=0;m.waterComplete=0;}}
 if(!isWaterBag(weapon)||!finiteSupply(game))return;
 mag.ammo=Math.min(mag.ammo,weapon.magazineSize);
 if(game.player.hp<=0||!nearWaterBagSource(game)){mag.waterFraction=0;mag.waterComplete=0;return;}
 mag.remaining=0;
 if(mag.ammo>=weapon.magazineSize){mag.waterFraction=0;return;}
 const amount=(mag.waterFraction||0)+weapon.magazineSize/weapon.reloadTime*dt,whole=Math.floor(amount+1e-8);
 mag.ammo=Math.min(weapon.magazineSize,mag.ammo+whole);mag.waterFraction=Math.max(0,amount-whole);
 mag.waterFilling=mag.ammo<weapon.magazineSize;
 if(!mag.waterFilling){mag.waterFraction=0;mag.waterComplete=WATER_BAG.completeSeconds;}
}
