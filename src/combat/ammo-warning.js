import {fallbackShell} from './vehicle-special-ammo.js';
// 实物武器只有在交战且无弹可装时才提醒。手持和主炮独立判定，同帧缺弹合并展示。
import {AMMO_TYPES,ammoKind,vehicleFaults} from '../config/supplies.js';
import {vehicleWeapon} from '../config/vehicles.js';
import {catAmmoWarehouse,finiteSupply,supplyAmmoCount} from './supply-ammo.js';

export function updateAmmoWarning(game,dt,engaged){
 let notice=game.ammoWarning;
 if(!finiteSupply(game)||game.livingPreview||game.state!=='playing'||game.player.hp<=0){
  game.ammoWarning=null;return;
 }
 if(!engaged){
  // 怪物短暂走出射程时保留提示记录，避免索敌边界反复弹字。
  if(notice&&(notice.quiet+=dt)>=1)game.ammoWarning=null;
  return;
 }
 if(!notice||notice.player!==game.player||notice.room!==game.cottage||notice.map!==game.mapId){
  notice=game.ammoWarning={player:game.player,room:game.cottage,map:game.mapId,hand:null,vehicle:null,quiet:0};
 }
 notice.quiet=0;
 const messages=[];
 // 弹匣与备用尽数用完才属于缺弹；有车内备用但背包无余量时给出对应处理方法。
 function check(slot,weapon,mag,hull){
  if(weapon?.id==='water'&&mag?.ammo===0&&!mag.waterFilling&&supplyAmmoCount(game,weapon,hull)<=0){if(notice[slot]!==mag){notice[slot]=mag;messages.push('水袋与备用水罐已空，靠近河流或湖泊即可补水（战斗中也可补水）');}return;}
  const key=ammoKind(weapon);
  if(!key||mag?.waterFilling||mag?.ammo!==0||supplyAmmoCount(game,weapon,hull)>0||hull!==null&&fallbackShell(game,weapon,mag)){notice[slot]=null;return;}
  if(notice[slot]===mag)return;
  notice[slot]=mag;
  if(hull===null&&catAmmoWarehouse(game)?.[key]>0)messages.push('手持武器没子弹了，背包腾出空间后可从车内补弹');
  else messages.push((hull===null?'手持武器':'载具主炮')+'的'+AMMO_TYPES[key].name+'用完了');
 }
 if(!game.cottage||!game.vehicle.active)check('hand',game.weapon(),game.magazines[game.loadout.weapon],null);
 else notice.hand=null;
 const v=game.vehicle;
 if(v.active&&v.module?.magazine.ammo===0&&vehicleFaults(game.progress,v.index).gun<100)check('vehicle',vehicleWeapon(game.loadout,v.weaponIndex),v.module.magazine,v.index);
 else notice.vehicle=null;
 if(messages.length)game.onEvent('story-hint',{text:messages.join('；')+'。'});
}
