// 关闭工坊专项：手机昼夜直接关闭免费试装，施工取消不扣费，已提交结果保留。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('游戏测试使用4175端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const t=await context.newPage(),errors=[],checks=[];t.on('pageerror',e=>errors.push(e.message));
 // 只比较交易数据，游戏时间和面板暂停状态不属于交易。
 const wallet=()=>t.evaluate(()=>JSON.stringify([a.game.progress.coins,a.game.progress.wood,a.game.progress.materials,a.game.progress.weaponParts,a.game.progress.vehicleParts,a.game.progress.weapons,a.game.progress.mods]));
 // 每次关闭后等待原生关闭事件完成，确认暂停和施工会话已经释放。
 async function closed(before){
  await t.waitForFunction(()=>!document.getElementById('workshop-dialog').open&&!a.workshop.guideState().draft&&a.game.state==='playing');
  if(await wallet()!==before)throw Error('关闭意外改变交易数据');
  if(await t.locator('#ws-discard').count()||await t.getByText('先保留或放弃当前试装',{exact:true}).count())throw Error('仍存在退出确认');
 }
 try{
  await t.goto('http://localhost:4175');await t.locator('#start').tap();
  await t.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);
   p.weapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(100);p.coins=p.wood=100000;for(const k in p.materials)p.materials[k]=999;
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const g=a.game;g.story=null;g.realm=null;g.progress=p;g.reset();g.state='playing';g.update=()=>{};g.arrivalScene=null;g.mainlineSpeech=null;a.refresh();
  });
  for(const [width,height]of [[320,568],[390,844],[844,390]])for(const phase of ['day','night']){
   await t.setViewportSize({width,height});await t.evaluate(async phase=>{
    a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===phase).start+1000;
    (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
    a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.draw();a.workshop.open('weapons',0);
   },phase);
   const before=await wallet();await t.locator('[data-ws-upgrade="damage"]').tap();
   if(!await t.evaluate(()=>a.workshop.guideState().draft))throw Error('未产生试装草稿');
   await t.locator('#ws-close').tap();await closed(before);
   await t.screenshot({path:`output/playwright/workshop-direct-close/closed-${width}-${phase}.png`});checks.push(`${width} ${phase}：替换动画中直接关闭`);
  }
  for(const kind of ['weapons','vehicle']){
   await t.setViewportSize({width:390,height:844});await t.evaluate(kind=>a.workshop.open(kind,0),kind);
   const before=await wallet();await t.locator('[data-ws-upgrade="'+(kind==='weapons'?'damage':'armor')+'"]').tap();
   await t.waitForFunction(()=>!document.getElementById('ws-hold').disabled);
   await t.locator('#ws-hold').focus();await t.keyboard.down('Space');await t.waitForTimeout(180);await t.keyboard.up('Space');
   await t.locator('#ws-close').tap();await closed(before);checks.push(kind+'：暂停施工后直接关闭且不扣费');
  }
  await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('#ws-function-modify').tap();
  await t.locator('[data-ws-part="1"]').tap();await t.locator('#ws-socket').tap();const before=await wallet();
  await t.keyboard.press('Escape');await closed(before);checks.push('返回键直接丢弃改装预览');
  await t.evaluate(()=>a.workshop.open('weapons',0));await t.locator('#ws-function-modify').tap();
  await t.locator('[data-ws-part="1"]').tap();await t.locator('#ws-socket').tap();await t.locator('#ws-confirm').tap();
  if(!await t.evaluate(()=>a.game.progress.mods[0]===1))throw Error('改装未提交');
  const saved=await wallet();await t.locator('#ws-close').tap();await closed(saved);checks.push('已确认的改装关闭后保留');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(result=>window.workshopCloseResult=result,{checks,errors});
 }finally{await context.close();}
}
