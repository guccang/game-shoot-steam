// 受击动作实机验收：正式命中和物理积分、连续帧、昼夜同屏与局部动作分类。
async page=>{
 if(new URL(page.url()).port!=='4291')throw Error('仅使用隔离验收端口');const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  (window.hApp||(await import('/src/main.js')).application).destroy();localStorage.clear();
  const {freshProgress}=await import('/src/progression/progress.js'),{MAINLINE_IDS}=await import('/src/config/mainline.js');const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.living.position={x:1600,y:450};p.vehicleHulls[0]=1;p.vehicleIndex=0;
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-audio-v1',JSON.stringify({enabled:false}));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  window.hApp=(await import('/src/app/create-app.js')).createApplication({random:()=>.5});
 });
 await page.locator('#start').click();await page.waitForFunction(()=>hApp.menu.page==='game');
 await page.evaluate(async()=>{
  const g=hApp.game,{armoredIdentity}=await import('/src/config/armored-enemies.js'),{rangedIdentity,RANGED_ENEMIES}=await import('/src/config/ranged-enemies.js'),{flyingIdentity}=await import('/src/config/enemies.js');
  g.enemies=[];g.encounterTimer=999;g.updateWaves=()=>{};g.attack=()=>{};g.updateWeaponAbility=()=>{};g.player.invincible=999;g.summonVehicle();
  window.hitSpecies=['slime','ironwood-bulwark','leaf-bat','spore-spitter','acorn-slinger','reed-archer','bramble-buggy','stump-bombard'];
  const positions=[[1500,310],[1600,310],[1680,310],[1500,440],[1680,440],[1500,570],[1600,570],[1680,570]];
  for(const [i,species] of hitSpecies.entries()){
   const [x,y]=positions[i],e=g.spawnEnemy(0,0,{x,y},{ambient:true});
   const identity=species==='ironwood-bulwark'?armoredIdentity(e):species==='leaf-bat'?flyingIdentity(e):RANGED_ENEMIES[species]?rangedIdentity(e,species):e;
   Object.assign(e,identity,{species,x,y,speed:0,hp:10000,maxHp:10000,damage:0,arena:{x:1600,y:440,radius:450}});
  }
  window.hitNames=hApp.game.enemies.map(e=>e.name.split('·')[0]);window.hitStart=hApp.game.enemies.map(e=>({x:e.x,y:e.y}));
 });
 const samples=[];
 for(let i=0;i<16;i++){
  if([0,3,6].includes(i))await page.evaluate(()=>{for(const e of hApp.game.enemies)hApp.game.hit(e,1,false,{direction:{x:1,y:0},impulse:95,pushLimit:250});});
  await page.waitForTimeout(100);samples.push(await page.evaluate(()=>hApp.game.enemies.map(e=>({species:e.species,x:e.x,y:e.y,roll:e.rollAngle||0,step:e.hitStep||0,knock:e.knockTime||0}))));
 }
 if(samples.flat().some(e=>e.species!=='slime'&&e.roll!==0))throw Error('非圆形怪物仍翻滚');
 if(!samples.flat().some(e=>e.species==='slime'&&Math.abs(e.roll)>.5))throw Error('团子翻滚丢失');
 if(!samples.flat().some(e=>e.species==='ironwood-bulwark'&&e.step>5))throw Error('重装未后撤');
 await page.evaluate(async()=>{
  const g=hApp.game,{stepBodies}=await import('/src/physics/motion.js'),{WORLD}=await import('/src/world/coordinates.js');g.update=()=>{};
  for(const [i,e] of g.enemies.entries()){Object.assign(e,hitStart[i],{pushX:0,pushY:0,z:0,vz:0,knockTime:0,rollAngle:0,hitStep:0,hitWheel:0});g.hit(e,1,false,{direction:{x:1,y:0},impulse:95,pushLimit:250});stepBodies([e],.12,WORLD);e.flash=0;}
  g.player.invincible=0;g.player.flash=0;g.fx.items=[];g.numbers=[];g.enemyBolts=[];g.particles=[];g.drops=[];hApp.refresh();
 });
 for(const width of [320,390,1280])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js'),{LIVING_PHASES}=await import('/src/config/living-world.js');hApp.game.progress.living.calendar.elapsed=LIVING_PHASES.find(p=>p.id===time).start+1000;Object.assign(hApp.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});hApp.renderer.seasons.reset('summer',performance.now());hApp.renderer.light=new EnvironmentTransition(hApp.environment,0);hApp.renderer.tone=new SceneTone(hApp.environment,0);hApp.renderer.camera.time=null;hApp.renderer.resize();hApp.refresh();hApp.renderer.draw();},time);
  await page.waitForFunction(t=>hApp.environment.time===t&&Math.abs(hApp.renderer.tone.sample(performance.now()).night-(t==='night'?1:0))<.01,time);
  await page.screenshot({path:`output/playwright/monster-hit-reactions/field-${width}-${time}.png`});
 }
 // 每行一个物种，每列一个真实积分时刻；比对遗留 rollAngle 不影响非圆形正式画面。
 const frames=await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{drawMonsterSprite,monsterAtlasStats}=await import('/src/rendering/monster-atlas.js');
  const canvas=document.createElement('canvas');canvas.id='hit-gallery';canvas.width=1120;canvas.height=1280;canvas.style.cssText='position:absolute;z-index:999;top:0;left:0;width:1120px;background:#f5efd5';document.body.append(canvas);const c=canvas.getContext('2d'),tile=document.createElement('canvas');tile.width=160;tile.height=160;const times=[0,.06,.14,.24,.4,.7,1.4],results=[];
  for(const [row,species] of hitSpecies.entries()){
   const unique=[];for(const [col,time] of times.entries()){
    await renderVisualCase(tile.getContext('2d'),'monster-hit-type-'+species,time);unique.push(tile.toDataURL());c.drawImage(tile,col*160,row*160);c.fillStyle='#315c43';c.font='12px sans-serif';c.fillText(hitNames[row]+' '+time+'秒',col*160+3,row*160+153);
   }
   const e={species,biome:'meadow',rank:0,hp:100,maxHp:100,phase:0,pushX:100,pushY:0,hitStep:15,rollAngle:0};
   const ctx=tile.getContext('2d');ctx.reset();ctx.translate(80,100);drawMonsterSprite(ctx,e,0);const baseline=tile.toDataURL();
   ctx.reset();ctx.translate(80,100);drawMonsterSprite(ctx,{...e,rollAngle:10},0);const ignored=baseline===tile.toDataURL();if(species!=='slime'&&!ignored)throw Error('绘制器仍使用翻滚角度 '+species);
   results.push({species,unique:new Set(unique).size,ignoresRoll:ignored});
  }
  return {results,atlas:monsterAtlasStats()};
 });
 if(frames.results.some(r=>r.unique<4))throw Error('局部动作帧不足');
 await page.setViewportSize({width:1280,height:1400});await page.locator('#hit-gallery').screenshot({path:'output/playwright/monster-hit-reactions/frames.png'});await page.evaluate(()=>document.querySelector('#hit-gallery').remove());
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/monster-hit-reactions/reduced-390.png'});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'monsterHitBodyTypes',passed:true,samples,frames,errors};
}
