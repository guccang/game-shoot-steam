// 正式帧循环验证高塔层间动画、键盘/触屏移动、暂停和一次性换层，保存连续录制。
async page=>{
 if(new URL(page.url()).port!=='4230')throw Error('仅允许隔离端口4230');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},recordVideo:{dir:'output/playwright/realm-tower-transition/video',size:{width:780,height:900}}});
 page=await context.newPage();const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4230');await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;await app.ready;});await page.locator('#start').click();
  if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();
  if(await page.locator('.dialog-settings,#realm-settings,#story-settings').count())throw Error('玩法设置入口未删除');
  await page.screenshot({path:'output/playwright/realm-tower-transition/catalog-390.png'});
  await page.locator('[data-enter-realm="tower"]').click();
  const cdp=await context.newCDPSession(page);
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:width<600});
   await page.evaluate(async time=>{
    const g=app.game;g.state='playing';g.player.hp=g.maxHp();g.player.invincible=999;
    Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false});
    app.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(app.environment,performance.now()-20000);
    g.progress.vehicleHulls[2]=1;g.selectVehicle(2);g.summonVehicle();
    g.enemies=[];g.boss=null;g.realm.kills=g.realm.spec.total-1;g.realm.spawned=g.realm.spec.total;
    const e=g.spawnEnemy(0,0,{x:g.player.x+60,y:g.player.y+45});e.realm=true;g.hit(e,99999);
    g.shots.push({x:g.player.x,y:g.player.y,tx:g.player.x+50,ty:g.player.y,life:.6,lifetime:.6,color:'#edce91',width:3});
    g.fx.add('ring',g.player.x,g.player.y,.6);g.float(g.player.x,g.player.y-30,'20','#f4dca0');
    (await import('/src/core/realm-manager.js')).updateRealm(g,0);app.refresh();
   },time);
   const before=await page.evaluate(async()=>{const g=app.game;return {...(await import('/src/rendering/visual-review.js')).inspectTowerIntermission(g,document),coins:g.progress.coins,arena:{...g.realm.arena},ammo:g.magazines[g.loadout.weapon].ammo};});
   if(before.phase!=='rest'||before.realmDialog||before.extraSettings)throw Error('休整状态错误');
   // 手机通过空白战场触摸摇杆移动；桌面使用实际方向键。
   if(width<600){const p={x:width*.3,y:height*.68};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+45,y:p.y}]});}
   else await page.keyboard.down('ArrowRight');
   await page.waitForTimeout(450);
   if(width<600)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('ArrowRight');
   const moving=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectTowerIntermission(app.game,document));
   if(moving.idleTime<=before.idleTime||moving.time!==before.time||Math.hypot(moving.player.x-before.player.x,moving.player.y-before.player.y)<1)throw Error('层间画面/移动未推进 '+JSON.stringify({before,moving}));
   await page.screenshot({path:`output/playwright/realm-tower-transition/rest-${width}-${time}.png`});
   if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();
   const frozen=await page.evaluate(()=>({remaining:app.game.realm.restRemaining,idle:app.game.realm.idleTime}));await page.waitForTimeout(250);
   const still=await page.evaluate(()=>({remaining:app.game.realm.restRemaining,idle:app.game.realm.idleTime}));
   if(JSON.stringify(frozen)!==JSON.stringify(still))throw Error('面板未冻结计时/动作');
   await page.screenshot({path:`output/playwright/realm-tower-transition/panel-${width}-${time}.png`});
   await page.locator('#close-realm').click();
   await page.waitForFunction(stage=>app.game.realm.stage===stage+1,before.stage,{timeout:12000});
   const after=await page.evaluate(()=>{const g=app.game;return {stage:g.realm.stage,phase:g.realm.phase,coins:g.progress.coins,ammo:g.magazines[g.loadout.weapon].ammo,arena:g.realm.arena,idle:g.realm.idleTime};});
   if(after.phase!=='combat'||after.coins!==before.coins||after.ammo!==before.ammo||JSON.stringify(after.arena)===JSON.stringify(before.arena)||after.idle<moving.idleTime)throw Error('换层状态异常');
   samples.push({width,time,before,moving,after});await page.screenshot({path:`output/playwright/realm-tower-transition/next-${width}-${time}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {pass:true,designCriterion:'tower-intermission-motion',samples,errors,video:await page.video().path()};
 }finally{await context.close();}
}
