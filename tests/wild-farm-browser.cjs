// 手机实际触控验收：只跳过入职并定位到正式固定田块，收割与复种使用真实指针和动作。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/wild-farm/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshRangerProgress(),{MAINLINE_IDS}=await import('/src/config/mainline.js');p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
   const g=a.game;g.progress=p;g.mapId='forest';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.wildFarmRetryAt=0;
   let seed=17;g.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   (await import('/src/core/farming/wild-farm.js')).ensureWildFarms(g);
   window.plotId=g.progress.farm.plots[0].id;window.site={...g.progress.farm.plots[0]};
   const {farmApproach}=await import('/src/world/farm-land.js');Object.assign(g.player,farmApproach(g,site),{vx:0,vy:0,invincible:0});g.enemies=[];
   a.renderer.camera.time=null;await (await import('/src/rendering/farm.js')).loadFarmArt();
   // 固定季节与时段只用于昼夜构图比较，农活动作仍正常推进。
   window.light=async time=>{Object.assign(a.environment,{time,weather:'sun',season:'summer',autoWeather:false,autoTime:false,livingPreview:true});const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();};await light('day');
  });
  await page.waitForTimeout(800);await page.screenshot({path:'output/playwright/wild-farm/discovery.png'});
  const before=await page.evaluate(()=>a.game.progress.coins),id=await page.evaluate(()=>plotId);await page.locator(`[data-farm-cell="${id}"]`).tap();
  if(!(await page.locator('#farm-notice').innerText()).includes('野外田地'))throw Error('未提示野外可种田');
  await page.screenshot({path:'output/playwright/wild-farm/harvest-prompt.png'});
  await page.waitForFunction(()=>a.game.progress.farm.plots.find(p=>p.id===plotId).crop===null,null,{timeout:15000});
  const after=await page.evaluate(()=>({coins:a.game.progress.coins,dug:a.game.progress.farm.dug,planted:a.game.progress.farm.planted,lesson:a.game.progress.farm.lessonRewarded}));
  if(after.coins<=before||after.dug||after.planted||after.lesson)throw Error('收获或教学事实异常 '+JSON.stringify(after));
  await page.screenshot({path:'output/playwright/wild-farm/harvested.png'});await page.waitForTimeout(800);
  await page.locator(`[data-farm-cell="${id}"]`).tap();await page.locator('[data-farm-seed="0"]').tap();await page.locator(`[data-farm-cell="${id}"]`).tap();
  await page.waitForFunction(()=>a.game.progress.farm.plots.find(p=>p.id===plotId).crop===0,null,{timeout:15000});await page.waitForTimeout(800);
  await page.screenshot({path:'output/playwright/wild-farm/replanted.png'});
  // 真实方向键从田前、侧面和后侧绕行，录像保留原绘制器的遮挡与脚底排序。
  await page.evaluate(()=>{a.game.farmWork=null;});
  for(const key of ['ArrowRight','ArrowUp','ArrowLeft','ArrowDown']){await page.keyboard.down(key);await page.waitForTimeout(350);await page.keyboard.up(key);}
  await page.evaluate(async()=>{const {farmApproach}=await import('/src/world/farm-land.js');Object.assign(a.game.player,farmApproach(a.game,site),{vx:0,vy:0});a.renderer.camera.time=null;});
  for(const [width,height] of [[390,844],[320,568],[844,390],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(time=>light(time),time);await page.waitForTimeout(500);
   await page.screenshot({path:`output/playwright/wild-farm/field-${width}-${time}.png`});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面溢出');
  }
  // 两图三种尺寸都采样正式方田，检查完整田埂、邻接环境和昼夜根部遮挡。
  await page.setViewportSize({width:390,height:844});
  for(const mapId of ['forest','jiuzhaigou']){
   await page.evaluate(async mapId=>{const g=a.game;g.progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);g.boss=null;if(g.mapId!==mapId&&!g.switchMap(mapId))throw Error('切图失败');g.wildFarmRetryAt=0;(await import('/src/core/farming/wild-farm.js')).ensureWildFarms(g);},mapId);
   for(let index=0;index<3;index++){
    await page.evaluate(async index=>{const g=a.game,field=(await import('/src/config/wild-farm.js')).WILD_FARM_SITES[g.mapId][index];Object.assign(g.player,{x:field.x+(field.size-1)*28,y:field.y+(field.size-1)*52+62,vx:0,vy:0,invincible:0});g.enemies=[];a.renderer.camera.time=null;},index);
    for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(400);await page.screenshot({path:`output/playwright/wild-farm/${mapId}-${index+2}x${index+2}-${time}.png`});}
   }
  }
  const review=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectWildFarm(a.game,document);if(r.art.sheets!==3||r.overflow||r.wildPlots!==29)throw Error('绘制预算或布局异常');return r;});
  // 同屏审查借用已拥有的正式车辆与怪物，农活验收已在步行状态完成。
  await page.evaluate(()=>{const g=a.game;g.progress.campParking.owned=[];g.progress.vehicleHulls[g.vehicle.index]=1;g.summonVehicle();if(!g.vehicle.active)throw Error('同屏载具未出场');g.spawnEnemy(0,0,{x:g.player.x-100,y:g.player.y+25});});
  for(const time of ['day','night']){await page.evaluate(time=>light(time),time);await page.waitForTimeout(200);await page.screenshot({path:`output/playwright/wild-farm/actors-${time}.png`});}
  const saved=await page.evaluate(()=>structuredClone(a.game.progress.farm));
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  // 校验器会规范对象键顺序，按田块事实比较，避免把键顺序误判为数据丢失。
  const restored=await page.evaluate(()=>a.game.progress.farm),facts=f=>f.plots.map(p=>[p.id,p.mapId,p.x,p.y,p.crop,p.plantedAt,p.readyAt,p.watered,p.wild]);
  if(JSON.stringify(facts(saved))!==JSON.stringify(facts(restored))||restored.wildMaps.join()!=='forest,jiuzhaigou')throw Error('刷新重复生成或丢失田块 '+JSON.stringify({before:facts(saved),after:facts(restored),maps:restored.wildMaps}));
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'wild-farmland',plots:saved.plots.length,after,review,errors};
 }finally{await context.close();}
}
