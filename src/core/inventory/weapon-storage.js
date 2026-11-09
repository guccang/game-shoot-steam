// 小屋武器存取先保存候选数据，成功后再切换装备；原有成长和弹匣原样保留。
import {cottageFloor} from '../../config/cottage.js';
import {WEAPON_RACK_CAPACITY} from '../../config/home-decor.js';
import {WEAPONS} from '../../config/weapons.js';
import {carriedWeapon,storedWeaponRack} from '../../progression/inventory/weapon-storage.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 只能在当前楼层靠近已摆放的武器架操作，睡眠与活动借用装备不参与。
export function accessibleWeaponRack(game,uid){
 if(!game.cottage||game.cottage.balcony||game.cottage.kind!=='cottage'||game.cottage.sleep||!['playing','paused'].includes(game.state))return null;
 const rack=game.progress.homeDecor.items.find(i=>i.uid===uid&&i.type==='weapon-rack'&&i.x!==null&&i.floor===cottageFloor(game.cottage));
 return rack&&Math.hypot(rack.x-game.player.x,rack.y-game.player.y)<=120?rack:null;
}
// 已挂在伴随控制器上的枪需要先卸下，避免收纳后仍从家里提供火力。
export function weaponStorageReason(progress,index){
 if(!carriedWeapon(progress,index))return '这把武器不在背包中。';
 if(index!==12&&progress.funnelLoadout?.includes(index)||progress.mechanicalLoadout===index||progress.spiderLoadout===index)return '请先从伴随装置卸下这把武器。';
 if(index===progress.weapon&&!progress.weapons.some((_,i)=>i!==index&&carriedWeapon(progress,i)))return '请保留一把随身武器，再存放当前主武器。';
 return '';
}
// 存入当前主武器时自动换上另一把随身武器；取出后可立即装备，不凭空生成武器。
export function transferRackWeapon(game,uid,index,direction){
 const rack=accessibleWeaponRack(game,uid),p=game.progress;
 if(!rack)return {ok:false,message:'请到同一层的武器架旁存取。'};
 if(!Number.isInteger(index)||!WEAPONS[index]||!['store','take'].includes(direction))return {ok:false,message:'请选择要存取的武器。'};
 if(direction==='store'){
  const reason=weaponStorageReason(p,index);if(reason)return {ok:false,message:reason};
  if((rack.weapons||[]).length>=WEAPON_RACK_CAPACITY)return {ok:false,message:'武器架已放满，可购买并摆放更多武器架。'};
 }else if(storedWeaponRack(p,index)?.uid!==uid)return {ok:false,message:'这把武器不在当前架上。'};
 const next=bindEconomy(structuredClone(p),economyFor(p)),target=next.homeDecor.items.find(i=>i.uid===uid);target.weapons??=[];
 if(direction==='store'){
  target.weapons.push(index);
  if(next.weapon===index)next.weapon=next.weapons.findIndex((_,i)=>carriedWeapon(next,i));
 }else{target.weapons=target.weapons.filter(i=>i!==index);next.weapon=index;}
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist?.(next)!==true)return {ok:false,message:'保存失败，武器位置没有改变，请重试。'};}catch{return {ok:false,message:'保存失败，武器位置没有改变，请重试。'};}
 const previous=p.weapon,equipped=next.weapon;game.progress=next;
 // 复用正式换枪副作用，清除旧武器的蓄力与伴随队形，不发送购买通知。
 if(previous!==equipped){const notify=game.onEvent;next.weapon=previous;game.onEvent=()=>{};try{game.transact('weapons',equipped,'equip');}finally{game.onEvent=notify;next.weapon=equipped;}}
 return {ok:true,message:direction==='store'?`已存入${WEAPONS[index].name}，随身负重已减少。`:`已取出并装备${WEAPONS[index].name}。`};
}
