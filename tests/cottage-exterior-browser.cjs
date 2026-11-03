// 4175端口隔离存档：正式绘制器验收整栋加盖、昼夜雪景、手机点入屋与屋后移动。
async original=>{
 await original.evaluate(async()=>{(await import('/src/main.js')).application.destroy();});
 const output='output/playwright/cottage-unified',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:output+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 // 只准备营地进度与定位，主体始终走正式场景和图集。
 async function setup(floors,time='day',season='spring',position={dx:95,dy:20}){
  await page.evaluate(async({floors,time,season,position})=>{
   const g=a.game;g.cottage=null;g.sceneApproach=null;g.update=()=>{};g.progress.homeDecor.floors=floors;g.vehicle.active=false;
   Object.assign(g.player,{x:site.x+position.dx,y:site.y+position.dy,vx:0,vy:0});g.player.hp=g.maxHp();
   Object.assign(a.environment,{time,livingPreview:true,forestSeason:season,weather:'sun',autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
   if(a.renderer.ground.season!==season){a.renderer.ground.dispose();a.renderer.ground=new(await import('/src/rendering/season-ground-cache.js')).SeasonGroundCache('forest',season);a.renderer.seasons=a.renderer.ground.seasons;}
   a.renderer.camera.time=null;a.refresh();
  },{floors,time,season,position});await page.waitForTimeout(350);
 }
 // 保存实际游戏同屏，验收入口同时返回外观层数和触控范围。
 async function shot(name){await page.screenshot({path:output+'/'+name+'.png'});checks.push(name);}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS;p.mainline.phase='complete';
   p.campParking.owned=[{hull:0,spot:'cottage',hp:1,ammo:0,reload:0,wheel:0,track:0}];p.living.patrolActive=false;
   const g=a.game;g.progress=p;g.reset();g.state='playing';window.updateGame=g.update;g.update=()=>{};g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=g.attackTimer=999999;g.enemies=[];g.boss=null;
   window.site=(await import('/src/world/workshop.js')).RANGER_COTTAGE;g.spawnEnemy(0,0,{x:site.x-80,y:site.y+75},{ambient:true});
  });
  for(const floors of [2,3,8,63,1000001])for(const time of ['day','night']){await setup(floors,time);await shot(floors+'-'+time);}
  await setup(63,'night','winter');await shot('63-snow-night');
  await setup(63,'day','winter');await shot('63-snow-day');
  // 半融雪直接采样正式材质混合；无需为检查改写场景绘制器。
  const cache=await page.evaluate(async()=>{
   const {drawScenery,sceneryAtlasStats}=await import('/src/rendering/scenery.js'),canvas=document.createElement('canvas');canvas.width=400;canvas.height=800;const c=canvas.getContext('2d');
   for(const floors of [2,3,8,63,1000001])drawScenery(c,{...site,kind:'cottage',x:200,y:400,homeFloors:floors},.5,null,.5);
   const before=sceneryAtlasStats();for(let floors=1000002;floors<1000030;floors++)drawScenery(c,{...site,kind:'cottage',x:200,y:400,homeFloors:floors},.5,null,.5);
   const after=sceneryAtlasStats();if(before.bytes!==after.bytes||before.count!==after.count)throw Error('真实层数使缓存增长');return {before,after};
  });
  for(const [width,height] of [[320,568],[844,390],[1280,900]]){
   await page.setViewportSize({width,height});
   for(const time of ['day','night']){await setup(63,time,'spring',{dx:95,dy:height<600?-120:20});await shot(width+'-'+time);}
  }
  await page.setViewportSize({width:390,height:844});await setup(63,'day','spring',{dx:95,dy:-240});
  await page.evaluate(()=>{a.game.enemies=[];a.game.update=updateGame;});await page.keyboard.down('ArrowLeft');await page.waitForFunction(()=>a.game.player.x<site.x+12);await page.keyboard.up('ArrowLeft');await page.evaluate(()=>{a.game.update=()=>{};});await shot('behind-day');
  await setup(63,'night','spring',{dx:0,dy:-240});await shot('behind-night');
  await setup(63,'day');await page.evaluate(()=>{a.game.enemies=[];a.game.update=updateGame;a.game.cottageDoorLatch=false;});
  const point=await page.evaluate(()=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.left+(site.x-v.x)*v.zoom,y:r.top+(site.y-280-v.y)*v.zoom};});
  await page.touchscreen.tap(point.x,point.y);await page.waitForFunction(()=>a.game.sceneApproach?.id==='cottage'||a.game.cottage?.kind==='cottage');await page.waitForFunction(()=>a.game.cottage?.kind==='cottage',null,{timeout:30000});await shot('upper-wall-enter');
  const review=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectHomeConstruction(a.game,a.renderer,document));
  if(review.exterior.floors!==63||review.exterior.rows!==6||review.overflow)throw Error('正式验收入口数据异常');
  if(errors.length)throw Error(errors.join('\n'));return {checks,cache,exterior:review.exterior,entered:review.room.kind,errors};
 }catch(error){await shot('failure');const state=await page.evaluate(()=>({position:{x:a.game.player.x,y:a.game.player.y},state:a.game.state,room:a.game.cottage?.kind,walk:a.game.sceneApproach?.id}));throw Error(error.message+' '+JSON.stringify(state));}finally{await context.close();}
}
