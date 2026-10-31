// 默认在4175运行；占用时由启动命令选择隔离端口。使用隔离浏览器账号，战斗由正式RAF与触控输入驱动。
async page=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;
  window.hordeApp=a;window.hordeErrors=[];
  // 代表存档只准备已有装备和任务阶段；不改命中、生命、刷怪或奖励结果。
  window.hordeFixture=async({weapon=3,mounted=false,time='day',round=1,level=3}={})=>{
   const {freshProgress}=await import('/src/progression/progress.js');
   const {MAINLINE_IDS}=await import('/src/config/mainline.js');
   const {TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js');
   const {grantVehicleArmament}=await import('/src/config/vehicle-armaments.js');
   const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};
   p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('weapon-field'));
   p.mainline.phase='doing';p.weapon=weapon;p.weapons[weapon]=level;p.heroes[0]=5;p.bosses=round;
   p.coins=5000;p.wood=2500;p.vehicleIndex=0;
   if(mounted){p.vehicleHulls[0]=1;grantVehicleArmament(p,0);}
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const g=a.game;g.progress=p;g.reset();g.arrivalScene=null;g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=99999;
   g.progress.living.patrolActive=true;g.wave=round*5+1;g.waveGroupStart=g.wave;g.bossWave=g.wave+4;
   g.waveWarning=0;g.waveRest=g.waveKills=g.waveSpawned=0;g.enemies=[];g.boss=null;g.bossReady=false;
   if(mounted){Object.assign(g.player,(await import('/src/core/camp-parking.js')).vehicleParkingSite(g,0));if(!g.summonVehicle())throw Error('正式上车失败');}
   Object.assign(g.player,{x:1600,y:400});g.attackTimer=0;
   const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===time);g.progress.living.calendar={day:1,elapsed:phase.start+phase.duration/2};
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{time,weather:'sun',autoWeather:false,autoTime:false});
   a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);
   a.refresh();window.hordeMetrics={peak:0,kills:0,start:performance.now()};
   clearInterval(window.hordeObserver);window.hordeObserver=setInterval(()=>{window.hordeMetrics.peak=Math.max(window.hordeMetrics.peak,g.enemies.filter(e=>e.hp>0).length);window.hordeMetrics.kills=g.kills;},50);
   return {hp:g.player.hp,vehicle:g.vehicle.active};
  };
 });
 if(await page.locator('#start').isVisible())await page.locator('#start').click();await page.evaluate(async()=>{await hordeApp.ready;});
 await page.setViewportSize({width:390,height:844});
 const initial=await page.evaluate(()=>hordeFixture());
 await page.waitForTimeout(3500);
 await page.screenshot({path:'output/playwright/horde-feel/390-day.png'});
 return {initial,errors,state:await page.evaluate(()=>({state:hordeApp.game.state,metrics:hordeMetrics,overflow:document.documentElement.scrollWidth>innerWidth,quest:document.querySelector('#mainline-hud').textContent}))};
}
