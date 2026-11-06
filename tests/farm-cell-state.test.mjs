// 静止热点不重复写入DOM，成熟、浇水、队列和工具变化仍立即更新读屏语义。
import test from 'node:test';
import assert from 'node:assert/strict';
import {updateFarmCellState,farmCellView,placeFarmCell} from '../src/ui/farm-cell-state.js';

// 记录属性写入，用于检查逐帧更新没有偷偷重复提交同值。
function cell(){const writes=[],attributes={},dataset=new Proxy({},{set(target,key,value){writes.push([key,value]);target[key]=value;return true;}});return {writes,attributes,dataset,setAttribute(key,value){writes.push([key,value]);attributes[key]=value;}};}
test('72块静止田连续刷新不产生重复属性写入',()=>{
 const cells=Array.from({length:72},()=>cell());
 for(let id=0;id<72;id++){
  const plot={id,crop:1,watered:false,plantedAt:0,readyAt:10000},context={tool:'seed',selected:false,now:100};
  assert.equal(updateFarmCellState(cells[id],plot,context),true);cells[id].writes.length=0;
  for(let frame=0;frame<120;frame++)assert.equal(updateFarmCellState(cells[id],{...plot},{...context,now:100+frame}),false);
  assert.equal(cells[id].writes.length,0);
 }
});
test('成熟边界、队列、选中与清空地块均立即更新',()=>{
 const node=cell(),plot={id:4,crop:1,watered:false,plantedAt:0,readyAt:10000},context={tool:'water',selected:false,now:9999};
 updateFarmCellState(node,plot,context);assert.match(node.attributes['aria-label'],/成长中.*点击浇水/);
 updateFarmCellState(node,plot,{...context,now:10000});assert.match(node.attributes['aria-label'],/成熟，点击收割/);
 updateFarmCellState(node,{...plot,watered:true},{...context,step:2,selected:true});assert.match(node.attributes['aria-label'],/湿润.*农活第2步/);assert.equal(node.dataset.queued,'true');assert.equal(node.attributes['aria-pressed'],'true');
 updateFarmCellState(node,{...plot,crop:null},context);assert.equal(node.dataset.farmStep,'');assert.equal(node.dataset.selected,'false');assert.match(node.attributes['aria-label'],/空田：选择种子/);
 updateFarmCellState(node,plot,{...context,tool:'remove'});assert.match(node.attributes['aria-label'],/点击确认移除/);
});

test('静止投影不重复访问样式，走位、缩放、滚动和重新显示均立即同步',()=>{
 let reads=0,offset=0;
 const frame={getBoundingClientRect:()=>({left:0,top:0,width:390,height:844})};
 const renderer={view:{x:0,y:0,w:390,h:844,zoom:1},canvas:{getBoundingClientRect:()=>({left:offset,top:0})}};
 const style={getPropertyValue(key){reads++;return this[key]||'';},setProperty(key,value){this[key]=value;}},node={style},plot={id:1,x:100,y:200,mapId:'forest'};
 const place=()=>placeFarmCell(node,plot,renderer,frame,farmCellView(renderer,frame));
 place();const first=node.style.left;reads=0;for(let i=0;i<100;i++)place();assert.equal(reads,0);
 renderer.view.x=10;place();assert.equal(parseFloat(node.style.left),parseFloat(first)-10);assert.equal(reads,0,'平移不应重新读取地块形状样式');
 renderer.view.zoom=.5;place();assert.equal(node.style.width,'44px');assert.equal(node.style['--farm-plot-width'],'25px');
 const moved=parseFloat(node.style.left);offset=30;place();assert.equal(parseFloat(node.style.left),moved+30);
 node.hidden=true;place();assert.equal(node.hidden,false);
 plot.x=3000;place();assert.equal(node.hidden,true);plot.x=100;place();assert.equal(node.hidden,false);
 renderer.view=null;place();assert.equal(node.hidden,true);
});
