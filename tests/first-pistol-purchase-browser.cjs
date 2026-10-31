// 首枪任务入口回归：真实点击建筑打开购买页，交易后恢复升级默认，并保留显式装备目标。
async page=>{
 const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  // 每次从建成工坊的新手存档开始，不改变正式入口和交易处理。
  window.preparePistol=async(time)=>{
   const g=a.game,p=(await import('/src/progression/progress.js')).freshRangerProgress();
   p.arrival={version:3,phase:'craft',elapsed:30,keys:true,parked:true,wood:0};p.weapon=14;p.weapons[14]=1;p.weapons[0]=0;p.wood=8;
   g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.update=()=>{};
   const door=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS.weapons.door;
   Object.assign(g.player,{x:door.x,y:door.y+15,vx:0,vy:0});
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);p.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
   Object.assign(a.environment,{time,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  };
 });
 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night']){
  await page.setViewportSize({width,height});await page.evaluate(time=>preparePistol(time),time);
  await page.waitForFunction(()=>{const n=document.getElementById('nearby-interaction');return !n.hidden&&n.textContent.includes('购买手枪');});
  await page.locator('#nearby-interaction').click();
  const state=await page.evaluate(()=>a.workshop.guideState());
  if(state.page!=='buy'||state.index!==0||!state.affordable)throw Error(JSON.stringify(state));
  if(await page.locator('#ws-function-buy').getAttribute('aria-selected')!=='true')throw Error('购买页签未选中');
  await page.screenshot({path:`output/playwright/first-pistol-purchase/${width}-${time}.png`});samples.push({width,height,time,page:state.page,index:state.index});
  await page.locator('#ws-close').click();
 }
 // 显式查看电锯仍打开电锯升级，随后无目标入口重新定位任务手枪。
 await page.evaluate(()=>a.workshop.open('weapons',14));
 let state=await page.evaluate(()=>a.workshop.guideState());if(state.page!=='upgrade'||state.index!==14)throw Error('显式装备目标被覆盖');
 await page.locator('#ws-close').click();await page.evaluate(()=>a.workshop.open('weapons'));
 state=await page.evaluate(()=>a.workshop.guideState());if(state.page!=='buy'||state.index!==0)throw Error('通用入口没有定位首枪');
 await page.locator('#ws-purchase').click();
 const purchase=await page.evaluate(()=>({owned:a.game.progress.weapons[0],wood:a.game.progress.wood,phase:a.game.progress.arrival.phase}));
 if(purchase.owned!==1||purchase.wood!==0||purchase.phase!=='complete')throw Error(JSON.stringify(purchase));
 await page.locator('#ws-close').click();await page.evaluate(()=>a.workshop.open('weapons'));
 state=await page.evaluate(()=>a.workshop.guideState());if(state.page!=='upgrade'||state.index!==0)throw Error('购买后未恢复已拥有装备升级入口');
 await page.locator('#ws-close').click();
 // 普通旧档仍以已装备武器为默认目标。
 await page.evaluate(()=>{a.game.progress.arrival=null;a.game.progress.weapon=14;a.workshop.open('weapons');});
 state=await page.evaluate(()=>a.workshop.guideState());if(state.page!=='upgrade'||state.index!==14)throw Error('普通档默认装备改变');
 if(errors.length)throw Error(errors.join('\n'));
 return {samples,purchase,explicitTarget:true,normalDefault:true,errors};
}
