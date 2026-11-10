// 布局更新只后台替换受影响地块，禁止再次退回同步清空整图。
import test from 'node:test';import assert from 'node:assert/strict';import {GroundCache} from '../src/rendering/ground-cache.js';
// 完整昼夜画布替身只验证资源生命周期，不替代浏览器视觉检查。
function tile(){return {day:{width:388,height:388},night:{width:388,height:388}};}
test('连续布局变更保留可见昼夜纹理，get不产生同步缺块，发布后释放旧像素',()=>{const c=new GroundCache(),old=tile(),far=tile();c.publish(old,{key:'0:0'});c.publish(far,{key:'10:10'});for(let i=0;i<3;i++){c.invalidateCampLayout([{x:100,y:100,w:100,h:100}]);assert.equal(c.get({key:'0:0'},1),old);assert.equal(c.get({key:'10:10'},1),far);assert.equal(old.day.width,388);assert.deepEqual([...c.layoutDirty],['0:0']);}assert.equal(c.syncMisses,0);const next=tile();c.publish(next,{key:'0:0'});assert.equal(c.get({key:'0:0'},1),next);assert.equal(old.day.width,1);assert.equal(far.day.width,388);assert.equal(c.layoutDirty.size,0);});
test('脏块进入预热队列而不是被当成已完成，地图切换清除旧脏标记',()=>{const c=new GroundCache();c.publish(tile(),{key:'0:0'});c.invalidateCampLayout();c.prepare({x:20,y:20,w:100,h:100},0);assert.ok(c.pending.some(p=>p.key==='0:0'));assert.equal(c.needsWarmup(),true);c.setMap('jiuzhaigou');assert.equal(c.layoutDirty.size,0);});
test('负世界坐标搬迁只标记周期镜像附近的地块',()=>{const c=new GroundCache();c.publish(tile(),{key:'124:0'});c.publish(tile(),{key:'0:0'});c.invalidateCampLayout([{x:-80,y:80,w:40,h:40}]);assert.deepEqual([...c.layoutDirty],['124:0']);});
