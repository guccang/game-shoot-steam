// 枪管转子状态绑定独立弹仓；消耗、伤害和射速仍由原战斗模块决定。
export function advanceRotary(magazine,weapon,dt) {
  if(weapon.id!=='gatling'||dt<=0)return;
  magazine.rotorDrive=Math.max(0,(magazine.rotorDrive||0)-dt);
  const desired=magazine.rotorDrive>0&&magazine.remaining<=0?38:0;
  magazine.rotorSpeed=(magazine.rotorSpeed||0)+(desired-(magazine.rotorSpeed||0))*(1-Math.exp(-dt*7));
  magazine.rotor=((magazine.rotor||0)+magazine.rotorSpeed*dt)%(Math.PI*2);
}
