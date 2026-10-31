// 主线整备后的前五轮领主输出预算：固定耐久靶走正式攻击、弹道、命中和装填，排除走位与暴击。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {clearingBossHealth} from '../src/config/clearing-boss.js';
import {createWorkshopTrial} from '../src/core/workshop-trial.js';

// 从实际任务条件读取最低等级，避免任务升级要求变化后测试仍沿用旧装备。
function taskLevel(id,path){
 const goal=MAINLINE_TASKS.find(task=>task.id===id).goal;
 // 任务允许两种清群武器，递归读取组合条件中的对应装备要求。
 const pending=[goal];let condition;
 while(pending.length&&!condition){const item=pending.pop();if(item.path===path)condition=item;else pending.push(...(item.all||item.any||[]));}
 assert.ok(condition,`${id}缺少${path}`);
 return condition.min;
}
// 第二轮采用已完成角色和弹匣教学的手枪，后续三轮采用任务要求购买的散弹枪。
function taskLoadout(round){
 const p=freshProgress();p.hero=0;p.weapon=round>=2?3:0;
 p.weapons[0]=taskLevel('pistol-upgrade','progress.weapons.0');
 p.heroes[0]=round===0?taskLevel('pistol-upgrade','progress.heroes.0'):taskLevel('first-boss','progress.heroes.0');
 if(round>=1)for(const part of ['capacity','reload'])p.weaponParts[0][part]=taskLevel('pistol-parts',`progress.weaponParts.0.${part}`);
 if(round>=2)p.weapons[3]=taskLevel('buy-shotgun','progress.weapons.3');
 p.mastery.fill(0);p.mods.fill(0);
 return p;
}

for(let round=0;round<5;round++)test(`第${round+1}轮主线装备持续输出约15～27秒`,()=>{
 const p=taskLoadout(round),hp=clearingBossHealth(round);
 const trial=createWorkshopTrial(p,'weapons',p.weapon,false,{count:1,hp});
 // 固定领主体型靶保证近距离散弹完整命中；不替换伤害或射击算法，不视作移动Boss实战。
 trial.game.enemies[0].radius=48;
 trial.game.random=()=>.5;
 let shots=0,reloads=0;
 trial.game.onEvent=type=>{if(type==='shot')shots++;if(type==='reload-start')reloads++;};
 while(!trial.destroyed&&trial.elapsed<30)trial.advance(1/60);
 assert.ok(trial.destroyed,'正式弹道未能击毁靶标');
 assert.ok(trial.elapsed>=15&&trial.elapsed<=27,`实际${trial.elapsed.toFixed(2)}秒`);
 assert.ok(reloads>0,'应计入实际装填');
 console.log(JSON.stringify({round:round+1,hp,weapon:p.weapon,damage:trial.game.damage(),shots,reloads,seconds:Number(trial.elapsed.toFixed(2))}));
});
