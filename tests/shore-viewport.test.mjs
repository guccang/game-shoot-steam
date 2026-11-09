// 河道裁切必须保留原采样几何，并让提交量与地块高度相关而非整张地图高度。
import test from 'node:test';
import assert from 'node:assert/strict';
import {drawShoreGroundSteps,drawShoreWaterSteps} from '../src/rendering/shore-art.js';

// 记录原绘制器提交的岸线折点与操作量，不模拟像素或另造河道几何。
function capture(draw){
 const paths=[];let path=[],commands=0;
 const c=new Proxy({beginPath(){path=[];},moveTo(x,y){path.push([x,y]);commands++;},lineTo(x,y){path.push([x,y]);commands++;},fill(){if(path.length>4)paths.push({color:c.fillStyle,points:path.slice()});},save(){},restore(){}},{get:(o,k)=>k in o?o[k]:()=>{commands++;}});
 for(const _ of draw(c)){}return {paths,commands};
}
// 比较裁切内部的原始点序列，截断线位于留边之外，不参与岸线变化。
function insidePaths(result,view){return result.paths.map(p=>({color:p.color,points:p.points.filter(q=>q[1]>=view.y&&q[1]<=view.y+view.h)})).filter(p=>p.points.length);}

test('局部地块岸线与整图原采样一致，保留沙湾两侧不同的采样起点',()=>{
 const full=capture(c=>drawShoreGroundSteps(c,false));
 for(const view of [{y:0,h:388},{y:847.5,h:388},{y:3840,h:388},{y:35710,h:290}]){
  const local=capture(c=>drawShoreGroundSteps(c,false,view));
  assert.deepEqual(insidePaths(local,view),insidePaths(full,view));
  assert.ok(local.commands<full.commands*.08,'局部河岸不能重新提交整条河流');
 }
});

test('水色带裁切保留原折点，水纹只提交包含曲线留边的附近行',()=>{
 const full=capture(c=>drawShoreWaterSteps(c));
 for(const view of [{y:380,h:388},{y:3838,h:388},{y:35710,h:290}]){
  const local=capture(c=>drawShoreWaterSteps(c,view));
  assert.deepEqual(insidePaths(local,view),insidePaths(full,view));
  assert.ok(local.commands<full.commands*.08);
 }
});

test('冬季沿用相同裁切几何，视野在世界外时不构建离屏河道',()=>{
 const view={y:9000,h:388},full=capture(c=>drawShoreGroundSteps(c,true)),local=capture(c=>drawShoreGroundSteps(c,true,view));
 assert.deepEqual(insidePaths(local,view),insidePaths(full,view));
 assert.equal(capture(c=>drawShoreWaterSteps(c,{y:-1000,h:388})).paths.length,0);
});
