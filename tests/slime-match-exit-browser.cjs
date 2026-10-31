// 正式球赛与暂停面板专项回归：隔离存档、真实按钮、昼夜截图及一次结算。
async page=>{
 const origin=new URL(page.url()).origin;
 if(!['4175','4176'].includes(new URL(origin).port))throw Error('仅限本地验收端口');
 const context=await page.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 const p=await context.newPage(),errors=[],samples=[],dir='output/playwright/slime-match-exit';
 p.on('pageerror',e=>errors.push(e.message));
 // 通过正式目录和准备页开赛，避免直接构造比赛状态掩盖界面问题。
 async function enter(){
  await p.locator('#realm-button').evaluate(n=>n.click());
  await p.locator('[data-enter-realm="football"]').tap();
  if(!/60/.test(await p.locator('[data-football-start]').innerText()))throw Error('开赛按钮时长错误');
  await p.locator('[data-football-start]').tap();
  await p.waitForFunction(()=>!document.querySelector('#realm-dialog').open);
 }
 // 主场景必须立即可操作，不能留在暂停页、结算页或首页菜单。
 async function assertReturned(){
  await p.waitForFunction(()=>a.game.state==='playing'&&!a.game.realm&&!document.querySelector('#realm-dialog').open);
  if(await p.locator('#overlay').isVisible()||await p.locator('#title-menu').isVisible())throw Error('返回被弹层阻断');
 }
 try{
  await p.goto(origin);await p.waitForFunction(()=>!document.querySelector('#start').disabled);
  await p.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();
   const progress=(await import('/src/progression/progress.js')).freshProgress();
   progress.arrival={version:2,phase:'complete',keys:true};
   progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];progress.mainline.phase='complete';
   progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   progress.vehicleHulls[0]=1;progress.vehicleIndex=0;progress.living.position={x:900,y:750};
   localStorage.setItem('forest-patrol-v1',JSON.stringify(progress));
   localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await p.reload();await p.waitForFunction(()=>!document.querySelector('#start').disabled);await p.locator('#start').tap();
  await p.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const g=a.game;window.advance=g.update.bind(g);g.update=()=>{};g.mainlineSpeech=null;g.trees=[];g.enemies=[];g.player.hp=73;g.magazines[0].ammo=2;
   if(!g.summonVehicle())throw Error('驾驶夹具未成功');
   window.forest={player:g.player,vehicles:g.vehicles,magazines:g.magazines,vehicle:g.vehicle,x:g.player.x,y:g.player.y};a.refresh();
  });
  await enter();
  const result=await p.evaluate(()=>{
   const g=a.game,r=g.realm,coins=g.progress.coins;g.realm.warning=0;g.realm.score=11;g.realm.remaining=.01;advance(.02);a.refresh();
   if(g.realm||g.state!=='playing'||g.progress.coins!==coins+88)throw Error('自然结束未一次结算返回');
   if(g.player!==forest.player||g.vehicles!==forest.vehicles||g.magazines!==forest.magazines||!g.vehicle.active||g.player.hp!==73||g.magazines[0].ammo!==2)throw Error('森林载具或供给未恢复');
   if(g.player.x!==forest.x||g.player.y!==forest.y)throw Error('返回位置变化');
   if(g.leaveRealm()||g.progress.coins!==coins+88||g.progress.realms.run)throw Error('重复结算或遗留比赛');
   return {state:g.state,goals:r.score,coins:g.progress.coins-coins,vehicle:g.vehicle.active};
  });
  await assertReturned();await p.screenshot({path:`${dir}/return-320.png`});
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(saved.realms.run||saved.realms.records.football.totalGoals!==11)throw Error('返回存档不一致');
  await enter();await p.evaluate(()=>{a.game.realm.score=3;});
  await p.locator('#realm-button').evaluate(n=>n.click());await p.locator('[data-realm-exit]').tap();await assertReturned();
  if(await p.evaluate(()=>a.game.progress.realms.records.football.totalGoals)!==14)throw Error('提前退出未结算');
  // 等待比赛提示自然消失，再采样独立暂停面板，避免提示遮住小屏边框。
  await p.waitForFunction(()=>!document.querySelector('#toast').classList.contains('visible'));
  for(const [width,height]of [[320,568],[390,844],[1280,960]])for(const phase of ['day','night']){
   await p.setViewportSize({width,height});
   await p.evaluate(async phase=>{
    const g=a.game,e=a.environment;e.livingPreview=false;
    g.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(s=>s.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(e,g.progress.living.calendar);e.weather='sun';e.autoWeather=false;
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;
    g.pause();a.refresh();a.renderer.draw();
   },phase);
   const sample=await p.evaluate(async()=>{
    const info=(await import('/src/rendering/visual-review.js')).inspectMobileUiHierarchy(document,'#overlay .ui-pause');
    return {...info,buttons:[...document.querySelectorAll('#overlay button')].map(n=>n.id),removed:!!document.querySelector('#overlay-settings,#overlay-help')};
   });
   if(sample.overflow||sample.bodyOverflow||sample.controls.some(c=>c.height<44)||sample.removed||sample.buttons.join()!=='resume')throw Error(JSON.stringify(sample));
   samples.push({width,height,phase,...sample});await p.screenshot({path:`${dir}/pause-${width}-${phase}.png`});
   await p.locator('#resume').tap();await assertReturned();
  }
  if(errors.length)throw Error(errors.join(';'));
  return {designCriterion:'mobile-ui-hierarchy',result,manualExit:true,samples,errors};
 }finally{await context.close();}
}
