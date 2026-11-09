// 柜台配置参与正式室内碰撞，所有营业房均验证可接近、绕行和离开。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSHOP_INTERIORS,interiorFurniture,interiorCounter,interiorShopkeeper,VEHICLE_BAY} from '../src/config/workshop-interiors.js';
import {cottageBlocked,updateCottage} from '../src/core/home/cottage.js';
import {createCatMotion} from '../src/core/battle/cat-motion.js';
import {freshProgress} from '../src/progression/progress.js';
// 网格搜索只使用正式碰撞，覆盖柜台左右和柜后相连的可走区域。
function reachable(g,start,target){const step=5,queue=[start],seen=new Set([start.x+','+start.y]);for(let n=0;n<queue.length;n++){const p=queue[n];if(Math.hypot(p.x-target.x,p.y-target.y)<step*1.5)return true;for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){const q={x:p.x+dx,y:p.y+dy},key=q.x+','+q.y;if(seen.has(key)||cottageBlocked(q.x,q.y,g))continue;seen.add(key);queue.push(q);}}return false;}

test('每位售货员有且仅有一个柜台，私人小屋没有柜台',()=>{
 for(const kind of Object.keys(WORKSHOP_INTERIORS)){const g={cottage:{kind},vehicle:{active:false},progress:freshProgress()},seller=interiorShopkeeper(g.cottage),list=interiorFurniture(g).filter(f=>f.type==='counter');assert.equal(list.length,1,kind);assert.deepEqual(list[0],interiorCounter(g.cottage));assert.equal(list[0].x,seller.x);assert.equal(list[0].y,seller.y+30);assert.ok(cottageBlocked(list[0].x,list[0].y,g));}
 assert.equal(interiorCounter({kind:'cottage'}),null);assert.equal(interiorCounter(null),null);
});

test('各房间柜台前后、两侧和出口相通，载具泊位保留',()=>{
 for(const [kind,layout] of Object.entries(WORKSHOP_INTERIORS)){const g={cottage:{kind},vehicle:{active:false},progress:freshProgress()};if(kind==='vehicle')g.progress.campParking.owned=[{hull:0,spot:'garage'}];const c=interiorCounter(g.cottage);assert.equal(cottageBlocked(layout.spawn.x,layout.spawn.y,g),false,kind);for(const target of [{x:c.x,y:c.y+40},{x:c.x,y:c.y-45},{x:c.x-90,y:c.y},{x:c.x+90,y:c.y},layout.exit])assert.ok(reachable(g,layout.spawn,target),kind+' '+JSON.stringify(target));if(kind==='vehicle')assert.ok(interiorFurniture(g).some(f=>f.id===VEHICLE_BAY.id));}
});

test('迎面行走被柜台阻挡，横移仍可绕开',()=>{
 for(const kind of ['weapons','vehicle']){const l=WORKSHOP_INTERIORS[kind],g={cottage:{kind},vehicle:{active:false},progress:freshProgress(),state:'playing',player:{...l.spawn,bodyAnimation:createCatMotion()},time:0},c=interiorCounter(g.cottage);for(let i=0;i<40;i++)updateCottage(g,.05,{x:0,y:-1});assert.ok(g.player.y>=c.y+c.height/2+10,kind);const x=g.player.x;for(let i=0;i<18;i++)updateCottage(g,.05,{x:1,y:0});assert.ok(g.player.x>x+75,kind);}
});
