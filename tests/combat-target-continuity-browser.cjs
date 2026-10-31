// 手机实际镜头回归：边缘野猪能受击，真实狙击击退后仍连续命中，未知屏外敌人不主动锁定。
async page=>{
 if(new URL(page.url()).port!=='4299')throw Error('仅允许隔离端口 4299');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],results=[];
 t.on('pageerror',e=>errors.push(e.message));await t.goto('http://localhost:4299');await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 // 只隔离随机刷怪和任务，使用正式镜头、领主工厂、武器、击退和伤害更新。
 async function setup(index,time,width,height){
  await t.setViewportSize({width,height});
  await t.evaluate(async({index,time})=>{
   const g=a.game;g.state='paused';
   const p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.weapon=index;
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   g.progress=p;g.reset();g.workshopTrial=true;g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;
   g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};g.fireClock=1e9;g.attackTimer=1e9;
   Object.assign(g.player,{x:1200,y:2400,angle:0,invincible:999,arena:{x:1200,y:2400,radius:1200,terrain:'trial'}});
   Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,weather:'sun',forestSeason:'summer',time:time==='day'?'night':'dusk'});
   document.getElementById('time-picture').click();
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.renderer.camera.time=null;a.renderer.draw();a.refresh();
  },{index,time});
 }
 for(const [width,height,time,side] of [[320,568,'day',1],[390,844,'night',-1]]){
  await setup(0,time,width,height);
  await t.evaluate(async side=>{
   const g=a.game;g.progress.bossChallenge={bosses:0,maxHp:10000,speed:0,damage:0,blastDamage:0};
   (await import('/src/core/boss-manager.js')).restoreBoss(g,10000);
   Object.assign(g.boss,{x:g.player.x+(side>0?g.arrivalView.right-8:g.arrivalView.left+8),y:g.player.y,speed:0,attack:999,arena:{...g.player.arena}});
   if(g.findAttackTarget()!==g.boss)throw Error('已露出身体的野猪未被锁定');
   a.renderer.draw();
  },side);
  await t.screenshot({path:'output/playwright/combat-target-continuity/boar-'+width+'-'+time+'.png'});
  await t.evaluate(()=>{a.game.attackTimer=0;});
  await t.waitForFunction(()=>a.game.boss.hp<10000,null,{timeout:10000});
  results.push(await t.evaluate(()=>({kind:'boar',hp:a.game.boss.hp,visibleWidth:a.game.viewport.width})));
 }
 await setup(8,'day',390,844);
 await t.evaluate(async()=>{
  const g=a.game;window.visible=(await import('/src/combat/perception.js')).attackTargetVisible;
  window.enemy=g.spawnEnemy(0,0,{x:g.player.x+g.arrivalView.right+70,y:g.player.y});
  Object.assign(enemy,{hp:100000,maxHp:100000,speed:0,damage:0,workshopTarget:true,arena:{...g.player.arena}});
  window.ammo=g.magazines[8].ammo;g.attackTimer=0;
 });
 await t.waitForTimeout(1000);
 if(!await t.evaluate(()=>enemy.hp===100000&&a.game.magazines[8].ammo===ammo))throw Error('未发现的屏外怪物被提前攻击');
 await t.evaluate(()=>{
  const g=a.game;enemy.x=g.player.x+g.arrivalView.right-5;window.hits=[];
  const hit=g.hit.bind(g);
  // 仅旁观每次正式伤害结算，不改变命中、击退或索敌资格。
  g.hit=function(target,...args){if(target===enemy)hits.push({visible:visible(g,target),x:target.x-g.player.x,hp:target.hp});return hit(target,...args);};
  g.attackTimer=0;
 });
 await t.waitForFunction(()=>hits.some(h=>!h.visible),null,{timeout:20000});
 await t.screenshot({path:'output/playwright/combat-target-continuity/knockback-follow-through.png'});
 results.push(await t.evaluate(()=>({kind:'knockback',hits,hp:enemy.hp,range:a.game.weapon().range})));
 if(errors.length)throw Error(errors.join('\n'));
 await context.close();await page.evaluate(result=>window.combatContinuityResult=result,{results,errors});
}
