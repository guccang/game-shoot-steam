// 隔离手机上下文使用正式铺轨、地图入口与手势，验证探索遮蔽和暂停归属。
async original=>{
 const base=new URL(original.url()).origin,context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/mine-map/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];
 page.on('pageerror',e=>errors.push(e.message));
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(120);}
 // 正式地图绘制数据与实际手机控件共同验收。
 async function shot(name){
  await page.waitForTimeout(150);await page.screenshot({path:'output/playwright/mine-map/'+name+'.png'});
  const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMineExplorationMap(a.game,a.renderer,document));
  if(r.overflow||r.canvas.height<80||r.buttons.some(b=>b.width<43.9||b.height<43.9))throw Error('地图布局不合格 '+JSON.stringify(r));reviews.push({name,...r});
 }
 try{
  await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await(await import('/src/rendering/farm.js')).loadFarmArt();window.mc=await import('/src/config/mining.js');window.ec=await import('/src/config/mine-ecology.js');window.mi=await import('/src/core/mining/mining.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;p.wood=200;p.mining.ore=100;
   p.mining.layers[2]=(await import('/src/progression/mining/mine-layers.js')).freshMineLayer(2,{x:8,y:4},()=>.31);
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.cottage={kind:'cottage',floor:0,outside:mc.MINING.home};Object.assign(g.player,mc.MINING.hatch.goal);mi.enterMine(g);g.cottage.scanWait=99999;g.livingPersist=()=>true;g.progress.outdoors.rod=true;g.progress.outdoors.bait=20;

   g.progress.wood=1000;g.progress.mining.ore=500;const l=g.progress.mining;l.dug={};
   for(let y=-1;y<=9;y++)for(let x=-1;x<=14;x++)l.dug[x+','+y]=true;
   const route=[];for(let x=0;x<=14;x++)route.push({x,y:3});for(let y=0;y<=8;y++)route.push({x:7,y});for(let y=4;y<=8;y++)route.push({x:14,y});for(let x=15;x<=24;x++)route.push({x,y:8});for(let x=40;x<=44;x++)route.push({x,y:25});
   for(const cell of route){const key=mc.mineKey(cell),current=g.progress.mining;current.dug[key]=true;if(ec.mineTerrain(cell,current).water)current.bridges[key]=true;Object.assign(g.player,mc.minePoint(cell));if(!g.progress.mining.rails[key]&&!mi.buildMine(g,'rail').ok)throw Error('铺轨失败');}
   // 事务会替换进度，继续使用当前正式存档设置玩家和已知洞口。
   g.progress.mining.dug['14,8']=true;g.progress.mining.shafts=['14,8'];g.progress.mining.descent='7,8';g.cottage.tool='pick';g.cottage.autoDig=true;Object.assign(g.player,mc.minePoint({x:7,y:3}));g.cottage.scanWait=99999;a.refresh();
  });await page.waitForTimeout(250);
  for(const time of ['day','night']){
   await phase(time);await page.screenshot({path:'output/playwright/mine-map/entry-'+time+'.png'});
   const before=await page.evaluate(()=>({position:{x:a.game.player.x,y:a.game.player.y},age:a.game.progress.mining.age,ore:a.game.progress.mining.ore}));
   await page.locator('#mine-map-open').tap();await shot('overview-'+time);
   const paused=await page.evaluate(()=>({age:a.game.progress.mining.age,state:a.game.state}));if(paused.state!=='paused')throw Error('地图未暂停');
   await page.waitForTimeout(200);if(await page.evaluate(()=>a.game.progress.mining.age)!==paused.age)throw Error('地图后台仍推进时间');
   await page.locator('[data-map-locate]').tap();await page.locator('[data-map-zoom="1"]').tap();await shot('tracks-'+time);
   // 一指拖动改变视图，玩家世界位置保持不变。
   const box=await page.locator('#mine-exploration-canvas').boundingBox(),cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
   const beforePixels=await page.locator('#mine-exploration-canvas').evaluate(c=>c.toDataURL());
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:x+65,y:y+40}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
   if(await page.locator('#mine-exploration-canvas').evaluate(c=>c.toDataURL())===beforePixels)throw Error('拖动未移动地图');
   const scale=await page.evaluate(()=>a.renderer.mineMapReview.scale);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:x-25,y},{id:1,x:x+25,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:x-60,y},{id:1,x:x+60,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);
   if(await page.evaluate(()=>a.renderer.mineMapReview.scale)<=scale)throw Error('双指未放大');
   await shot('pinch-'+time);await cdp.detach();await page.locator('[data-map-fit]').tap();await shot('fit-'+time);
   await page.locator('[data-map-close]').tap();await page.waitForTimeout(150);
   const after=await page.evaluate(()=>({state:a.game.state,x:a.game.player.x,y:a.game.player.y,ore:a.game.progress.mining.ore}));
   if(after.state!=='playing'||after.x!==before.position.x||after.y!==before.position.y||after.ore!==before.ore)throw Error('查看地图改变位置资源或未恢复');
  }
  for(const size of [{width:320,height:568},{width:360,height:640},{width:430,height:932},{width:844,height:390},{width:1280,height:900}]){
   await page.setViewportSize(size);await page.locator('#mine-map-open').tap();await shot('layout-'+size.width);await page.locator('[data-map-locate]').tap();await shot('located-'+size.width);await page.locator('[data-map-close]').tap();
  }
  await page.evaluate(()=>{a.game.state='paused';});await page.locator('#mine-map-open').tap();await page.locator('[data-map-close]').tap();await page.waitForTimeout(100);if(await page.evaluate(()=>a.game.state)!=='paused')throw Error('手动暂停被错误恢复');
  // 深层地图仅显示该层记录，旧档重读仍能看到同一条铁轨。
  await page.evaluate(async()=>{
   const g=a.game;g.progress=(await import('/src/progression/progress.js')).validateProgress(g.progress);g.state='playing';g.cottage.depth=2;const l=g.progress.mining.layers[2];Object.assign(g.player,mc.minePoint({x:8,y:4}));l.dug['9,4']=true;l.rails['8,4']=true;l.rails['9,4']=true;a.refresh();
  });await page.locator('#mine-map-open').tap();await shot('depth-two');
  if(await page.evaluate(()=>a.renderer.mineMapReview.rails)!==2)throw Error('地图串层');
  await page.evaluate(()=>{a.game.cottage.depth=1;a.refresh();});await page.waitForTimeout(150);if(await page.locator('#mine-map-dialog').isVisible())throw Error('切层未清理旧地图');
  if(errors.length)throw Error(errors.join('/'));return {scenes:reviews.length,errors,reviews};
 }catch(e){await page.screenshot({path:'output/playwright/mine-map/failure.png'});throw e;}finally{await context.close();}
}
