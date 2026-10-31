// 新装备在隔离端口通过正式工坊购买和实际战场验收，保留昼夜连续运动证据。
async page=>{
 if(new URL(page.url()).port!=='4281')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:960});await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.menu.enter();if(!await a.ready)throw Error("资源加载失败");window.reviewApp=a;const {freshProgress,validateProgress}=await import('/src/progression/progress.js');const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};a.game.progress=validateProgress(p);a.game.reset();a.game.state='ready';a.refresh();a.workshop.open('weapons',17);});
 await page.screenshot({path:'output/playwright/gravity-gun-redwolf/gun-shop.png'});
 await page.locator('#ws-purchase').click();

 await page.locator('#ws-test').click();await page.waitForTimeout(1800);await page.screenshot({path:'output/playwright/gravity-gun-redwolf/gun-trial.png'});await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 await page.evaluate(()=>reviewApp.workshop.open('vehicle',6));await page.screenshot({path:'output/playwright/gravity-gun-redwolf/tank-shop.png'});await page.locator('#ws-purchase').click();await page.locator('#ws-test').click();await page.waitForTimeout(800);await page.screenshot({path:'output/playwright/gravity-gun-redwolf/tank-trial.png'});await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 const scenes=[];
 for(const mode of ['gun','tank'])for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async({mode,time})=>{
   const a=reviewApp,g=a.game,{validateProgress}=await import('/src/progression/progress.js'),{restoreArrival}=await import('/src/core/ranger-arrival.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   if(g.reviewUpdate){g.update=g.reviewUpdate;delete g.reviewUpdate;}
   g.progress.vehicleIndex=6;g.progress.weapon=17;g.progress=validateProgress(g.progress);g.reset();restoreArrival(g);g.start();if(mode==='tank')g.summonVehicle();
   g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;g.workshopTrial=true;
   const {blocked}=await import('/src/physics/motion.js'),{settlementAt}=await import('/src/world/settlements.js');let origin=null;for(let y=1200;y<2200&&!origin;y+=60)for(let x=350;x<900;x+=60)if(!settlementAt({x,y})&&[-100,0,250].every(dx=>!blocked(x+dx,y,75,[],{mapId:'forest'}))){origin={x,y};break;}if(!origin)throw Error('缺少可通行验收场地');g.reviewOrigin=origin;Object.assign(g.player,{...origin,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-origin.x,t.y-origin.y)>350);
   for(const [x,y] of [[1040,860],[1120,800],[1160,890],[1080,955]]){const at={x:g.reviewOrigin.x+x-900,y:g.reviewOrigin.y+y-850};const e=g.spawnEnemy(0,0,at);Object.assign(e,{...at,hp:100000,maxHp:100000,speed:0,damage:0,mass:10,flying:false,football:true});}
   if(mode==='tank')g.attack=()=>false;else delete g.attack;
   Object.assign(a.environment,{time,livingPreview:true,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
  },{mode,time});
  await page.waitForFunction(mode=>{const g=reviewApp.game;if(mode==='gun'?(g.gravityFields?.length&&g.gravityFields[0].life<2.7):(g.vehicle.recoil.tankAge>.04&&g.vehicle.recoil.tankAge<.16)){g.reviewUpdate=g.update;g.update=()=>{};return true;}return false;},mode,{timeout:15000});
  await page.screenshot({path:`output/playwright/gravity-gun-redwolf/${mode}-${width}-${time}.png`});
  scenes.push(await page.evaluate(async({mode,width,time})=>({actualTime:reviewApp.environment.time,...((await import('/src/rendering/visual-review.js')).inspectGravityRedwolf(reviewApp.game,document)),mode,width,time}),{mode,width,time}));
 }
 // 连续记录真实驾驶、停驻和反向驾驶；绘制器不推进相位。
 await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>{const g=reviewApp.game;g.update=g.reviewUpdate;delete g.reviewUpdate;g.enemies=[];window.motion=[];const chunks=[],stream=document.getElementById('game').captureStream(30),r=new MediaRecorder(stream,{mimeType:'video/webm'});window.reviewRecording={r,stream,chunks};r.ondataavailable=e=>chunks.push(e.data);r.start();});
 for(const key of ['ArrowLeft','ArrowUp',null,'ArrowRight','ArrowDown',null]){if(key)await page.keyboard.down(key);await page.waitForTimeout(650);if(key)await page.keyboard.up(key);await page.evaluate(()=>motion.push({x:reviewApp.game.player.x,y:reviewApp.game.player.y,phase:reviewApp.game.vehicle.wheelPhase}));}
 const clip=await page.evaluate(async()=>{const {r,stream,chunks}=reviewRecording;const done=new Promise(resolve=>r.onstop=resolve);r.stop();await done;stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'});return await new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(blob);});});
 await page.evaluate(data=>{const a=document.createElement('a');a.href=data;a.download='redwolf-motion.webm';a.click();},clip);
 const motion=await page.evaluate(()=>window.motion);if(motion.every(m=>m.phase===0))throw Error('驾驶未生效');
 if(errors.length)throw Error(errors.join('\n'));if(scenes.some(s=>s.overflow))throw Error('页面横向溢出');return {scenes,motion,errors};

}
