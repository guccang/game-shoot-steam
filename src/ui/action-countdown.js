// 界面徽记直接复用正式停车绘制器；无独立计时器，由所属功能提供剩余时间。
import {drawActionCountdown} from '../rendering/action-countdown.js';

// 固定逻辑尺寸，以屏幕像素比绘制；无障碍名称保留自动关闭含义。
export function createActionCountdown(root,{id,action='自动关闭'}={}){
 const canvas=root.createElement('canvas');canvas.className='action-countdown';if(id)canvas.id=id;
 canvas.setAttribute('role','img');let previous='';
 // 背景暂停与重开规则由调用方管理，徽记只呈现当前时钟。
 function update(remaining,total){
  const ratio=Math.max(0,Math.min(1,remaining/total)),seconds=Math.max(1,Math.ceil(remaining/1000)),dpr=Math.min(3,root.defaultView.devicePixelRatio||1);
  const key=[Math.round(ratio*1000),seconds,dpr].join(':');if(key===previous)return;previous=key;
  canvas.width=Math.round(70*dpr);canvas.height=Math.round(36*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,35*dpr,18*dpr);
  drawActionCountdown(c,{progress:1-ratio,label:seconds});canvas.dataset.seconds=String(seconds);canvas.dataset.progress=String(1-ratio);canvas.setAttribute('aria-label',`${seconds}秒后${action}`);
 }
 return {node:canvas,update};
}
