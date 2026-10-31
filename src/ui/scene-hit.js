// 场景本体的透明命中区：保留原生键盘与无障碍语义，不绘制悬浮名称按钮。
import {nearest} from '../world/coordinates.js';
import {sceneLayout} from './scene-layout.js';
import {sceneResident} from './scene-resident.js';
// 点击与拖动交给统一战场输入，避免触屏从建筑起步时误开弹窗。
export function sceneHit(node,label){
 node.classList.add('scene-hit');node.textContent='';node.setAttribute('aria-label',label);node.setAttribute('data-world-movement','');
}
// 热点严格跟随世界实体，不钉屏、不避让到错误人物；固定HUD由更高层级接收输入。
export function placeSceneHit(node,site,renderer,frame,{width=64,height=80,foot=8,centered=false}={}){
 const v=renderer.view;if(!v){if(!node.hidden)node.hidden=true;return;}
 site=sceneResident(renderer,site);
 const p=nearest(site,{x:v.x+v.w/2,y:v.y+v.h/2}),{frame:r,canvas:c}=sceneLayout(renderer,frame);
 const w=Math.max(44,width*v.zoom),h=Math.max(44,height*v.zoom),x=(p.x-v.x)*v.zoom+c.left-r.left,y=(p.y-v.y)*v.zoom+c.top-r.top;
 // 地面格以中心锚定；建筑与人物继续沿用脚底，最小触控尺寸不会把地面热点向上推。
 const top=centered?y-h/2:y+foot*v.zoom-h;
 const hidden=x+w/2<0||x-w/2>r.width||(centered?top+h<0||top>r.height:y<0||y-h>r.height);
 if(node.hidden!==hidden)node.hidden=hidden;
 // 画外热点不提交无用坐标；重新入镜时同步当前投影，保持触控区域与本体一致。
 if(hidden)return;
 const styles={left:(x-w/2)+'px',top:top+'px',width:w+'px',height:h+'px',transform:'none'};
 for(const [name,value] of Object.entries(styles))if(node.style[name]!==value)node.style[name]=value;
}
