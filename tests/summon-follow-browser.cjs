// 实际键盘绕圈、急转与触摸走位，正式昼夜绘制和四类召唤物屏外索敌复核。
async page=>{
 if(new URL(page.url()).port!=='4209')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('素材未加载');window.followApp=a;});
 const checks=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async({time})=>{
   const a=followApp,g=a.game,{freshProgress,validateProgress}=await import('/src/progression/progress.js'),{updateMechanical}=await import('/src/combat/mechanical.js');
   const p=freshProgress();p.weapons.fill(1);p.weapon=15;p.weaponParts[15].coordination=8;p.mechanicalLoadout=0;g.progress=validateProgress(p);g.reset();g.start();g.updateWaves=()=>{};g.waveWarning=0;
   g.enemies=[];g.boss=null;Object.assign(g.player,{x:900,y:850,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-900,t.y-850)>490);
   if(time==='night')g.summonVehicle();
   for(let i=0;i<1500;i++)updateMechanical(g,1/60);
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
  },{time});
  await page.waitForTimeout(250);
  // 连续八方向形成一圈，再急转折返；通过正式键盘输入，不直接改位置。
  for(const keys of [['ArrowRight'],['ArrowRight','ArrowDown'],['ArrowDown'],['ArrowDown','ArrowLeft'],['ArrowLeft'],['ArrowLeft','ArrowUp'],['ArrowUp'],['ArrowUp','ArrowRight']]){
   for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(160);for(const key of keys)await page.keyboard.up(key);
  }
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(350);await page.keyboard.up('ArrowLeft');
  if(await page.evaluate(()=>Math.hypot(followApp.game.player.x-900,followApp.game.player.y-850))<8)throw Error('键盘未驱动正式移动');
  await page.screenshot({path:`output/summon-follow/turn-${width}-${time}.png`});await page.waitForTimeout(1700);
  await page.screenshot({path:`output/summon-follow/settle-${width}-${time}.png`});
  checks.push(await page.evaluate(async({width,time})=>({width,time,...(await import('/src/rendering/visual-review.js')).inspectSummonFollow(followApp.game)}),{width,time}));
 }
 // 四种召唤物逐一使用正式镜头：视野内近敌可索敌，屏外敌不进入任何目标池。
 for(const index of [12,13,15,16]){
  await page.evaluate(async(index)=>{const g=followApp.game;g.progress.weapon=index;g.reset();g.start();g.updateWaves=()=>{};g.waveWarning=0;g.enemies=[];g.trees=[];g.boss=null;Object.assign(g.player,{x:900,y:850});followApp.refresh();},index);await page.waitForTimeout(250);
  const targets=await page.evaluate(async()=>{
   const g=followApp.game,v=g.arrivalView,{summonTargetPool}=await import('/src/combat/summons/targets.js');
   const visible=g.spawnEnemy(0,0,{x:g.player.x+75,y:g.player.y+35}),hidden=g.spawnEnemy(0,0,{x:g.player.x+v.right+80,y:g.player.y});
   for(const e of [visible,hidden])Object.assign(e,{hp:1e7,maxHp:1e7,speed:0,damage:0,flying:false});
   const ids=summonTargetPool(g,g.player,2000).map(t=>t.id);if(!ids.includes(visible.id)||ids.includes(hidden.id))throw Error('可见索敌失效');return {visible:visible.id,hidden:hidden.id};
  });await page.waitForTimeout(2400);await page.screenshot({path:`output/summon-follow/combat-${index}-320.png`});
  const chosen=await page.evaluate(()=>{const g=followApp.game,s=g[g.weapon().controller];return s.nodes.map(n=>n.targetId);});if(chosen.includes(targets.hidden))throw Error('实际锁定屏外目标');
 }
 // 手机真实触摸走位，松手后停止；不改变输入实现。
 const canvas=page.locator('canvas').first(),box=await canvas.boundingBox(),cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});const x=box.x+box.width*.35,y=box.y+box.height*.7;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y:y-25}]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/summon-follow/reduced-touch.png'});
 if(errors.length)throw Error(errors.join('\n'));return {checks,errors,keyboard:true,touch:true};
}
