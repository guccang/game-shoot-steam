// 独立手机浏览器验收：正式种子图集、拖播、取消/确认移除和保存重载。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4175');await page.setViewportSize({width:390,height:844});await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.farmApp=(await import('/src/main.js')).application;await farmApp.ready;const g=farmApp.game,p=(await import('/src/progression/progress.js')).freshProgress();
  p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
  p.farm.wildMaps=['forest','jiuzhaigou'];p.farm.seeds=[14,1,3,1,2,1,999999,0];p.farm.unlocked.fill(true);p.farm.lessonRewarded=true;
  p.farm.plots=[0,1,2].map(id=>({id,mapId:'forest',x:1005+id*56,y:672,crop:null,plantedAt:0,readyAt:0,watered:false}));p.farm.nextId=3;
  g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.spawnTimer=g.attackTimer=g.fireClock=99999;g.enemies=[];g.boss=null;g.trees=g.trees.filter(t=>Math.hypot(t.x-1061,t.y-672)>240);
  Object.assign(g.player,{x:1061,y:740,vx:0,vy:0,invincible:99999});farmApp.renderer.camera.time=null;farmApp.refresh();
 });
 await page.locator('#field-menu-toggle').click();await page.locator('#farm-menu').click();await page.locator('[data-farm-cell="0"]').click();await page.locator('#farm-picker').waitFor({state:'visible'});
 const layouts=[];
 for(const [width,height,time] of [[390,844,'day'],[320,568,'night'],[430,932,'day'],[844,390,'night']]){
  await page.setViewportSize({width,height});await page.evaluate(async time=>{const a=farmApp,g=a.game,phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);
  const view=await page.evaluate(()=>{const r=document.getElementById('farm-picker').getBoundingClientRect();return {width:innerWidth,height:innerHeight,popup:r.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,seeds:[...document.querySelectorAll('[data-farm-seed]')].map(n=>({text:n.innerText,aria:n.getAttribute('aria-label'),rect:n.getBoundingClientRect().toJSON(),count:n.querySelector('.farm-seed-count').getBoundingClientRect().toJSON()}))};});
  if(view.overflow||view.popup.top<0||view.popup.bottom>height||view.popup.left<0||view.popup.right>width||view.seeds.length!==8||view.seeds.some(s=>!/^\d+$/.test(s.text)||!s.aria.includes('种子')||s.rect.width<44||s.rect.height<44||s.count.right>s.rect.right||s.count.bottom>s.rect.bottom))throw Error('种子图标网格异常 '+JSON.stringify(view));
  layouts.push(view);await page.screenshot({path:`output/playwright/farm-remove/picker-${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-farm-seed="0"]').click();await page.locator('[data-farm-cell="0"]').click();await page.waitForFunction(()=>farmApp.game.progress.farm.plots.find(p=>p.id===0)?.crop===0&&!farmApp.game.farmWork.job);
 if(await page.evaluate(()=>farmApp.game.progress.farm.seeds[0])!==13)throw Error('选种播种扣库存异常');
 // 从种子图标按住拖到空田，仍走正式队列撒种。
 await page.locator('#farm-hoe').click();await page.locator('[data-farm-cell="1"]').click();const seed=await page.locator('[data-farm-seed="1"]').boundingBox(),cell=await page.locator('[data-farm-cell="1"]').boundingBox();
 await page.mouse.move(seed.x+seed.width/2,seed.y+seed.height/2);await page.mouse.down();await page.mouse.move(cell.x+cell.width/2,cell.y+cell.height/2,{steps:12});await page.mouse.up();await page.waitForFunction(()=>farmApp.game.progress.farm.plots.find(p=>p.id===1)?.crop===1&&!farmApp.game.farmWork.job);
 // 空田确认前仍在原地，取消保留；确认后真实走近平整。
 await page.locator('#farm-remove').click();await page.locator('[data-farm-cell="2"]').click();await page.locator('#farm-remove-dialog').waitFor({state:'visible'});await page.locator('#farm-remove-cancel').click();
 if(!await page.evaluate(()=>farmApp.game.progress.farm.plots.some(p=>p.id===2)))throw Error('取消移除丢地块');
 await page.locator('[data-farm-cell="2"]').click();await page.locator('#farm-remove-confirm').click();await page.waitForFunction(()=>!farmApp.game.progress.farm.plots.some(p=>p.id===2));await page.waitForFunction(()=>!farmApp.game.farmWork.job);
 // 作物移除明确告知损失；保存失败不丢失，重试成功也不返种发奖。
 await page.locator('[data-farm-cell="0"]').click();await page.locator('#farm-remove-dialog').waitFor({state:'visible'});await page.setViewportSize({width:320,height:568});
 const notice=await page.locator('#farm-remove-description').innerText();if(!notice.includes('种子不返还'))throw Error('缺少作物移除说明');await page.screenshot({path:'output/playwright/farm-remove/remove-confirm-night.png'});
 await page.evaluate(()=>{window.farmPersist=farmApp.game.livingPersist;farmApp.game.livingPersist=()=>false;});await page.locator('#farm-remove-confirm').click();await page.waitForFunction(()=>farmApp.game.farmWork.result?.ok===false);
 if(!await page.evaluate(()=>farmApp.game.progress.farm.plots.some(p=>p.id===0&&p.crop===0)))throw Error('保存失败丢作物');
 await page.evaluate(()=>{farmApp.game.livingPersist=farmPersist;});await page.locator('[data-farm-cell="0"]').click();await page.locator('#farm-remove-confirm').click();await page.waitForFunction(()=>!farmApp.game.progress.farm.plots.some(p=>p.id===0));
 const result=await page.evaluate(()=>({ids:farmApp.game.progress.farm.plots.map(p=>p.id),seeds:farmApp.game.progress.farm.seeds.slice(0,2),coins:farmApp.game.progress.coins,harvested:farmApp.game.progress.farm.harvested}));
 if(JSON.stringify(result.ids)!=='[1]'||JSON.stringify(result.seeds)!=='[13,0]'||result.harvested!==0)throw Error('移除错误结算 '+JSON.stringify(result));
 await page.evaluate(()=>farmApp.save());await page.reload();await page.locator('#start').click();await page.evaluate(async()=>{window.farmApp=(await import('/src/main.js')).application;await farmApp.ready;});
 if(await page.evaluate(()=>farmApp.game.progress.farm.plots.length)!==1)throw Error('重载复活地块');if(errors.length)throw Error(errors.join('\n'));return {passed:true,layouts:layouts.map(l=>({width:l.width,height:l.height,popup:l.popup})),result,errors};
}
