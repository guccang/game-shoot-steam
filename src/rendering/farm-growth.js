// 作物的视觉成长采样独立于存档与奖励，图集与根部锚点保持不变。
import {farmGrowth} from '../progression/farm.js';
import {FARM_WATER} from '../config/farm.js';

// 有界缓动用于萌芽和开花过渡，避免阶段边界突然换图。
function ease(value){const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);}

// 从真实成熟时间采样，不保留每块田的历史或离线特效队列。
export function sampleCropGrowth(plot,now,time=0,reduced=false,boost=null){
 const growth=farmGrowth(plot,now),readyAt=plot.readyAt+(boost&&!reduced?boost.savedSeconds*1000*(1-ease((time-boost.start)/.8)):0);
 const duration=Math.max(1,readyAt-plot.plantedAt),displayGrowth=now>=readyAt?1:Math.max(0,(now-plot.plantedAt)/duration),sproutAt=plot.plantedAt+duration*.25;
 const sprout=ease((now-sproutAt+700)/1400),bloom=ease((now-readyAt+1400)/1400),layers=[];
 if(sprout<1)layers.push({stage:0,alpha:1-sprout,scale:(1-.15*sprout)*(reduced?1:.8+.2*ease((now-plot.plantedAt)/500))});
 if(sprout>0&&bloom<1)layers.push({stage:1,alpha:sprout*(1-bloom),scale:.62+.38*ease((displayGrowth-.25)/.65)});
 if(bloom>0)layers.push({stage:2,alpha:bloom,scale:.88+.12*bloom});
 return {growth,layers,time:reduced?0:time,phase:(plot.id*2.399+plot.crop*.83)%6.283,reduced,
  soil:reduced?-1:(now-sproutAt)/850,shine:reduced?-1:(now-readyAt)/1100};
}

// 浇水只保留本次单田的短过渡；结果不重复消费，结束、切图或重开即释放。
export function cropGrowthBoosts(state,game,time){
 const result=game.farmWork?.result;
 if(state.map!==game.mapId||time<state.time){state.boosts=[];state.result=result;}
 state.map=game.mapId;state.time=time;
 if(result!==state.result){state.result=result;
  if(result?.ok&&result.action==='water')state.boosts=result.wateredPlots.slice(0,FARM_WATER.maxPlots).flatMap(target=>{
   const plot=game.progress.farm.plots.find(p=>p.id===target.id);return plot?[{id:plot.id,crop:plot.crop,plantedAt:plot.plantedAt,readyAt:plot.readyAt,savedSeconds:target.savedSeconds,start:time}]:[];
  });
 }
 if(state.boosts?.length&&time-state.boosts[0].start>=.8)state.boosts=[];
 return state.boosts||[];
}

// 茎叶按高度连续弯曲，根部严格为零；各田相位不同，避免整片机械同步。
export function cropBend(height,visual){
 if(visual.reduced||height<=0)return 0;
 const h=Math.max(0,Math.min(1,height));return h*h*(Math.sin(visual.time*1.65+visual.phase)*1.1+Math.sin(visual.time*2.9+visual.phase+h*1.7)*.45);
}

// 小尺寸用三条相接切片，放大时保留六条；连续弯曲与固定根部不因数量变化而停止。
export function drawGrowingCrop(c,image,rect,x,rootY,width,height,visual,stage,zoom=1){
 const [sx,sy,sw,sh]=rect,bands=stage===0||visual.reduced?1:height*zoom<=80?3:6;
 let bend=stage===0?0:cropBend(1,visual);
 for(let i=0;i<bands;i++){
  const top=i/bands,bottom=(i+1)/bands,dy=top*height,dh=(bottom-top)*height;
  // 邻接切片共享同一边界采样，少算一半的三角函数且不会出现接缝。
  const a=bend,b=stage===0?0:cropBend(1-bottom,visual);bend=b;
  c.save();c.transform(1,0,(b-a)/dh,1,x-width/2+a,rootY-height+dy);
  c.drawImage(image,sx,sy+top*sh,sw,sh/bands,0,0,width,dh);c.restore();
 }
}

// 萌芽扬土与成熟亮点只出现一次，直接由时间计算，不分配持久粒子。
export function drawCropChange(c,item,visual){
 const soil=visual.soil,shine=visual.shine;
 if(!(soil>=0&&soil<1)&&!(shine>=0&&shine<1))return;
 c.save();
 if(soil>=0&&soil<1){c.globalAlpha*=Math.sin(soil*Math.PI)*.75;for(let i=0;i<4;i++){
  const side=i%2?1:-1,x=item.x+side*(4+soil*(7+i*2)),y=item.y+4-Math.sin(soil*Math.PI)*(4+i);
  c.fillStyle=i%2?'#c6a473':'#92704e';c.beginPath();c.ellipse(x,y,1.8,1.2,soil*side,0,Math.PI*2);c.fill();
 }}
 c.restore();c.save();
 if(shine>=0&&shine<1){c.globalAlpha*=Math.sin(shine*Math.PI)*.8;c.strokeStyle='#fff1b4';c.lineWidth=1.4;
  for(let i=0;i<4;i++){const angle=i*1.8+visual.phase,x=item.x+Math.cos(angle)*(17+shine*7),y=item.y-24+Math.sin(angle)*15-shine*7,r=1+Math.sin(shine*Math.PI)*1.5;c.beginPath();c.moveTo(x-r,y);c.lineTo(x+r,y);c.moveTo(x,y-r);c.lineTo(x,y+r);c.stroke();}
 }c.restore();
}
