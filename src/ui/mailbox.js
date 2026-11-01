// 手机邮箱使用统一底板，仅展示载具和武器购买合同。
import {createEventScope} from '../platform/events.js';
import {readMail,mailboxAvailable} from '../core/mailbox.js';
import {unreadMailCount,isPurchaseContract} from '../progression/mailbox.js';
import {keepsakeIcon} from './keepsake-icons.js';
// 存档文字只能显示为正文，不能构造页面标签或属性。
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 一次只创建二十个列表项，历史记录不增加每帧绘制负担。
export function createMailbox({game,root,dialogs,onChange,onClose}){
 const scope=createEventScope(),dialog=root.createElement('dialog');dialog.id='mailbox-dialog';dialog.className='ui-panel ui-page mailbox';dialog.setAttribute('aria-labelledby','mailbox-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="mailbox-title">邮件</h2><p id="mailbox-summary"></p></div><button id="mailbox-close" class="ui-close" aria-label="关闭邮件">×</button></header><div class="ui-panel__body"><div id="mailbox-content"></div></div><footer class="ui-panel__footer"><p id="mailbox-message" role="status"></p><div id="mailbox-actions"></div></footer>';root.body.append(dialog);
 let selected=null,page=0,notice='';const get=id=>dialog.querySelector('#mailbox-'+id);
 // 历史合同缺少时间时不伪造寄件时刻。
 function date(mail){return mail.at?new Date(mail.at).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'历史来信';}
 // 合同只区分已读与未读，不提供附件领取。
 function status(mail){return mail.read?'已读':'未读';}
 // 所有按钮采用统一触控区与固定底栏，长信正文独立滚动。
 function button(action,label,primary=false,disabled=false){return `<button type="button" class="ui-button${primary?' ui-button--primary':''}" data-mail-action="${action}" ${disabled?'disabled':''}>${label}</button>`;}
 // 仅读取存档生成界面，不因查看列表自动领取或自动标记。
 function render(){
  const items=(game.progress.mailbox?.items||[]).filter(isPurchaseContract),mail=items.find(m=>m.id===selected);get('summary').textContent=`${unreadMailCount(game.progress)} 封未读 · ${items.length} 份购买合同`;get('message').textContent=notice;get('message').hidden=!notice;
  if(mail){
   get('content').innerHTML=`<article class="mailbox-letter"><small>${escape(mail.sender)} · ${escape(date(mail))}</small><h3>${escape(mail.title)}</h3><p class="mailbox-status">${status(mail)}</p><div class="mailbox-text">${escape(mail.body)}</div></article>`;
   get('actions').innerHTML=button('back','返回列表')+(!mail.read?button('read','标为已读'):'');
  }else{
   selected=null;page=Math.min(page,Math.max(0,Math.ceil(items.length/20)-1));
   get('content').innerHTML=items.length?`<div class="mailbox-list">${[...items].reverse().slice(page*20,page*20+20).map(m=>`<button type="button" class="ui-choice mailbox-row ${m.read?'':'is-unread'}" data-mail-id="${m.id}"><span class="mailbox-icon">${keepsakeIcon('elder-letter')}</span><span><b>${escape(m.title)}</b><small>${escape(m.sender)} · ${escape(date(m))}</small><small>${status(m)}</small></span></button>`).join('')}</div>${items.length>20?`<nav class="mailbox-pages" aria-label="邮件分页">${button('prev','上一页',false,page===0)}<span>${page+1} / ${Math.ceil(items.length/20)}</span>${button('next','下一页',false,(page+1)*20>=items.length)}</nav>`:''}`:'<div class="mailbox-empty">'+keepsakeIcon('elder-letter')+'<h3>暂时没有来信</h3><p>这里只保留载具购买合同和武器购买合同。</p></div>';
   get('actions').innerHTML=button('close','返回手机')+button('all-read','全部已读',false,!items.some(m=>!m.read));
  }
 }
 // 每次从手机进入列表，详情返回保留列表页码。
 function open(){if(mailboxAvailable(game)){if(!dialog.open)root.body.append(dialog);dialogs.open(dialog.id);}}
 dialogs.register(dialog.id,{focusId:'mailbox-close',onOpen:()=>{selected=null;page=0;notice='';render();}});
 scope.on(get('close'),'click',()=>dialogs.close(dialog.id));scope.on(dialog,'close',()=>onClose?.());
 scope.on(dialog,'click',event=>{
  const row=event.target.closest('[data-mail-id]'),action=event.target.closest('[data-mail-action]')?.dataset.mailAction;
  if(row){selected=Number(row.dataset.mailId);const result=readMail(game,selected);notice=result.message;render();dialog.querySelector('.ui-panel__body').scrollTop=0;onChange();return;}
  if(!action)return;if(action==='close'){dialogs.close(dialog.id);return;}
  if(action==='back'){selected=null;notice='';}else if(action==='next'){page++;}else if(action==='prev'){page=Math.max(0,page-1);}else{const result=readMail(game,action==='all-read'?null:selected);notice=result.message;}
  render();onChange();
 });
 // 卸载释放节点及监听，不保留上一个存档的选中邮件。
 function dispose(){scope.dispose();dialog.remove();}
 return {open,dispose};
}
