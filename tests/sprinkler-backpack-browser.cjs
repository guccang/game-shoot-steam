// 手机真实交互验证持久背包、失败重试、取消、免费再放置与二十四格范围。
async original=>{
 const base=new URL(original.url()).origin,dir='output/playwright/sprinkler-backpack/';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:dir+'video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 // 检查真实弹窗和现有手机容器，不创建额外绘图。
 async function shot(name){await page.screenshot({path:dir+name+'.png'});const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectSprinklerBackpack(a.game));if(r.overflow)throw Error('页面横向溢出');reviews.push({name,...r});}
 // 随身物品入口使用实际菜单按钮。
 async function bag(){if(!await page.locator('#heroes-button').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#heroes-button').tap();await page.locator('[data-cat-tab=items]').tap();}
 // 改变真实历法，不用独立预览或合成图替代场景。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(150);}


 try{
  await page.goto(base);await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(x=>x.id);p.wood=1000;p.mining.ore=100;p.production.minedOre=12;p.production.returned=true;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.livingPersist=()=>true;g.livingWeather='sun';Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});
   const land=await import('/src/world/farm-land.js'),{SPRINKLER_OFFSETS}=await import('/src/config/farm-production.js');const offsets=[[0,0],...SPRINKLER_OFFSETS,[168,52],[112,156]];let point=null;
   for(let y=2000;y<5000&&!point;y+=104)for(let x=2000;x<5000&&!point;x+=112){const q={x,y,mapId:'forest'};Object.assign(g.player,q);if(offsets.every(([dx,dy])=>!land.farmLandReason(g,{...q,x:x+dx,y:y+dy})))point=q;}
   if(!point)throw Error('无合法二格区域');window.site=point;const now=Date.now();g.progress.farm.plots=offsets.slice(1).map(([dx,dy],i)=>({id:i+1,mapId:'forest',x:point.x+dx,y:point.y+dy,crop:i%3===0?3:1,plantedAt:now,readyAt:now+120000,watered:false}));g.progress.farm.nextId=27;g.progress.farm.dug=g.progress.farm.planted=26;Object.assign(g.player,{x:point.x-60,y:point.y});a.renderer.camera.time=null;a.refresh();
  });

  await page.evaluate(async()=>{window.persist=(await import('/src/platform/storage.js')).createSaveStore().saveProgress;a.game.livingPersist=window.persist;});
  await phase('day');await page.locator('#production-menu').tap();await page.locator('[data-production-tab=build]').tap();await page.locator('[data-production-build=sprinkler]').tap();await page.waitForFunction(()=>a.game.productionCursor);
  await shot('coverage-24');await page.locator('[data-production-place]').tap();await page.waitForFunction(()=>a.game.productionSpray?.devices?.length);
  await page.waitForFunction(()=>a.game.progress.farm.plots.filter(p=>p.sprinklerWatered).length===24);
  if(await page.evaluate(()=>a.game.progress.farm.plots.filter(p=>p.sprinklerWatered).length)!==24)throw Error('不是24块田');
  await page.locator('#production-menu').tap();await page.locator('[data-production-store]').scrollIntoViewIfNeeded();await shot('store-action');
  await page.evaluate(()=>a.game.livingPersist=()=>false);await page.locator('[data-production-store]').tap();if(await page.evaluate(()=>a.game.progress.production.sprinklerInventory)!==0)throw Error('失败仍收回');await shot('store-failure');
  await page.evaluate(()=>a.game.livingPersist=window.persist);await page.locator('[data-production-store]').tap();await page.waitForFunction(()=>a.game.progress.production.sprinklerInventory===1&&!a.game.progress.production.sprinklers.length);
  await page.locator('[data-production-close]').first().tap();await shot('stored-scene');
  const point=await page.evaluate(()=>site);await page.reload();await page.locator('#start').tap();await page.evaluate(async point=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.state='playing';g.vehicle.active=false;g.enemies=[];g.trees=[];g.mainlineSpeech=null;g.spawnTimer=g.mainlineTalkDelay=999999;Object.assign(g.player,point);window.site=point;window.persist=(await import('/src/platform/storage.js')).createSaveStore().saveProgress;g.livingPersist=window.persist;Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.refresh();},point);
  if(await page.evaluate(()=>a.game.progress.production.sprinklerInventory)!==1)throw Error('刷新后背包丢失');
  await bag();await page.locator('[data-keepsake="facility:sprinkler"]').tap();await shot('bag-detail');
  for(const size of [{width:320,height:568},{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(size);await shot('detail-'+size.width);const bad=await page.locator('#keepsake-dialog button').evaluateAll(bs=>bs.filter(b=>b.getClientRects().length).some(b=>b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44));if(bad)throw Error('触控不足44px');}
  await page.locator('[data-pack-action=place-sprinkler]').tap();await page.waitForFunction(()=>!!a.game.productionCursor&&a.game.state==='playing');await page.locator('[data-production-cancel]').tap();if(await page.evaluate(()=>a.game.progress.production.sprinklerInventory)!==1)throw Error('取消丢设备');
  await page.evaluate(async()=>{const g=a.game,c=await import('/src/core/farm-production.js');let q=null;for(let y=2500;y<4500&&!q;y+=104)for(let x=2500;x<4500&&!q;x+=112){Object.assign(g.player,{x:x-60,y});const check=c.productionPlacement(g,{x,y},'sprinkler');if(!check.reason)q=check.point;}if(!q)throw Error('无新位置');window.newSite=q;Object.assign(g.player,{x:q.x-60,y:q.y});g.progress.wood=g.progress.mining.ore=0;a.renderer.camera.time=null;a.refresh();});
  await page.locator('#production-menu').tap();await page.locator('[data-production-from-bag]').tap();await page.waitForFunction(()=>a.game.productionCursor);await phase('night');await shot('new-position-night');
  await page.evaluate(()=>a.game.livingPersist=()=>false);await page.locator('[data-production-place]').tap();if(await page.evaluate(()=>a.game.progress.production.sprinklerInventory)!==1)throw Error('放置失败丢库存');await shot('place-failure');
  await page.evaluate(()=>a.game.livingPersist=window.persist);await page.locator('[data-production-place]').tap();await page.waitForFunction(()=>a.game.progress.production.sprinklers.length===1&&a.game.progress.production.sprinklerInventory===0);
  const end=await page.evaluate(()=>({d:a.game.progress.production.sprinklers[0],ore:a.game.progress.mining.ore,wood:a.game.progress.wood,newSite,site}));if(end.ore||end.wood||Math.hypot(end.d.x-end.site.x,end.d.y-end.site.y)<150)throw Error('没有免费异地放置');await shot('placed-night');
  if(errors.length)throw Error(errors.join('\n'));return {scenes:reviews.length,errors,end,reviews};
 }catch(e){await page.screenshot({path:dir+'failure.png'});throw Error(e.message+' | '+errors.join(';'));}finally{await context.close();}
}
