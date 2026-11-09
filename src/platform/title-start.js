// 首页轻量入口先接收开始意图，不等待游戏模块、字体、场景图片或背景视频。
import {createEventScope} from './events.js';
import {currentPlayer,playerName,randomPlayerName,rememberPlayer} from './player-profile.js';
import {bindMobileFullscreen} from './mobile-fullscreen.js';
// 在资源加载前接住首次手机点击，避免正式应用装配时用户激活已经过期。
const fullscreenScope=createEventScope();
bindMobileFullscreen({root:document,host:window,scope:fullscreenScope,button:document.getElementById('fullscreen')});
const start=document.getElementById('start'),status=document.getElementById('title-start-status');
const nameField=document.getElementById('login-name'), randomButton=document.getElementById('random-player');
nameField.value=currentPlayer;
let requested=history.state?.forestEnter===true,finished=false;
if(requested)rememberPlayer(currentPlayer,false);
randomButton.addEventListener('click',()=>{
  nameField.value=randomPlayerName();
  nameField.dispatchEvent(new Event('input'));
});
nameField.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.isComposing){event.preventDefault();start.click();}
});
// 换人时重新装配整个世界，旧页在离页保存期间仍绑定原用户。
start.addEventListener('click',event=>{
  const name=playerName(nameField.value);
  if(!name){
    event.stopImmediatePropagation();nameField.focus();status.textContent='请输入有效的用户名';return;
  }
  nameField.value=name;
  const switching=name!==currentPlayer;
  rememberPlayer(name,switching);
  if(switching){
    event.stopImmediatePropagation();start.disabled=true;location.reload();
  }
},true);
// 启动期间只记录一次点击，准备完成后交给正式菜单进入，不重复建图。
function requestStart(){
  if(finished||requested)return;
  requested=true;
  lockName(true);
  start.disabled=true;
  start.setAttribute('aria-busy','true');
  status.textContent='正在准备游戏…';
}
start.addEventListener('click',requestStart);
start.disabled=requested;
// 接管前锁定已提交的用户名，避免资源加载期间继续改名。
function lockName(locked){nameField.disabled=locked;randomButton.disabled=locked;}
lockName(requested);
// 正式应用接管按钮；启动失败保留原错误提示，不能进入不完整场景。
export function finishTitleStart(application){
 if(finished)return;finished=true;fullscreenScope.dispose();start.removeEventListener('click',requestStart);status.textContent='';
 if(!application){start.disabled=true;start.setAttribute('aria-busy','false');return;}
 lockName(false);
 if(requested)application.menu.enter();
}
