// 单行犁的存档、领养与移动边界回归，使用真实农田结算。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {PASTURE,PEN_GATE,PEN_OX,oxFoot,oxHandler} from '../src/config/pasture.js';
import {tendPasture} from '../src/core/farming/farm-production.js';
import {setFarmTool,updateFarmWork,turnOx,oxRigClear,oxTarget,syncOxFoot} from '../src/core/farming/farm.js';
import {farmLandReason} from '../src/world/farm-land.js';
import {OX_PLOW,FARM_MAX_PLOTS} from '../src/config/farm.js';
// 在可连续开垦的草地准备玩家。
function scene(){
 const progress=freshRangerProgress(),g={state:'playing',mapId:'forest',progress,player:{hp:100},vehicle:{active:false},trees:[],livingPersist:()=>true};
 progress.coins=PASTURE.oxPrice;
 for(let y=350;y<1300;y+=52)for(let x=1300;x<2400;x+=56){
  if([0,1,2,3].every(i=>!farmLandReason(g,{x:x+56*i,y,mapId:'forest'}))){Object.assign(g.player,{x,y});return g;}
 }
 throw Error('需要一段可耕地');
}
test('牧栏领牛须到场；余额不足、保存失败和重复领养不会扣款',()=>{
 const g=scene(),adopt=()=>tendPasture(g,'adopt-ox');
 assert.equal(adopt().ok,false);
 Object.assign(g.player,PEN_GATE);
 g.progress.coins--;assert.equal(adopt().ok,false);g.progress.coins++;
 g.livingPersist=()=>false;assert.equal(adopt().ok,false);assert.equal(g.progress.coins,PASTURE.oxPrice);
 assert.equal(g.progress.farm.oxPlow,false);g.livingPersist=()=>true;
 assert.ok(adopt().ok);assert.equal(g.progress.coins,0);
 assert.deepEqual(validateProgress(g.progress).farm.oxSite,PEN_OX);
 g.progress.coins=PASTURE.oxPrice;assert.equal(adopt().ok,false);assert.equal(g.progress.coins,PASTURE.oxPrice);
});
test('横移逐格提交，原地不重复，折返经过已有田仍继续牵行',()=>{
 const g=scene();g.progress.farm.oxPlow=true;setFarmTool(g,'ox');
 const move=x=>{const prev={...g.player};updateFarmWork(g,.016,{x,y:0});syncOxFoot(g,prev);};
 move(1);g.player.x+=60;move(1);assert.equal(g.progress.farm.dug,0);
 g.farmWork.ox.held=true;move(1);g.player.x+=55;move(1);assert.equal(g.progress.farm.dug,0);
 g.player.x++;move(1);move(0);assert.equal(g.progress.farm.dug,1);
 g.player.x+=56;move(1);assert.equal(g.progress.farm.dug,2);
 const rowY=g.player.y;g.farmWork.ox.held=false;g.farmWork.ox.row=null;move(-1);
 for(let i=0;i<70;i++)move(-1);
 assert.equal(g.player.y,rowY);
 // 回到已有田垄再落犁，验证占用保护。
 g.player.y=rowY;g.farmWork.ox.held=true;move(-1);g.player.x-=56;move(-1);assert.equal(g.progress.farm.dug,2);
 assert.equal(g.farmWork.tool,'ox');assert.equal(g.farmWork.ox.held,true);
 assert.deepEqual(validateProgress(g.progress).farm.oxSite,g.progress.farm.oxSite);
});

test('偏离旧地中心仍吸附最近田垄，落犁与三格预览坐标一致',()=>{
 const g=scene(),f=g.progress.farm;f.oxPlow=true;setFarmTool(g,'ox');const x=g.player.x,y=g.player.y;
 f.plots.push({id:0,mapId:'forest',x:x-56,y:y-52,crop:null});f.nextId=1;
 g.player.x+=13;g.player.y+=9;
 const target=oxTarget(g);assert.equal(target.x,x+56);assert.equal(target.y,y);
 updateFarmWork(g,.016,{x:0,y:0});g.farmWork.ox.held=true;
 updateFarmWork(g,.016,{x:0,y:0});g.player.x=x+57;updateFarmWork(g,.016,{x:0,y:0});
 assert.equal(f.plots.length,1);assert.equal(g.progress.farm.plots.at(-1).x,target.x);assert.equal(g.progress.farm.plots.at(-1).y,target.y);
});
test('掉头连续取样，半圈期间抬犁；河岸猫可站立时仍检查牛身',async()=>{
 const {riverXAt,riverHalfWidth,isWaterBlocked}=await import('../src/world/river-geometry.js');
 const g=scene(),bankY=1300,bankX=riverXAt(bankY)-riverHalfWidth(bankY,-1)-18;
 assert.equal(isWaterBlocked(bankX,bankY,12),false);assert.equal(oxRigClear(g,{x:bankX,y:bankY},0),false);
 g.progress.farm.oxPlow=true;setFarmTool(g,'ox');
 for(let y=1800;y<2600;y+=60){g.player.y=y;g.player.x=2200;updateFarmWork(g,.016,{x:0,y:0});turnOx(g,-1);if(g.farmWork.ox.turn)break;}
 assert.ok(g.farmWork.ox.turn);
 let previous=0;const start={...g.player};
 for(let i=0;i<62;i++){
  const before={...g.player};updateFarmWork(g,.016,{x:0,y:0});syncOxFoot(g,before);
  const angle=g.farmWork.ox.yaw,foot=oxFoot(g.progress.farm.oxSite),cat=oxHandler(foot,angle);
  assert.ok(Math.hypot(foot.x-g.player.x,foot.y-g.player.y)<.001);
  assert.equal(cat.y,foot.y-96);assert.equal(cat.x,foot.x);
  assert.ok(Math.hypot(foot.x-start.x,foot.y-start.y)<.001);
  assert.ok(Math.abs(angle-previous)<.06);previous=angle;
 }
 assert.equal(g.farmWork.ox.facing,-1);assert.equal(g.progress.farm.dug,0);
});

