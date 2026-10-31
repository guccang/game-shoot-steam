// 新远程怪实机验收：正式混战、键盘/触摸走位、昼夜手机及部件连续帧。
async page => {
 if(new URL(page.url()).port!=='4235')throw Error('仅使用隔离验收端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('资源加载失败');
  const {freshProgress}=await import('/src/progression/progress.js');
  const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};
  a.game.progress=p;a.game.arrivalScene=null;a.game.reset();a.menu.enter();a.game.start();
  const g=a.game;g.updateWaves=()=>{};g.attack=()=>{};g.updateWeaponAbility=()=>{};g.enemies=[];g.bossReady=true;g.encounterTimer=999;
  Object.assign(g.player,{x:1600,y:400,hp:g.maxHp()});g.wave=6;g.waveWarning=0;g.waveRest=0;
  const {RANGED_ENEMIES}=await import('/src/config/ranged-enemies.js');
  const species=['bramble-buggy','stump-bombard','reed-archer','spore-spitter','acorn-slinger','slime'];
  const positions=[[-90,-100],[90,-90],[100,90],[-90,90],[0,155],[-100,180]];
  for(const [i,key] of species.entries()){
   const e=g.spawnEnemy(0,0,{x:1600+positions[i][0],y:400+positions[i][1]});
   Object.assign(e,{species:key,flying:false,hp:1e7,maxHp:1e7,damage:4,speed:45,radius:RANGED_ENEMIES[key]?.bodyRadius||17,arena:{x:1600,y:400,radius:800}});
  }
  Object.assign(a.environment,{time:'day',weather:'sun',autoTime:false,autoWeather:false,autoSeason:false,forestSeason:'summer'});
  a.renderer.seasons.reset('summer',performance.now());a.refresh();
 });
 const samples=[];for(let i=0;i<50;i++){
  await page.waitForTimeout(160);samples.push(await page.evaluate(()=>({hp:a.game.player.hp,bolts:a.game.enemyBolts.length,phases:a.game.enemies.map(e=>[e.species,e.assault.phase])})));
 }
 if(!samples.some(s=>s.bolts>0)||samples.some(s=>s.bolts>6))throw Error('弹量或开火异常');
 if(samples.at(-1).hp>=samples[0].hp)throw Error('实际混战未造成伤害');
 for(const key of ['bramble-buggy','stump-bombard','reed-archer'])for(const phase of ['windup','recovery'])
  if(!samples.some(s=>s.phases.some(p=>p[0]===key&&p[1]===phase)))throw Error('缺少正式攻击阶段 '+key+phase);
 const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(350);await page.keyboard.up('ArrowDown');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:85,y:600}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:125,y:600}]});await page.waitForTimeout(250);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 const moved=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
 if(Math.hypot(moved.x-before.x,moved.y-before.y)<20)throw Error('实际走位失败');
 if(!await page.locator('#joystick').isHidden())throw Error('取消触摸未释放摇杆');
 // 固定同一混战现场，保留真实渲染器与场景背景，仅冻结逻辑避免截图间怪物离开镜头。
 await page.evaluate(()=>{
  const g=a.game;g.update=()=>{};Object.assign(g.player,{x:1600,y:400,flash:0,invincible:0});
  g.fx.items=[];g.numbers=[];g.enemyBolts=[];g.summonVehicle();
  const positions=[[-90,-100],[90,-90],[100,90],[-90,90],[0,155],[-100,180]];
  g.enemies.forEach((e,i)=>{e.x=1600+positions[i][0];e.y=400+positions[i][1];e.knockTime=e.z=e.rollAngle=0;e.assault={phase:'chase',elapsed:0,dirX:0,dirY:1};});a.refresh();
 });
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?900:844});
  await page.evaluate(async time=>{const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();},time);
  await page.waitForTimeout(150);await page.screenshot({path:`output/playwright/ranged-enemy-reinforcements/field-${width}-${time}.png`});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/ranged-enemy-reinforcements/reduced-320.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 const frames=await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{monsterAtlasStats}=await import('/src/rendering/monster-atlas.js');
  const before=monsterAtlasStats(),gallery=document.createElement('canvas');gallery.id='ranged-gallery';gallery.width=1200;gallery.height=500;gallery.style.cssText='position:absolute;z-index:999;top:0;left:0;width:1200px;background:#eee8c8';document.body.append(gallery);
  const c=gallery.getContext('2d'),tile=document.createElement('canvas');tile.width=400;tile.height=250;const frames=[];
  for(let i=0;i<6;i++){await renderVisualCase(tile.getContext('2d'),'ranged-enemy-reinforcements',i*.24);frames.push(tile.toDataURL());c.drawImage(tile,(i%3)*400,Math.floor(i/3)*250);}
  const after=monsterAtlasStats();if(before.bytes!==after.bytes)throw Error('新增图集缓存');return {unique:new Set(frames).size,before,after};
 });
 await page.setViewportSize({width:1280,height:900});await page.locator('#ranged-gallery').screenshot({path:'output/playwright/ranged-enemy-reinforcements/frames.png'});await page.evaluate(()=>document.getElementById('ranged-gallery').remove());
 if(frames.unique!==6)throw Error('动作帧无变化');if(errors.length)throw Error(errors.join('\n'));
 return {designCriterion:'ranged-enemy-reinforcements',maximumBolts:Math.max(...samples.map(s=>s.bolts)),damage:samples[0].hp-samples.at(-1).hp,movement:Math.hypot(moved.x-before.x,moved.y-before.y),frames,errors};
}
