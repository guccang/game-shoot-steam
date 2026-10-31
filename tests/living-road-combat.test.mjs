// 聚落木门只阻止威胁进入，不能让玩家失去向道路两侧开火的能力。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {livingSafePoint,livingBoltBlocked} from '../src/world/living-spaces.js';
import {WORLD} from '../src/world/coordinates.js';

// 使用正式出生、寻敌、开火和弹丸碰撞，隔离怪物移动与主线对白。
function roadside(weapon,side,offset=0){
  const p=freshProgress();p.weapon=weapon;p.weapons[weapon]=1;
  const game=new Game(p,()=>.5);game.start();game.trees=[];
  Object.assign(game.player,{x:(side<0?140:1070)+offset,y:729,aimInitialized:false});
  const enemy=game.spawnEnemy(0,0,{x:(side<0?140:1070)+side*100+offset,y:729},{ambient:true});
  return {game,enemy};
}

test('聚落木门可命中东西两侧敌人，普通弹丸和激光在循环镜像中行为一致',()=>{
  for(const weapon of [0,1])for(const side of [-1,1])for(const offset of [0,-WORLD.width]){
    const {game,enemy}=roadside(weapon,side,offset);
    assert.equal(livingSafePoint(game.player),true);
    assert.equal(livingSafePoint(enemy),false);
    assert.equal(game.findAttackTarget(),enemy,'木门不应关闭寻敌');
    const hp=enemy.hp;assert.equal(game.attack(),true);
    for(let i=0;i<40;i++)game.updateProjectiles(.05);
    assert.ok(enemy.hp<hp,'正式攻击应命中木门外的敌人');
  }
});

test('允许玩家开火后，聚落仍拦截敌方伤害与穿越弹丸，居民不进入目标列表',()=>{
  const {game,enemy}=roadside(0,-1),hp=game.player.hp;
  game.player.invincible=0;game.hurt(100);assert.equal(game.player.hp,hp);
  assert.equal(livingBoltBlocked(game,{x:0,y:729,vx:400,vy:0},1),true);
  game.enemies=[];game.livingActors=new Map([['neighbor',{x:140,y:729,hp:100}]]);
  assert.equal(game.findAttackTarget(),null);
  assert.equal(enemy.hp>0,true);
});
