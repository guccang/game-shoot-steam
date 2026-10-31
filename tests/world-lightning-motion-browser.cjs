// 手机与宽屏实际绘制回归：固定放电时刻以便持续移动观察，记录正式 Canvas 电弧坐标。
async original => {
 const results=[],errors=[];
 for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[1100,800,'day']]) {
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try {
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async time=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;
    p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.enemies=[];g.spawnTimer=999;g.attackTimer=999;
    Object.assign(g.player,{x:900,y:800,invincible:999});g.progress.vehicleHulls[0]=1;g.summonVehicle();g.spawnEnemy(0,0,{x:780,y:700});
    Object.assign(a.environment,{time,weather:'thunder',autoTime:false,autoWeather:false,livingPreview:true});
    const r=a.renderer;r.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);r.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    const {StormCycle}=await import('/src/world/storm.js');window.originalStormSample=StormCycle.prototype.sample;
    // 仅冻结雷电时钟，角色、相机、图集和所有正式绘制仍正常运行。
    StormCycle.prototype.sample=function(){return {cycle:0,frame:r.reduced.matches?-1:8,age:.35,flash:r.reduced.matches?0:1,thunder:false};};
    r.stormStrike=null;
    const {getLightningAtlas,LIGHTNING_ATLAS:spec}=await import('/src/rendering/weather-atlas.js');
    const atlas=getLightningAtlas(0),drawImage=r.c.drawImage,draw=r.draw.bind(r);
    r.c.drawImage=function(...args){if(args[0]===atlas)window.bolt={x:args[5]+spec.anchor[0]*args[7]/spec.width,y:args[6]+spec.anchor[1]*args[8]/spec.height};return drawImage.apply(this,args);};
    r.draw=function(...args){window.bolt=null;draw(...args);window.lightningFrame={bolt:window.bolt,view:{...r.view},strike:r.stormStrike?{...r.stormStrike}:null,player:{x:g.player.x,y:g.player.y}};};
   },time);
   await page.waitForFunction(()=>window.lightningFrame?.bolt);
   const before=await page.evaluate(()=>lightningFrame);
   await page.screenshot({path:`output/playwright/world-lightning/${width}-${time}-before.png`});
   const frames=[before];
   for(const key of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']) {
    const initial=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
    await page.keyboard.down(key);
    try{await page.waitForFunction(p=>Math.hypot(a.game.player.x-p.x,a.game.player.y-p.y)>25,initial,{timeout:10000});}finally{await page.keyboard.up(key);}
    frames.push(await page.evaluate(()=>lightningFrame));
    if(key==='ArrowRight')await page.screenshot({path:`output/playwright/world-lightning/${width}-${time}-moved.png`});
   }
   for(const frame of frames) {
    if(!frame.bolt||JSON.stringify(frame.strike)!==JSON.stringify(before.strike))throw Error('落点随移动改变');
    const wx=frame.bolt.x/frame.view.zoom+frame.view.x,wy=frame.bolt.y/frame.view.zoom+frame.view.y;
    if(Math.hypot(wx-before.strike.x,wy-before.strike.y)>1e-7)throw Error('实际电弧绘制未绑定世界');
   }
   if(Math.abs(frames[1].bolt.x-before.bolt.x)<5)throw Error('电弧仍然贴屏');
   // 普通森林不提供手动缩放；跨设备宽度阈值会触发正式相机倍率切换。
   await page.setViewportSize({width:width<500?900:390,height:1000});await page.waitForTimeout(300);
   const zoomed=await page.evaluate(()=>lightningFrame);
   if(JSON.stringify(zoomed.strike)!==JSON.stringify(before.strike)||zoomed.view.zoom===before.view.zoom)throw Error('缩放回归失败 '+JSON.stringify({before,zoomed}));
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>lightningFrame.strike===null&&lightningFrame.bolt===null);
   results.push({width,height,time,directions:4,anchor:before.strike,cameraDelta:frames[1].view.x-before.view.x,boltDelta:frames[1].bolt.x-before.bolt.x,zoom:[before.view.zoom,zoomed.view.zoom],reduced:true});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'lightning-world-anchor',results,errors};
}
