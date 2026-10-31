// 实际四向移动录像，并从正式雪花绘制的translate调用读取屏幕位置，避免只测试示意公式。
async (page) => {
 if(new URL(page.url()).port!=='4174')throw Error('仅允许隔离端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:'output/playwright/world-snow-motion/video',size:{width:390,height:844}}});
 try {
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:4174/');await p.locator('#start').tap();
  await p.locator('#settings-button').tap();await p.locator('#environment-button').tap();
  await p.locator('[data-forest-season="winter"]').tap();await p.locator('button[data-weather="snow"]').tap();await p.locator('button[data-time="day"]').tap();
  await p.locator('#auto-time').uncheck();await p.locator('#auto-weather').uncheck();await p.locator('#environment-ok').tap();await p.locator('#settings-done').tap();
  await p.evaluate(async()=>{
   const a=(await import('/src/main.js')).application;window.a=a;
   await (await import('/src/rendering/cat-animation.js')).catSprites.load();
   Object.assign(a.game.player,{x:900,y:800,invincible:99});a.game.spawnTimer=999;a.game.attackTimer=999;a.game.enemies=[];
   a.game.progress.vehicleHulls[0]=1;a.game.summonVehicle();a.game.spawnEnemy(0,0,{x:770,y:700});
   const snow=a.renderer.snow,original=snow.draw.bind(snow),{visibleSnow}=await import('/src/world/snowfall.js');
   // 只保留最新一帧采样，读取真实绘制参数，不累计诊断数据。
   snow.draw=function(...args) {
    const [c,time,width,height,view,intensity,night,reduced]=args,points=[],translate=c.translate;
    c.translate=function(x,y){points.push({x,y});return translate.call(this,x,y);};
    try{original(...args);}finally{c.translate=translate;}
    const samples=intensity>=.01?[...visibleSnow(view,width,height,reduced?0:time)]:[];
    window.snowFrame={time:reduced?0:time,view:{...view},samples,points};
   };
  });
  await p.waitForTimeout(1200);
  const frames=[await p.evaluate(()=>snowFrame)];await p.screenshot({path:'output/playwright/world-snow-motion/idle.png'});
  for(const [key,axis,limit,sign,name] of [['ArrowRight','x',990,1,'right'],['ArrowDown','y',890,1,'down'],['ArrowLeft','x',910,-1,'left'],['ArrowUp','y',810,-1,'up']]) {
   await p.keyboard.down(key);try{await p.waitForFunction(({axis,limit,sign})=>sign*(a.game.player[axis]-limit)>0,{axis,limit,sign},{timeout:12000});}finally{await p.keyboard.up(key);}
   frames.push(await p.evaluate(()=>snowFrame));await p.screenshot({path:`output/playwright/world-snow-motion/${name}.png`});
  }
  await p.waitForTimeout(1200);frames.push(await p.evaluate(()=>snowFrame));await p.screenshot({path:'output/playwright/world-snow-motion/stopped.png'});
  let common=0;
  for(const frame of frames) {
   if(frame.points.length!==frame.samples.length)throw Error('正式绘制粒子数不一致');
   for(let i=0;i<frame.points.length;i++)if(Math.hypot(frame.points[i].x-frame.samples[i].x,frame.points[i].y-frame.samples[i].y)>1e-8)throw Error('正式绘制仍使用屏幕雪花');
  }
  for(let i=1;i<frames.length;i++) {
   const previous=new Map(frames[i-1].samples.map(f=>[f.id,f]));common+=frames[i].samples.filter(f=>previous.has(f.id)).length;
  }
  if(common<60||Math.abs(frames[1].view.x-frames[0].view.x)<30)throw Error('移动录像没有覆盖足够共同雪花');
  // 固定下落时钟后再移动角色，减少动态不能把雪场钉在屏幕上。
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(150);const reducedBefore=await p.evaluate(()=>snowFrame);
  await p.keyboard.down('ArrowRight');try{await p.waitForFunction(()=>a.game.player.x>970);}finally{await p.keyboard.up('ArrowRight');}
  const reducedAfter=await p.evaluate(()=>snowFrame),prior=new Map(reducedBefore.samples.map(f=>[f.id,f]));
  let reducedShared=0;
  for(const f of reducedAfter.samples)if(prior.has(f.id)) {
   const prev=prior.get(f.id),z=reducedAfter.view.zoom;
   if(Math.abs((f.x-prev.x)+(reducedAfter.view.x-reducedBefore.view.x)*z)>1e-7||Math.abs((f.y-prev.y)+(reducedAfter.view.y-reducedBefore.view.y)*z)>1e-7)throw Error('减少动态贴屏');
   reducedShared++;
  }
  if(reducedShared<15)throw Error('冻结移动覆盖不足');
  const video=p.video();await context.close();if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:'snow-world-motion',directions:4,frames:frames.length,commonParticles:common,reducedShared,realDrawProjection:true,video:await video.path(),errors};
 } catch(error) {await context.close();throw error;}
}
