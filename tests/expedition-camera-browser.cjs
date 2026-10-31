// 隔离手机浏览器验证正式远征绘制、预热与退出镜头；不改动玩家存档。
async page=>{
 if(new URL(page.url()).port!=='4305')throw Error('仅允许隔离端口4305');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],samples=[];t.on('pageerror',e=>errors.push(e.message));
 await t.goto('http://localhost:4305');await t.locator('#start').tap();
 await t.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const {freshProgress,validateProgress}=await import('/src/progression/progress.js'),p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapon=8;p.weapons[8]=1;
  const g=a.game;g.progress=validateProgress(p);g.reset();g.state='playing';g.mainlineSpeech=null;
  if(!g.enterRealm('rogue'))throw Error('远征进入失败');
  for(const kind of ['weapon','vehicle','turret'])if(!g.rollRealmEquipment(kind))throw Error('抽取失败');
  if(!g.readyRealm()||!g.chooseRealmBlessing(g.realm.offers[0]))throw Error('远征开战失败');
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  g.state='playing';g.player.invincible=999;g.realm.warning=0;g.realm.spawnTimer=999;g.update=()=>{};
  g.enemies=[];const e=g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y+60});Object.assign(e,{hp:99999,maxHp:99999,speed:0});
  a.refresh();
 });
 for(const [width,height]of [[320,568],[390,844],[844,390]])for(const time of ['day','night']){
  await t.setViewportSize({width,height});await t.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const sample=await t.evaluate(async({time})=>{
   const g=a.game,r=a.renderer,{WEAPONS}=await import('/src/config/weapons.js');
   Object.assign(a.environment,{time,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer'});
   r.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);r.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   const weapons=WEAPONS.map((w,i)=>({w,i})).filter(({w})=>['pistol','sniper','pulse'].includes(w.id)||['funnel','drone'].includes(w.controller));
   const checks=[];for(const {w,i}of weapons){g.loadout.weapon=i;r.camera.setZoomStep(0);r.draw();const view=r.view,pre=r.prepareGround();
    if(view.zoom!==(r.width<500?.85:1.05)||pre.zoom!==view.zoom)throw Error('远征武器镜头或预热不一致：'+w.id);
    checks.push({id:w.id,zoom:view.zoom});
   }
   g.loadout.weapon=8;r.draw();
   return {width:r.width,height:r.height,time,checks,enemies:g.enemies.length,vehicle:g.vehicle.active,zoom:r.view.zoom};
  },{time});samples.push(sample);
  if(!sample.enemies||!sample.vehicle)throw Error('实景缺少敌人或载具');
  await t.screenshot({path:`output/playwright/expedition-camera/${width}-${time}.png`});
 }
 const exit=await t.evaluate(()=>{a.game.leaveRealm();a.game.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();a.renderer.draw();return {realm:a.game.realm,weapon:a.game.progress.weapon,zoom:a.renderer.view.zoom,width:a.renderer.width};});
 if(exit.realm||exit.weapon!==8||exit.zoom!==(exit.width<500?.6:.75))throw Error('退出未恢复森林狙击镜头：'+JSON.stringify(exit));
 if(errors.length)throw Error(errors.join('\n'));await context.close();await page.evaluate(result=>window.expeditionCameraResult=result,{samples,exit,errors});
}
