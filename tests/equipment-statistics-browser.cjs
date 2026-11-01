// 正式游戏档案验证武器与车型明细、手机切换、旧档提示、昼夜及保存恢复。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅限隔离验收端口4291');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:400};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.refresh();});
 await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
 if((await page.locator('[data-equipment-id="pistol"] td').allTextContents()).join(',')!=='0,0')throw Error('新档武器零值不正确');
 await page.locator('[data-equipment-tab="vehicles"]').click();
 if(await page.locator('#chronicle-equipment-legacy').isVisible())throw Error('新档误标旧历史');
 await page.locator('#close-chronicle').click();await page.locator('#settings-done').click();
 // 真实子弹击杀和伐木后重新打开，验证明细读取最新进度。
 await page.evaluate(async()=>{
  const g=a.game,{fireBallistics,updateBallistics}=await import('/src/combat/ballistics.js');g.trees=[];g.enemies=[];
  const e=g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y});e.hp=1;
  fireBallistics(g,{...g.weapon(),spread:0},{x:g.player.x+30,y:g.player.y-8},{x:1,y:0},1e5,false,true);updateBallistics(g,.4);
  g.addTree(g.player.x+100,g.player.y);fireBallistics(g,{...g.weapon(),spread:0},{x:g.player.x+30,y:g.player.y-8},{x:1,y:0},1e5,false,true);updateBallistics(g,.4);
 });
 await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
 await page.locator('[data-equipment-tab="weapons"]').click();
 if((await page.locator('[data-equipment-id="pistol"] td').allTextContents()).join(',')!=='1,1')throw Error('真实命中未更新档案');
 await page.locator('#close-chronicle').click();await page.locator('#settings-done').click();
 // 全装备与大数为布局夹具，不替代上方真实事件与专项战斗测试。
 await page.evaluate(async()=>{
  const g=a.game,{WEAPONS}=await import('/src/config/weapons.js'),{VEHICLE_ARMAMENTS,grantVehicleArmament}=await import('/src/config/vehicle-armaments.js'),{COLLECTED_VEHICLES}=await import('/src/config/vehicles.js');
  g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);g.progress.vehicleWeapons.fill(1);
  for(const [i,w]of [...WEAPONS,...VEHICLE_ARMAMENTS].entries())g.progress.statistics.equipment.weapons[w.id]={kills:i===0?123456789:10+i,trees:i===0?115122:i};
  for(const [i,v]of COLLECTED_VEHICLES.entries())g.progress.statistics.equipment.vehicles[v.id]={kills:30+i,trees:5+i};
  grantVehicleArmament(g.progress,0);g.progress.vehicleIndex=0;g.vehicle=g.vehicles[0]=(await import('/src/combat/vehicle.js')).createVehicle(g.progress, 0);g.vehicle.active=true;
  g.numbers=[];g.remnants=[];g.drops=[];g.spawnEnemy(0,0,{x:g.player.x+130,y:g.player.y+55},{ambient:true});a.refresh();
 });
 for(const [width,height]of [[1280,900],[390,844],[320,740]])for(const phase of ['day','night']){
  await page.setViewportSize({width,height});
  await page.evaluate(async phase=>{const e=a.environment;e.livingPreview=true;e.time=phase;e.weather='sun';e.autoWeather=false;
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.renderer.draw();},phase);
  await page.screenshot({path:`output/playwright/equipment-statistics/field-${width}-${phase}.png`});
  await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
  for(const tab of ['weapons','vehicles']){
   const button=page.locator(`[data-equipment-tab="${tab}"]`);if(width===320){await button.focus();await page.keyboard.press('Enter');}else await button.click();
   await page.locator('#chronicle-equipment').evaluate(el=>el.scrollIntoView({block:'start'}));
   const result=await page.evaluate(async()=>{const r=(await import('/src/rendering/visual-review.js')).inspectGameStatistics(a.game,document);return {tab:r.equipmentTab,rows:r.equipmentRows,overflow:r.overflow};});
   if(result.overflow||!result.rows)throw Error('明细缺失或溢出');
   if(await page.locator(`[data-equipment-id="${tab==='weapons'?'gravity-gun':'red-wolf'}"]`).count()!==1)throw Error('新装备未纳入目录');
   if(tab==='weapons'&&(await page.locator('[data-equipment-id="pistol"] td').allTextContents()).join(',')!=='1Y,11w')throw Error('大数格式错误');
   checks.push({width,phase,...result});await page.screenshot({path:`output/playwright/equipment-statistics/${tab}-${width}-${phase}.png`});
  }
  await page.locator('#close-chronicle').click();if(!await page.locator('#settings-dialog').isVisible())throw Error('未返回设置');await page.locator('#settings-done').click();
 }
 const saved=await page.evaluate(()=>{a.save();return structuredClone(a.game.progress.statistics.equipment);});
 await page.reload();await page.locator('#start').click();
 const restored=await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};return a.game.progress.statistics.equipment;});
 if(JSON.stringify(saved)!==JSON.stringify(restored))throw Error('刷新丢失装备战绩');
 await page.evaluate(async()=>{const p=structuredClone(a.game.progress);delete p.statistics.equipment;a.game.progress=(await import('/src/progression/progress.js')).validateProgress(p);});
 await page.locator('#settings-button').focus();await page.keyboard.press('Enter');await page.locator('#chronicle-button').click();
 if(!await page.locator('#chronicle-equipment-legacy').isVisible())throw Error('旧档缺少历史说明');
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'game-profile-statistics',checks,errors,persistence:true,legacyNotice:true};
}
