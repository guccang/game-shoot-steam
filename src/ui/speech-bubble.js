// 主线与故事共用打字机、全文点击和跳过操作，任务结果仍由各自正式流程提交。
import {createEventScope} from '../platform/events.js';
import {createDialogueText} from './dialogue-text.js';
export function createSpeechBubble(root,id,label,{interactive=true,onAdvance=()=>{},onSkip=()=>{}}={}){
 // 面板每半秒检查一次，按该间隔推进可见文字。
 const scope=createEventScope(),writer=createDialogueText(30,.5),node=root.createElement('section');
 node.id=id;node.className='story-speech task-speech ui-dialogue';node.hidden=true;node.tabIndex=-1;node.setAttribute('aria-label',label);
 node.innerHTML=`<div class="story-speech-copy"><b id="${id}-speaker"></b><p id="${id}-text"><span class="speech-text-space" aria-hidden="true"></span><span class="speech-text-visible" aria-hidden="true"></span></p></div><div class="story-speech-actions"><button id="${id}-next" class="ui-button" type="button">显示全文</button><button id="${id}-skip" class="ui-button" type="button">跳过对话</button></div><span class="story-speech-tail" aria-hidden="true"></span>`;
 const copy=node.querySelector('.story-speech-copy'),speaker=node.querySelector('b'),text=node.querySelector('p'),space=node.querySelector('.speech-text-space'),visible=node.querySelector('.speech-text-visible'),next=node.querySelector('#'+id+'-next'),skip=node.querySelector('#'+id+'-skip');
 let nextLabel='下一句',fullText='',name='',pointer=null;
 // 完整文案预留高度，逐字出现不让底板和按钮随换行上下跳动。
 function paint(){const shown=writer.text;if(visible.textContent!==shown)visible.textContent=shown;const label=writer.complete?nextLabel:'显示全文';if(next.textContent!==label)next.textContent=label;const accessible=name+'：'+fullText+'。'+label;if(copy.getAttribute('aria-label')!==accessible)copy.setAttribute('aria-label',accessible);const typing=String(!writer.complete);if(node.dataset.typing!==typing)node.dataset.typing=typing;}
 // 正文和主按钮共用两段点击语义；跳过按钮始终跳过当前完整对白。
 function advance(){if(node.hidden)return;if(writer.reveal())paint();else onAdvance();}
 if(interactive){
  copy.tabIndex=0;copy.setAttribute('role','button');
  scope.on(copy,'pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};});
  scope.on(copy,'pointercancel',()=>{pointer=null;});
  scope.on(copy,'click',e=>{if(e.detail&&pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>10){pointer=null;return;}pointer=null;advance();});
  scope.on(copy,'keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)advance();}});
  scope.on(next,'click',advance);scope.on(skip,'click',()=>{if(!node.hidden)onSkip();});
 }else node.querySelector('.story-speech-actions').hidden=true;
 // 面板只在实际可见的帧推进打字；隐藏/弹窗暂停时不消耗阅读进度。
 function present(info,dt=0){name=info.speaker;fullText=info.text;nextLabel=info.nextLabel||'下一句';if(writer.begin(info.key,fullText)){speaker.textContent=name;space.textContent=fullText;copy.scrollTop=0;}writer.tick(dt);paint();}
 // 会话结束释放当前文字状态，事件在最终销毁时统一移除。
 function reset(){writer.reset();pointer=null;}
 // 销毁组件时移除监听，避免重新开局累积点击回调。
 function dispose(){scope.dispose();node.remove();}
 return {node,speaker,text,copy,next,skip,present,reset,dispose};
}
