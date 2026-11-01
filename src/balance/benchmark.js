import { i18nText } from "../i18n/index.js";
// 正式战斗靶场对照：保留真实攻击、装填、蓄能与召唤，不将面板DPS冒充实测。
import { createWorkshopTrial } from '../core/workshop-trial.js';
import { freshProgress } from '../progression/progress.js';
import { bindEconomy, heroHealth } from '../config/economy.js';
import { weaponDamage } from '../config/weapon-mods.js';
import { vehicleMaxHp } from '../config/vehicles.js';
import { HEROES } from '../config/heroes.js';
// 两侧使用同种子、位置、等级和时长；耐久靶没有领主AI，不评价躲避能力。
export function benchmarkGrowth(config,index=0,level=4,seconds=30){
  if(!Number.isInteger(index)||index<0||index>16||!Number.isInteger(level)||level<1||level>19||!Number.isFinite(seconds)||seconds<5||seconds>60)throw Error(i18nText("balance.benchmark.b809270914"));
  const results=[];
  for(const scenario of [{id:'single',name:i18nText("balance.benchmark.ff29b63dd6"),count:1,hp:120},{id:'group',name:i18nText("balance.benchmark.a26af94108"),count:5,hp:120},{id:'boss',name:i18nText("balance.benchmark.f80a28bd40"),count:1,hp:3000}]){
    const sides=[];
    for(const current of [level,level+1]){
      const p=bindEconomy(freshProgress(),config);p.weapons[index]=current;p.weapon=index;p.heroes[0]=5;
      const trial=createWorkshopTrial(p,'weapons',index,false,{count:scenario.count,hp:scenario.hp});
      let hits=0,damage=0,shots=0,firstKill=null;
      const original=trial.game.hit.bind(trial.game);
      // 包裹正式命中以读取有效扣血，不替换命中或伤害算法。
      trial.game.hit=(target,amount,...rest)=>{
        const before=target.hp;original(target,amount,...rest);
        if(before>0&&target.hp<before){hits++;damage+=before-Math.max(0,target.hp);if(target.hp<=0&&firstKill===null)firstKill=trial.elapsed;}
      };
      trial.game.onEvent=type=>{if(type==='shot')shots++;};
      for(let i=0;i<Math.round(seconds*60);i++)trial.advance(1/60);
      sides.push({level:current,damage:weaponDamage(p,index),effectiveDps:damage/seconds,hits,shots,kills:trial.destroyed,
        firstKillSeconds:firstKill,shotsPerKill:trial.destroyed?shots/trial.destroyed:null,
        heroHp:heroHealth(HEROES[0].hp,current,p),hullHp:vehicleMaxHp(bindEconomy({...p,vehicleHulls:p.vehicleHulls.map((level,i)=>i===p.vehicleIndex?current:level)},config),heroHealth(HEROES[0].hp,5,p))});
    }
    results.push({...scenario,before:sides[0],after:sides[1]});
  }
  return {kind:'runtime-target-benchmark',seconds,index,results,note:i18nText("balance.benchmark.9788677d13")};
}
