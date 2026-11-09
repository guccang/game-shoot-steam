// 固定山峰场景测量正式敌人更新；仅报告计时，不用机器相关阈值代替正确性验收。
import {Game,freshProgress} from '../src/game.js';
import {updateEnemies} from '../src/core/battle/enemy-manager.js';
import {createEnemyAttack} from '../src/combat/enemy-attack.js';
import {NATURAL_TERRAIN} from '../src/world/natural-terrain.js';
import {mountainPeaks} from '../src/world/mountain-peaks.js';

const game=new Game(freshProgress(),()=>.5),results=[];
game.state='playing';game.trees=[];game.boss=null;game.remnants=[];
for(const mountain of NATURAL_TERRAIN.mountains.filter(item=>item.regional).slice(0,12)){
  const peak=mountainPeaks(mountain)[4];if(!peak)continue;
  Object.assign(game.player,{x:peak.x+130,y:peak.y});
  game.enemies=Array.from({length:3},(_,index)=>({id:index+1,type:'enemy',mapId:'forest',
    x:peak.x-130,y:peak.y+(index-1)*40,radius:17,hp:100,maxHp:100,speed:60,damage:1,
    flash:0,phase:0,assault:createEnemyAttack()}));
  const begin=performance.now();updateEnemies(game,.04,game.player);const coldMs=performance.now()-begin;
  const samples=[];
  for(let frame=0;frame<50;frame++){
    const start=performance.now();updateEnemies(game,.04,game.player);samples.push(performance.now()-start);
  }
  results.push({id:mountain.id,coldMs,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,maxMs:Math.max(...samples)});
}
console.log(JSON.stringify({scenario:'十二处山地，三只敌人，25Hz正式敌人更新，不含渲染',results,
  coldMeanMs:results.reduce((sum,item)=>sum+item.coldMs,0)/results.length,
  steadyMeanMs:results.reduce((sum,item)=>sum+item.meanMs,0)/results.length},null,2));
