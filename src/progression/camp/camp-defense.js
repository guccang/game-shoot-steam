import {validateRealmVehicles} from '../realms/realm-vehicles.js';
// 守门存档保留阶段、已完成配额与载具检查点，运行时代理、弹丸和绘制资源不进入 JSON。
import {CAMP_GATES,CAMP_DEFENSE,campDefenseBoss,CAMP_DEFENSE_GROWTH_VERSION} from '../../config/camp-defense.js';
// 数字使用有限上限，损坏的活动记录不能生成无限敌人或重复奖励。
const count=(n,max)=>Math.max(0,Math.min(max,Math.floor(Number(n)||0)));
// 玩法独立记录不触碰原清缴胜场、主线条件和装备所有权。
export function validateCampDefense(raw){
 let run=null;const r=raw?.run;
 if(r&&CAMP_GATES.some(g=>g.id===r.gateId)){
  const rounds=count(r.rounds,999999),bossMax=campDefenseBoss(rounds).hp;
  const bossHp=count(r.bossHp,bossMax);
  // 旧十波按完成比例折算，保留本波击杀、总成绩、拒马和领主伤势；迁移仅执行一次。
  const legacy=(Number(r.growthVersion)||0)<4,size=CAMP_DEFENSE.waves.length;
  const wave=Math.max(1,count(legacy?Math.ceil(count(r.wave,10)*size/10):r.wave,size)),total=CAMP_DEFENSE.waves[wave-1].count;
  const cleared=count(legacy?Math.floor(count(r.cleared,10)*size/10):r.cleared,size);
  run={growthVersion:CAMP_DEFENSE_GROWTH_VERSION,gateId:r.gateId,rounds,wave,cleared,waveKills:count(r.waveKills,total),kills:count(r.kills,590),
   gateHp:count(r.gateHp,CAMP_DEFENSE.gateHp),elapsed:count(r.elapsed,86400),
   // 爆散演出中关页，续档直接领取已经打出的战利品。
   phase:r.phase==='spoils'&&r.bossDefeated?'result':['waves','boss-ready','boss','rescue','result'].includes(r.phase)?r.phase:'waves',
   rescueRoll:Number.isFinite(r.rescueRoll)?Math.max(.9,Math.min(1.1,r.rescueRoll)):undefined,
   reason:['death','barricade'].includes(r.reason)?r.reason:null,bossDefeated:!!r.bossDefeated,
   bossHp,allies:Array.isArray(r.allies)?r.allies.filter(i=>Number.isInteger(i)&&CAMP_DEFENSE.allies[i]).slice(0,2):[],
   vehicles:validateRealmVehicles(r.vehicles),forestVehicles:validateRealmVehicles(r.forestVehicles)};
 }
 return {runs:count(raw?.runs,999999),best:['B','A','S'].includes(raw?.best)?raw.best:null,run};
}
