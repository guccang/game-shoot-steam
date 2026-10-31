// 任务与建筑气泡共存回归：保持来信可点击，短屏仍保留建筑上方提示。
async page=>{
 const samples=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(await page.locator('#start').isVisible())await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();g.progress.mainline.phase='complete';g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.enemies=[];g.boss=null;g.update=()=>{};
  window.facilities=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;window.rooms=(await import('/src/config/workshop-interiors.js')).WORKSHOP_INTERIORS;
  // 每个样本只改变目标进度和角色位置，渲染及交互实现保持正式版本。
  window.setBuilding=async(id,time,wood)=>{
   g.progress.arrival=id==='arrival-repair'?{version:3,phase:'repair',elapsed:0,keys:true,gifted:true,wood:0}:null;
   g.progress.restoration.repaired=facilities.filter(f=>f.id!==id).map(f=>f.id);g.progress.restoration.build=null;g.progress.wood=wood;g.cottage=null;g.vehicle.active=false;g.mainlineSpeech=null;
   const site=id==='arrival-repair'?rooms.weapons.door:id.startsWith('upgrade-')?rooms[id.slice(8)].door:facilities.find(f=>f.id===id).site;
   Object.assign(g.player,{x:site.x,y:site.y+15,vx:0,vy:0});g.enemies=[];g.spawnEnemy(0,0,{x:site.x+140,y:site.y+80},{ambient:true});
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
   Object.assign(a.environment,{time,weather:'sun',livingPreview:true,autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
   a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();
  };
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
 });

 for(const [width,height] of [[320,568],[390,844],[844,390]])for(const time of ['day','night'])for(const phase of ['letter','repair','mainline','clearing','gate']){
  await page.setViewportSize({width,height});
  await page.evaluate(async({phase,time})=>{
   await setBuilding(phase==='repair'?'arrival-repair':'upgrade-weapons',time,999);
   const g=a.game;
   if(phase==='letter')g.progress.arrival={version:3,phase:'letter',elapsed:0,keys:true,gifted:true,wood:0};
   if(['mainline','clearing','gate'].includes(phase))g.progress.mainline=(await import('/src/progression/progress.js')).freshProgress().mainline;
   if(phase==='clearing'||phase==='gate'){
    const entry=(await import('/src/config/building-entries.js')).BUILDING_ENTRIES.find(e=>e.type===phase);
    Object.assign(g.player,{x:entry.x,y:entry.y});
   }
   a.refresh();
  },{phase,time});await page.waitForFunction(()=>{const b=document.getElementById('nearby-interaction');return b&&!b.hidden&&b.offsetHeight>0;});await page.waitForTimeout(150);
  const info=await page.evaluate(phase=>{
   const card=document.getElementById(['mainline','clearing','gate'].includes(phase)?'mainline-hud':'ranger-arrival'),bubble=document.getElementById('nearby-interaction'),c=card.getBoundingClientRect(),b=bubble.getBoundingClientRect();
   return {cardHidden:card.hidden,bubbleHidden:bubble.hidden,cardText:card.textContent,bubbleText:bubble.textContent,cardBottom:c.bottom,bubbleTop:b.top,bubbleBottom:b.bottom,zoom:a.renderer.view.zoom};
  },phase);
  if(info.cardHidden||info.bubbleHidden||info.bubbleTop<info.cardBottom+7||info.bubbleBottom>height)throw Error(JSON.stringify({width,height,time,phase,info}));
  if(phase==='letter'){
   await page.locator('#arrival-goal').click();
   if(!await page.locator('#arrival-letter-dialog').isVisible())throw Error('靠近建筑时来信不可打开');
   await page.locator('#arrival-letter-close').click();await page.waitForTimeout(200);
   if(!await page.locator('#ranger-arrival').isVisible())throw Error('关闭来信未恢复任务');
  }
  samples.push({width,height,time,phase,...info});
  await page.screenshot({path:`output/playwright/keep-task-hud/${phase}-${width}-${time}.png`});
  // 离开建筑后仍显示任务入口，不依赖建筑提示是否出现。
  await page.evaluate(()=>{a.game.player.x+=800;a.refresh();});await page.waitForTimeout(200);
  if(!await page.locator(['mainline','clearing','gate'].includes(phase)?'#mainline-hud':'#ranger-arrival').isVisible())throw Error('离开建筑任务消失');
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {samples,errors};
}
