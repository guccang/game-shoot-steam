// 正式战斗模拟：只发送移动与任务意图，不修改伤害、生命、弹药或敌人。
import {Game} from '../src/game.js';
import {STORY_LOADOUTS} from '../src/config/story.js';
import {STORY_SITES} from '../src/world/story-sites.js';
import {writeFileSync,mkdirSync} from 'node:fs';
// 固定种子保证三配置可比较，并仍保留正式暴击和物理随机序列。
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// 行走到目标或绕中心横移，归一化输入交给正式移动物理。
function steer(player,target){const x=target.x-player.x,y=target.y-player.y,d=Math.hypot(x,y);return d<6?{x:0,y:0}:{x:x/d,y:y/d};}
// 全流程脚本玩家：遭遇区绕行，守点贴站拦截，冲锋时横向避让。
function run(id,route){
  const g=new Game(undefined,random(42));g.start();g.enterStory();
  const stages=[],failures=[],dt=.05;let previous='',seconds=0,peak=0,metrics,relay;
  for(let step=0;step<24000&&g.story;step++){
    const r=g.story;
    if(r.stageId!==previous){stages.push({stage:r.stageId,seconds:+seconds.toFixed(1),hp:+g.player.hp.toFixed(1),hull:+g.vehicle.hp.toFixed(1)});previous=r.stageId;}
    if(r.phase==='failed'){
      failures.push({stage:r.stageId,reason:r.error,seconds});
      if(failures.length>2)break;g.retryStory();continue;
    }
    if(r.dialogue){g.advanceStoryDialogue(true);continue;}
    if(r.phase==='prepare'){
      if(r.stageId==='Q30'){g.chooseStoryRoute(route);continue;}
      if(r.stageId==='Q80'){metrics={...r.metrics};relay=r.relay?.hp;g.claimStory();break;}
      g.chooseStoryLoadout(id);g.startStoryStage();continue;
    }
    const o=g.storyObjective(),site=STORY_SITES[o.site];let target=site;
    if(o.action&&Math.hypot(g.player.x-site.x,g.player.y-site.y)<=40){g.interactStory();target=g.player;}
    else if(r.combat&&!r.combat.cleared&&!o.action){
      const center=STORY_SITES[r.combat.site],radius=r.stageId==='Q50'?55:85,angle=seconds*.48;
      target={x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
      if(r.stageId==='Q50'){
        const e=g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y))[0];
        if(e){const d=Math.hypot(e.x-center.x,e.y-center.y)||1;target={x:center.x+(e.x-center.x)/d*110,y:center.y+(e.y-center.y)/d*110};}
      }
    }else if(r.stageId==='Q60'){
      const b=g.boss,center=STORY_SITES.BOSS,angle=seconds*.7;
      target={x:center.x+Math.cos(angle)*150,y:center.y+Math.sin(angle)*150};
      if(b?.ai?.phase==='windup'||b?.ai?.phase==='cast'){
        const a=b.ai.angle;target={x:g.player.x-Math.sin(a)*80,y:g.player.y+Math.cos(a)*80};
      }
    }
    if(g.state!=='playing')g.start();g.update(dt,steer(g.player,target));seconds+=dt;peak=Math.max(peak,g.enemies.length);
  }
  return {id,route,completed:!g.story,seconds:+seconds.toFixed(1),stage:g.story?.stageId,error:g.story?.error,
    hp:g.player.hp,relay:relay??g.story?.relay?.hp,metrics:metrics??g.story?.metrics,peak,failures,stages};
}
const results=[];
for(const l of STORY_LOADOUTS)for(const route of ['road','short']){const r=run(l.id,route);results.push(r);console.log(JSON.stringify(r));}
mkdirSync('output/playwright/sunleaf',{recursive:true});writeFileSync('output/playwright/sunleaf/simulation.json',JSON.stringify(results,null,2));
if(results.some(r=>!r.completed))process.exitCode=1;
