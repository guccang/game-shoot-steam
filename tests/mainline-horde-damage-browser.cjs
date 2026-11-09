// 使用隔离页面检查真实点击、战斗数字、昼夜视图与西门结算，不污染用户存档。
async page=>{
 if(new URL(page.url()).port!=='4275')throw Error('仅使用隔离端口4275');
 // 世界覆盖层会跟随相机；直接按屏幕坐标点击，避免自动滚动把森林容器推偏。
 const clickTask=async()=>{const b=await page.locator('#mainline-hud').boundingBox();if(!b)throw Error('主线卡不可见');await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
 await page.setViewportSize({width:390,height:844});
 const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  // 任务检查点只准备已解锁步骤，按钮、路径与实际战斗仍由正式实现驱动。
  window.checkpoint=async(id,step=0)=>{
   const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));g.progress.mainline.phase='doing';
   if(id==='long-patrol'&&step===1)g.progress.weapons[12]=3;
   if(id==='pistol-upgrade'&&step===1)g.progress.weapons[0]=3;
   if(id==='pine-patrol'){g.progress.vehicleIndex=0;g.progress.vehicleHulls[0]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(g.progress,0);}
   g.reset();g.arrivalScene=null;g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.attackTimer=999;g.enemies=[];Object.assign(g.player,{x:750,y:1050});a.refresh();
  };
  window.nav=async()=>(await import('/src/core/navigation/world-navigation.js')).worldNavigationObjective(a.game);
  window.route=async()=>(await import('/src/core/navigation/story-route.js')).storyRouteState(a.game);
 });
 for(const [id,step,key] of [['first-letter',0,'storyPost'],['expedition',0,'rogueEntry'],['tower',0,'towerEntry'],['guardian',0,'guardianEntry'],['fire-duty',0,'fireEntry'],['neighbors',0,'neighbors'],['long-patrol',0,'weaponsEntry'],['long-patrol',1,'garageEntry'],['pine-patrol',0,'westGate']]){
  await page.evaluate(([id,step])=>checkpoint(id,step),[id,step]);await page.waitForTimeout(700);await clickTask();
  await page.waitForTimeout(1200);await page.waitForFunction(async()=>{const r=await route();return r?.reachable&&r.points.length>1;});
  const state=await page.evaluate(async()=>({key:(await nav())?.key,points:(await route())?.points.length,state:a.game.state,dialogs:document.querySelectorAll('dialog[open]').length}));
  if(state.key!==key||state.state!=='playing'||state.dialogs||state.points<2)throw Error(id+JSON.stringify(state));results.push({id,step,...state});
 }
 await page.screenshot({path:'output/playwright/mainline-horde-damage/west-route.png'});
 // 随身操作直接打开真实页面；问号仍可查看说明。
 for(const [id,step,dialog] of [['first-map',0,'map-dialog'],['pistol-upgrade',1,'camp-dialog']]){
  await page.evaluate(([id,step])=>checkpoint(id,step),[id,step]);await page.waitForTimeout(700);await clickTask();await page.locator('#'+dialog).waitFor({state:'visible'});
  if(await page.evaluate(async()=>!!await nav()))throw Error('随身操作残留假路线');
 }
 await page.evaluate(()=>checkpoint('pine-patrol'));await clickTask();
 // 沿既有路线实际走到西门，检查围栏门洞与最后一段落点可达。
 for(let i=0;i<170;i++){
  const next=await page.evaluate(async()=>{const g=a.game,o=await nav();if((await import('/src/world/coordinates.js')).worldDistance(g.player,o.site)<135)return null;const p=(await route())?.points?.[1];return p?{dx:p.x-g.player.x,dy:p.y-g.player.y}:{};});
  if(!next)break;if(next.dx===undefined){await page.waitForTimeout(80);continue;}
  const keys=[];if(Math.abs(next.dx)>6)keys.push(next.dx>0?'d':'a');if(Math.abs(next.dy)>6)keys.push(next.dy>0?'s':'w');for(const k of keys)await page.keyboard.down(k);await page.waitForTimeout(100);for(const k of keys)await page.keyboard.up(k);
 }
 await clickTask();await page.locator('#camp-defense-dialog').waitFor({state:'visible'});
 if(await page.locator('[data-select-gate="left"]').getAttribute('aria-pressed')!=='true')throw Error('未选择西门');
 await page.screenshot({path:'output/playwright/mainline-horde-damage/west-start.png'});
 await page.evaluate(()=>a.game.summonVehicle());await page.locator('#camp-primary').click();
 await page.waitForFunction(()=>a.game.campDefense?.gateId==='left');if(!await page.evaluate(()=>a.game.vehicle.active))throw Error('入场强制下车');
 await page.waitForFunction(()=>a.game.enemies.length>3);await page.screenshot({path:'output/playwright/mainline-horde-damage/west-defense.png'});
 await page.evaluate(()=>{a.game.player.invincible=0;a.game.vehicle.active=false;a.game.hurt(100000);});
 await page.waitForFunction(()=>a.game.campDefense?.phase==='result',{timeout:30000});await page.locator('#camp-defense-dialog').waitFor({state:'visible'});await page.locator('#camp-primary').click();
 await page.waitForFunction(()=>a.game.progress.mainline.phase==='report');if(!await page.evaluate(()=>a.game.progress.mainline.seen.westHorde))throw Error('结算未推进主线');
 // 固定实战检查点与天气，只加厚靶怪血量供连续散弹观察；仍走正式发射、命中与飘字链。
 for(const width of [320,390,1280])for(const time of ['day','night']){
  await page.setViewportSize({width,height:844});await page.evaluate(async time=>{
   const g=a.game,{MAINLINE_IDS}=await import('/src/config/mainline.js');g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=[...MAINLINE_IDS];g.progress.mainline.phase='complete';g.progress.weapons[3]=1;g.progress.weapon=3;g.reset();g.arrivalScene=null;g.state='playing';g.mainlineTalkDelay=999;g.attackTimer=999;g.spawnTimer=999;Object.assign(g.player,{x:1600,y:400,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-1600,t.y-400)>350);g.enemies=[];
   for(const angle of [-.16,0,.16]){const e=g.spawnEnemy(angle,100);Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0});}
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time,weather:'sun',autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();
  },time);await page.waitForTimeout(180);
  await page.evaluate(()=>{a.game.attack();a.game.updateProjectiles(.22);a.game.attack();a.game.updateProjectiles(.22);});
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMainlineHordeDamage(a.game,document));
  if(!review.damage.length||review.numbers>65||review.overflow)throw Error(JSON.stringify(review));results.push({width,time,review});
  await page.screenshot({path:`output/playwright/mainline-horde-damage/damage-${width}-${time}.png`});
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
