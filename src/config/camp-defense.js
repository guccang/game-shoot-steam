// 守门玩法表：场地、波次、援军、评分与报酬均独立于清缴数值。
import {SETTLEMENTS} from './settlements.js';
import {missionBossHealth} from './mission-boss-balance.js';
const camp=SETTLEMENTS.find(s=>s.id==='sunleaf');
// 东门临河、南门紧邻小院，只在有连续开阔前场的北门和西门守卫。
export const CAMP_GATES=camp.gates.filter(g=>['top','left'].includes(g.side)).map(g=>({
 id:g.side,name:{top:'北门',bottom:'南门',left:'西门'}[g.side],
 x:g.side==='left'?camp.left:g.at,y:g.side==='top'?camp.top:g.side==='bottom'?camp.bottom:g.at,
 nx:g.side==='left'?-1:0,ny:g.side==='top'?-1:g.side==='bottom'?1:0,
}));
export const CAMP_DEFENSE={gateHp:1500,limit:56,rest:3,spawnInterval:.17,radius:410,
 // 团子在拒马外305至375单位出生，比原先外移70单位，保留横向分散与战区边界。
 spawn:{depth:305,depthSpread:70,width:240,offscreenEvery:3,offscreenMargin:64},
 // 每三只优先安排一只从画面外走入，64单位边距覆盖身体与头顶标签。
 // 先出营再交战，随机强度只在临时援军中生效。
 rescue:{firstDelay:.8,stagger:2.8,inside:85,queueGap:65,outside:75,spread:48,speed:82,attackDistance:135,combatSeconds:14,bubbleSeconds:4},
  // 兽潮使用独立生命曲线：首场每波18+波次索引×3，不随野外等级属性变化。
 waves:Array.from({length:10},(_,i)=>({level:i+1,count:18+i*5,hp:18+i*3,damage:2+i/3,speed:34+i*2,spawnInterval:.36-i*.018})),
 boss:{kind:'dumpling',hp:1900,damage:32,blastDamage:60,speed:45},
 spoils:{duration:1.8,bonus:{coins:3000,wood:300,parts:12,crystal:6,core:1}},
 allies:[{hero:1,name:'薄荷',vehicle:1,weapon:10},{hero:2,name:'栗子',vehicle:2,weapon:8},{hero:4,name:'雪团',vehicle:3,weapon:6}],
 grades:{S:{coins:1200,wood:400,parts:8},A:{coins:750,wood:250,parts:5},B:{coins:300,wood:100,parts:2}},
 lines:{death:'歇一歇，换我来！',barricade:'稳住，我们来了！',victory:'十波怪潮和领主都退了，今晚一起吃顿热饭。'},
};
// 援军出场前冻结成绩，救场击杀不得反过来抬高评分。
export function campDefenseGrade({cleared,gateHp,bossDefeated,reason}){
 return bossDefeated&&!reason?(gateHp>=CAMP_DEFENSE.gateHp*.5?'S':'A'):cleared>=6?'A':'B';
}

// 守门报酬与巨物掉落组成一张结算单，预览和实际入账使用同一份金额。
export function campDefenseReward(run){
 const reward={...CAMP_DEFENSE.grades[campDefenseGrade(run)]};
 if(run.cleared===10 && run.bossDefeated && !run.reason){
   for(const [key,amount] of Object.entries(CAMP_DEFENSE.spoils.bonus))reward[key]=(reward[key]||0)+amount;
 }
 return reward;
}

// 兽潮独立版本用于旧在途领主按剩余比例迁移，不改变已结算次数。
export const CAMP_DEFENSE_GROWTH_VERSION=3;
// 每场相对上一场复合增长5%；仅在数值表示极限处防止溢出，不沿用旧玩法倍率上限。
export function campDefenseDifficulty(completed=0){
 const n=Math.max(0,Math.floor(Number.isFinite(completed)?completed:0));
 const scale=Math.min(Number.MAX_SAFE_INTEGER,1.05**Math.min(n,Math.log(Number.MAX_SAFE_INTEGER)/Math.log(1.05)));
 return {health:scale,damage:scale};
}
// 成长全部相乘后才取整，避免逐波或逐场取整丢失小幅增长。
function scaledCampStat(base,scale){return Math.min(Number.MAX_SAFE_INTEGER,Math.max(1,Math.round(base*scale)));}
// 正式刷怪与续档共用属性入口，移速及数量始终来自原波次配置。
export function campDefenseWave(wave=1,completed=0){
 const index=Math.min(9,Math.max(0,Math.floor(Number.isFinite(wave)?wave:1)-1)),base=CAMP_DEFENSE.waves[index],d=campDefenseDifficulty(completed);
 // 独立基础生命只叠加场次成长，不再应用此前连续降血的统一系数。
 return {...base,hp:scaledCampStat(base.hp,d.health),damage:scaledCampStat(base.damage,d.damage)};
}
// 领主不计作第十一波，保留自身基础属性，仅按已结算兽潮次数成长。
export function campDefenseBoss(completed=0){
 const base=CAMP_DEFENSE.boss,d=campDefenseDifficulty(completed);
 return {...base,hp:missionBossHealth(scaledCampStat(base.hp,d.health)),damage:scaledCampStat(base.damage,d.damage),blastDamage:scaledCampStat(base.blastDamage,d.damage)};
}
