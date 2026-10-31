import {finiteSupply} from './supply-ammo.js';
import {ammoKind} from '../config/supplies.js';
// 下车只收回超出原容量的余弹，不补弹、不重置装填或召唤伙伴的技能周期。
import {funnelWeapon} from '../config/funnel-loadouts.js';
import {realmWeapon} from '../config/realms.js';
import {scooterCapacity} from '../config/scooter-capacity.js';
// 手持枪与浮游炮各自保留独立供给，收起模块也不能囤积超过步行上限的弹药。
export function clampRiderSupply(game){
 for(const [index,magazine] of (game.magazines||[]).entries()){
  if(magazine.modules)for(const [slot,m] of magazine.modules.entries())m.ammo=Math.min(m.ammo,scooterCapacity(realmWeapon(funnelWeapon(game.loadout,slot),game.realm?.buffs),game).magazineSize);
  else {
   const weapon=game.weapon(index),limit=weapon.magazineSize,key=ammoKind(weapon),extra=Math.max(0,magazine.ammo-limit);
   // 实物子弹回到背包，离开电动车不会把扩大弹夹里的余弹丢掉。
   if(extra&&finiteSupply(game)&&key)game.progress.supplies.hand[key]+=extra;
   magazine.ammo=Math.min(magazine.ammo,limit);
  }
 }
 for(const node of game.funnel?.nodes||[])for(const [index,state] of Object.entries(node.loadouts||{}))state.magazine.ammo=Math.min(state.magazine.ammo,game.weapon(Number(index)).magazineSize);
}
