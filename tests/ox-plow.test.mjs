// 单行犁的存档、领养与移动边界回归，使用真实农田结算。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {PASTURE,PEN_GATE,PEN_OX,oxFoot,oxHandler} from '../src/config/pasture.js';
import {tendPasture} from '../src/core/farm-production.js';
import {setFarmTool,updateFarmWork,turnOx,oxRigClear,oxTarget,syncOxFoot} from '../src/core/farm.js';
import {farmLandReason} from '../src/world/farm-land.js';
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
test('横移逐格提交，原地不重复，折返碰到已有田会收犁',()=>{
 const g=scene();g.progress.farm.oxPlow=true;setFarmTool(g,'ox');
 const move=x=>{const prev={...g.player};updateFarmWork(g,.016,{x,y:0});syncOxFoot(g,prev);};
 move(1);g.player.x+=60;move(1);assert.equal(g.progress.farm.dug,0);
 g.farmWork.ox.held=true;move(1);g.player.x+=55;move(1);assert.equal(g.progress.farm.dug,0);
 g.player.x++;move(1);move(0);assert.equal(g.progress.farm.dug,1);
 g.player.x+=56;move(1);assert.equal(g.progress.farm.dug,2);
 const rowY=g.player.y;g.farmWork.ox.held=false;g.farmWork.ox.row=null;move(-1);
 for(let i=0;i<70;i++)move(-1);
 assert.ok(Math.abs(Math.abs(g.player.y-rowY)-52)<.001);
 // 回到已有田垄再落犁，验证占用保护。
 g.player.y=rowY;g.farmWork.ox.held=true;move(-1);g.player.x-=56;move(-1);assert.equal(g.progress.farm.dug,2);
 assert.equal(g.farmWork.tool,'ox');assert.equal(g.farmWork.ox.held,false);
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
  assert.ok(cat.y<foot.y&&Math.abs(cat.x-foot.x)<=28.001);
  if(i===30)assert.ok(foot.x-start.x>25);
  assert.ok(Math.abs(angle-previous)<.06);previous=angle;
 }
 assert.equal(g.farmWork.ox.facing,-1);assert.equal(g.progress.farm.dug,0);
});
