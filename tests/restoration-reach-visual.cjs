// 首间工坊实际骑乘靠近与正式绘制器昼夜同屏复核，固定画面仅用于视觉验收。
async page=>{
 if(new URL(page.url()).port!=='4295')throw Error('仅限隔离验收端口4295');
 await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});
 await page.waitForFunction(()=>a.menu.page==='game'&&a.game.state==='playing');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const g=a.game;g.state='paused';
  const {freshRangerProgress}=await import('/src/progression/progress.js'),{WORKSHOP}=await import('/src/world/workshop.js'),{createVehicle}=await import('/src/combat/vehicle.js');
  const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:0,x:WORKSHOP.x+190,y:WORKSHOP.y+30});p.wood=280;p.vehicleHulls[5]=1;p.vehicleIndex=5;
  g.progress=p;g.arrivalScene=null;g.enemies=[];g.boss=null;g.parking=null;g.attackTimer=999;
  g.vehicles[5]=createVehicle(p,g.maxHp(),5);g.vehicle=g.vehicles[5];g.vehicle.active=true;
  Object.assign(g.player,{x:p.arrival.x,y:p.arrival.y,vx:0,vy:0});g.state='playing';a.renderer.camera.time=null;a.refresh();
 });
 await page.keyboard.down('ArrowLeft');
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='repairing');await page.keyboard.up('ArrowLeft');
 await page.waitForFunction(()=>a.game.progress.arrival.elapsed>1);
 await page.screenshot({path:'docs/art-reference/repair-first-mounted.png'});
 await page.waitForFunction(()=>a.game.progress.arrival.phase==='craft');
 const result=await page.evaluate(()=>({mounted:a.game.vehicle.active,wood:a.game.progress.wood,phase:a.game.progress.arrival.phase}));
 if(!result.mounted||result.wood!==0)throw Error('首次工坊骑乘修复失败');
 await page.evaluate(async()=>{
  const g=a.game;g.state='paused';const {freshProgress}=await import('/src/progression/progress.js'),{TOWN_RESTORATIONS}=await import('/src/config/town-restoration.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');
  const p=freshProgress(),f=TOWN_RESTORATIONS.find(f=>f.id==='defense');p.mainline.completed=MAINLINE_IDS.slice(0,f.order);p.mainline.phase='doing';p.restoration.repaired=TOWN_RESTORATIONS.filter(v=>v.order<f.order).map(v=>v.id);p.wood=f.wood;
  p.weapons[0]=1;p.weapon=0;p.vehicleHulls[5]=1;p.campParking.owned=[{hull:5,spot:'weapons-west',hp:1,ammo:0,reload:0,wheel:0,track:0}];
  g.progress=p;g.vehicle.active=false;g.arrivalScene=null;g.update=()=>{};g.state='playing';Object.assign(g.player,{x:f.x+145,y:f.y+45,vx:0,vy:0,angle:.4});
  g.enemies=[];g.spawnEnemy(0,0,{x:g.player.x+80,y:g.player.y+60},{ambient:true});
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});a.renderer.camera.time=null;a.refresh();
 });
 for(const time of ['day','night']){
  await page.evaluate(async time=>{
   a.environment.time=time==='day'?'night':'dusk';document.getElementById('time-picture').click();const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();
  },time);
  for(const width of [390,1280]){await page.setViewportSize({width,height:width===390?844:900});await page.screenshot({path:'docs/art-reference/repair-scene-'+width+'-'+time+'.png'});}
 }
 await page.evaluate(r=>window.restorationVisualResult=r,result);
}
