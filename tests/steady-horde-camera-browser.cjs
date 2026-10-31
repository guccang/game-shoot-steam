// 真实自动攻击频繁切换方向时保持构图，持续键盘和触摸行进仍可调整七三视野。
async page=>{
 if(new URL(page.url()).port!=='4278')throw Error('仅用于隔离端口4278');
 const errors=[],samples=[],aimRuns=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress(),gate=(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='top');
  p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';p.living.position={x:gate.x,y:gate.y+50};p.vehicleHulls[1]=2;p.vehicleIndex=1;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.setViewportSize({width:390,height:900});await page.locator('#start').click();
 await page.locator('[data-camp-gate="top"]').click();await page.locator('#camp-primary').click();
 await page.locator('#camp-defense-hud').waitFor({state:'visible'});
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application,g=a.game,r=g.campDefense;
  r.timer=0;r.spawned=32;g.enemies=[];g.summonVehicle();g.vehicle.module.cooldown=99999;g.player.invincible=99999;
  for(let i=0;i<17;i++){
   const e=g.spawnEnemy(0,0,{x:g.player.x+(i?((i-1)%8-3.5)*30:0),y:g.player.y-(i?260+Math.floor((i-1)/8)*35:100)},{ambient:true});
   Object.assign(e,{campDefense:true,arena:r.arena,hp:1000000,maxHp:1000000,speed:0,damage:0});
  }
  window.steadyAimTarget=g.enemies[0];a.renderer.camera.time=null;a.environment.autoWeather=false;a.environment.weather='sun';a.refresh();a.renderer.draw();
 });
 for(const lighting of ['day','night']){
  await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};},lighting);
  await page.waitForTimeout(21000);
  // 保留真实瞄准、开火和后坐，仅把一个高生命敌人交替置于左右来复现快速转枪。
  const aim=await page.evaluate(async()=>{
   const a=(await import('/src/main.js')).application,g=a.game,review=await import('/src/rendering/visual-review.js'),frames=[];
   const original=g.onEvent;let shots=0;g.onEvent=(type,...args)=>{if(type==='shot')shots++;original(type,...args);};
   const start=performance.now();
   await new Promise(resolve=>{
    // 每帧读正式镜头，攻击方向每 0.18 秒切到另一侧。
    function frame(){const elapsed=(performance.now()-start)/1000,e=window.steadyAimTarget;
     e.x=g.player.x+(Math.floor(elapsed/.18)%2?100:-100);e.y=g.player.y-70;e.pushX=e.pushY=0;
     frames.push(review.inspectHordeCamera(g,a.renderer));if(elapsed<4)requestAnimationFrame(frame);else resolve();}
    requestAnimationFrame(frame);
   });
   g.onEvent=original;
   const first=frames[0],last=frames.at(-1),angles=frames.map(f=>f.angle);
   return {first,last,frames:frames.length,shots,angleSpan:Math.max(...angles)-Math.min(...angles),
    maxOffsetDrift:Math.max(...frames.map(f=>Math.hypot(f.player.x-first.player.x,f.player.y-first.player.y)))};
  });
  if(aim.angleSpan<.6||aim.shots<1||aim.maxOffsetDrift>.01)throw Error('自动攻击复现或镜头稳定失败 '+JSON.stringify(aim));
  aimRuns.push({lighting,...aim});
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
   const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectHordeCamera(a.game,a.renderer);});
   if(Math.abs(sample.frontRatio-.7)>.01)throw Error('静止七三比例错误');samples.push({lighting,width,...sample});
   await page.screenshot({path:`output/playwright/steady-horde-camera/${width}-${lighting}.png`});
  }
 }
 await page.setViewportSize({width:390,height:900});await page.waitForTimeout(250);
 // 短促躲闪不应翻转构图，即使瞄准仍在变化。
 for(let i=0;i<3;i++){await page.keyboard.down('KeyA');await page.waitForTimeout(120);await page.keyboard.up('KeyA');
  await page.keyboard.down('KeyD');await page.waitForTimeout(120);await page.keyboard.up('KeyD');}
 const dodge=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return a.renderer.camera.hordeAngle;});
 if(Math.abs(dodge+Math.PI/2)>.001)throw Error('短促躲闪改变了构图');
 await page.keyboard.down('KeyD');await page.waitForTimeout(850);await page.keyboard.up('KeyD');await page.waitForTimeout(3500);
 const keyboard=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectHordeCamera(a.game,a.renderer);});
 if(Math.abs(keyboard.heading)>.05||Math.abs(keyboard.frontRatio-.7)>.005)throw Error('持续右移未改变构图 '+JSON.stringify(keyboard));
 await page.screenshot({path:'output/playwright/steady-horde-camera/keyboard-east.png'});
 const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:550}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:490}]});await page.waitForTimeout(850);
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();await page.waitForTimeout(3500);
 const touchResult=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectHordeCamera(a.game,a.renderer);});
 if(Math.abs(touchResult.heading+Math.PI/2)>.05||Math.abs(touchResult.frontRatio-.7)>.005)throw Error('持续触摸向上未调整构图');
 await page.screenshot({path:'output/playwright/steady-horde-camera/touch-north.png'});
 if(errors.length)throw Error(errors.join('\n'));
 return {aimRuns,samples,dodge,keyboard,touch:touchResult,errors};
}
