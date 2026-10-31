// 实机验收恢复后的枪械、车炮、连续腾空和分体型动作，使用正式 Game.update 与绘制器。
async page=>{
 if(new URL(page.url()).port!=='4292')throw Error('仅允许隔离验收端口');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'no-preference'});
 // 重建隔离档案并从真实进入按钮载入战场。
 async function mount(width,time,hull,weapon){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async({time,hull,weapon})=>{
   (window.hitApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();localStorage.clear();
   const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js'),{LIVING_PHASES}=await import('/src/config/living-world.js');
   const p=freshProgress();p.weapons.fill(1);p.weapon=weapon;p.vehicleHulls.fill(1);p.vehicleIndex=Math.max(0,hull);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:400};p.living.calendar.elapsed=LIVING_PHASES.find(v=>v.id===time).start+1000;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
   window.hitApp=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
  },{time,hull,weapon});
  await page.locator('#start').click();await page.waitForFunction(()=>hitApp.menu.page==='game');
  await page.evaluate(async({time,hull})=>{
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js'),{armoredIdentity}=await import('/src/config/armored-enemies.js'),{rangedIdentity}=await import('/src/config/ranged-enemies.js'),{flyingIdentity}=await import('/src/config/enemies.js');
   Object.assign(hitApp.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});hitApp.renderer.seasons.reset('summer',performance.now());hitApp.renderer.light=new EnvironmentTransition(hitApp.environment,0);hitApp.renderer.tone=new SceneTone(hitApp.environment,0);
   const g=hitApp.game;g.enemies=[];g.encounterTimer=999;g.updateWaves=()=>{};g.player.invincible=99;if(hull>=0)g.summonVehicle();
   window.battleCheck={time:0,hits:0,peakHeight:0,peakPush:0,roundRoll:false,armoredStep:false,badRoll:false,kills:0,samples:[]};const startKills=g.kills;
   for(let i=0;i<8;i++){
    const a=-Math.PI*.85+i*Math.PI*.23,x=g.player.x+Math.cos(a)*100,y=g.player.y+Math.sin(a)*100,e=g.spawnEnemy(a,0,{x,y});
    const identity=i===2?armoredIdentity(e):i===4?flyingIdentity(e):i===6?rangedIdentity(e,'spore-spitter'):e;
    Object.assign(e,identity,{x,y,hp:240,maxHp:240,damage:0,arena:{x:1600,y:400,radius:420}});
   }
   const hit=g.hit.bind(g);g.hit=(...args)=>{hit(...args);if(args[0].type==='enemy')battleCheck.hits++;};
   const update=g.update.bind(g);g.update=(dt,input)=>{if(battleCheck.time>=3.5)return;update(dt,input);battleCheck.time+=dt;battleCheck.kills=g.kills-startKills;
    for(const e of [...g.enemies,...g.remnants]){battleCheck.peakHeight=Math.max(battleCheck.peakHeight,e.z||0);battleCheck.peakPush=Math.max(battleCheck.peakPush,Math.hypot(e.pushX||0,e.pushY||0));if(!e.species||e.species==='slime')battleCheck.roundRoll ||= Math.abs(e.rollAngle||0)>.2;else battleCheck.badRoll ||= Math.abs(e.rollAngle||0)>0;if(e.species==='ironwood-bulwark')battleCheck.armoredStep ||= e.hitStep>2;}
   };hitApp.refresh();
  },{time,hull});
  await page.waitForFunction(t=>hitApp.environment.time===t&&Math.abs(hitApp.renderer.tone.sample(performance.now()).night-(t==='night'?1:0))<.01,time);
 }
 for(const [id,width,time,hull,weapon] of [
  ['pine',390,'day',0,0],['pine',390,'night',0,0],['pine',320,'day',0,0],['pine',320,'night',0,0],
  ]){
  await mount(width,time,hull,weapon);await page.waitForFunction(()=>battleCheck.time>=.65);
  await page.screenshot({path:`output/playwright/restore-knockback-feel/${id}-${width}-${time}.png`});
  await page.waitForFunction(()=>battleCheck.time>=3.5);const result=await page.evaluate(()=>({...battleCheck}));
  if(!result.hits||!result.peakHeight||result.badRoll)throw Error('命中、腾空或体型动作失败 '+id+JSON.stringify(result));checks.push({id,width,phase:time,...result});
 }
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'monsterHitBodyTypes',passed:true,checks,errors};
}
