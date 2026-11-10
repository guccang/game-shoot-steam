// 潮汐炮双发时序与独立喷管行程，战斗、绘制和检查点共用。
export const TIDE_DELAY = .12;
// 快速缩回、缓慢复进，只移动喷管，减少动态保留小幅行程。
export function tideKick(age=1,reduced=false) {
  return (reduced?2:10)*Math.pow(Math.max(0,1-age/.32),2);
}
// 仅接收有界标量；保留夜间射程基值，双喷口与读档不能重复缩短射程。
export function validateTideState(raw) {
  if(!raw)return undefined;
  const cap=(v,max,fallback=0)=>Number.isFinite(v)?Math.max(0,Math.min(max,v)):fallback;
  const p=raw.pending,w=p?.weapon;
  return {next:raw.next===1?1:0,ages:[0,1].map(i=>cap(raw.ages?.[i],1,1)),
    pending:p&&w?{delay:cap(p.delay,TIDE_DELAY),side:p.side===1?1:0,amount:cap(p.amount,100000),critical:p.critical===true,
      weapon:{id:'hover-tide',weaponIndex:20,...(Number.isFinite(w.surfaceBaseRange)?{surfaceBaseRange:cap(w.surfaceBaseRange,2000)}:{}),statisticsSource:w.statisticsSource?{weapon:typeof w.statisticsSource.weapon==='string'?w.statisticsSource.weapon.slice(0,64):undefined,vehicle:typeof w.statisticsSource.vehicle==='string'?w.statisticsSource.vehicle.slice(0,64):undefined}:undefined,range:cap(w.range,2000),speed:cap(w.speed,2000),spread:cap(w.spread,2),impulse:cap(w.impulse,1000),pushLimit:Number.isFinite(w.pushLimit)?cap(w.pushLimit,760):undefined,groundedPush:w.groundedPush===true,hitRadius:cap(w.hitRadius,20,5),color:'#9ee2db'}}:null};
}
