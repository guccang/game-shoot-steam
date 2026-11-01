// 重型坦克受力姿态：只改变悬挂上方的结构，不推动玩家或修改碰撞体。
export function tankHullPose(vehicle, reduced = false) {
  const age=vehicle.recoil?.tankAge;
  if(reduced||![1,6,9,10].includes(vehicle.index)||![18,21,23,24].includes(vehicle.weaponIndex)||!Number.isFinite(age)||age>=.8)
    return {x:0,y:0,compression:0};
  const t=Math.max(0,age),angle=vehicle.recoil.tankAngle??vehicle.angle??0;
  // 急压、阻尼回稳及一次轻微余振，时间和方向不依赖当前瞄准目标。
  const force=t<.07?Math.sin(t/.07*Math.PI/2):t<.42?Math.pow(1-(t-.07)/.35,2):-.12*Math.sin((t-.42)/.38*Math.PI);
  return {x:-Math.cos(angle)*5*force,y:-Math.sin(angle)*3*force+Math.abs(force)*2.5,compression:force*3};
}
