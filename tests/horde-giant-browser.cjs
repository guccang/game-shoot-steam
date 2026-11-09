// 从十波末尾检查点触发正式领主，采样同一场战斗的姿态和最终领奖。
async original=>{
 const out='output/playwright/horde-giant/';
 const recordVideo=process.env.HORDE_GIANT_RECORD==='0'?undefined:{dir:out+'video'};
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,recordVideo});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(original.url());await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.app=(await import('/src/main.js')).application;await app.ready;await document.fonts.ready;
   const g=app.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};
   p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';
   p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(site=>site.id);
   p.vehicleHulls[0]=1;g.progress=p;g.reset();g.state='playing';g.arrivalScene=null;
   const {CAMP_GATES,CAMP_DEFENSE}=await import('/src/config/camp-defense.js');
   const {startCampDefense,updateCampDefense}=await import('/src/core/camp/camp-defense.js');
   Object.assign(g.player,CAMP_GATES.find(gate=>gate.id==='left'));
   if(!startCampDefense(g,'left'))throw Error('未进入营门');g.summonVehicle();
   const r=g.campDefense;Object.assign(r,{wave:10,cleared:9,waveKills:CAMP_DEFENSE.waves[9].count,spawned:CAMP_DEFENSE.waves[9].count,timer:0});
   updateCampDefense(g,.01);if(g.boss?.radius!==114)throw Error('末波未换成团山');
   // 守在拒马外侧，给进场的领主留下同屏距离；使用正式游戏更新逐帧采样。
   Object.assign(g.player,{x:r.barrier.x-175,y:r.barrier.y+65});
   window.step=g.update.bind(g);g.update=()=>{};app.renderer.camera.time=null;app.refresh();
  });
  // 普通连击与重击走真实伤害入口；固定同一姿态逐像素对比，覆盖身体换色和整层透明度。
  await page.evaluate(async()=>{
   const {drawBoss}=await import('/src/rendering/enemies.js');
   const g=app.game,b=g.boss,hp=b.hp;
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=480;
   const c=canvas.getContext('2d',{willReadFrequently:true});
   function pixels(actor,reduced){
    c.clearRect(0,0,480,480);
    drawBoss(c,{...actor,x:240,y:400},g.time,reduced);
    return c.getImageData(0,0,480,480).data;
   }
   for(const kind of ['pistol','pistol','sniper']){
    g.hit(b,1,false,{kind,power:kind==='sniper'?2:1,x:b.x,y:b.y-50,direction:{x:1,y:0}});
    if(!(b.flash>0)||b.gelHitAge!==0)throw Error('命中未进入胶体回弹');
    for(const reduced of [false,true]){
     const hit=pixels(b,reduced),base=pixels({...b,flash:0},reduced);
     if(!hit.some(v=>v)||hit.some((v,i)=>v!==base[i]))throw Error('团山受击改变了本色或透明度');
    }
   }
   if(b.hp!==hp-3||!(b.heavyHit>0))throw Error('连续命中或重击未生效');
   if(g.fx.items.some(p=>p.kind==='impact-flash'))throw Error('命中位置仍在闪白');
  });
  for(const [width,height] of [[320,568],[390,844],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{
    Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});
    app.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(app.environment,0);
    app.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(app.environment,0);
    app.renderer.camera.time=null;app.renderer.draw();
   },time);
   await page.screenshot({path:out+width+'-'+time+'.png'});
  }
  await page.setViewportSize({width:390,height:844});
  const samples=[];
  await page.evaluate(()=>{app.game.update=step;});
  for(const phase of ['windup','cast','recover']){
   await page.waitForFunction(p=>app.game.boss?.ai.phase===p&&app.game.boss.ai.elapsed>=.25,phase);
   samples.push(await page.evaluate(phase=>{
    const g=app.game;
    app.refresh();app.renderer.draw();return {phase,hazards:g.hazards.length,gateHp:g.campDefense.gateHp};
   },phase));
   await page.screenshot({path:out+phase+'.png'});
  }
  await page.evaluate(()=>{const g=app.game;g.hit(g.boss,g.boss.hp+100,true);if(g.campDefense.phase!=='spoils')throw Error('未爆出战利品');});
  for(const [seconds,name] of [[.30,'burst'],[1.05,'landed']]){
   await page.waitForFunction(t=>app.game.campDefense.spoils.elapsed>=t,seconds);
   await page.screenshot({path:out+name+'.png'});
  }
  await page.locator('#camp-defense-dialog[open]').waitFor();
  const rewards=await page.locator('.camp-rewards').innerText();await page.screenshot({path:out+'reward.png'});
  await page.locator('#camp-primary').tap();
  if(!await page.evaluate(()=>!app.game.campDefense&&app.game.progress.campDefense.runs===1))throw Error('领奖失败');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'horde-giant-dumpling',samples,rewards,errors};
 }finally{await context.close();}
}
