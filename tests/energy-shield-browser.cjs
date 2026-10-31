// 正式工坊购买、独立防御演练与昼夜战场验收，使用手机触控和独立存档上下文。
async original=>{
 const results=[],errors=[];
 for(const [width,height,time,mounted] of [[390,844,'day',true],[320,568,'night',false],[1100,800,'night',true]]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async()=>{
    const a=window.a=(await import('/src/main.js')).application;await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.coins=p.wood=99999;p.materials={parts:9999,crystal:9999,core:9999};
    p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
    p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[1]=1;p.vehicleIndex=1;
    a.game.progress=p;a.game.reset();a.menu.enter();a.game.start();a.game.arrivalScene=null;a.game.mainlineSpeech=null;a.refresh();a.workshop.open('weapons',18);
   });
   await page.locator('#workshop-dialog').waitFor({state:'visible'});
   if(!(await page.locator('#ws-stats').innerText()).includes('护盾容量'))throw Error('工坊没有显示防御属性');
   await page.screenshot({path:`output/playwright/energy-shield/shop-${width}.png`});
   await page.locator('#ws-purchase').tap();
   await page.waitForFunction(()=>a.game.progress.weapons[18]===1);
   await page.evaluate(()=>a.workshop.open('weapons',18));
   if(width===390){
    await page.locator('#ws-test').tap();
    await page.waitForFunction(()=>document.getElementById('weapon-trial-score')?.textContent.match(/已抵挡 [1-9]/),null,{timeout:30000}).catch(async()=>{throw Error(await page.locator('#weapon-trial-dialog').innerText());});
    await page.locator('#weapon-trial-pause').tap();
    const before=await page.locator('#weapon-trial-score').innerText();await page.waitForTimeout(250);
    if(before!==await page.locator('#weapon-trial-score').innerText())throw Error('暂停后护盾仍在变化');
    await page.screenshot({path:'output/playwright/energy-shield/trial-day.png'});
    await page.locator('#weapon-trial-close').tap();
   }
   await page.locator('#ws-close').tap();
   await page.evaluate(async({time,mounted})=>{
    const g=a.game;g.progress.weapon=18;g.reset();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.workshopTrial=true;g.updateWaves=()=>{};
    if(mounted)g.summonVehicle();g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;
    const {blocked}=await import('/src/physics/motion.js'),{settlementAt}=await import('/src/world/settlements.js');let origin=null;
    for(let y=1200;y<2200&&!origin;y+=60)for(let x=350;x<900;x+=60)if(!settlementAt({x,y})&&[-100,0,200].every(dx=>!blocked(x+dx,y,75,[],{mapId:'forest'}))){origin={x,y};break;}
    if(!origin)throw Error('缺少验收场地');Object.assign(g.player,origin,{invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-origin.x,t.y-origin.y)>220);
    for(const [dx,dy] of [[130,-110],[-110,-140],[170,30]]){const e=g.spawnEnemy(0,0,{x:origin.x+dx,y:origin.y+dy});Object.assign(e,{hp:5000,maxHp:5000,speed:0,damage:0});}
    g.hurt(100);window.tick=g.update.bind(g);g.update=()=>{};
    Object.assign(a.environment,{time,livingPreview:true,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
   },{time,mounted});
   await page.waitForTimeout(300);
   const data=await page.evaluate(()=>({shield:a.game.magazines[18].ammo,weapon:a.game.weapon().id,mounted:a.game.vehicle.active,labels:[...document.querySelectorAll('.ring-icon')].map(e=>e.parentElement.getAttribute('aria-label')),overflow:document.documentElement.scrollWidth>innerWidth}));
   if(data.shield!==380||data.mounted!==mounted||data.overflow||!data.labels.some(s=>s?.includes('护盾 380')))throw Error(JSON.stringify(data));
   await page.screenshot({path:`output/playwright/energy-shield/battle-${width}-${time}.png`});
   // 用正式更新推进移动、破盾和恢复，确认效果没有独立于逻辑的计时器。
   const states=await page.evaluate(()=>{
    const g=a.game,at={x:g.player.x,y:g.player.y};for(let i=0;i<12;i++)tick(.05,{x:0,y:1});
    const moved=Math.hypot(g.player.x-at.x,g.player.y-at.y);g.player.invincible=0;g.hurt(380);
    const broken=g.magazines[18].ammo;for(let i=0;i<130;i++)tick(.05);
    return {moved,broken,restored:g.magazines[18].ammo};
   });
   if(states.moved<=0||states.broken!==0||states.restored<=0)throw Error(JSON.stringify(states));
   await page.screenshot({path:`output/playwright/energy-shield/recharge-${width}.png`});
   if(width===390){
    await page.evaluate(()=>a.workshop.open('weapons',18));await page.locator('[data-ws-upgrade="damage"]').tap();
    await page.waitForFunction(()=>!document.getElementById('ws-hold').disabled);const hold=await page.locator('#ws-hold').boundingBox(),cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:hold.x+hold.width/2,y:hold.y+hold.height/2}]});
    await page.waitForFunction(()=>a.game.progress.weapons[18]===2,null,{timeout:10000}).catch(async()=>{await page.screenshot({path:'output/playwright/energy-shield/upgrade-failure.png'});throw Error(await page.locator('#workshop-dialog').innerText());});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(await page.evaluate(()=>a.game.weapon().magazineSize)!==528)throw Error('升级未增加护盾容量');
    if(!(await page.locator('#ws-purpose').innerText()).includes('提升护盾容量'))throw Error('升级仍显示攻击属性');
    await page.screenshot({path:'output/playwright/energy-shield/upgrade-390.png'});
   }
   results.push({width,time,mounted,...data,...states});
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'energy-shield-defense',results,errors};
}
