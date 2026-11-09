// 挖矿和铺轨遇敌临时收起工具；安全后恢复原作业意图，不恢复旧挖掘目标。
import {MINE_WORK_COMBAT} from '../../config/mining.js';
import {currentMineLayer} from './mine-layers.js';
import {mineLineClear} from '../../physics/mine-motion.js';
import {mineNotice} from './mine-transactions.js';
// 手动换工具、钓鱼、登车或换层时取消待恢复作业，避免覆盖玩家新选择。
export function cancelMineWorkCombat(room){if(room){room.combatWork=null;room.combatRecovery=0;}}
// 只响应可见活怪；已有交战使用稍远的退出距离，并等待短暂安全期避免来回切换。
export function updateMineWorkCombat(game,dt){
 const room=game.cottage;if(room?.kind!=='mine'||game.state!=='playing')return;
 if(game.vehicle.active||room.ride||game.fishing||room.shaftWork){cancelMineWorkCombat(room);return;}
 if(!room.combatWork&&!room.autoDig&&!['pick','rail'].includes(room.tool))return;
 const range=Math.min(MINE_WORK_COMBAT.maxRange,Math.max(MINE_WORK_COMBAT.minRange,game.weapon().range+16))+(room.combatWork?MINE_WORK_COMBAT.exitMargin:0);
 const threat=Object.values(currentMineLayer(game).animals).some(a=>a.hp>0&&Math.hypot(a.x-game.player.x,a.y-game.player.y)<=range&&mineLineClear(game,game.player,a));
 if(threat){
  room.combatRecovery=0;
  if(!room.combatWork){room.combatWork={tool:room.tool,autoDig:room.autoDig};Object.assign(room,{tool:null,autoDig:false,dig:null,strike:0});mineNotice(game,'发现怪物，自动拿起武器；安全后继续作业。');}
 }else if(room.combatWork){
  room.combatRecovery=(room.combatRecovery||0)+dt;
  if(room.combatRecovery+1e-9>=MINE_WORK_COMBAT.resumeDelay){const work=room.combatWork;Object.assign(room,{tool:work.tool,autoDig:work.autoDig,dig:null,weaponReady:false,weaponTarget:null});cancelMineWorkCombat(room);mineNotice(game,work.tool==='rail'?'周围安全，已恢复铺轨。':'周围安全，已恢复挖矿。');}
 }
}
