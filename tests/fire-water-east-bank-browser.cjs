// 在隔离浏览器上下文检查正式东岸取水设备、消防目标和补水；仅冻结随机战斗以稳定构图。
async original=>{
 const results=[],errors=[],dir='output/playwright/fire-water-east-bank';
 for(const [width,height,time] of [[320,568,'night'],[390,844,'day'],[1100,800,'night']]){
  const context=await original.context().browser().newContext({viewport:{width,height},isMobile:width<500,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://localhost:4175');await page.locator('#start').tap();
   await page.evaluate(async time=>{
    window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
    const g=a.game;g.progress=p;g.reset();a.menu.enter();g.start();g.arrivalScene=null;g.mainlineSpeech=null;g.livingWeather='sun';g.update=()=>{};
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.refresh();g.livingWeather='sun';if(!g.requestFireRescue()||!g.startFireRescue())throw Error('接警失败');
    const {updateFireRescue}=await import('/src/core/activities/fire-rescue.js');for(let i=0;i<5000&&g.fireTransit;i++)updateFireRescue(g,.05);if(g.fireRescue.phase!=='active')throw Error('出库失败 '+JSON.stringify({state:g.state,phase:g.fireRescue.phase,transit:g.fireRescue.transit,player:{x:g.player.x,y:g.player.y}}));
    Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
   },time);
   for(let index=0;index<3;index++){
    const state=await page.evaluate(async index=>{
     const g=a.game,r=g.fireRescue,s=r.waters[index],{fireObjective,updateFireRescue}=await import('/src/core/activities/fire-rescue.js'),{riverXAt,isWaterBlocked}=await import('/src/world/river-geometry.js');
     Object.assign(g.player,{x:s.x+25,y:s.y+30,vx:0,vy:0});r.water=10;r.waterGuide=true;r.routeClock=0;const target=fireObjective(g);updateFireRescue(g,.1);g.time+=.1;a.renderer.camera.time=null;a.refresh();
     return {index,x:s.x,y:s.y,east:s.x>riverXAt(s.y),dry:!isWaterBlocked(s.x,s.y,16),waterDx:s.waterDx,targetX:target.point.x,targetY:target.point.y,water:r.water,filling:r.filling,driving:g.vehicle.active,route:r.route.length};
    },index);
    if(!state.east||!state.dry||state.waterDx>=0||state.x!==state.targetX||state.y!==state.targetY||state.water<=10||!state.filling||!state.driving)throw Error(JSON.stringify(state));
    await page.waitForTimeout(200);await page.waitForFunction(()=>!document.getElementById('toast').classList.contains('visible'));
    if(width===390||index===0)await page.screenshot({path:`${dir}/${width}-${time}-${index+1}.png`});results.push({width,time,...state});
   }
  }finally{await context.close();}
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'fire-water-east-bank',results,errors};
}
