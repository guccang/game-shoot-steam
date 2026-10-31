// 换季双池调度测试：保留旧纹理、提前分帧、最新请求、共享预算和释放生命周期。
import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundCache} from '../src/rendering/ground-cache.js';
import {SeasonGroundCache,SEASON_PREWARM_MS} from '../src/rendering/season-ground-cache.js';
import {SEASON_FADE_DURATION} from '../src/world/season-transition.js';
const view={x:2039.951,y:268.422,w:440/.85,h:793/.85};
// 合并风格切换与双季预热后，验证纹理失效不会重置调度状态或丢失渐变来源。
test('风格刷新释放两池并保留预制目标、遮罩与季节时钟',()=>{
 const {cache,env}=setup();cache.setSceneryMask({x:10,y:20,radius:30});
 cache.update(env,view,1);fill(cache.current);env.forestSeason='winter';cache.update(env,view,2);fill(cache.staged);
 const seasonClock=cache.seasons,oldPools=cache.pools(),images=oldPools.map(pool=>[...pool.tiles.values()][0].day);
 cache.setPrewarmPolicy(false,'combat');cache.refreshArtStyle();
 assert.equal(cache.seasons,seasonClock);assert.equal(cache.requested,'winter');assert.equal(cache.staged.season,'winter');assert.equal(cache.prewarmAllowed,false);
 assert.ok(images.every(image=>image.width===1));assert.ok(cache.pools().every(pool=>pool.tiles.size===0&&pool.sceneryMask.radius===250));
 cache.setPrewarmPolicy(true);cache.prepare(view,1);fill(cache.current);fill(cache.staged);cache.update(env,view,3);
 const progress=cache.seasons.sample(1000),source=cache.source,sourceImage=[...source.tiles.values()][0].day;
 cache.refreshArtStyle();assert.equal(sourceImage.width,1);assert.notEqual(cache.source,source);assert.equal(cache.source.season,'summer');
 assert.deepEqual(cache.seasons.sample(1000),progress);assert.equal(cache.seasons,seasonClock);assert.equal(cache.pools().length,2);cache.dispose();
});
// 正式调度配合轻量可释放纹理，Node不代替真实浏览器的像素和帧耗时检查。
function tile(){return {day:{width:388,height:388},night:{width:388,height:388}};}
// 预先填充完整工作集，逐个测试发布前缺失日夜层时不能启动渐变。
function fill(pool){for(const key of pool.desired)pool.publish(tile(),{key});pool.pending=[];}
// 初始生活历法只读，渲染不得通过延后外观改变逻辑日期。
function setup(remaining=100000){const cache=new SeasonGroundCache(),env={forestSeason:'summer',calendarActive:true,livingSeasonRemaining:remaining};cache.update(env,view,0);fill(cache.current);return {cache,env};}

test('自动换季提前45秒预制，未到时间不切换、不清空旧纹理',()=>{
 const {cache,env}=setup(SEASON_PREWARM_MS+1),old=[...cache.tiles.values()][0];
 assert.equal(cache.staged,null);env.livingSeasonRemaining=SEASON_PREWARM_MS;cache.update(env,view,1);
 assert.equal(cache.staged.season,'autumn');assert.equal(cache.season,'summer');assert.equal(old.day.width,388);
 fill(cache.staged);cache.update(env,view,2);assert.equal(cache.commits,0);assert.equal(cache.season,'summer');
 env.forestSeason='autumn';env.livingSeasonRemaining=300000;cache.update(env,view,3);
 assert.equal(cache.commits,1);assert.equal(cache.season,'autumn');assert.equal(cache.source.season,'summer');assert.equal(cache.transition.progress,0);
 assert.equal(old.day.width,388);cache.update(env,view,3+SEASON_FADE_DURATION);
 assert.equal(old.day.width,1);assert.equal(cache.source,null);assert.equal(cache.tiles.size,48);assert.equal(env.forestSeason,'autumn');
});

