// imagegen精修图集只承载材质和独立部件；局部软体、表情和施法继续使用游戏时钟。
import manifest from '../../assets/biome-dumplings/manifest.json' with {type:'json'};
import {drawDumplingFace} from './dumpling-body.js';
import {BIOME_DUMPLINGS} from '../config/biome-dumplings.js';
const sheets=new Map();let loading=null;
// 冠饰包围盒沿用旧绘制器的局部尺寸，不随图集留白改变角色比例。
const CROWN_BOXES={cap:[-24,-9,48,17],horn:[-22,-19,44,28],stack:[-17,-22,34,34],crater:[-22,-10,44,20],fan:[-23,-16,46,26],plates:[-7,-13,14,22],lotus:[-27,-16,54,23],bubbles:[-23,-24,46,34],spiral:[-13,-6,26,13],fronds:[-27,-24,54,34],flower:[-19,-20,38,31],vines:[-7,-5,14,12],shelves:[-29,-19,58,30],bell:[-18,-20,36,30],crystals:[-23,-31,46,42]};

// 必需部件加载失败时阻止进入游戏，禁止以旧程序造型静默兜底。
export function loadBiomeDumplingArt(){
 for(const p of BIOME_DUMPLINGS)if(!manifest.entries[p.id]?.parts.body||p.id!=='vine'&&!manifest.entries[p.id]?.parts.crown)throw Error('地貌团子清单缺少必需部件：'+p.id);
 return loading||=Promise.all(Object.entries(manifest.entries).map(async([id,entry])=>{
  const image=new Image();image.src='/assets/biome-dumplings/'+entry.file;
  try{await image.decode();}catch(cause){throw Error('地貌团子PNG加载失败：'+id,{cause});}
  if(image.naturalWidth!==entry.size[0]||image.naturalHeight!==entry.size[1])throw Error('地貌团子图集尺寸不符：'+id);
  sheets.set(id,image);
 }));
}

// 使用清单有效透明边界绘制独立部件，尺寸始终为原游戏逻辑单位。
function part(c,image,entry,name,x,y,w,h){const r=entry.parts[name];if(r)c.drawImage(image,...r,x,y,w,h);}

// 藤鞭逐段弯曲、根部固定，不能用整片旋转代替原来的局部曲率变化。
function flexiblePart(c,image,entry,name,x,y,w,h,wave){
 const r=entry.parts[name];if(!r)return;
 for(let i=0;i<12;i++){const u=i/12,dx=wave*(1-u)**2;c.save();c.beginPath();c.rect(x+dx-1,y+h*u,w+2,h/12+(i===11?0:.5));c.clip();c.drawImage(image,...r,x+dx,y,w,h);c.restore();}
}

// 水平条带随高度错相偏移，脚底固定；不是完整角色静帧的整体拉伸动画。
function softBody(c,image,entry,p,pose,wave){
 const [sx,sy,sw,sh]=entry.parts.body,h=p.height*(1-pose.squash),w=p.width*(1+pose.squash*.65),bottom=-pose.lift;
 const strips=20;
 for(let i=0;i<strips;i++){
  const u=i/strips,v=(i+1)/strips,weight=Math.sin(u*Math.PI),offset=(pose.sway+wave*.32)*weight;
  const edge=Math.sin(u*Math.PI*2+wave)*(.25+Math.abs(pose.squash)*1.8)*weight;
  // 保留完整源图采样范围，在目标空间裁条，消除分数源矩形的插值横缝。
  c.save();c.beginPath();c.rect(-w+offset-edge-1,bottom-h+h*u,2*w+edge*2+2,h*(v-u)+(i===strips-1?0:.5));c.clip();
  c.drawImage(image,sx,sy,sw,sh,-w+offset-edge,bottom-h,2*w+edge*2,h);c.restore();
 }
 return {top:bottom-h,bottom,width:w,height:h};
}

// 冠、侧部与身体独立运动，保留固定脚底、原比例、受击软体及程序表情。
export function drawBiomeDumplingPng(c,e,p,pose,wave,time=0){
 const image=sheets.get(p.id),entry=manifest.entries[p.id];if(!image||!entry)throw Error('地貌团子PNG尚未就绪：'+p.id);
 const b=softBody(c,image,entry,p,pose,wave),top=b.top;
 const box=CROWN_BOXES[p.shape];c.save();c.translate(pose.sway*.6,top+wave*.18);
 if(p.shape==='spiral'){c.scale(1,.5);c.rotate(time*.3);part(c,image,entry,'crown',-13,-13,26,26);}
 else if(p.shape==='fronds')flexiblePart(c,image,entry,'crown',...box,wave*.6);
 else part(c,image,entry,'crown',...box);c.restore();
 const side=e.aquatic?[-32,b.height-17,17,19]:p.shape==='vines'?[-37,-18,22,45]:p.shape==='plates'?[-26,-11,17,43]:p.shape==='cap'?[-27,5,10,19]:p.shape==='stack'?[-32,21,18,15]:p.shape==='bell'?[-27,23,13,14]:[-30,6,15,22];
 for(const [name,sign] of [['left',-1],['right',1]]){const [x,y,w,h]=side;c.save();c.translate(pose.sway*.45+sign*wave*.3,top+Math.sin(wave+sign)*.4);if(p.shape==='vines')flexiblePart(c,image,entry,name,sign<0?x:-x-w,y,w,h,sign*wave);else part(c,image,entry,name,sign<0?x:-x-w,y,w,h);c.restore();}
 drawDumplingFace(c,pose.sway*.4,b.bottom-b.height*.48,b.width*.32);
}

// 验收报告只计实际加载的图集，不另建昼夜副本或动态帧缓存。
export function biomeDumplingArtStats(){return {loaded:sheets.size,count:Object.keys(manifest.entries).length,bytes:Object.values(manifest.entries).reduce((sum,e)=>sum+e.bytes,0),decodedBytes:sheets.size*512*512*4};}
