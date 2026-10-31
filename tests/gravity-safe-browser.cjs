// 实际森林内观察近怪/树木穿行与远处聚怪，昼夜手机桌面共用正式绘制器。
async page=>{
 if(new URL(page.url()).port!=='4294')throw Error('只允许隔离验收端口');
 const errors=[],scenes=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;a.menu.enter();if(!await a.ready)throw Error('正式资源未就绪');});
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async time=>{
   const g=a.game,{freshProgress}=await import('/src/progression/progress.js');
   if(g.reviewUpdate){g.update=g.reviewUpdate;delete g.reviewUpdate;}
   const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.weapons[17]=1;p.weapon=17;p.vehicleHulls[5]=1;p.vehicleIndex=5;
   g.progress=p;g.reset();g.start();g.workshopTrial=true;g.updateWaves=()=>{};g.enemies=[];g.boss=null;g.waveWarning=0;g.spawnTimer=9999;
   Object.assign(g.player,{x:1600,y:1600,invincible:999});g.summonVehicle();
   const tree={...g.trees[0],id:g.nextId++,x:1600,y:1430,hp:10000,maxHp:10000};g.trees=g.trees.filter(t=>Math.hypot(t.x-1600,t.y-1600)>430);g.trees.push(tree);g.reviewTree=tree;
   for(const [x,y]of [[1600,1550],[1600,1260],[1655,1275],[1550,1265]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{x,y,hp:100000,maxHp:100000,speed:0,damage:0,mass:10,football:true});}
   g.reviewNear=g.enemies[0];g.reviewUnsafe=false;
   const update=g.update;g.reviewUpdate=update;g.update=function(dt){update.call(this,dt);for(const f of this.gravityFields||[])if(Math.hypot(f.x-this.player.x,f.y-this.player.y)<150)this.reviewUnsafe=true;};
   Object.assign(a.environment,{time,livingPreview:true,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});
   a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment);a.renderer.camera.time=null;a.refresh();
  },time);
  await page.waitForFunction(()=>{const g=a.game;if(g.gravityFields?.length&&g.gravityFields[0].life<2.5){g.update=()=>{};return true;}return false;},null,{timeout:15000});
  const result=await page.evaluate(async()=>{const g=a.game;return {...(await import('/src/rendering/visual-review.js')).inspectGravityRedwolf(g,document),unsafe:g.reviewUnsafe,treeHp:g.reviewTree.hp,nearHp:g.reviewNear.hp,nearDistance:Math.hypot(g.reviewNear.x-g.player.x,g.reviewNear.y-g.player.y),fieldDistance:Math.hypot(g.gravityFields[0].x-g.player.x,g.gravityFields[0].y-g.player.y),time:a.environment.time};});
  if(result.nearDistance<65||result.fieldDistance>170||result.unsafe||result.treeHp!==10000||result.nearHp!==100000||result.overflow)throw Error(JSON.stringify(result));
  await page.screenshot({path:`output/playwright/gravity-nearby-gather/${width}-${time}.png`});scenes.push({width,...result});
 }
 if(errors.length)throw Error(errors.join('\n'));return {scenes,errors};
}
