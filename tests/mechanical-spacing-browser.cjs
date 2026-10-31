// 正式战场车载伙伴间距检查：三枪与十只混编、四车型、移动、昼夜及手机。
async page=>{
 if(new URL(page.url()).port!=='4201')throw Error('仅限隔离端口');await page.reload();await page.evaluate(async()=>{if(!await (await import('/src/main.js')).application.ready)throw Error('场景预热失败');});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=0;p.vehicleIndex=3;p.vehicleLoadouts.fill(15);p.mechanicalLoadout=0;const g=a.game;g.progress=p;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:810});for(const [x,y] of [[1180,780],[900,850]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,flying:false});}g.summonVehicle();a.refresh();if(!await (await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('角色图集缺失');});
 await page.locator('#settings-button').click();await page.locator('#environment-button').click();await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();await page.locator('button[data-weather="sun"]').click();await page.locator('#close-environment').click();await page.locator('#close-settings').click();await page.waitForTimeout(1500);
 // 等待真实归队完成，首帧资源预热或初次部署不作为最终间距截图。
 await page.waitForFunction(async()=>{const g=(await import('/src/main.js')).application.game,nodes=g.vehicle.module?.companions?.nodes?.filter(n=>n.active&&n.ready);return nodes?.length===3&&nodes.every(n=>Math.hypot(n.x-g.player.x,n.y-g.player.y)>60);},null,{timeout:60000});
 const results=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});const label=time==='day'?'当前白昼':'当前夜晚';for(let i=0;i<3&&!(await page.locator('#time-picture').getAttribute('aria-label')).startsWith(label);i++)await page.locator('#time-picture').click();
  await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);
  await page.waitForTimeout(250);await page.screenshot({path:`output/playwright/mechanical-spacing/${width}-${time}.png`});
  const nodes=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectMechanicalVehicleSpacing((await import('/src/main.js')).application.game));results.push({width,time,nodes});if(nodes.length!==3||nodes.some(n=>Math.hypot(n.x,n.y)<60))throw Error('车身周围仍过近 '+JSON.stringify({width,time,nodes}));
 }
 // 真实键盘移动后仍有归队行走与背枪攻击，放开按键不会瞬移。
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(600);await page.keyboard.up('ArrowRight');await page.waitForTimeout(1500);await page.screenshot({path:'output/playwright/mechanical-spacing/after-move.png'});
 for(const index of [0,1,2,3]){await page.evaluate(async index=>{const a=(await import('/src/main.js')).application,g=a.game;g.dismountVehicle();g.selectVehicle(index);g.summonVehicle();g.progress.turretParts[15].coordination=8;a.refresh();},index);await page.waitForTimeout(1300);await page.screenshot({path:`output/playwright/mechanical-spacing/ten-vehicle-${index}.png`});}
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}


