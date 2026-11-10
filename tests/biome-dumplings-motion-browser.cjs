// 补充正式同屏验收：移动步态、受击、死亡、载具与昼夜；使用独立浏览器临时档。
async(page)=>{
 const skip=page.getByRole('button',{name:'跳过剧情',exact:true});if(await skip.isVisible())await skip.click();
 await page.evaluate(async()=>{window.app=(await import('/src/main.js')).application;await app.ready;const g=app.game;g.progress.arrival.phase='complete';Object.assign(g.player,{x:15240,y:3825,invincible:0});g.enemies=[];g.attackTimer=g.spawnTimer=g.encounterTimer=99999;g.progress.vehicleHulls[3]=1;g.progress.vehicleIndex=3;const vehicles=await import('/src/combat/vehicle.js');g.vehicle=vehicles.createVehicle(g.progress,3);g.vehicles[3]=g.vehicle;g.state='playing';vehicles.summonVehicle(g);if(!g.vehicle.active)throw Error('载具未进入正式场景');g.state='playing';const e=g.spawnEnemy(0,0,{x:g.player.x+130,y:g.player.y+35},{ambient:true,dumplingVariant:'obsidian'});e.hp=e.maxHp=1e6;e.damage=0;e.arena={x:g.player.x,y:g.player.y,radius:600};app.renderer.camera.time=null;app.refresh();});
 const samples=[];
 for(const time of ['day','night']){
  await page.evaluate(async time=>{Object.assign(app.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});app.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(app.environment);},time);
  for(let i=0;i<8;i++){await page.waitForTimeout(180);samples.push(await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectBiomeDumplings(app.game)));}
  await page.screenshot({path:`output/biome-dumplings/vehicle-${time}.png`});
 }
 await page.evaluate(()=>{const g=app.game,e=g.enemies[0];g.hit(e,5,false,{direction:{x:1,y:0},impulse:45});});await page.waitForTimeout(70);await page.screenshot({path:'output/biome-dumplings/hit.png'});
 await page.evaluate(()=>{const g=app.game,e=g.enemies[0];g.hit(e,1e9,false,{direction:{x:1,y:0},impulse:45});if(!g.remnants.some(r=>r.dumplingVariant==='obsidian'))throw Error('死亡未保留地貌身份');});
 await page.waitForTimeout(100);await page.screenshot({path:'output/biome-dumplings/death.png'});
 await page.waitForTimeout(1200);if(await page.evaluate(()=>app.game.remnants.some(r=>r.dumplingVariant==='obsidian')))throw Error('死亡残影未回收');
 if(!samples.some(s=>s.actors.some(e=>e.step>0)))throw Error('移动步态没有推进');
 return {designCriterion:'biome-dumplings',vehicle:true,hit:true,death:true,samples};
}
