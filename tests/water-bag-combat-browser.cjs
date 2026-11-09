// 正式世界更新验证战斗取水、水罐装填、受击及手机详情，不使用替代动画。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/water-bag-combat';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.g=a.game;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(s=>s.id);p.restoration.cottageRested=true;
   window.wi=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.id==='water');p.weapon=wi;p.weapons[wi]=1;p.supplies.hand.water=80;g.progress=p;g.reset();g.start();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.encounterTimer=99999;g.vehicle.active=false;g.enemies=[];g.boss=null;
   const r=await import('/src/world/river-geometry.js');Object.assign(g.player,{x:r.riverXAt(1800)+r.riverHalfWidth(1800,1)+25,y:1800,vx:0,vy:0});window.mag=g.magazines[wi];mag.ammo=0;mag.remaining=0;
   window.enemy=g.spawnEnemy(0,0,{x:g.player.x+110,y:g.player.y});Object.assign(enemy,{hp:10000,maxHp:10000,speed:0,damage:0});window.realUpdate=g.update.bind(g);g.update=()=>{};for(let i=0;i<40;i++)realUpdate(.05);a.renderer.camera.time=null;a.refresh();
  });
  const active=await page.evaluate(()=>({ammo:mag.ammo,stock:g.progress.supplies.hand.water,hp:enemy.hp,filling:mag.waterFilling}));assert.ok(active.ammo>0);assert.ok(active.hp<10000);assert.equal(active.stock,80);assert.ok(active.filling);
  await page.evaluate(()=>{g.player.invincible=0;g.hurt(1);for(let i=0;i<20;i++)realUpdate(.05);a.refresh();});assert.equal(await page.evaluate(()=>mag.waterFilling),true);assert.equal(await page.evaluate(()=>g.progress.supplies.hand.water),80);
  await page.waitForTimeout(4200);
  for(const [width,height] of [[390,844],[320,568]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>a.renderer.waterBagView.percent),await page.evaluate(()=>Math.floor(mag.ammo/g.weapon().magazineSize*100)));const badge=await page.evaluate(()=>a.renderer.waterBagView);assert.equal(badge.icon,'water');assert.equal(badge.width,68);assert.equal(badge.seconds,Math.ceil(badge.remaining-1e-8));await page.screenshot({path:out+'/combat-'+width+'-'+time+'.png'});
  }
  await page.locator('#magazine-hud').tap();assert.match(await page.locator('#field-equipment-body').innerText(),/战斗和受击不会中断/);assert.match(await page.locator('#field-equipment-body').innerText(),/备用潮汐水罐 80/);await page.locator('#field-equipment-body').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:out+'/details-320.png'});
  const paused=await page.evaluate(()=>{const before=mag.ammo;for(let i=0;i<40;i++)realUpdate(.05);return {before,after:mag.ammo};});assert.equal(paused.after,paused.before);await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{g.enemies=[];g.player.x+=300;mag.ammo=0;mag.remaining=0;for(let i=0;i<40;i++)realUpdate(.05);a.renderer.camera.time=null;a.refresh();});assert.equal(await page.evaluate(()=>mag.waterFilling),false);assert.ok(await page.evaluate(()=>mag.remaining)>0);assert.match(await page.locator('#magazine-hud').getAttribute('aria-label'),/潮汐水罐装填/);await page.screenshot({path:out+'/can-reloading.png'});
  await page.evaluate(()=>{for(let i=0;i<40;i++)realUpdate(.05);a.refresh();});assert.equal(await page.evaluate(()=>g.progress.supplies.hand.water),40);assert.ok(await page.evaluate(()=>mag.ammo)>0);assert.deepEqual(errors,[]);
  // 无射击时采样完整倒计时，仍通过正式游戏更新推进；暂停及离岸不留下虚假进度。
  await page.evaluate(()=>{g.player.x-=300;mag.ammo=0;mag.remaining=0;mag.waterFraction=0;g.attackTimer=9999;});
  const samples=[];for(let second=1;second<=4;second++){await page.evaluate(()=>{for(let i=0;i<20;i++)realUpdate(.05);a.refresh();});await page.waitForTimeout(80);const sample=await page.evaluate(()=>a.renderer.waterBagView);assert.equal(sample.seconds,4-second);assert.ok(Math.abs(sample.progress-second/4)<.001);samples.push(sample);await page.screenshot({path:out+'/ring-'+second+'.png'});}
  assert.equal(samples[3].label,'满');await page.evaluate(()=>{g.player.x+=300;realUpdate(.05);a.refresh();});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>a.renderer.waterBagView),null);
  fs.writeFileSync(out+'/result.json',JSON.stringify({active,paused,samples,errors,canUsed:40},null,2));return {active,canUsed:40,errors};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
