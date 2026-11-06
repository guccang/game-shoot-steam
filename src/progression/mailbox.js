import {ERA_RESOURCES} from '../config/vehicle-eras.js';
// 邮箱只保存载具与武器购买合同，其他业务通知不进入收件箱。
const LIMIT=600;
const RESOURCES={...Object.fromEntries(Object.entries(ERA_RESOURCES).map(([key,r])=>[key,r.name])),coins:'金币',wood:'木头',parts:'零件',crystal:'晶石',core:'核心'};
// 新旧存档均使用独立邮箱实例。
export function freshMailbox(){return {serial:0,items:[]};}
// 存档文本只保留有限长度，显示层仍需转义。
function cleanText(value,max){return typeof value==='string'?value.slice(0,max):'';}
// 使用交易稳定键识别合同，不以可变标题或发件人判断类型。
export function isPurchaseContract(mail){return /^purchase:(vehicle|weapons|turret):\d+$/.test(mail?.key||'');}
// 白名单恢复邮件及已读状态，不信任存档附带的奖励数量。
export function normalizeMailbox(raw){
 const box=freshMailbox(),ids=new Set();
 for(const m of (Array.isArray(raw?.items)?raw.items:[]).filter(isPurchaseContract).slice(-LIMIT)){
  if(!Number.isSafeInteger(m?.id)||m.id<1||ids.has(m.id)||!m.title)continue;
  ids.add(m.id);box.items.push({id:m.id,key:cleanText(m.key,100),sender:cleanText(m.sender,60),title:cleanText(m.title,100),body:cleanText(m.body,1800),at:Number.isFinite(m.at)&&m.at>=0?Math.min(m.at,8640000000000000):0,read:m.read===true});
 }
 box.serial=Math.max(Number.isSafeInteger(raw?.serial)&&raw.serial>=0?raw.serial:0,...box.items.map(m=>m.id));return box;
}
// 新邮件同样执行合同白名单，重复交易不重寄，最多保留600封历史合同。
export function sendMail(progress,{key='',sender='巡林服务中心',title,body,at=Date.now()}){
 if(!isPurchaseContract({key}))return false;
 const box=progress.mailbox??=freshMailbox();if(key&&box.items.some(m=>m.key===key))return false;
 box.items.push({id:++box.serial,key,sender,title,body,at,read:false});
 if(box.items.length>LIMIT)box.items.splice(0,box.items.length-LIMIT);return true;
}
// 购买手续列出本次实际折后支出，不根据今后的配置重新计算历史账单。
export function resourceMailText(amounts){return Object.entries(RESOURCES).filter(([key])=>amounts[key]>0).map(([key,name])=>`${name} ×${amounts[key]}`).join('、')||'无资源消耗';}
// 未读提示直接来自持久化状态，关闭或刷新不会丢失。
export function unreadMailCount(progress){return (progress.mailbox?.items||[]).filter(m=>isPurchaseContract(m)&&!m.read).length;}
