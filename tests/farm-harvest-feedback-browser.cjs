// 收获反馈专项：真实触摸收割、单枚金币、快速回收、合并金额、暂停及减少动态。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.vehicle.active=false;g.player.invincible=99999;
   const {farmLandReason,snapFarmPoint,farmApproach}=await import('/src/world/farm-land.js');
   for(let y=400;y<1200&&!window.site;y+=52)for(let x=1500;x<2600&&!window.site;x+=56){const candidate=snapFarmPoint({x,y},'forest');if(!farmLandReason(g,candidate)&&farmApproach(g,candidate))window.site=candidate;}
   if(!site)throw Error('未找到合法测试田');
   const now=Date.now();g.progress.farm.plots=[{...site,id:0,mapId:'forest',crop:7,plantedAt:now-500000,readyAt:now-1000,watered:false}];g.progress.farm.nextId=1;Object.assign(g.player,farmApproach(g,g.progress.farm.plots[0]),{vx:0,vy:0});
   for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();window.beforeCoins=g.progress.coins;
   // 批量反馈通过正式收割事务产生，避免伪造收益信号或动画节点。
   window.harvestNext=async crop=>{const g=a.game,now=Date.now(),id=g.progress.farm.nextId++,p={...site,id,mapId:'forest',crop,plantedAt:now-500000,readyAt:now-1000,watered:false};g.progress.farm.plots=[p];Object.assign(g.player,{x:p.x,y:p.y+50});const result=(await import('/src/core/farm.js')).farmAction(g,'harvest',{plot:id});if(!result.ok)throw Error(result.message);a.farm.render();return result.coins;};
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();await page.waitForFunction(()=>!document.getElementById('farm-sickle').disabled);
  await page.locator('[data-farm-cell="0"]').tap();await page.waitForFunction(()=>document.querySelector('.farm-coin-flight'));
  const first=await page.evaluate(()=>{a.game.state='paused';a.farm.render();const nodes=[...document.querySelectorAll('.farm-coin-flight')],node=nodes[0],animation=node.getAnimations()[0];return {count:nodes.length,icons:node.querySelectorAll('svg').length,text:node.textContent,duration:animation.effect.getTiming().duration,coins:a.game.progress.coins-beforeCoins,time:animation.currentTime};});
  if(first.count!==1||first.icons!==1||first.text!=='+600'||first.duration!==360||first.coins!==600)throw Error(JSON.stringify(first));
  await page.waitForTimeout(180);if(!await page.evaluate(t=>Math.abs(document.querySelector('.farm-coin-flight').getAnimations()[0].currentTime-t)<1,first.time))throw Error('暂停没有冻结飞行');
  // 暂停验证结束后恢复战场，只冻结动画采样，截图不被暂停底板遮住。
  await page.evaluate(()=>{const animation=document.querySelector('.farm-coin-flight').getAnimations()[0];animation.playbackRate=0;animation.play();animation.currentTime=0;a.game.state='playing';a.game.update=()=>{};a.refresh();});
  await page.screenshot({path:'output/playwright/farm-harvest-feedback/real-harvest.png'});
  await page.evaluate(()=>{a.game.state='playing';a.game.update=()=>{};document.querySelector('.farm-coin-flight').getAnimations()[0].playbackRate=1;a.farm.render();});await page.waitForFunction(()=>!document.querySelector('.farm-coin-flight'),null,{timeout:1500});
  if(await page.evaluate(()=>a.game.progress.coins-beforeCoins)!==600)throw Error('动画结束重复结算');
  // 同时收割与飞行途中追加都合并到同一节点，不重启动画时钟。
  const batch=await page.evaluate(async()=>{await harvestNext(0);await harvestNext(1);window.flightNode=document.querySelector('.farm-coin-flight');window.flightAnimation=flightNode.getAnimations()[0];return {text:flightNode.textContent,count:document.querySelectorAll('.farm-coin-flight').length};});
  if(batch.text!=='+140'||batch.count!==1)throw Error('同时收割未合并');
  await page.waitForTimeout(100);
  const merged=await page.evaluate(async()=>{const before=flightAnimation.currentTime;await harvestNext(2);return {same:flightNode===document.querySelector('.farm-coin-flight'),text:flightNode.textContent,before,after:flightAnimation.currentTime,count:document.querySelectorAll('.farm-coin-flight').length};});
  if(!merged.same||merged.text!=='+380'||merged.count!==1||merged.after<merged.before)throw Error('追加收益重启或重复创建动画 '+JSON.stringify(merged));
  await page.waitForFunction(()=>!document.querySelector('.farm-coin-flight'),null,{timeout:1500});
  // 每个样本冻结在同一真实动画进度，仅用于查看昼夜与手机大小，不代替上方播放验证。
  for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);a.game.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(120);
   await page.evaluate(async()=>{a.game.state='playing';await harvestNext(7);const animation=document.querySelector('.farm-coin-flight').getAnimations()[0];animation.playbackRate=0;animation.currentTime=45;});
   await page.screenshot({path:`output/playwright/farm-harvest-feedback/${width}-${time}.png`});samples.push({width,height,time});
   await page.evaluate(()=>{document.querySelector('.farm-coin-flight').getAnimations()[0].playbackRate=1;a.farm.render();});await page.waitForFunction(()=>!document.querySelector('.farm-coin-flight'));
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(async()=>{await harvestNext(0);const animation=document.querySelector('.farm-coin-flight').getAnimations()[0],frames=animation.effect.getKeyframes();return {duration:animation.effect.getTiming().duration,still:frames[0].transform===frames.at(-1).transform};});
  if(reduced.duration!==120||!reduced.still)throw Error('减少动态仍跨屏移动');await page.waitForFunction(()=>!document.querySelector('.farm-coin-flight'));
  // 卸载释放尚未播完的动画，金币到账不依赖表现层。
  await page.emulateMedia({reducedMotion:'no-preference'});const disposed=await page.evaluate(async()=>{await harvestNext(0);const before=a.game.progress.coins;a.farm.dispose();return !document.querySelector('.farm-coin-flight')&&a.game.progress.coins===before;});
  if(!disposed||errors.length)throw Error('卸载或页面错误 '+errors.join('\n'));return {designCriterion:'world-farm-delivery',first,batch,merged,reduced,disposed,samples,errors};
 }finally{await context.close();}
}
