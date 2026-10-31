// 居民闲聊与援军短句共用的小气泡，不复用任务对话框或抢占点击。
import {nearest} from '../world/coordinates.js';
import {sceneLayout} from './scene-layout.js';
import {sceneResident} from './scene-resident.js';
// 固定一个头顶节点，空间不足则隐藏，不移动镜头或收起其他UI。
export function createCompactSpeech(root,id){
 const frame=root.getElementById('game-frame'),node=root.createElement('aside');node.id=id;node.className='compact-speech';node.hidden=true;frame.append(node);
 const submittedStyles={};
 // 只投影当前镜头里的说话人，尾尖始终指向真实头顶。
 function show(actor,text,renderer,{head=62,minTop=100,bottom=110}={}){
  // 没有有效台词时不展示气泡，避免附近出现只有底板的空框。
  if(typeof text!=='string'||!text.trim())return hide();
  const v=renderer.view;if(!v||root.querySelector('#living-dialog.npc-bottom-dialogue[open],.task-speech:not([hidden])'))return hide();
  const {frame:bounds,canvas}=sceneLayout(renderer,frame);
  actor=sceneResident(renderer,actor);
  const p=nearest(actor,{x:v.x+v.w/2,y:v.y+v.h/2});
  const x=(p.x-v.x)*v.zoom+canvas.left-bounds.left,y=(p.y-(actor.elevation||0)-head-v.y)*v.zoom+canvas.top-bounds.top;
  if(x<12||x>bounds.width-12||y<minTop+30||y>bounds.height-bottom)return hide();
  // 保持可见节点和文本，避免每帧销毁文字布局、切换 display 后再次强制测量。
  const name=actor.name||'邻居',label=name+'：'+text;
  if(node.textContent!==text)node.textContent=text;
  if(node.dataset.speaker!==name)node.dataset.speaker=name;
  if(node.getAttribute('aria-label')!==label)node.setAttribute('aria-label',label);
  if(node.hidden)node.hidden=false;
  const width=node.offsetWidth,height=node.offsetHeight;
  if(y-height<minTop)return hide();
  const left=Math.max(8,Math.min(bounds.width-width-8,x-width/2));
  const styles={left:left+'px',top:(y-height)+'px','--tail-x':Math.max(9,Math.min(width-15,x-left))+'px'};
  // CSSOM会缩短小数精度，比较上次提交值，避免静止在小数坐标时仍反复写样式。
  for(const [key,value] of Object.entries(styles))if(submittedStyles[key]!==value){node.style.setProperty(key,value);submittedStyles[key]=value;}
  const data={placement:'overhead',anchorX:String(x),anchorY:String(y)};
  for(const [key,value] of Object.entries(data))if(node.dataset[key]!==value)node.dataset[key]=value;
  return true;
 }
 // 只在实际离屏或被对白遮挡时隐藏；返回值供阅读时钟直接使用。
 function hide(){if(!node.hidden)node.hidden=true;return false;}
 // 面板销毁移除可见气泡，不残留交互遮罩。
 function dispose(){node.remove();}
 return {node,show,hide,dispose};
}
