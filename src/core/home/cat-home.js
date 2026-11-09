// 猫窝获取使用候选存档事务，失败时保留钱包、已有猫和当前出战角色。
import {HEROES} from '../../config/heroes.js';
import {roomResident,RESIDENT_VISITOR} from '../../config/cottage-residents.js';
import {cottageFloor} from '../../config/cottage.js';
import {transactProgress} from '../../progression/economy/transactions.js';
import {bindEconomy,economyFor} from '../../config/economy.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 仅屋内可获取，价格沿用角色目录及营地折扣，获取后可自行选择出战。
export function adoptCat(game,index){
 if(game.cottage?.kind!=='cat-home'||!['playing','paused'].includes(game.state))return {ok:false,message:'请进入猫窝，与管理员交谈。'};
 const needed=game.progress.residentCats.length+2;
 if(!game.progress.heroes[index]&&game.progress.homeDecor.floors<needed)return {ok:false,message:`请先到建筑公司加盖第 ${needed} 楼，再来接新伙伴。`};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 if(!transactProgress(next,'heroes',index,'buy',{catHome:true}))return {ok:false,message:'暂时无法获取：请检查资源或角色是否已拥有。'};
 next.heroXp??=next.heroes.map(()=>0);next.heroXp[index]=0;const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=(game.livingPersist?.(next)??false)===true;}catch{}
 if(!saved)return {ok:false,message:'没有保存成功，资源未扣除，请重试。'};
 game.progress=next;return {ok:true,message:`${HEROES[index].name}已入住巡林小屋第 ${needed} 楼，去房间找它聊天吧。`};
}

// 房间、住户、聊天对象和玩家位置一起校验，切楼或离开后旧对话立即失效。
export function canRelieveResident(game,index){
 const room=game.cottage;
 return ['paused','playing'].includes(game.state)&&room?.kind==='cottage'&&!room.balcony&&!room.sleep&&!room.arcade&&
  room.residentTalk===index&&roomResident(game.progress,cottageFloor(room))===index&&game.progress.hero!==index&&
  game.progress.heroes[index]>0&&game.player.hp>0&&Math.hypot(game.player.x-RESIDENT_VISITOR.x,game.player.y-RESIDENT_VISITOR.y)<=14;
}

// 先持久化换班后的角色与巡游血量，失败时当前角色和室内位置均保持原样。
export function commitResidentRelief(game,index){
 if(!canRelieveResident(game,index))return false;
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));
 if(!transactProgress(next,'heroes',index,'equip'))return false;
 const snapshot=Object.create(game);snapshot.progress=next;snapshot.player={...game.player,hp:Math.min(game.player.hp,snapshot.maxHp())};
 next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist?.(next)!==true)return false;}catch{return false;}
 game.progress=next;return true;
}
