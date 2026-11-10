// 默认本地4175；隔离服务可由驱动设置PORT，截图使用正式应用与绘制器。
async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const skip=page.getByRole('button',{name:'跳过剧情',exact:true});if(await skip.isVisible())await skip.click();
 await page.waitForTimeout(800);
 await page.evaluate(async()=>{
  window.app=(await import('/src/main.js')).application;await app.ready;
  window.ecoProfiles=(await import('/src/config/biome-dumplings.js')).BIOME_DUMPLINGS;
  app.game.progress.arrival.phase='complete';app.game.player.invincible=0;app.game.spawnTimer=99999;app.game.encounterTimer=99999;
 });
 await page.setViewportSize({width:1000,height:800});
 // 正常尺寸与双倍尺寸目录均调用正式drawSlime，不另画预览替身。
 await page.evaluate(async()=>{
  const {drawSlime}=await import('/src/rendering/enemies.js');const canvas=document.createElement('canvas');canvas.id='eco-review';canvas.width=1000;canvas.height=630;canvas.style='position:fixed;inset:0;z-index:99999;width:100%;height:auto';document.body.append(canvas);
  const c=canvas.getContext('2d');c.fillStyle='#f3ecd0';c.fillRect(0,0,1000,630);c.font='16px sans-serif';c.textAlign='center';
  for(const [i,p] of ecoProfiles.entries()){const x=100+(i%5)*200,y=110+Math.floor(i/5)*205;c.save();c.translate(x,y);c.scale(1.5,1.5);drawSlime(c,{type:'enemy',species:'slime',dumplingVariant:p.id,color:p.color,aquatic:p.habitat==='lake',x:0,y:0,hp:100,maxHp:100,rank:0,radius:16,phase:0,gelStep:.8,gelMove:.6,assault:{phase:'chase',elapsed:0}},1);c.restore();c.fillStyle='#315c43';c.fillText(p.name,x,y+35);c.font='13px sans-serif';c.fillText(p.attack,x,y+58);c.font='16px sans-serif';}
 });
 await page.locator('#eco-review').screenshot({path:'output/biome-dumplings/catalog.png'});await page.evaluate(()=>document.getElementById('eco-review').remove());
 const samples=[];
 for(const habitat of ['snowpeak','volcano','lake','rainforest','strata','rift']){
  await page.evaluate(async habitat=>{
   const {NATURAL_TERRAIN}=await import('/src/world/natural-terrain.js'),{drySpawn,blocked}=await import('/src/physics/motion.js'),{dumplingWaterFits}=await import('/src/world/dumpling-habitats.js');
   const g=app.game,f=habitat==='lake'?NATURAL_TERRAIN.lakes.find(l=>dumplingWaterFits(l.x,l.y,100)):NATURAL_TERRAIN.earth.find(f=>f.kind===habitat);
   const origin=drySpawn({x:f.x,y:habitat==='lake'?f.y-f.ry-35:f.y+f.ry+100,mapId:'forest'});Object.assign(g.player,origin,{invincible:0});g.enemies=[];g.enemyBolts=[];g.remnants=[];g.state='playing';g.attackTimer=9999;g.spawnTimer=9999;g.encounterTimer=9999;g.boss=null;g.waveWarning=0;
   const profiles=ecoProfiles.filter(p=>p.habitat===habitat);
   profiles.forEach((p,i)=>{let point=habitat==='lake'?{x:f.x+(i-1)*85,y:f.y}:drySpawn({x:origin.x+(i-1)*90,y:origin.y-35,mapId:'forest'});const e=g.spawnEnemy(0,0,point,{ambient:true,dumplingVariant:p.id});if(e.dumplingVariant!==p.id)throw Error('出生身份错误 '+p.id);e.hp=e.maxHp=1e6;e.damage=0;e.speed=0;e.reviewOrigin={x:e.x,y:e.y};});
   app.renderer.camera.time=null;app.renderer.draw();app.refresh();
  },habitat);
  await page.waitForTimeout(180);
  for(const [width,height] of [[390,844],[320,568],[1280,900]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{app.game.state='playing';for(const e of app.game.enemies){Object.assign(e,e.reviewOrigin);e.assault={phase:'chase',elapsed:0};}app.game.enemyBolts=[];Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});app.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(app.environment,performance.now()-20000);app.renderer.camera.time=null;app.renderer.draw();},time);
   await page.waitForTimeout(100);await page.screenshot({path:`output/biome-dumplings/${habitat}-${width}-${time}.png`});
   const actualNight=await page.evaluate(()=>app.renderer.light.sample(performance.now(),true).night);if(actualNight!==(time==='night'?1:0))throw Error('昼夜状态被覆盖');
   const result=await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectBiomeDumplings(app.game));if(result.overflow)throw Error('手机横向溢出');samples.push({habitat,width,time,...result});
  }
 }
 // 手机触屏拖动实际画布，检查移动后仍由正式世界绘制。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{app.game.state='playing';app.game.enemies=[];app.game.player.invincible=99999;app.game.attackTimer=9999;});
 const before=await page.evaluate(()=>({x:app.game.player.x,y:app.game.player.y}));
 const session=await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:600}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:600}]});await page.waitForTimeout(650);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(()=>({x:app.game.player.x,y:app.game.player.y}));if(Math.hypot(after.x-before.x,after.y-before.y)<5)throw Error('手机摇杆没有移动角色');
 // 连续运行包含前摇、释放和恢复，并采样真实实体；无敌只用于延长录制。
 await page.evaluate(()=>{const g=app.game;const e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y},{ambient:true,dumplingVariant:'bubble'});g.enemies=g.enemies.filter(n=>n!==e);const land=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y},{ambient:true,dumplingVariant:'ashfan'});land.hp=land.maxHp=1e6;land.damage=0;land.arena={x:g.player.x,y:g.player.y,radius:500};g.attackTimer=9999;g.state='playing';});
 for(let i=0;i<12;i++){await page.waitForTimeout(250);samples.push(await page.evaluate(async()=> (await import('/src/rendering/visual-review.js')).inspectBiomeDumplings(app.game)));}
 if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'biome-dumplings',errors,touch:{before,after},samples};
}
