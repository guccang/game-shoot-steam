// 工坊共用长按底栏边界：载具昼夜和手机横屏，保持原有竖版容器。
async page=>{
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),t=await context.newPage(),errors=[],samples=[];
 t.setDefaultTimeout(10000);t.on('pageerror',e=>errors.push(e.message));await t.goto(new URL(page.url()).origin);await t.locator('#start').tap();
 await t.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);p.weapons[3]=0;p.weapon=0;p.mastery.fill(100);p.coins=p.wood=100000;p.bosses=999;p.vehicleHulls.fill(1);for(const k of Object.keys(p.materials))p.materials[k]=999;a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.update=()=>{};a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.game.enemies=[];a.refresh();a.workshop.open('weapons',3);});

 async function check(label,shot=false){await t.waitForTimeout(80);const s=await t.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopFocus(document));const size=t.viewportSize(),bad=s.controls.filter(c=>c.box.width<43.9||c.box.height<43.9||c.box.x<0||c.box.y<0||c.box.right>size.width+1||c.box.bottom>size.height+1);if(s.overflow.length||bad.length||s.territory)throw Error(label+JSON.stringify({overflow:s.overflow,bad,territory:s.territory}));samples.push(label);if(shot)await t.screenshot({path:'output/playwright/workshop-hold/'+label+'.png'});}

 await t.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[320,568],[844,390],[1280,900]])for(const time of ['day','night']){
  await t.locator('#ws-close').tap();await t.setViewportSize({width,height});await t.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.game.selectVehicle(0);a.game.summonVehicle();a.game.spawnEnemy(0,125);a.renderer.resize();a.refresh();a.renderer.draw();a.workshop.open('vehicle',0);},time);
  await t.locator('[data-ws-upgrade="armor"]').tap();await check('vehicle-upgrade-'+width+'-'+time,true);
  await t.locator('#ws-function-modify').tap();const choice=await t.locator('[data-ws-part]').evaluateAll(nodes=>Number(nodes.find(n=>Number(n.dataset.wsPart)!==a.game.progress.vehicleLoadouts[0]).dataset.wsPart));await t.locator('[data-ws-part="'+choice+'"]').tap();await check('vehicle-mount-'+width+'-'+time,true);
  if(width===844){await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('[data-ws-upgrade="damage"]').tap();await check('weapon-upgrade-'+width+'-'+time,true);await t.locator('#ws-function-modify').tap();await t.locator('[data-ws-part="1"]').tap();await check('weapon-modify-'+width+'-'+time,true);}
 }
 if(errors.length)throw Error(errors.join('\n'));await context.close();return {samples,errors};
}
