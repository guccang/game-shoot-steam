// 表现容器复用回归：删除、环引用、新增字段与查询换绑都不能污染权威状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';

// 最小权威场景包含数组、共享成员与带环的居民表。
function fixture(){
 const actor={x:20,y:30,age:1},actors=new Map([['a',actor]]),game={state:'playing',mapId:'forest',time:1,player:{x:1,y:2},enemies:[actor],livingActors:actors};
 actor.nodes=game.enemies;actors.set('self',actors);return {game,actor};
}

test('集合复用保持共享和环引用，缩短数组及删除Map成员不会复活对象',()=>{
 const {game,actor}=fixture(),interpolation=createRenderInterpolation();interpolation.beforeStep(game);actor.x+=8;
 const first=interpolation.sample(game,.25),array=first.enemies,map=first.livingActors;
 assert.equal(array[0].x,22);assert.equal(map.get('a'),array[0]);assert.equal(array[0].nodes,array);assert.equal(map.get('self'),map);
 assert.notEqual(array,game.enemies);assert.notEqual(map,game.livingActors);assert.equal(actor.x,28);
 game.enemies.length=0;game.livingActors.delete('a');
 const second=interpolation.sample(game,.75);assert.equal(second.enemies,array);assert.equal(second.livingActors,map);assert.equal(array.length,0);assert.equal(map.has('a'),false);assert.equal(map.size,1);
 game.enemies.push({x:99,y:5});assert.equal(interpolation.sample(game,.1).enemies[0].x,99);
});

test('新字段立即显示、移除字段不残留，动作重置不倒放',()=>{
 const {game,actor}=fixture(),interpolation=createRenderInterpolation();interpolation.beforeStep(game);
 actor.z=7;actor.age=0;actor.x=24;delete actor.y;
 const view=interpolation.sample(game,.5).enemies[0];assert.equal(view.z,7);assert.equal(view.age,0);assert.equal(view.x,22);assert.equal(Object.hasOwn(view,'y'),false);
 delete actor.z;assert.equal(Object.hasOwn(interpolation.sample(game,.5).enemies[0],'z'),false);
 assert.equal(actor.x,24);
});

test('查询绑定复用权威this，方法替换和删除立即生效',()=>{
 const {game}=fixture(),interpolation=createRenderInterpolation();game.weapon=function(){return this.player;};
 const first=interpolation.sample(game,.2),query=first.weapon;assert.equal(query(),game.player);
 assert.equal(interpolation.sample(game,.8).weapon,query);
 game.weapon=function(){return this.time;};const next=interpolation.sample(game,.8);assert.notEqual(next.weapon,query);assert.equal(next.weapon(),1);
 delete game.weapon;assert.equal(interpolation.sample(game,.8).weapon,undefined);
});
