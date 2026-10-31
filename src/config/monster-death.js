// 死亡表现预算独立于伤害、奖励和残影寿命，所有材质共用同一节拍。
export const MONSTER_DEATH={puffs:5,chips:10,forwardChips:8,arcs:2,flashEnd:.24,smokeEnd:.85};
// 正式绘制与验收共用归一化时钟，保留重击后先翻滚再爆裂。
export function monsterDeathPose(enemy,reduced=false){
 const duration=enemy.duration||.6,delay=enemy.burstDelay||0,age=duration-enemy.life;
 const t=Math.max(0,Math.min(1,(age-delay)/Math.max(.01,duration-delay))),active=!!enemy.burst&&age>=delay&&enemy.life>0;
 const angle=Math.atan2(Number.isFinite(enemy.hitY)?enemy.hitY:0,Number.isFinite(enemy.hitX)?enemy.hitX:1);
 const strength=1+Math.min(1,Math.max(0,(enemy.deathPower||1)-1))*.35;
 return {active,t,angle,strength,spread:reduced?8:8+30*(1-(1-t)**3),flash:active&&!reduced?Math.max(0,1-t/MONSTER_DEATH.flashEnd):0,
  smoke:active?Math.max(0,1-t/MONSTER_DEATH.smokeEnd):0,alpha:active?Math.min(1,(1-t)/.3):0,
  puffs:reduced?3:MONSTER_DEATH.puffs,chips:reduced?0:MONSTER_DEATH.chips,arcs:reduced?0:MONSTER_DEATH.arcs};
}
// 每枚碎屑沿致命弹道快速推出后减速，少量短反溅提供击穿感；不调用游戏随机源。
export function monsterDeathFragments(enemy,reduced=false){
 const pose=monsterDeathPose(enemy,reduced);if(!pose.active||reduced)return [];
 return Array.from({length:pose.chips},(_,i)=>{
  const forward=i<MONSTER_DEATH.forwardChips,angle=pose.angle+(forward?(i-3.5)*.15:Math.PI+(i-8.5)*.55);
  const reach=(forward?56+(i%4)*13:18+(i%2)*8)*pose.strength;
  // 位移在头0.1秒迅速展开，拖尾取同一轨迹的前一瞬，避免方向与实体翻滚耦合。
  const point=t=>{const d=reach*(1-Math.exp(-7*t));return {x:Math.cos(angle)*d,y:Math.sin(angle)*d-9*Math.sin(t*Math.PI)+12*t*t};};
  const p=point(pose.t),tail=point(Math.max(0,pose.t-.045)),dx=tail.x-p.x,dy=tail.y-p.y,limit=Math.min(1,20/Math.max(1,Math.hypot(dx,dy)));
  return {...p,tailX:p.x+dx*limit,tailY:p.y+dy*limit,angle:angle+pose.t*(i%2?3:-3),forward,size:1+(i%3)*.15};
 });
}
