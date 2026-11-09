// 独立手机存档点击正式种地入口，检查昼夜飞行和真实移动；默认使用4175端口。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const page=await context.newPage(),errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
  for(const index of [12,13]){
   await page.evaluate(async index=>{
    const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.weapon=index;p.weapons[index]=1;p.farm.lessonRewarded=true;
    const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.fireClock=999999;g.updateWaves=()=>{};g.trees=[];g.enemies=[];g.boss=null;g.reducedMotion=false;Object.assign(g.player,{x:893,y:2814,invincible:9999});a.refresh();
   },index);
   await page.locator('#farm-menu').tap();await page.locator('#farm-tools').waitFor({state:'visible'});
   for(const time of ['day','night']){
    await page.evaluate(async time=>{
     const {LIVING_PHASES}=await import('/src/config/living-world.js');a.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;
     (await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);
     Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});
     a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);
     a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);
    },time);
    const before=await page.evaluate(()=>{const g=a.game,s=g[g.weapon().controller];return {time:s.time,player:{x:g.player.x,y:g.player.y},nodes:s.nodes.map(n=>({x:n.x,y:n.y}))};});
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(650);await page.keyboard.up('ArrowRight');
    const result=await page.evaluate(async before=>{
     const g=a.game,s=g[g.weapon().controller];
     if(!(await import('/src/core/farming/farm.js')).farmWorking(g))throw Error('未保持种地模式');
     if(s.time<=before.time+.1)throw Error('种地时飞行时钟冻结');
     if(Math.hypot(g.player.x-before.player.x,g.player.y-before.player.y)<20)throw Error('真实输入未移动');
     if(s.nodes.some(n=>n.targetId!==null||Math.hypot(n.x,n.y)>270))throw Error('伙伴误攻击或未跟随');
     return {kind:s.kind,elapsed:s.time-before.time,nodes:s.nodes.map(n=>({x:n.x,y:n.y}))};
    },before);samples.push({time,...result});
    await page.screenshot({path:`output/playwright/farm-funnel-movement/${index}-${time}.png`});
   }
   await page.locator('#farm-exit').tap();await page.locator('#farm-tools').waitFor({state:'hidden'});
  }
  if(errors.length)throw Error(errors.join('\n'));return {samples,errors};
 }finally{await context.close();}
}
