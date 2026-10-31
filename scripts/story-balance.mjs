// 独立输出与站桩容错样本：正式开火、装填、冲锋和伤害链保持不变。
import {Game} from '../src/game.js';
import {STORY_LOADOUTS} from '../src/config/story.js';
import {writeFileSync} from 'node:fs';
// 只搭建Q60准备夹具，不改写战斗数值。
function bossGame(id){const g=new Game(undefined,()=>.42);g.start();g.enterStory();g.advanceStoryDialogue(true);g.chooseStoryLoadout(id);Object.assign(g.story,{stageId:'Q60',phase:'prepare'});g.startStoryStage();return g;}
const result=[];
for(const l of STORY_LOADOUTS){
  const stationary=bossGame(l.id);let seconds=0,casts=0,previous='';
  while(seconds<240&&stationary.story?.stageId==='Q60'&&stationary.story.phase==='active'){
    stationary.update(.05);seconds+=.05;
    if(stationary.boss?.ai.phase==='cast'&&previous!=='cast')casts++;previous=stationary.boss?.ai.phase;
  }
  // 单体持续输出使用锚定靶，隔帧复位靶坐标避免击退推出射程；实际命中、射失和装填仍正常结算。
  const g=bossGame(l.id);g.boss=null;g.story.support=null;
  const e=g.spawnEnemy(0,0,{x:g.player.x,y:g.player.y-180},{bossOwner:'fixture'});
  Object.assign(e,{football:true,workshopTarget:true,hp:1e9,maxHp:1e9,type:'boss',mass:6,radius:48});
  let damage=0,hits=0;const formalHit=g.hit.bind(g);
  // 旁路仅记录命中，不截断或替换原始结算。
  g.hit=(target,amount,...rest)=>{if(target===e){damage+=amount;hits++;}return formalHit(target,amount,...rest);};
  for(let i=0;i<1800;i++){Object.assign(e,{x:g.player.x,y:g.player.y-180,vx:0,vy:0});g.update(.05);}
  result.push({id:l.id,stationary:{seconds:+seconds.toFixed(1),failed:stationary.story?.phase==='failed',stage:stationary.story?.stageId,hp:stationary.player.hp,hull:stationary.vehicle.hp,casts},singleTarget:{seconds:90,damage,hits,dps:+(damage/90).toFixed(2)}});
}
writeFileSync('output/playwright/sunleaf/balance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
