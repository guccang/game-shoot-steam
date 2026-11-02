// 隔离存档验证默认镜头、昼夜真实飞行和新价格购买，不修改用户的正式存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],views=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/game.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.weapon=12;p.weapons[0]=p.weapons[12]=p.weapons[13]=1;p.living.patrolActive=false;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.vehicle.active=false;g.player.invincible=9999;
   Object.assign(g.player,{x:2600,y:1500});g.enemies=[];g.spawnTimer=999999;
   const e=g.spawnEnemy(0,0,{x:2740,y:1580});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0});
   window.shots=0;const event=g.onEvent;g.onEvent=(type,data)=>{if(type==='shot')window.shots++;event(type,data);};a.refresh();
  });
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);a.renderer.camera.time=null;
   },time);
   await page.waitForTimeout(700);
   const result=await page.evaluate(async()=>{
    const g=a.game,r=a.renderer,{CombatCamera}=await import('/src/rendering/camera.js');r.draw();const v=r.view,base=new CombatCamera().update(g.player,r.width,r.height);
    if(v.zoom!==base.zoom||Math.abs(v.x-base.x)>.01||Math.abs(v.y-base.y)>.01)throw Error('浮游炮未恢复默认镜头');
    const prepared=r.prepareGround();if(prepared.zoom!==v.zoom)throw Error('地形预热与正式镜头不一致');
    for(const n of g.funnel.nodes){const x=(g.player.x+n.x-v.x)*v.zoom,y=(g.player.y+n.y-v.y)*v.zoom;if(x<35||x>r.width-60||y<110||y>r.height-100)throw Error('炮体越过屏幕安全范围');}
    return {width:r.width,height:r.height,zoom:v.zoom,shots:window.shots};
   });views.push({time,...result});
   await page.screenshot({path:`output/playwright/funnel-view-pricing/${width}-${time}.png`});
  }
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
  const switched=await page.evaluate(()=>{
   const g=a.game,r=a.renderer,zooms=[];for(const i of [0,13,12]){if(!g.transact('weapons',i,'equip'))throw Error('切枪失败');r.draw();zooms.push(r.view.zoom);}
   if(zooms[0]!==zooms[2]||zooms[1]>=zooms[2])throw Error('切枪镜头错误');if(!window.shots)throw Error('没有实际开火');return zooms;
  });
  await page.setViewportSize({width:390,height:844});
  const cost=await page.evaluate(async()=>{
   const g=a.game;g.progress.weapon=0;g.progress.weapons[12]=0;g.enemies=[];g.state='playing';g.boss=null;g.progress.bosses=999;
   for(const c of Object.values(g.progress.story.chapters))c.completed=true;
   const cost=(await import('/src/progression/equipment-goals.js')).equipmentRecipe('weapons',12,g.progress);
   g.progress.coins=cost.coins;g.progress.wood=cost.wood;for(const key of ['parts','crystal','core'])g.progress.materials[key]=cost[key];
   const layout=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind:'weapons'});Object.assign(g.player,layout.door,{vx:0,vy:0});
   if(!(await import('/src/core/cottage.js')).enterWorkshop(g,'weapons'))throw Error('无法进武器工坊');a.workshop.open('weapons',12);a.refresh();return cost.coins;
  });
  await page.locator('#ws-purchase').waitFor({state:'visible'});
  const priceText=await page.locator('#ws-resources').innerText();if(!priceText.replaceAll(',','').includes(String(cost)))throw Error('界面未展示新报价 '+priceText);
  await page.screenshot({path:'output/playwright/funnel-view-pricing/price.png'});
  await page.locator('#ws-purchase').tap();await page.waitForFunction(()=>a.game.progress.weapons[12]===1);
  if(await page.evaluate(()=>a.game.progress.coins)!==0)throw Error('实际扣款与报价不同');
  if(errors.length)throw Error(errors.join('\n'));return {views,switched,paid:cost,errors};
 }finally{await context.close();}
}
