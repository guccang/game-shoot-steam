// 手机购买合同的已读状态走候选存档提交，保存失败保留未读。
import {ownsKeepsake} from '../../progression/inventory/keepsakes.js';
import {validateProgress} from '../../progression/progress.js';
import {capturePatrol} from '../battle/patrol-session.js';
// 邮箱可在手机暂停页查看购买合同。
export function mailboxAvailable(game){return ownsKeepsake(game.progress,'patrol-phone')&&['playing','paused'].includes(game.state);}
// 标记单封或全部已读时先保存，不以页面打开代替成功落盘。
export function readMail(game,id=null){
 if(!mailboxAvailable(game))return {ok:false,message:'请在巡林时打开手机邮件。'};
 const next=validateProgress(structuredClone(game.progress)),items=next.mailbox.items.filter(m=>id===null||m.id===id);
 if(!items.length&&id!==null)return {ok:false,message:'没有找到这封邮件。'};
 if(items.every(m=>m.read))return {ok:true,message:''};
 for(const m of items)m.read=true;
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=game.livingPersist?.(next)===true;}catch{}
 if(!saved)return {ok:false,message:'已读状态保存失败，请重试。'};
 game.progress=next;return {ok:true,message:''};
}
