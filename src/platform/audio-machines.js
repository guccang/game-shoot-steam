// 新载具与召唤机械的原创程序音色；独立确定性噪声不消耗战斗随机数。
const RATE=22050,TAU=Math.PI*2;
export const MACHINE_SOUNDS={
  'vehicle-machinegun':[.22,0,0,0,0,.045],
  'tank-125':[1.1,0,0,0,0,.18],
  'wolf-256':[1.35,0,0,0,0,.22],
  'gravity-gun':[.48,0,0,0,0,.16],
  'cat-crew-hit':[.16,0,0,0,0,.08],
  'cat-crew-deploy':[.25,0,0,0,0,.08],
  'vehicle-vulcan':[.105,0,0,0,0,.035],
  'hover-tide':[.27,0,0,0,0,.045],
  'mechanical-core':[.24,0,0,0,0,.09],
  'mechanical-spider':[.18,0,0,0,0,.1],
  'mechanical-deploy':[.46,0,0,0,0,.22],
  'spider-hatch':[.52,0,0,0,0,.3],
};
for(let index=0;index<9;index++)for(const action of ['start','stop'])
  MACHINE_SOUNDS[`vehicle-${action}-${index}`]=[action==='start'?.65:.5,0,0,0,0,.3];

// 独立短攻击与指数释放，机械声不靠整段单音扫频冒充真实动作。
function envelope(t,decay,attack=.002){return t<0?0:Math.min(1,t/attack)*Math.exp(-t/decay);}

// 每车型的机械基音不同，循环长度为完整周期，接缝不产生咔嗒。
export function machineEngineSample(index,t) {
  if(index===5)return Math.sin(TAU*180*t)*.04+Math.sin(TAU*360*t)*.012; // 轻柔电机，不叠柴油爆发。
  if(index===7||index===8)return Math.sin(TAU*72*t)*.11+Math.sin(TAU*144*t)*.04+Math.sin(TAU*288*t)*(.018+.01*Math.sin(TAU*12*t)); // 面包车汽油机的轻快低鸣。
  if(index===0)return Math.sin(TAU*90*t)*.12+Math.sin(TAU*180*t)*.045+Math.sin(TAU*360*t)*(.018+.012*Math.sin(TAU*10*t));
  if(index===1||index===6)return Math.sin(TAU*42*t)*.17+Math.sin(TAU*84*t)*.075+Math.sin(TAU*510*t)*(.5+.5*Math.sin(TAU*8*t))**6*.04;
  // 消防柴油机用低转速六缸脉冲与车体谐振，区别于气垫风扇。
  if(index===4)return Math.sin(TAU*54*t)*.18+Math.sin(TAU*108*t)*.075+Math.sin(TAU*216*t)*(.025+.018*Math.sin(TAU*18*t));
  if(index===2)return (Math.sin(TAU*84*t)*.17+Math.sin(TAU*168*t)*.07)*(.25+(.5+.5*Math.sin(TAU*19*t))**4);
  return Math.sin(TAU*96*t)*.1+Math.sin(TAU*192*t)*.055+Math.sin(TAU*384*t)*(.02+.015*Math.sin(TAU*24*t));
}

// 重炮低频压力与炮闩、机枪短爆音、水压喷流及召唤机械分别合成并限幅。
export function renderMachineSound(context,kind) {
  if(!MACHINE_SOUNDS[kind])return null;
  const duration=MACHINE_SOUNDS[kind][0],buffer=context.createBuffer(1,Math.ceil(RATE*duration),RATE),samples=buffer.getChannelData(0);
  let seed=[...kind].reduce((s,c)=>(Math.imul(s,31)+c.charCodeAt(0))>>>0,1927),low=0,mid=0,phase=0;
  const vehicle=/^vehicle-(start|stop)-(\d)$/.exec(kind);
  for(let i=0;i<samples.length;i++){
    const t=i/RATE,p=t/duration;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=seed/2147483648-1;low+=(n-low)*.04;mid+=(n-mid)*.23;
    let value=0;
    if(vehicle){
      const start=vehicle[1]==='start';phase+=(start?.35+p*.8:1.1-p*.85)/RATE;
      value=machineEngineSample(Number(vehicle[2]),phase)*2*Math.sin(Math.PI*p)**.7+(n-mid)*.12*envelope(t,.015);
    } else if(kind==='tank-125'||kind==='wolf-256'){
      value=((n-mid)*.9+mid*2.4)*envelope(t,.035)+low*6*envelope(t,.18)+
        (Math.sin(TAU*58*t)*.6+Math.sin(TAU*116*t)*.2)*envelope(t,.15)+
        mid*.8*envelope(t-.08,.2,.018)+(n-mid)*.28*envelope(t-.23,.018);
    } else if(kind==='vehicle-machinegun'||kind==='vehicle-vulcan'){
      const fast=kind==='vehicle-vulcan',decay=fast?.018:.042;
      value=((n-mid)*.8+mid*2.1+low*(fast?1:2))*envelope(t,decay)+
        Math.sin(TAU*(fast?165:105)*t)*.25*envelope(t,decay)+(n-mid)*.25*envelope(t-(fast?.014:.035),.007);
      if(fast)value*=.66;
    } else if(kind==='cat-crew-hit'||kind==='cat-crew-deploy'){
      value=(mid*.6+Math.sin(TAU*(kind==='cat-crew-hit'?180:320)*t)*.2)*envelope(t,.045,.006);
    } else if(kind==='gravity-gun'){
      phase+=TAU*(620-420*p)/RATE;value=(Math.sin(phase)+.35*Math.sin(phase*1.5))*.3*envelope(t,.17,.01)+mid*.4*envelope(t,.05);
    } else if(kind==='hover-tide'){
      phase+=TAU*(120+180*Math.exp(-t*24))/RATE;
      value=mid*2.1*envelope(t,.055,.006)+low*3.5*envelope(t,.09,.004)+
        Math.sin(phase)*.22*envelope(t,.065)+mid*.55*envelope(t-.065,.05,.012);
    } else if(kind==='mechanical-deploy'||kind==='spider-hatch'){
      const hatch=kind==='spider-hatch';phase+=TAU*(hatch?180+90*p:330+380*p)/RATE;
      value=(Math.sin(phase)*.2+Math.sin(phase*2)*.07)*Math.sin(Math.PI*p)**2+
        (n-mid)*.28*(envelope(t,.012)+envelope(t-(hatch?.32:.24),.016));
    } else {
      const spider=kind==='mechanical-spider';
      value=(mid*1.3+(n-mid)*.5)*envelope(t,spider?.017:.035)+
        Math.sin(TAU*(spider?870:430)*t)*.12*envelope(t,.045)+
        (n-mid)*.18*envelope(t-(spider?.045:.065),.009);
    }
    samples[i]=Math.tanh(value)*.68*Math.min(1,(duration-t)/.025);
  }
  return buffer;
}
