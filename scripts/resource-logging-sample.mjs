// 正式采集样本：逐棵走近树木，调用真实电锯攻击；不直接扣树血或补钱包。
import {Game} from '../src/core/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {skipArrivalJourney} from '../src/core/camp/ranger-arrival.js';
import {worldDistance,nearest} from '../src/world/coordinates.js';
import {seededRandom} from '../src/balance/model-metrics.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
const samples=[];
for(const seed of [1,2,3]){
 const g=new Game(freshRangerProgress(),seededRandom(seed));g.start();skipArrivalJourney(g);
 let target=g.trees.find(t=>t.hp>0),seconds=0;Object.assign(g.player,{x:target.x-55,y:target.y});
 while(g.chopped<40&&seconds<120){
  if(target.hp<=0)target=g.trees.filter(t=>t.hp>0).sort((a,b)=>worldDistance(a,g.player)-worldDistance(b,g.player))[0];
  const p=nearest(target,g.player),dx=p.x-g.player.x,dy=p.y-g.player.y,d=Math.hypot(dx,dy);
  g.player.angle=Math.atan2(dy,dx);g.update(.05,d>55?{x:dx/d,y:dy/d}:{x:0,y:0});seconds+=.05;
 }
 samples.push({seed,seconds,trees:g.chopped,coins:g.progress.coins,wood:g.progress.wood});g.dispose?.();
}
const destination=process.argv[2]||'docs/balance-reports/resource-source/logging-samples.json';
mkdirSync(dirname(destination),{recursive:true});
writeFileSync(destination,JSON.stringify({kind:'正式运行时自动操作采样',assumption:'从第一棵树旁开始，含逐棵移动，不含往返营地；不是真人平均或长期森林密度保证。',samples},null,2));console.log(JSON.stringify(samples));
