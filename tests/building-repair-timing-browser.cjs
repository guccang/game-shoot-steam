// 正式工坊和小屋修复流程的三秒边界及手机昼夜倒计时检查。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto(original.url()||'http://localhost:4175');await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;a.game.update=()=>{};});
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night'])for(const id of ['weapons','cottage']){
   // 等上一组正式完工提示自然消失，再创建下一处施工场景。
   await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
   await page.setViewportSize({width,height});
   const result=await page.evaluate(async({time,id})=>{
    const g=a.game,{freshRangerProgress,freshProgress}=await import('/src/progression/progress.js'),{WORKSHOP}=await import('/src/world/workshop.js');
    const {TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),{RANGER}=await import('/src/config/ranger-arrival.js');
    const p=id==='weapons'?freshRangerProgress():freshProgress(),f=TOWN_RESTORATIONS.find(f=>f.id===id);
    if(id==='weapons'){Object.assign(p.arrival,{phase:'repair',keys:true,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood;}else p.wood=f.wood;
    g.progress=p;g.reset();g.state='playing';g.mainlineSpeech=null;g.arrivalPersist=g.restorationPersist=()=>true;
    Object.assign(g.player,id==='weapons'?{x:WORKSHOP.x,y:WORKSHOP.y+25}:f.site);
    const arrival=await import('/src/core/camp/ranger-arrival.js'),town=await import('/src/core/camp/town-restoration.js');
    if(!(id==='weapons'?arrival.advanceArrival(g):town.repairFacility(g,id).ok))throw Error('无法开工 '+id);
    window.updateBuild=id==='weapons'?arrival.updateArrival:town.updateRestoration;
    const initial=id==='weapons'?arrival.workshopBuildView(g).seconds:3;
    for(let i=0;i<20;i++)updateBuild(g,.05);
    const e=a.environment;Object.assign(e,{time,livingPreview:true,autoTime:false,autoWeather:false,weather:'sun'});
    a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(e,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(e,0);a.renderer.camera.time=null;a.refresh();
    return {initial,remaining:id==='weapons'?arrival.workshopBuildView(g).seconds:Math.ceil(3-g.progress.restoration.build.elapsed)};
   },{time,id});
   if(result.initial!==3||result.remaining!==2)throw Error('倒计时不同步 '+JSON.stringify(result));
   await page.waitForTimeout(120);await page.screenshot({path:`output/playwright/building-repair-three-seconds/${id}-${width}-${time}.png`});
   const completed=await page.evaluate(async id=>{
    const g=a.game,{facilityOpen}=await import('/src/config/town-restoration.js');
    for(let i=0;i<39;i++)updateBuild(g,.05);if(facilityOpen(g.progress,id))throw Error('2.95秒提前完成');
    updateBuild(g,.05);a.refresh();return facilityOpen(g.progress,id);
   },id);
   if(!completed)throw Error('3秒未完成 '+id);samples.push({width,time,id,...result,completed});
  }
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'weapon-workshop-rebuild',samples,errors};
 }finally{await context.close();}
}