test('下一季或当前季节任一昼夜地块未齐备时继续旧季节，镜头移动重新校验',()=>{
 const {cache,env}=setup();env.forestSeason='winter';cache.update(env,view,10);fill(cache.staged);
 const key=[...cache.staged.desired][0],target=cache.staged.tiles.get(key);target.night=null;
 cache.update(env,view,11,0);assert.equal(cache.commits,0);target.night=tile().night;
 const moved={...view,x:view.x+400};cache.update(env,moved,12,1);assert.equal(cache.commits,0);
 fill(cache.current);fill(cache.staged);cache.update(env,moved,13,1);assert.equal(cache.commits,1);
 assert.equal(cache.stats().seasonStaging.pools,2);assert.equal(cache.syncMisses,0);
});

test('连续请求取消尚未发布的旧目标，渐变中只排队最新季节且不建立第三池',()=>{
 const {cache,env}=setup();env.forestSeason='autumn';cache.update(env,view,1);fill(cache.staged);const cancelled=[...cache.staged.tiles.values()][0];
 env.forestSeason='winter';cache.update(env,view,2);assert.equal(cancelled.day.width,1);assert.equal(cache.staged.season,'winter');assert.equal(cache.cancelled,1);
 fill(cache.staged);cache.update(env,view,3);env.forestSeason='spring';cache.update(env,view,1000);
 assert.equal(cache.staged,null);assert.equal(cache.season,'winter');assert.equal(cache.stats().seasonStaging.pools,2);
 env.forestSeason='autumn';cache.update(env,view,3+SEASON_FADE_DURATION);
 assert.equal(cache.source,null);assert.equal(cache.staged.season,'autumn');assert.equal(cache.stats().seasonStaging.requested,'autumn');
});

test('刚完成渐变时请求返回旧季节，直接复用来源池而不重建',()=>{
 const {cache,env}=setup(),old=cache.current;env.forestSeason='winter';cache.update(env,view,1);fill(cache.staged);cache.update(env,view,2);
 env.forestSeason='summer';cache.update(env,view,2+SEASON_FADE_DURATION);
 assert.equal(cache.current,old);assert.equal(cache.season,'summer');assert.equal(cache.commits,2);assert.equal(cache.stats().seasonStaging.pools,2);
});

test('共享帧预算在旧季节超支时不再追加下一季任务',()=>{
 const {cache,env}=setup();env.forestSeason='winter';cache.update(env,view,1);let clock=0,second=0;
 cache.current.advance=()=>{clock+=3;};cache.staged.advance=()=>second++;
 cache.advance(2,()=>clock);assert.equal(second,0);
});

test('换地图与销毁释放两池和在建任务，累计诊断不因切换归零',()=>{
 const {cache,env}=setup();env.forestSeason='winter';cache.update(env,view,1);fill(cache.staged);
 const old=[...cache.tiles.values()][0],staged=[...cache.staged.tiles.values()][0];cache.current.syncMisses=2;
 cache.setMap('jiuzhaigou');assert.equal(old.day.width,1);assert.equal(staged.day.width,1);assert.equal(cache.syncMisses,2);
 cache.update(env,view,2);assert.equal(cache.season,'summer');assert.equal(cache.staged,null);
 cache.dispose();cache.advance(10);assert.equal(cache.stats().bytes,0);assert.equal(cache.stats().pending,0);assert.equal(cache.ready(view),false);
});

test('尚在分帧中的目标取消会执行生成器清理，未完成纹理不能发布',()=>{
 const {cache,env}=setup();env.forestSeason='winter';cache.update(env,view,1);let cancelled=false;
 // 模拟持有临时像素的未完成绘制步骤，确保取消调用return而非仅丢弃引用。
 function* steps(){try{yield;return tile();}finally{cancelled=true;}}
 const work={spec:{key:'0:0'},steps:steps(),surfaces:new Set(),ms:0};work.steps.next();cache.staged.work=work;
 env.forestSeason='spring';cache.update(env,view,2);assert.ok(cancelled);assert.equal(cache.staged.tiles.size,0);
});
