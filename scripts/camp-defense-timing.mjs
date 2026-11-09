// 守门节奏验收：正式武器、弹丸、敌人和拒马承伤，无秒杀或加血钩子。
import {Game,freshProgress} from '../src/game.js';
import {startCampDefense,spawnCampBoss} from '../src/core/camp/camp-defense.js';
import {campDefenseGrade} from '../src/config/camp-defense.js';
const results=[];
for(const equipped of [false,true]){
 const p=freshProgress();p.mainline.phase='complete';if(equipped){p.weapons[10]=8;p.weapon=10;p.vehicleHulls[1]=8;p.vehicleIndex=1;p.heroes[0]=6;}
 const g=new Game(p,()=>.41);g.state='playing';Object.assign(g.player,{x:120,y:729});startCampDefense(g,'left');if(equipped)g.summonVehicle();
 let frames=0,maxEnemies=0;
 while(g.campDefense.phase!=='result'&&frames<12000){if(g.campDefense.phase==='boss-ready')spawnCampBoss(g);g.update(.05);frames++;maxEnemies=Math.max(maxEnemies,g.enemies.length);}
 const r=g.campDefense;results.push({equipped,seconds:frames*.05,phase:r.phase,reason:r.reason,wave:r.wave,cleared:r.cleared,kills:r.kills,gateHp:r.gateHp,grade:campDefenseGrade(r),maxEnemies,remaining:g.enemies.filter(e=>e.hp>0).length});
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.phase!=='result'))process.exitCode=1;
