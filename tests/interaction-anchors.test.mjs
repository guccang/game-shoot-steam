// 固定目标锚点的回归：覆盖全部操作类别、玩家位移、循环镜像及停车过程提示。
import test from 'node:test';
import assert from 'node:assert/strict';
import {nearbyInteractionAnchor,parkingInteractionAnchor,projectInteractionAnchor,doorwayInteractionAnchor} from '../src/world/interaction-anchors.js';
import {drawParkingCountdown} from '../src/rendering/parking.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {FIRE_STATION} from '../src/world/fire-navigation.js';
import {WORLD} from '../src/world/coordinates.js';

test('建筑、停车、告示与室内操作使用稳定目标，移动玩家不移动锚点',()=>{
 const g={player:{x:650,y:1000}},entries=[{type:'workshop',key:'vehicle'},{type:'arrival-repair'},{type:'restoration',key:'garage'},{type:'realm',key:'tower'},{type:'post',key:'sunleaf-post'},{type:'clearing'},{type:'gate',key:'left'},{type:'rest'},{type:'display',x:90,y:100},{type:'fire-parking'},...PARKING_SPOTS.map(s=>({type:'parking',id:'parking-'+s.id}))];
 for(const e of entries){const a=nearbyInteractionAnchor(g,e);assert.ok(a,e.type);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));g.player.x+=5;g.player.y+=3;assert.deepEqual(nearbyInteractionAnchor(g,e),a);}
 // 各泊位都读取最新坐标，尤其小屋东侧位不能再投影到房屋中心。
 for(const spot of PARKING_SPOTS)assert.deepEqual(parkingInteractionAnchor(spot.id),{x:spot.x,y:spot.y-16,space:'world'});
 assert.equal(parkingInteractionAnchor('missing'),null);
 assert.equal(nearbyInteractionAnchor(g,{type:'fire-parking'}).x,FIRE_STATION.x);
 assert.equal(nearbyInteractionAnchor(g,{type:'unknown'}),null);
 const entrance=doorwayInteractionAnchor({...g,cottageEntryKind:'vehicle'}),upgrade=nearbyInteractionAnchor(g,{type:'workshop',key:'vehicle'});
 assert.equal(upgrade.hitbox,true);assert.equal(upgrade.y,WORKSHOP_INTERIORS.vehicle.site.y);assert.ok(upgrade.width>=44&&upgrade.height>=44);assert.ok(entrance.y<upgrade.y,'倒计时留在屋面，点击锚点归属建筑脚底');
});

test('镜头移动与缩放按世界投影，室内不用外部世界坐标',()=>{
 const a={x:20,y:40,space:'world'},v={x:WORLD.width-100,y:0,w:400,h:500,zoom:1};
 assert.deepEqual(projectInteractionAnchor(a,v),{x:120,y:40});
 assert.deepEqual(projectInteractionAnchor(a,{...v,x:v.x+10,zoom:2}),{x:220,y:80});
 assert.deepEqual(projectInteractionAnchor({...a,space:'room'},v,{x:12,y:30,zoom:.5}),{x:22,y:50});
 assert.equal(projectInteractionAnchor({...a,space:'room'},v),null);
});

test('倒车和消防交接徽记固定在目标，不追随车身',()=>{
 const moves=[],context=new Proxy({translate(x,y){moves.push({x,y});}}, {get(target,key){return target[key]??(()=>{});},set(){return true;}});
 const g={parking:{id:'garage',phase:'reverse'}};
 drawParkingCountdown(context,g,{x:350,y:1000});const garage=moves[0];moves.length=0;drawParkingCountdown(context,g,{x:370,y:980});assert.deepEqual(moves[0],garage);
 moves.length=0;Object.assign(g,{fireActive:true,vehicle:{active:true},fireRescue:{phase:'parking',transit:{step:0}}});
 drawParkingCountdown(context,g,{x:1460,y:1170});const fire=moves[0];moves.length=0;drawParkingCountdown(context,g,{x:1371,y:1100});assert.deepEqual(moves[0],fire);assert.equal(moves[0].x,FIRE_STATION.x);
});
