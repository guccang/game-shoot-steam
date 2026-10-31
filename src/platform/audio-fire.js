// 消防音景：独立柴油机之外的警笛、水带、补水泵与交接提示，全部为原创确定性合成。
const RATE=22050,TAU=Math.PI*2;
export const FIRE_SOUNDS={
 'fire-siren':[2,0,0,0,0,.1], 'fire-spray':[2,0,0,0,0,.1], 'fire-refill':[2,0,0,0,0,.1],
 'fire-alert':[.9,0,0,0,0,1], 'fire-park':[.45,0,0,0,0,.4],
};
export const FIRE_LOOPS=Object.freeze({'fire-siren':'fireSiren','fire-spray':'fireSpray','fire-refill':'fireRefill'});
// 只读取真实操作；返站关闭警笛，水箱满了不继续发出补水声。
export function fireAudioScene(game){
 const r=game.fireRescue,driving=game.vehicle.active&&game.vehicle.index===4,working=driving&&r?.phase==='active';
 const spraying=working&&!!r.stream,refilling=working&&!!r.filling&&r.water<100;
 return {fireSiren:working&&!spraying&&!refilling&&Math.hypot(game.player.vx||0,game.player.vy||0)>18,fireSpray:!!spraying,fireRefill:!!refilling};
}
// 警笛采用完整两秒调频周期；水流交叉滤波并在接缝淡入淡出，不使用战斗随机数。
export function renderFireSound(context,kind){
 if(!FIRE_SOUNDS[kind])return null;
 const duration=FIRE_SOUNDS[kind][0],buffer=context.createBuffer(1,Math.ceil(RATE*duration),RATE),data=buffer.getChannelData(0);
 let seed=1739,low=0,mid=0;
 for(let i=0;i<data.length;i++){
  const t=i/RATE;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;low+=(n-low)*.025;mid+=(n-mid)*.18;
  const edge=Math.min(1,t/.012,(duration-t)/.02);let value=0;
  if(kind==='fire-siren'){
   const phase=TAU*540*t+360*(1-Math.cos(Math.PI*t));value=(Math.sin(phase)*.18+Math.sin(phase*3)*.025);
  }else if(kind==='fire-spray')value=((n-mid)*.16+mid*.7+low*.5)*(.85+.15*Math.sin(TAU*9*t))+Math.sin(TAU*120*t)*.018;
  else if(kind==='fire-refill')value=low*1.1+mid*.14+Math.sin(TAU*72*t)*.075+Math.sin(TAU*144*t)*.025;
  else if(kind==='fire-park')value=(n-mid)*.32*Math.exp(-t*8)+low*.3*Math.exp(-t*12);
  else{const local=t% .45,gate=Math.min(1,local/.015)*Math.exp(-local*9);value=(Math.sin(TAU*(t<.45?740:980)*t)*.18+Math.sin(TAU*1480*t)*.035)*gate;}
  data[i]=value*edge;
 }
 return buffer;
}
