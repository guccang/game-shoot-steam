// 兽潮屏外入场实机检查：正式镜头和连续移动，不替换怪物动画或世界碰撞。
async page=>{
 if(new URL(page.url()).port!=='4304')throw Error('仅限隔离端口4304');
 page.setDefaultTimeout(10000);const errors=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();const p=(await import('/src/progression/progress.js')).freshProgress();p.restoration.repaired=['clearing','cottage','story','garage','defense'];const ids=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.completed=ids.slice(0,ids.indexOf('pine-patrol'));p.mainline.phase='doing';p.weapon=0;p.weapons[0]=3;p.heroes[0]=2;p.vehicleIndex=0;p.vehicleHulls[0]=1;(await import('/src/config/vehicle-armaments.js')).grantVehicleArmament(p,0);localStorage.setItem('forest-patrol-world-revision','forest-threefold-2026-10');localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await page.reload();await page.locator('#start').click();await page.waitForTimeout(3200);
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.mainlineSpeech=null;g.mainlineTalkDelay=99999;g.state='playing';Object.assign(g.player,(await import('/src/core/vehicles/camp-parking.js')).vehicleParkingSite(g,0));if(!g.summonVehicle())throw Error('松果战车无法上车');Object.assign(g.player,(await import('/src/config/camp-defense.js')).CAMP_GATES.find(g=>g.id==='left'));window.tick=g.update.bind(g);g.update=()=>{};a.refresh();});
 await page.locator('[data-camp-gate="left"]').dispatchEvent('click',{detail:0});await page.locator('#camp-primary').click();

 const samples=[];
 for(const [gate,width,height,phase]of [['left',390,844,'day'],['left',320,740,'night'],['top',390,844,'day'],['top',320,740,'night'],['left',1280,900,'day'],['top',1280,900,'night']]){
  await page.setViewportSize({width,height});
  await page.evaluate(async({gate,phase})=>{
   const g=a.game,core=await import('/src/core/camp/camp-defense.js'),{CAMP_GATES}=await import('/src/config/camp-defense.js');if(g.campDefense)core.leaveCampDefense(g);g.state='playing';Object.assign(g.player,CAMP_GATES.find(p=>p.id===gate));if(!core.startCampDefense(g,gate))throw Error('无法入场');g.update=()=>{};g.mainlineSpeech=null;g.mainlineTalkDelay=99999;
   const {LIVING_PHASES}=await import('/src/config/living-world.js'),{projectLivingCalendar}=await import('/src/world/living-calendar.js'),{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');g.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===phase).start+1000;projectLivingCalendar(a.environment,g.progress.living.calendar);a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.camera.hordeSession=null;a.renderer.resize();a.refresh();a.renderer.draw();
   g.campDefense.timer=0;core.updateCampDefense(g,.01);window.entryEnemy=g.enemies[0];window.entryDone=false;window.entrySamples=[];window.entryStart={x:entryEnemy.x,y:entryEnemy.y};
   const {nearest,worldDistance}=await import('/src/world/coordinates.js'),v=a.renderer.view,p=nearest(entryEnemy,g.player);
   if(p.x>v.x-60&&p.x<v.x+v.w+60&&p.y>v.y-60&&p.y<v.y+v.h+60)throw Error('团子未完整出生在屏外');
   // 入场观测暂停我方射击，仅验证实际移动与连续帧；完整战斗不使用此观测夹具。
   g.attackTimer=999;g.vehicle.module.cooldown=999;g.campDefense.spawnTimer=999;
   window.runEntry=dt=>{const before={x:entryEnemy.x,y:entryEnemy.y};tick(dt,{x:0,y:0});const point=nearest(entryEnemy,g.player),v=a.renderer.view;entrySamples.push({x:point.x,y:point.y,step:worldDistance(before,entryEnemy)});if(point.x>v.x+30&&point.x<v.x+v.w-30&&point.y>v.y+50&&point.y<v.y+v.h-30){entryDone=true;g.update=()=>{};}};
  },{gate,phase});
  const label=gate+'-'+width+'-'+phase;await page.screenshot({path:'output/playwright/horde-offscreen-entry/'+label+'-before.png'});await page.evaluate(()=>{a.game.update=runEntry;});await page.waitForFunction(()=>window.entryDone,null,{timeout:18000});
  const result=await page.evaluate(()=>({start:entryStart,end:entrySamples.at(-1),frames:entrySamples.length,maxStep:Math.max(...entrySamples.map(p=>p.step)),level:entryEnemy.level,hp:entryEnemy.hp}));if(result.maxStep>8||result.frames<20)throw Error('入场发生跳跃或没有真实步行');samples.push({gate,width,phase,...result});await page.screenshot({path:'output/playwright/horde-offscreen-entry/'+label+'-entered.png'});
 }
 if(errors.length)throw Error(errors.join('\n'));return {samples,errors};
}
