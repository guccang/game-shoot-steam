// 桥头拥堵回归：真实刚体挤压与追击共同运行，不允许用穿水或瞬移解除堵塞。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyAttack, updateEnemyAttack } from '../src/combat/enemy-attack.js';
import { navigationTarget, stepBodies, clearWaterPath } from '../src/physics/motion.js';
import { terrainBlocked } from '../src/physics/terrain-navigation.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';

test('桥面偏离中线但出口通畅时继续过桥，不返回身后入口',()=>{
  for(const [body,target] of [
    [{x:1250,y:712},{x:1480,y:470}],
    [{x:1320,y:746},{x:1080,y:970}],
  ]){
    const goal=navigationTarget(body,target);
    assert.ok((goal.x-body.x)*(target.x-body.x)>0,'不应倒退回桥头');
    assert.ok(clearWaterPath(body,goal),'整段桥面必须可通行');
  }
});

// 从两侧桥头以多排队形出发，保留碰撞、扑击及循环世界的最近镜像规则。
function crossCrowdedBridge(side,targetY,dt,offset={x:0,y:0}){
  const target={x:(side<0?1480:1080)+offset.x,y:targetY+offset.y};
  const enemies=Array.from({length:12},(_,i)=>({id:i+1,type:'enemy',
    x:(side<0?1120-i%3*36:1470+i%3*36)+offset.x,y:684+Math.floor(i/3)*32+offset.y,
    hp:100,radius:17,speed:50,assault:createEnemyAttack()}));
  const crossed=new Set();
  for(let step=0;step<40/dt;step++){
    stepBodies(enemies,dt,WORLD,()=>{},[]);
    for(const enemy of enemies){
      updateEnemyAttack(enemy,target,target,dt,WORLD);
      assert.equal(terrainBlocked(enemy.x,enemy.y,12),false,'追击途中不能进入河水');
      if(worldDistance(enemy,target)<=105)crossed.add(enemy.id);
    }
  }
  assert.equal(crossed.size,12,'整群都应通过桥梁并接近目标');
}

for(const dt of [1/30,1/120])for(const side of [-1,1])for(const y of [470,970])
  test(`${Math.round(1/dt)} 帧 ${side<0?'西到东':'东到西'} ${y<700?'北斜向':'南斜向'}拥挤过桥`,()=>crossCrowdedBridge(side,y,dt));
test('周期镜像桥头也能解除群体拥堵',()=>crossCrowdedBridge(-1,470,1/30,{x:WORLD.width,y:-WORLD.height}));
