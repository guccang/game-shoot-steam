// 首页轻量入口先接收开始意图，不等待游戏模块、字体、场景图片或背景视频。
import {createEventScope} from './events.js';
import {bindMobileFullscreen} from './mobile-fullscreen.js';
// 在资源加载前接住首次手机点击，避免正式应用装配时用户激活已经过期。
const fullscreenScope=createEventScope();
bindMobileFullscreen({root:document,host:window,scope:fullscreenScope,button:document.getElementById('fullscreen')});
const start=document.getElementById('start'),status=document.getElementById('title-start-status');
let requested=false,finished=false;
// 启动期间只记录一次点击，准备完成后交给正式菜单进入，不重复建图。
function requestStart(){if(finished||requested)return;requested=true;start.disabled=true;start.setAttribute('aria-busy','true');status.textContent='正在准备游戏…';}
start.addEventListener('click',requestStart);
start.disabled=false;
// 正式应用接管按钮；启动失败保留原错误提示，不能进入不完整场景。
export function finishTitleStart(application){
 if(finished)return;finished=true;fullscreenScope.dispose();start.removeEventListener('click',requestStart);status.textContent='';
 if(!application){start.disabled=true;start.setAttribute('aria-busy','false');return;}
 if(requested)application.menu.enter();
}