// 猫和牛共用脚底，纵向一格采用现有农田的五十二单位间距。
test('耕牛按列挖田，实际落点与预览一致',()=>{
 const g=scene();
 // 纵向同样选择连续可开垦的地面，避免横向夹具的下一列落入山体。
 outer:for(let y=1800;y<2500;y+=52)for(let x=1800;x<2400;x+=56){
  if([0,1,2].every(i=>!farmLandReason(g,{x,y:y+52*i,mapId:'forest'}))){Object.assign(g.player,{x,y});break outer;}
 }
 g.progress.farm.axis='column';g.progress.farm.oxPlow=true;setFarmTool(g,'ox');
 updateFarmWork(g,.016,{x:0,y:0});g.farmWork.ox.held=true;
 updateFarmWork(g,.016,{x:0,y:0});const point=oxTarget(g);
 g.player.y+=52;updateFarmWork(g,.016,{x:0,y:0});
 assert.equal(g.progress.farm.dug,1);assert.equal(g.progress.farm.plots.at(-1).y,point.y);
 assert.equal(g.progress.farm.plots.at(-1).x,point.x);
});

// 行列都可穿过已有田，下一块空地恢复开垦，不能因占用停止移动。
for(const axis of ['row','column'])test(`按${axis==='row'?'行':'列'}跳过已有田并继续开垦`,()=>{
 const g=scene(),along=axis==='column'?'y':'x',spacing=axis==='column'?52:56;
 outer:for(let y=1800;y<2600;y+=52)for(let x=1800;x<2600;x+=56){
  if([0,1,2].every(i=>!farmLandReason(g,{x:x+(along==='x'?i*spacing:0),y:y+(along==='y'?i*spacing:0),mapId:'forest'}))){Object.assign(g.player,{x,y});break outer;}
 }
 g.progress.farm.axis=axis;g.progress.farm.oxPlow=true;setFarmTool(g,'ox');updateFarmWork(g,.016,{x:0,y:0});
 const first=oxTarget(g);g.progress.farm.plots.push({...first,id:0,crop:1,plantedAt:0,readyAt:1000,watered:false});g.progress.farm.nextId=1;g.progress.farm.dug=1;
 const crop=structuredClone(g.progress.farm.plots[0]);g.farmWork.ox.held=true;updateFarmWork(g,.016,{x:0,y:0});
 g.player[along]+=spacing;const moving=updateFarmWork(g,.016,{x:0,y:0});assert.equal(moving[along],OX_PLOW.speed);assert.ok(g.farmWork.ox.held);assert.equal(g.progress.farm.dug,1);assert.deepEqual(g.progress.farm.plots[0],crop);
 g.player[along]+=spacing;assert.equal(updateFarmWork(g,.016,{x:0,y:0})[along],OX_PLOW.speed);assert.equal(g.progress.farm.dug,2);assert.equal(g.progress.farm.plots.at(-1)[along],first[along]+spacing);
});

test('路面与牧栏禁种区允许牵行，不写入非法田块',()=>{
 for(const point of [{x:1800,y:729,mapId:'forest'},{x:PASTURE.x,y:PASTURE.y,mapId:'forest'}]){
  const g=scene();Object.assign(g.player,point);assert.ok(farmLandReason(g,point));assert.ok(oxRigClear(g,point,0));g.progress.farm.oxPlow=true;setFarmTool(g,'ox');updateFarmWork(g,.016,{x:0,y:0});
  g.farmWork.ox.held=true;g.farmWork.ox.row={...point,x:point.x-56};const move=updateFarmWork(g,.016,{x:0,y:0});assert.equal(move.x,OX_PLOW.speed);assert.ok(g.farmWork.ox.held);assert.equal(g.progress.farm.dug,0);assert.deepEqual(g.farmWork.ox.row,point);
 }
});

test('田块达到上限或保存失败仍可移动，失败不增加农田',()=>{
 for(const full of [true,false]){
  const g=scene();g.progress.farm.oxPlow=true;setFarmTool(g,'ox');updateFarmWork(g,.016,{x:0,y:0});g.farmWork.ox.held=true;updateFarmWork(g,.016,{x:0,y:0});
  if(full)g.progress.farm.plots=Array.from({length:FARM_MAX_PLOTS},(_,id)=>({id,x:100,y:100,mapId:'jiuzhaigou',crop:null}));else g.livingPersist=()=>false;
  g.player.x+=56;assert.equal(updateFarmWork(g,.016,{x:0,y:0}).x,OX_PLOW.speed);assert.ok(g.farmWork.ox.held);assert.equal(g.progress.farm.dug,0);
 }
});
