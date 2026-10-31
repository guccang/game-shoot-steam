// 电锯可见导板与接触判定共用几何，升级只延长锯链，不拉伸机身和握柄。
import {WEAPONS} from '../config/weapons.js';
import {GAMEPLAY_VALUES} from '../config/gameplay-values.js';
import {PLAYER_SCALE,GUN_SCALE,weaponPose} from './recoil.js';

// 与部件升级的正式范围公式一致，供只有装备部件的绘制入口读取。
export function chainsawRange(parts){
 if(Number.isFinite(parts?.sawRange))return parts.sawRange;
 return WEAPONS[14].range*(1+GAMEPLAY_VALUES.parts.rangePerLevel*((parts?.range||1)-1));
}

// 手持从角色中心计算总长；独立挂载保留原枪口后退17单位的攻击起点。
export function chainsawTip(range,scale=PLAYER_SCALE*GUN_SCALE,mounted=false){
 return mounted?64+(range-17)/scale:(range-18*PLAYER_SCALE)/scale;
}

// 圆头导板的中心线两端内收半宽，使扫圆外缘恰好到达可见锯尖。
export function heldChainsawSegment(player,range,reduced=false){
 const pose=weaponPose(player.angle,14,player.recoil,reduced?.35:1);
 const tip=chainsawTip(range),radius=9*PLAYER_SCALE*GUN_SCALE;
 // 变换与正式手持绘制完全一致，包含左右翻转、后坐、步行起伏及骑手高度。
 const point=local=>{
  const x=8-pose.kick+local*GUN_SCALE;
  return {x:player.x+(pose.bodyX+pose.gripX+pose.flip*Math.cos(pose.rotation)*x)*PLAYER_SCALE,
   y:player.y+(pose.bodyY+pose.gripY+Math.sin(player.walkPhase||0)*1.5+Math.sin(pose.rotation)*x)*PLAYER_SCALE};
 };
 return {start:point(10),end:point(tip-9),radius};
}
