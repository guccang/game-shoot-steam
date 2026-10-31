// 猫窝获取使用候选存档事务，失败时保留钱包、已有猫和当前出战角色。
import {transactProgress} from '../progression/transactions.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';
// 仅屋内可获取，价格沿用角色目录及营地折扣，获取后可自行选择出战。
export function adoptCat(game,index){
 if(game.cottage?.kind!=='cat-home'||!['playing','paused'].includes(game.state))return {ok:false,message:'请进入猫窝，与管理员交谈。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),hero=next.hero;
 if(!transactProgress(next,'heroes',index,'buy',{catHome:true}))return {ok:false,message:'暂时无法获取：请检查资源或角色是否已拥有。'};
 next.hero=hero;next.heroXp??=next.heroes.map(()=>0);next.heroXp[index]=0;const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=(game.livingPersist?.(next)??false)===true;}catch{}
 if(!saved)return {ok:false,message:'没有保存成功，资源未扣除，请重试。'};
 game.progress=next;return {ok:true,message:'新伙伴已来到猫窝，可以选择出战。'};
}
