// 重要消息随玩家存档保存；附件仅引用正式包裹，邮件正文不能发放资源。
import {FARM_CROPS,FARM_SENDERS} from '../config/farm.js';
const LIMIT=600;
const RESOURCES={coins:'金币',wood:'木头',parts:'零件',crystal:'晶石',core:'核心'};
// 新旧存档均使用独立邮箱实例。
export function freshMailbox(){return {serial:0,items:[]};}
// 存档文本只保留有限长度，显示层仍需转义。
function cleanText(value,max){return typeof value==='string'?value.slice(0,max):'';}
// 白名单恢复邮件及已读状态，不信任存档附带的奖励数量。
export function normalizeMailbox(raw){
 const box=freshMailbox(),ids=new Set();
 for(const m of (Array.isArray(raw?.items)?raw.items:[]).slice(-LIMIT)){
  if(!Number.isSafeInteger(m?.id)||m.id<1||ids.has(m.id)||!m.title)continue;
  ids.add(m.id);box.items.push({id:m.id,key:cleanText(m.key,100),sender:cleanText(m.sender,60),title:cleanText(m.title,100),body:cleanText(m.body,1800),at:Number.isFinite(m.at)&&m.at>=0?Math.min(m.at,8640000000000000):0,read:m.read===true,parcel:Number.isInteger(m.parcel)&&m.parcel>0?m.parcel:null,claimed:m.claimed===true});
 }
 box.serial=Math.max(Number.isSafeInteger(raw?.serial)&&raw.serial>=0?raw.serial:0,...box.items.map(m=>m.id));return box;
}
// 保留所有待领附件，再淘汰最早普通记录；序号不复用，重复业务键不重寄。
export function sendMail(progress,{key='',sender='巡林服务中心',title,body,parcel=null,at=Date.now()}){
 const box=progress.mailbox??=freshMailbox();if(key&&box.items.some(m=>m.key===key))return false;
 box.items.push({id:++box.serial,key,sender,title,body,parcel,at,read:false,claimed:false});
 while(box.items.length>LIMIT){const i=box.items.findIndex(m=>!m.parcel||m.claimed);if(i<0)break;box.items.splice(i,1);}return true;
}
// 购买手续列出本次实际折后支出，不根据今后的配置重新计算历史账单。
export function resourceMailText(amounts){return Object.entries(RESOURCES).filter(([key])=>amounts[key]>0).map(([key,name])=>`${name} ×${amounts[key]}`).join('、')||'无资源消耗';}
// 包裹来源唯一；旧快递存档补建邮件不改变种子、解锁状态或寄送计时。
export function syncParcelMail(progress){
 for(const p of progress.farm.delivery.parcels)sendMail(progress,{key:'parcel:'+p.id,sender:FARM_SENDERS[p.sender]||'邻居',title:'给你寄来了一包种子',body:`给你带来${FARM_CROPS[p.crop].name}种子 ×${p.count}，愿你的田地收获满满！可以在邮件里领取，也可以到快递站领取。`,parcel:p.id,at:p.arrivedAt});
}
// 两个领取入口共同更新同一封邮件，打开邮件不会自动领取。
export function markParcelMailClaimed(progress,id){const m=progress.mailbox?.items.find(m=>m.parcel===id);if(m){m.claimed=true;m.read=true;}}
// 未读提示直接来自持久化状态，关闭或刷新不会丢失。
export function unreadMailCount(progress){return (progress.mailbox?.items||[]).filter(m=>!m.read).length;}
