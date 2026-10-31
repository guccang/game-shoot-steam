// 正式绘制器昼夜同屏、手机短屏、原桌面竖版、触控与连续动作采样。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.campApp=(await import('/src/main.js')).application;await campApp.ready;if(campApp.game.mapId!=='forest')campApp.game.switchMap('forest');});
 const samples=[];
 for(const [width,height] of [[390,844],[320,568],[1280,900]]){
  await page.setViewportSize({width,height});
  for(const phase of ['day','night']){
   await page.evaluate(async({phase})=>{
    const a=campApp,g=a.game,cfg=await import('/src/config/monster-camps.js'),c=cfg.MONSTER_CAMPS[1];
    g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.progress.fireDispatch.next=999999;g.attackTimer=999999;g.encounterTimer=999999;g.enemies=[];g.player.invincible=0;g.player.hp=g.maxHp();
    Object.assign(g.player,{...cfg.campVisitorSite(c),x:c.x-10,y:c.y-cfg.MONSTER_CAMP_RULES.radius-18});
    g.progress.monsterCamps.camps[c.id]={clears:6,mask:0,cooldown:0};g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
    Object.assign(a.environment,{time:phase,livingPreview:false,weather:'sun',forestSeason:'summer',autoWeather:false,autoTime:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);
    if(!g.vehicle.active)g.summonVehicle();a.renderer.camera.time=null;a.refresh();
   },{phase});
   await page.waitForTimeout(1600);if(await page.evaluate(()=>campApp.game.state)!=='playing')throw Error('场景未处于巡游状态，不能用死亡弹窗代替营地验收');await page.screenshot({path:`output/playwright/monster-camps/world-${width}-${phase}.png`});
   const check=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMonsterCamps(campApp.game,document));samples.push({width,phase,...check});if(check.overflow)throw Error('战场溢出');
  }
  // 统一附近按钮点击打开居民故事，底栏和触控尺寸检查以实际DOM为准。
  await page.locator('#nearby-interaction').click();
  await page.screenshot({path:`output/playwright/monster-camps/directory-${width}.png`});
  const check=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMonsterCamps(campApp.game,document));if(check.overflow||check.buttons.some(b=>b.height<44))throw Error('故事触控尺寸或换行失败');samples.push({width,panel:check});await page.locator('[data-camp-close]').click();
 }
 // 开启浏览器真实触屏事件，手指拖动前后通过正式角色坐标确认移动。
 await page.setViewportSize({width:390,height:844});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const before=await page.evaluate(()=>({x:campApp.game.player.x,y:campApp.game.player.y}));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:510}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:510}]});await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(()=>({x:campApp.game.player.x,y:campApp.game.player.y}));if(Math.hypot(after.x-before.x,after.y-before.y)<20)throw Error('触控摇杆未移动');
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 // 同一个正式Canvas连续录制局部火焰、怪物步态、玩家起停和载具，未复制静帧。
 await page.evaluate(()=>{const a=campApp;window.campVideo={chunks:[],stream:a.renderer.canvas.captureStream(20)};const r=window.campVideo;r.recorder=new MediaRecorder(r.stream,{mimeType:'video/webm'});r.recorder.ondataavailable=e=>{if(e.data.size)r.chunks.push(e.data);};r.recorder.start();});
 for(const key of ['ArrowDown','ArrowRight','ArrowUp','ArrowLeft']){await page.keyboard.down(key);await page.waitForTimeout(800);await page.keyboard.up(key);await page.waitForTimeout(250);}
 const download=page.waitForEvent('download');await page.evaluate(async()=>{const r=window.campVideo;await new Promise(resolve=>{r.recorder.onstop=resolve;r.recorder.stop();});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(r.chunks,{type:'video/webm'}));a.download='camp-motion.webm';a.click();for(const t of r.stream.getTracks())t.stop();});await(await download).saveAs('output/playwright/monster-camps/camp-motion.webm');
 await page.evaluate(()=>campApp.game.pause());if(errors.length)throw Error(errors.join('\n'));return {samples,touch:{before,after},errors};
}
