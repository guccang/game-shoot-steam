// 正式战场昼夜与手机电锯范围验收；默认服务为4175，CLI可连接隔离工作树端口。
async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const a=(await import('/src/main.js')).application;a.destroy();
  const {freshProgress}=await import('/src/game.js');const p=freshProgress();
  p.weapon=14;p.weapons[14]=1;p.weaponParts[14].range=5;p.restoration.repaired=['weapons','vehicle','cottage','clearing'];
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
 });
 await page.reload();await page.locator('#start').click();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.update=()=>{};a.game.onEvent=()=>{};const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('猫连续帧加载失败');});
 const results=[];
 for(const width of [320,390,1100])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===320?640:844});
  results.push(await page.evaluate(async({time})=>{
   const a=(await import('/src/main.js')).application,g=a.game;
   const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
   const {heldChainsawSegment}=await import('/src/combat/chainsaw-geometry.js');
   g.state='playing';g.player.x=1650;g.player.y=450;g.player.angle=0;g.player.walkPhase=0;g.player.recoil.kick=0;g.player.recoil.rise=0;g.player.recoil.flash=.13;
   g.progress.weapon=14;g.progress.weaponParts[14].range=5;g.vehicle.active=false;g.enemies=[];g.boss=null;g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>150);
   const segment=heldChainsawSegment(g.player,g.weapon().range);const enemy=g.spawnEnemy(0,0,{x:segment.end.x+segment.radius+15,y:segment.end.y+8});enemy.hp=enemy.maxHp=999;
   Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);
   a.renderer.camera.time=null;a.renderer.resize();a.refresh();a.renderer.draw();
   return {time,range:g.weapon().range,segment,enemy:{x:enemy.x,y:enemy.y,radius:enemy.radius}};
  },{time}));
  await page.screenshot({path:`output/playwright/chainsaw-range/${width}-${time}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 for(const time of ['day','night'])for(let frame=0;frame<3;frame++){
  await page.evaluate(async({time,frame})=>{
   const a=(await import('/src/main.js')).application,g=a.game;
   const {createVehicle}=await import('/src/combat/vehicle.js');const {updateRecoil,triggerRecoil}=await import('/src/combat/recoil.js');
   const {EnvironmentTransition}=await import('/src/world/environment.js');const {SceneTone}=await import('/src/rendering/scene-tone.js');
   const {heldChainsawSegment}=await import('/src/combat/chainsaw-geometry.js');const {riderPosition}=await import('/src/config/vehicle-rider.js');
   if(frame===0){g.progress.vehicleHulls[5]=1;g.vehicle=createVehicle(g.progress,g.maxHp(),5);g.vehicle.active=true;triggerRecoil(g.player.recoil,14);}
   else updateRecoil(g.player.recoil,14,1/30);
   const segment=heldChainsawSegment(riderPosition(g.player,g.vehicle),g.weapon().range);g.enemies[0].x=segment.end.x+segment.radius+g.enemies[0].radius-1;g.enemies[0].y=segment.end.y+8;
   Object.assign(a.environment,{time,weather:'sun'});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.resize();a.refresh();a.renderer.draw();
  },{time,frame});
  await page.screenshot({path:'output/playwright/chainsaw-range/rider-'+time+'-'+frame+'.png'});
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.workshop.open('weapons',14);});
 await page.screenshot({path:'output/playwright/chainsaw-range/workshop.png'});
 await page.evaluate(()=>document.querySelector('dialog[open]').close());
 await page.setViewportSize({width:900,height:650});
 await page.evaluate(async()=>{
  const {drawWeapon}=await import('/src/rendering/characters.js');const {freshProgress}=await import('/src/game.js');const {effectiveWeapon}=await import('/src/config/weapon-mods.js');
  const canvas=document.createElement('canvas');canvas.id='saw-review';canvas.width=900;canvas.height=650;canvas.style='position:fixed;inset:0;z-index:99999;background:#eee9d6';document.body.append(canvas);
  const c=canvas.getContext('2d');c.font='20px sans-serif';
  for(const [i,level] of [1,3,5].entries()){const p=freshProgress();p.weapons[14]=1;p.weaponParts[14].range=level;const w=effectiveWeapon(p,14);c.fillStyle='#34564c';c.fillText(`范围${level}级 · ${Number(w.range.toFixed(1))}距离`,80,40+i*190);drawWeapon(c,14,230,115+i*190,3,0,.13,0,0,w.parts);}
 });
 await page.screenshot({path:'output/playwright/chainsaw-range/levels.png'});
 await page.evaluate(()=>document.getElementById('saw-review').remove());
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({designCriterion:'chainsaw-range-contact',results,errors}));
}

