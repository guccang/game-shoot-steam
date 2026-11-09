// 正式4175冷启动与首帧缓存回归；局部装饰和完整布局使用相同绘制器作像素对照。
const {chromium}=require('D:/ChatGPT/perf-tools/node_modules/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const out='output/playwright/loading-local-ground';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
 // 参考模块只将候选集换为完整布局，保留旧逐项裁切与绘制顺序。
 const source=fs.readFileSync('src/rendering/season-ground.js','utf8').replace('for(const p of seasonGroundPatches(view))','for(const p of seasonGroundPatches())');
 await page.route('**/src/rendering/season-ground-full-reference.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto('http://localhost:4175');
 async function start(label){await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;window.entry={start:performance.now(),ninety:null,complete:false,firstDraw:null};
  const draw=a.renderer.draw.bind(a.renderer);let captured=false;a.renderer.draw=function(...args){const before=new Map(this.ground.tiles),misses=this.ground.syncMisses;const result=draw(...args);if(!captured){captured=true;entry.firstDraw={cached:before.size,retained:[...before].filter(([key,value])=>this.ground.tiles.get(key)===value).length,misses:this.ground.syncMisses-misses};}return result;};
  function observe(){const progress=+document.querySelector('#start-loading-progress').getAttribute('aria-valuenow');if(progress>=90&&entry.ninety===null)entry.ninety=performance.now();if(progress===100)entry.complete=true;if(a.menu.page==='game'){entry.end=performance.now();return;}requestAnimationFrame(observe);}a.menu.enter();requestAnimationFrame(observe);
 });await page.waitForFunction(()=>entry.end&&entry.firstDraw,null,{timeout:20000});const r=await page.evaluate(()=>({...entry,elapsed:entry.end-entry.start,waiting:entry.ninety===null?0:entry.end-entry.ninety}));assert.ok(r.complete);assert.ok(r.elapsed<12000,JSON.stringify(r));assert.ok(r.waiting<8000,JSON.stringify(r));assert.ok(r.firstDraw.cached>0);assert.equal(r.firstDraw.retained,r.firstDraw.cached);assert.equal(r.firstDraw.misses,0);results.push({label,...r});}
 await start('首次冷启动');await page.screenshot({path:out+'/entered.png'});
 await page.evaluate(()=>{a.game.pause();a.refresh();a.menu.home();window.oldTrees=a.game.trees;window.oldPlayer=a.game.player;});await start('返回首页再进入');assert.equal(await page.evaluate(()=>a.game.trees===oldTrees&&a.game.player===oldPlayer),true);
 // 留存存档重新加载，仍需通过真实地面门禁，不能只修新档。
 await page.reload();await start('读档重新加载');
 const pixels=await page.evaluate(async()=>{
  const actual=await import('/src/rendering/season-ground.js'),reference=await import('/src/rendering/season-ground-full-reference.js');
  const views=[{x:768,y:384,w:388,h:388},{x:1150,y:760,w:388,h:388},{x:3600,y:2800,w:388,h:388},{x:-2,y:-2,w:388,h:388},{x:47614,y:35614,w:388,h:388}],rows=[];
  for(const season of ['spring','summer','autumn','winter'])for(const view of views){
   const arrays=[];for(const renderer of [actual,reference]){const canvas=document.createElement('canvas');canvas.width=view.w;canvas.height=view.h;const c=canvas.getContext('2d',{willReadFrequently:true});c.translate(-view.x,-view.y);renderer.drawSeasonGround(c,view,season);arrays.push(c.getImageData(0,0,view.w,view.h).data);}
   let differences=0,ink=0;for(let i=0;i<arrays[0].length;i++){if(arrays[0][i]!==arrays[1][i])differences++;if(i%4===3&&arrays[0][i])ink++;}rows.push({season,view,differences,ink});
  }return rows;
 });assert.ok(pixels.every(r=>r.differences===0));assert.ok(pixels.some(r=>r.ink>0));
 for(const [width,height] of [[320,568],[390,844],[1280,900]]){await page.setViewportSize({width,height});for(const time of ['day','night']){await page.evaluate(async time=>{const {LIVING_PHASES}=await import('/src/config/living-world.js');const phase=LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar.elapsed=phase.start+phase.duration/2;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{time,autoTime:false,autoWeather:false,weather:'sun',livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},time);await page.waitForTimeout(200);await page.screenshot({path:out+'/world-'+width+'-'+time+'.png'});}}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({designCriterion:'start-game-loading',results,pixels,errors},null,2));console.log(JSON.stringify({results,pixelCases:pixels.length,pixelDifferences:pixels.reduce((n,r)=>n+r.differences,0),errors},null,2));
}catch(e){console.error(e);console.log(await page.evaluate(()=>({entry:window.entry,ground:window.a?.renderer.ground.stats()})));await page.screenshot({path:out+'/failure.png'});process.exitCode=1;}finally{await browser.close();}})();
