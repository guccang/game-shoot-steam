// 正式工坊、混编猫群、蜘蛛动作和昼夜手机同屏实机验收；仅运行在隔离端口。
async page=>{
 if(new URL(page.url()).port!=='4198')throw Error('仅允许隔离端口');await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:960});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=15;p.weaponParts[15].coordination=8;p.weaponParts[16].coordination=8;p.turretParts[15].coordination=8;p.mechanicalLoadout=0;p.vehicleLoadouts[0]=15;p.coins=p.wood=999999;p.bosses=100;p.materials={parts:9999,crystal:9999,core:999};a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('角色图集缺失');});
 const results=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?960:844});
  if(!await page.locator('#weapons-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
  await page.locator('#weapons-button').click();await page.locator('[data-ws-item="15"]').click();await page.locator('#ws-mechanical').click();
  await page.locator('[data-mechanical-gun="0"]').click();if(!(await page.locator('#mechanical-hp').innerText()).includes('重装 300'))throw Error('混编生命未显示');
  await page.screenshot({path:`output/playwright/spider-motion/config-${width}.png`});await page.locator('#mechanical-done').click();
  if(!(await page.locator('#ws-stats').innerText()).includes('3 / 7'))throw Error('工坊编队不正确');await page.screenshot({path:`output/playwright/spider-motion/mixed-${width}.png`});
  await page.locator('[data-ws-item="16"]').click();await page.locator('#ws-test').click();await page.waitForTimeout(4200);await page.screenshot({path:`output/playwright/spider-motion/hatch-trial-${width}.png`});await page.waitForTimeout(4600);const trial=await page.locator('#ws-trial-time').innerText();await page.screenshot({path:`output/playwright/spider-motion/trial-${width}.png`});await page.locator('#ws-trial-stop').click();
  const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(ns=>ns.reduce((n,c)=>n+c.width*c.height*4,0));if(bytes>5*1024*1024)throw Error('画布预算超限');results.push({width,trial,bytes});await page.locator('#ws-close').click();
 }
 // 全树木真实森林，固定高质量靶只防止主炮把目标击退出小蛛半径。
 await page.setViewportSize({width:1280,height:960});await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.weapon=16;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:710});for(const [x,y] of [[890,820],[1060,820],[1180,750],[900,640],[1090,600]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,mass:1e6,flying:false});}g.summonVehicle();for(let i=0;i<3000;i++)g.update(1/60);a.refresh();});
 const full=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game,n=g.spider.nodes;return {small:n.filter(n=>n.active&&n.hp>0).length,targets:new Set(n.map(n=>n.targetId).filter(Boolean)).size,guns:g.vehicle.module.companions.nodes.filter(n=>n.gun).length,heavy:g.vehicle.module.companions.nodes.filter(n=>n.maxHp===300).length};});if(full.small!==10||full.targets<4||full.guns!==3||full.heavy!==7)throw Error(JSON.stringify(full));
 await page.locator('#settings-button').click();await page.locator('#environment-button').click();await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();await page.locator('button[data-forest-season="summer"]').click();await page.locator('button[data-weather="sun"]').click();await page.locator('#close-environment').click();if(await page.locator('#close-settings').isVisible())await page.locator('#close-settings').click();
 await page.waitForTimeout(20500);const scenes=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?960:844});
  for(const time of ['day','night']){
   const label=time==='day'?'白昼':'夜晚';for(let i=0;i<3&&(await page.locator('#time-picture-label').innerText())!==label;i++)await page.locator('#time-picture').click();
   await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,forestSeason:'summer'});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);
   await page.waitForTimeout(600);await page.screenshot({path:`output/playwright/spider-motion/scene-${width}-${time}.png`});
   await page.locator('.world-workshop-entry').click();await page.locator('[data-ws-item="16"]').click();await page.screenshot({path:`output/playwright/spider-motion/full-${width}-${time}.png`});await page.locator('#ws-close').click();
   const info=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {cache:a.renderer.diagnosticInfo().groundCache.count};});scenes.push({width,time,...info});
  }
 }
 await page.setViewportSize({width:390,height:844});
 // 用正式死亡/补召制造新出舱窗口，并逐帧停在真实出舱和攻击状态。
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game,{hurtMechanical}=await import('/src/combat/mechanical.js');hurtMechanical(g,g.spider.nodes[0],999);g.magazines[16].ammo=40;g.magazines[16].remaining=0;for(let i=0;i<800;i++){g.update(1/60);if(g.spider.nodes[0].emerge>.5&&g.spider.nodes[0].hp>0)break;}g.reviewUpdate=g.update;g.update=()=>{};});
 await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/spider-motion/egress-a.png'});
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;for(let i=0;i<25;i++)g.reviewUpdate(1/60);});await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/spider-motion/egress-b.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'output/playwright/spider-motion/reduced.png'});await page.emulateMedia({reducedMotion:'no-preference'});
 // 实际键盘移动并停步；冻结采样只包裹测试时钟，不展示暂停遮罩。
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;g.update=g.reviewUpdate;delete g.reviewUpdate;});
 await page.keyboard.down('s');await page.waitForTimeout(600);await page.screenshot({path:'output/playwright/spider-motion/walk-a.png'});await page.waitForTimeout(180);await page.screenshot({path:'output/playwright/spider-motion/walk-b.png'});await page.keyboard.up('s');await page.waitForTimeout(1600);
 const samples=await page.evaluate(async()=>{const {renderVisualCase}=await import('/src/rendering/visual-review.js'),c=document.createElement('canvas');c.width=560;c.height=360;const out={};for(const id of ['spider-motion','mechanical-mixed-pack']){const frames=[];for(const t of [0,.15,.3,.5,.7,1]){await renderVisualCase(c.getContext('2d'),id,t);frames.push(c.toDataURL());}out[id]=new Set(frames).size;}return out;});if(Object.values(samples).some(n=>n<5)||errors.length)throw Error(JSON.stringify({samples,errors}));return {results,full,scenes,samples,errors};
}
