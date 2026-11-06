// 静态画笔共享的有界栅格缓存；动态状态不进入缓存，每次预热只生成一项。
import {createRenderCanvas,canvasRecoveryRevision} from './canvas-recovery.js';
import {artStyle} from '../art-styles/state.js';
export class StaticRasterCache {
 // 注入画布与时钟便于验证资源预算，默认使用正式画布恢复机制。
 constructor({maxBytes=8*1024*1024,maxEntryBytes=2*1024*1024,maxPending=32,create=createRenderCanvas,now=()=>performance.now(),revision=canvasRecoveryRevision,style=artStyle}={}){
  Object.assign(this,{maxBytes,maxEntryBytes,maxPending,create,now,revision,style});this.entries=new Map();this.pending=new Map();this.bytes=0;this.generation=null;
  this.hits=0;this.misses=0;this.builds=0;this.evictions=0;this.buildMs=0;this.maxBuildMs=0;
 }
 // 切换风格或画布恢复时丢弃所有派生像素，保持游戏数据与动作时钟独立。
 sync(){const generation=this.style()+':'+this.revision();if(generation!==this.generation){this.clear();this.generation=generation;}}
 // 首帧仍由正式画笔绘制，之后贴图；队列只持有不含世界实体的静态绘制描述。
 draw(c,key,bounds,paint){
  this.sync();const entry=this.entries.get(key);
  if(entry){this.hits++;this.entries.delete(key);this.entries.set(key,entry);c.drawImage(entry.canvas,...entry.bounds);return;}
  this.misses++;paint(c);
  if(!this.pending.has(key)&&this.pending.size<this.maxPending)this.pending.set(key,{bounds:[...bounds],paint});
 }
 // 单项画笔不可中断，因此只限制每帧一项，并暴露真实最长耗时而非伪装硬时间片。
 advance(){
  this.sync();const next=this.pending.entries().next();if(next.done)return 0;
  const [key,{bounds,paint}]=next.value;this.pending.delete(key);
  const [x,y,w,h]=bounds,width=Math.ceil(w*2),height=Math.ceil(h*2),bytes=width*height*4;
  if(!(w>0&&h>0&&Number.isFinite(bytes))||bytes>Math.min(this.maxEntryBytes,this.maxBytes))throw Error('静态图集超出尺寸或内存预算：'+key);
  const started=this.now(),canvas=this.create();let stored=false;
  try{
   canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');
   if(!c||c.isContextLost?.())throw Error('静态图集画布不可用：'+key);
   c.scale(2,2);c.translate(-x,-y);paint(c);
   if(c.isContextLost?.())throw Error('静态图集生成期间画布丢失：'+key);
   while(this.bytes+bytes>this.maxBytes){const oldest=this.entries.keys().next().value;this.release(oldest);this.evictions++;}
   this.entries.set(key,{canvas,bounds,bytes});this.bytes+=bytes;stored=true;this.builds++;
  }finally{if(!stored)canvas.width=canvas.height=1;const ms=this.now()-started;this.buildMs+=ms;this.maxBuildMs=Math.max(this.maxBuildMs,ms);}
  return 1;
 }
 // 淘汰时主动缩小画布，避免只移除Map引用却延迟释放大块像素。
 release(key){const entry=this.entries.get(key);if(!entry)return;entry.canvas.width=entry.canvas.height=1;this.bytes-=entry.bytes;this.entries.delete(key);}
 // 清理队列和已生成位图，计数保留用于整个会话诊断。
 clear(){for(const key of this.entries.keys())this.release(key);this.pending.clear();}
 // 理论RGBA预算不包含浏览器内部纹理副本，不作为GPU实测内存。
 stats(){return {count:this.entries.size,bytes:this.bytes,maxBytes:this.maxBytes,pending:this.pending.size,hits:this.hits,misses:this.misses,builds:this.builds,evictions:this.evictions,buildMs:this.buildMs,maxBuildMs:this.maxBuildMs};}
}
