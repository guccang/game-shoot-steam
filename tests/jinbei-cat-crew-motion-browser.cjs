// 满编近战猫实机驾驶与停驻记录，沿正式画布录制昼夜视频和动作时钟。
async page=>{
 if(new URL(page.url()).port!=='4282')throw Error('仅允许隔离端口');const errors=[];page.on('pageerror',e=>errors.push(e.message));const report={scenes:[],motion:[]};
 await page.reload();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.menu.enter();if(!await a.ready)throw Error('资源加载失败');window.reviewApp=a;});
 await page.evaluate(async()=>{const a=reviewApp,g=a.game,{debugGrantProgress}=await import('/src/progression/debug-grants.js'),{restoreArrival}=await import('/src/core/ranger-arrival.js');g.progress=debugGrantProgress(g.progress,'max-vehicles');g.progress.vehicleIndex=7;g.reset();restoreArrival(g);g.workshopTrial=true;g.state='playing';g.summonVehicle();g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;g.attack=()=>false;Object.assign(g.player,{x:350,y:1260});g.trees=g.trees.filter(t=>Math.hypot(t.x-350,t.y-1260)>400);a.refresh();});
 await page.setViewportSize({width:1280,height:960});await page.waitForTimeout(8500);
 for(const time of ['day','night']){
  await page.evaluate(async time=>{const a=reviewApp,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,livingPreview:true,autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);const chunks=[],stream=document.getElementById('game').captureStream(30),r=new MediaRecorder(stream,{mimeType:'video/webm'});window.reviewRecording={r,stream,chunks};r.ondataavailable=e=>chunks.push(e.data);r.start();},time);
  for(const key of ['ArrowLeft','ArrowUp',null,'ArrowRight','ArrowDown',null]){
   if(key)await page.keyboard.down(key);await page.waitForTimeout(600);if(key)await page.keyboard.up(key);
   report.motion.push(await page.evaluate(async({time,key})=>({time,key,x:reviewApp.game.player.x,y:reviewApp.game.player.y,...(await import('/src/rendering/visual-review.js')).inspectJinbeiCrew(reviewApp.game,document)}),{time,key}));
  }
  await page.screenshot({path:`output/playwright/jinbei-cat-crew/max-1280-${time}.png`});
  const clip=await page.evaluate(async()=>{const {r,stream,chunks}=reviewRecording,done=new Promise(resolve=>r.onstop=resolve);r.stop();await done;stream.getTracks().forEach(t=>t.stop());return await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});});
  const pending=page.waitForEvent('download');await page.evaluate(data=>{const a=document.createElement('a');a.href=data;a.download='jinbei-motion.webm';a.click();},clip);await(await pending).saveAs(`output/playwright/jinbei-cat-crew/motion-${time}.webm`);
 }
 await page.setViewportSize({width:320,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(350);await page.screenshot({path:'output/playwright/jinbei-cat-crew/max-reduced-320.png'});
 report.scenes.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectJinbeiCrew(reviewApp.game,document)));
 for(const turret of [null,22]){await page.evaluate(t=>reviewApp.workshop.open('vehicle',7,t===null?undefined:t),turret);await page.screenshot({path:`output/playwright/jinbei-cat-crew/${turret===null?'van':'crew'}-max-shop-320.png`});if(await page.locator('#workshop-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('工坊横向溢出');const stats=await page.locator('#ws-stats').innerText();if(!stats.includes('邻里猫')||stats.includes('重装生命'))throw Error(stats);await page.locator('#ws-close').click();}
 await page.emulateMedia({reducedMotion:'no-preference'});
 if(errors.length)throw Error(errors.join('\n'));if(report.motion.some(m=>m.nodes.length!==8)||report.motion.every(m=>m.wheelPhase===0))throw Error('满编或驾驶异常');
 const pending=page.waitForEvent('download');await page.evaluate(data=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='report.json';a.click();},report);await(await pending).saveAs('output/playwright/jinbei-cat-crew/motion-report.json');return {frames:report.motion.length,nodes:report.scenes[0].nodes.length,errors};
}
