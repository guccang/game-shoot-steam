import {cottageFloor} from '../config/cottage.js';
// 小屋交易与布局提交：先保存候选存档，再兑现扣款、位置或采收，失败保持原状。
import {HOME_CATALOG,HOME_LIMIT,HOME_PLANTS} from '../config/home-decor.js';
import {freshHome,placementError,plantState,homeTime} from '../progression/home-decor.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';

// 店内只购买，家中只布置；弹窗暂停可提交，睡眠和屋外不能操作。
function available(game,shopping=false){return game.cottage&&(shopping?game.cottage.kind==='furniture':(!game.cottage.kind||game.cottage.kind==='cottage'))&&!game.cottage.sleep&&['playing','paused'].includes(game.state);}
// 候选存档携带室外安全位置，避免刷新后出生在小屋局部坐标。
function commit(game,change,shopping=false){
 if(!available(game,shopping))return {ok:false,message:shopping?'请进家具小铺，与售货员交谈购买。':'请先回到小屋，再打开装扮。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.homeDecor??=freshHome();
 const message=change(next);if(message)return {ok:false,message};
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist&&game.livingPersist(next)!==true)return {ok:false,message:'没有保存成功，金币与家具未改变，请重试。'};}catch{return {ok:false,message:'没有保存成功，金币与家具未改变，请重试。'};}
 game.progress=next;return {ok:true,message:'已保存到小屋。'};
}
// 每次明确购买生成独立实例；默认收纳，购买不会覆盖现有布局。
export function buyDecor(game,type){
 let uid;const result=commit(game,next=>{const d=HOME_CATALOG.find(i=>i.id===type);if(!d)return '这件家具暂未上架。';if(next.homeDecor.items.length>=HOME_LIMIT)return '家具已达40件，暂时无法继续购买。';if(next.coins<d.price)return '金币不足，去巡林攒一些再来吧。';uid=next.homeDecor.nextId++;next.coins-=d.price;next.homeDecor.items.push({uid,type,x:null,y:null,plant:null,floor:0,weapons:[]});return '';},true);
 return {...result,uid:result.ok?uid:null};
}
// 移动不收费；位置重新校验后一次保存，取消预览不触碰存档。
export function moveDecor(game,uid,x,y){return commit(game,next=>{const error=placementError(next.homeDecor,uid,x,y,game.player,cottageFloor(game.cottage));if(error)return error;Object.assign(next.homeDecor.items.find(i=>i.uid===uid),{x,y,floor:cottageFloor(game.cottage)});return '';});}
// 收纳不销毁家具或盆栽，重新摆放保留原来的成长时间。
export function storeDecor(game,uid){return commit(game,next=>{const i=next.homeDecor.items.find(i=>i.uid===uid);if(!i)return '这件家具不存在。';if(i.weapons?.length)return '请先取出架上的武器，再收纳武器架。';i.x=i.y=null;return '';});}
// 空花盆支付种子费即可播种，已有植物不能被重复点击覆盖。
export function sowDecor(game,uid,id){return commit(game,next=>{const item=next.homeDecor.items.find(i=>i.uid===uid),plant=HOME_PLANTS.find(p=>p.id===id);if(item?.type!=='pot'||item.x===null||!plant)return '请先摆好花盆，再选择种子。';if(item.plant)return '这个花盆已经种了植物。';if(next.coins<plant.cost)return '金币不足，暂时买不起种子。';next.coins-=plant.cost;item.plant={id,started:homeTime(next.living.calendar)};return '';});}
// 成熟后可留花观赏或采收金币；采收清空盆栽，连点不会重复领奖。
export function harvestDecor(game,uid){return commit(game,next=>{const item=next.homeDecor.items.find(i=>i.uid===uid),state=plantState(item,next.living.calendar);if(item?.type!=='pot'||item.x===null||!state.ready)return '植物还没有成熟，请去巡林或休息后再来。';next.coins+=state.plant.reward;item.plant=null;return '';});}
