// 内部电锯兼容验收：工具栏已移除电锯，保留点树、结算与迎敌后续作检查。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/farm-saw/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.lessonRewarded=true;p.farm.plots=[];
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.enemies=[];g.boss=null;g.trees=[];g.vehicle.active=false;g.updateWaves=()=>{};
   Object.assign(g.player,{x:893,y:2910,vx:0,vy:0,invincible:99999});g.addTree(893,2752);window.tree=g.trees.at(-1);if(!tree)throw Error('正式树木未生成');window.beforeChopped=g.chopped;window.beforeWeapon=g.progress.weapon;
   window.realUpdate=g.update.bind(g);g.update=()=>{};for(const d of document.querySelectorAll('dialog[open]'))d.close();a.renderer.camera.time=null;a.refresh();
   // 固定光照方便同屏复核，不替换正式场景或工具绘制。
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();};
  });
  await page.locator('#field-menu-toggle').tap();await page.locator('#farm-menu').tap();await page.evaluate(async()=>{(await import('/src/core/farming/farm.js')).setFarmTool(a.game,'saw');});
  if(await page.evaluate(()=>a.game.farmWork?.tool!=='saw'||!!document.querySelector('#farm-saw')))throw Error('电锯未选中');
  for(const [width,height] of [[320,568],[390,844],[844,390],[1280,900]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(180);
   const boxes=await page.locator('#farm-tools button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));
   if(boxes.length!==5||boxes.some(r=>r.w<44||r.h<44||r.x<0||r.right>width||r.y<0||r.bottom>height||!r.hit))throw Error('工具按钮越界或被遮挡 '+JSON.stringify(boxes));
   for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/farm-saw/toolbar-${width}-${time}.png`});}
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>light('day'));await page.waitForTimeout(250);
  // 世界坐标通过正式镜头换算为触点，避免直接调用农活队列绕过入口。
  async function tapWorld(x,y){const p=await page.evaluate(({x,y})=>{const r=a.renderer.canvas.getBoundingClientRect(),v=a.renderer.view;return {x:r.x+(x-v.x)/v.w*r.width,y:r.y+(y-v.y)/v.h*r.height};},{x,y});await page.touchscreen.tap(p.x,p.y);}
  await tapWorld(1000,2820);
  if(await page.evaluate(()=>a.game.farmWork.job||a.game.farmWork.queue.length||!document.querySelector('#farm-notice').textContent.includes('点击一棵树')))throw Error('空地缺少反馈');
  await tapWorld(893,2722);
  if(await page.evaluate(()=>a.game.farmWork.queue.length!==1))throw Error('点树未排队');
  await page.evaluate(()=>{a.game.update=realUpdate;});
  await page.waitForFunction(()=>tree.hp<=0,null,{timeout:15000});await page.waitForTimeout(500);
  if(await page.evaluate(()=>a.game.chopped!==beforeChopped+1||a.game.farmWork.tool!=='saw'||a.game.progress.weapon!==beforeWeapon||!a.game.stumps.some(s=>s.x===tree.x&&s.y===tree.y)))throw Error('锯树结算或武器恢复错误');
  await page.screenshot({path:'output/playwright/farm-saw/chopped.png'});
  // 第二棵树排队后遇敌，敌人死亡后继续原电锯工作。
  await page.evaluate(()=>{const g=a.game;g.update=()=>{};g.addTree(949,2752);window.tree2=g.trees.at(-1);});
  await tapWorld(949,2722);
  await page.evaluate(()=>{const g=a.game;g.spawnEnemy(0,80,{x:g.player.x+80,y:g.player.y});window.target=g.enemies.at(-1);Object.assign(target,{hp:100000,maxHp:100000,speed:0,mass:100000,damage:0});g.attackTimer=0;g.update=realUpdate;});
  await page.waitForFunction(()=>a.game.farmWork?.autoCombat&&target.hp<100000);
  if(await page.evaluate(()=>tree2.hp<=0||a.game.farmWork.tool!=='saw'))throw Error('迎敌未暂停电锯');
  await page.evaluate(()=>{a.game.hit(target,target.hp+1,false);});await page.waitForFunction(()=>tree2.hp<=0&&!a.game.farmWork.autoCombat,null,{timeout:15000});
  await page.locator('#farm-hoe').tap();await page.evaluate(async()=>{(await import('/src/core/farming/farm.js')).setFarmTool(a.game,'saw');});
  if(await page.evaluate(()=>a.game.farmWork.tool!=='saw'||a.game.chopped!==beforeChopped+2))throw Error('内部工具切换或重复结算错误');
  await page.locator('#farm-exit').tap();if(await page.locator('#farm-tools').isVisible())throw Error('退出未收起工具栏');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'world-farm-delivery',layouts:8,touchSaw:true,emptyFeedback:true,combatResume:true,internalTool:true,errors};
 }finally{await context.close();}
}
