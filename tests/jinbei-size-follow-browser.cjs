// 金杯缩身与满编小队驾驶、停车的正式浏览器验收；只在隔离端口改测试进度。
async page=>{
 if(new URL(page.url()).port!=='4295')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.menu.enter();if(!await a.ready)throw Error('资源加载失败');window.reviewApp=a;const g=a.game,{debugGrantProgress}=await import('/src/progression/player/debug-grants.js'),{restoreArrival}=await import('/src/core/camp/ranger-arrival.js');g.progress=debugGrantProgress(g.progress,'max-vehicles');g.progress.vehicleIndex=7;g.progress.arrival={...g.progress.arrival,version:2,phase:'complete',keys:true};g.reset();restoreArrival(g);g.workshopTrial=true;g.state='playing';if(!g.summonVehicle())throw Error('金杯上车失败');g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;g.attack=()=>false;Object.assign(g.player,{x:350,y:1260});g.trees=g.trees.filter(t=>Math.hypot(t.x-350,t.y-1260)>400);a.refresh();});
 await page.setViewportSize({width:1280,height:960});await page.waitForTimeout(10000);
 const report=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async time=>{const a=reviewApp,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,livingPreview:true,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();},time);
  if(width===390){
   await page.evaluate(()=>{const chunks=[],stream=document.getElementById('game').captureStream(30),r=new MediaRecorder(stream,{mimeType:'video/webm'});window.recording={r,stream,chunks};r.ondataavailable=e=>chunks.push(e.data);r.start();});
   for(const key of ['ArrowLeft','ArrowUp',null,'ArrowRight','ArrowDown',null]){if(key)await page.keyboard.down(key);await page.waitForTimeout(key?600:2000);if(key)await page.keyboard.up(key);}
   const download=page.waitForEvent('download');await page.evaluate(async()=>{const {r,stream,chunks}=recording,done=new Promise(resolve=>r.onstop=resolve);r.stop();await done;stream.getTracks().forEach(t=>t.stop());const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));a.download='motion.webm';a.click();});await(await download).saveAs(`output/playwright/jinbei-size-follow/motion-${time}.webm`);
  }
  await page.waitForTimeout(2000);await page.screenshot({path:`output/playwright/jinbei-size-follow/${width}-${time}.png`});
  report.push(await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectJinbeiCrew(reviewApp.game,document)));
 }
 await page.evaluate(()=>{const g=reviewApp.game;for(const [dx,dy] of [[150,0],[140,-80],[160,90]]){const x=g.player.x+dx,y=g.player.y+dy,e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{x,y,hp:1e6,maxHp:1e6,speed:0,damage:0,mass:10,flying:false,football:true});}});
 for(const time of ['day','night']){
  await page.evaluate(async time=>{const a=reviewApp,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);},time);await page.waitForTimeout(1800);await page.screenshot({path:`output/playwright/jinbei-size-follow/combat-320-${time}.png`});
 }
 await page.evaluate(()=>reviewApp.workshop.open('vehicle',7));await page.screenshot({path:'output/playwright/jinbei-size-follow/shop-320.png'});
 if(await page.locator('#workshop-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('工坊溢出');
 if(errors.length||report.some(r=>r.overflow||r.nodes.length!==8))throw Error(JSON.stringify({errors,report}));
 const download=page.waitForEvent('download');await page.evaluate(data=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='report.json';a.click();},{report,errors});await(await download).saveAs('output/playwright/jinbei-size-follow/report.json');return {scenes:report.length,errors};
}
