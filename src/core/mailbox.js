// 手机邮件读取和领取走候选存档提交，保存失败保留未读与附件。
import {ownsKeepsake} from '../progression/keepsakes.js';
import {validateProgress} from '../progression/progress.js';
import {capturePatrol} from './patrol-session.js';
import {claimFarmParcel} from './farm-delivery.js';
// 邮箱可在手机暂停页使用；附件权限在正式包裹入口再次检查。
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
// 只使用真实包裹编号领取，邮件里的文本和数量不能制造奖励。
export function claimMailGift(game,id){
 if(!mailboxAvailable(game))return {ok:false,message:'请在巡林时打开手机邮件。'};
 const mail=game.progress.mailbox?.items.find(m=>m.id===id);
 if(!mail?.parcel||mail.claimed)return {ok:false,message:'这封邮件没有待领取的附件。'};
 return claimFarmParcel(game,mail.parcel,{remote:true});
}
