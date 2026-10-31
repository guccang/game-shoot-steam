// 正式工坊、车载队形及二十小蛛实机验收；仅在隔离端口构造测试存档。
async page=>{
 if(new URL(page.url()).port!=='4202')throw Error('仅允许隔离端口');await page.reload();await page.evaluate(async()=>{if(!await (await import('/src/main.js')).application.ready)throw Error('场景资源准备失败');});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const dir='output/playwright/companion-formations-spider';
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.mastery.fill(40);p.weapon=16;p.coins=p.wood=99999;p.bosses=100;p.vehicleLoadouts.fill(16);a.game.progress=p;a.game.reset();a.game.start();a.game.updateWaves=()=>{};a.game.hurt=()=>{};a.game.enemies=[];Object.assign(a.game.player,{x:1030,y:960});a.refresh();if(!await (await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('角色图集缺失');});
 const results=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?960:844});await page.evaluate(async()=>(await import('/src/main.js')).application.workshop.open('weapons',16));
  if(!(await page.locator('#ws-stats').innerText()).includes('8'))throw Error('初始上限未展示');
  await page.locator('#ws-spider').click();await page.locator('[data-spider-gun="0"]').focus();await page.keyboard.press('Enter');
  const name=await page.locator('[data-spider-gun="0"]').getAttribute('aria-pressed');if(name!=='true')throw Error('挂枪未保存');
  await page.screenshot({path:`${dir}/config-${width}.png`});
  const bytes=await page.locator('dialog[open] canvas').evaluateAll(ns=>ns.reduce((s,c)=>s+c.width*c.height*4,0));if(bytes>7*1024*1024)throw Error('配置画布超预算');results.push({width,bytes});
  await page.locator('#spider-done').click();await page.waitForFunction(()=>document.querySelectorAll('#spider-choices canvas').length===0);
  const expected=await page.evaluate(async()=>{const p=(await import('/src/main.js')).application.game.progress;return Math.round((await import('/src/config/weapon-mods.js')).weaponDamage(p,0)*1.5);});
  const text=await page.locator('#ws-stats').innerText();if(!text.includes('主炮伤害 ×1.5')||!text.includes(String(expected)))throw Error('面板增伤错误');
  await page.screenshot({path:`${dir}/workshop-${width}.png`});await page.locator('#ws-close').click();
 }
 // 触屏配置使用真实触摸点击，车载原生伤害与车体等级来源明确。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.workshop.open('vehicle',3,16);});await page.locator('#ws-turret-upgrade').click();await page.locator('#ws-spider').click();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});const b=await page.locator('[data-spider-gun="native"]').boundingBox();for(const type of ['touchStart','touchEnd'])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 if(await page.locator('[data-spider-gun="native"]').getAttribute('aria-pressed')!=='true')throw Error('触摸原生选择失败');await page.locator('#spider-done').click();await page.locator('#ws-close').click();
 // 二十只小蛛通过真实出舱时钟生成，既不直接写名额也不凭静态预览验收。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.weaponParts[16].coordination=13;g.progress.spiderLoadout=9;g.progress.vehicleIndex=0;g.progress.vehicleLoadouts[0]=0;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:960});for(const [x,y] of [[830,850],[900,1050],[1220,870],[1210,1050],[1030,1160]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,mass:1e6,flying:false});}g.summonVehicle();a.refresh();});
 await page.waitForTimeout(2300);await page.screenshot({path:`${dir}/hatch.png`});
 await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;for(let i=0;i<55*60;i++)g.update(1/60);});
 const swarm=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectSpiderSwarm(a.game);});if(swarm.spawned!==20||swarm.interval!==2)throw Error('扩编失败 '+JSON.stringify(swarm));results.push(swarm);
 await page.locator('#settings-button').click();await page.locator('#environment-button').click();await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();await page.locator('button[data-weather="sun"]').click();await page.locator('#close-environment').click();await page.locator('#close-settings').click();
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});const label=time==='day'?'当前白昼':'当前夜晚';for(let i=0;i<3&&!(await page.locator('#time-picture').getAttribute('aria-label')).startsWith(label);i++)await page.locator('#time-picture').click();
  await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');a.environment.time=time;a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);
  await page.waitForTimeout(350);await page.screenshot({path:`${dir}/swarm-${width}-${time}.png`});
 }
 // 四车型实际方向键转弯后停车，小狗状态由正式车载会话读取。
 for(const hull of [0,1,2,3]){
  await page.evaluate(async hull=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.weapon=0;g.progress.vehicleIndex=hull;g.progress.vehicleLoadouts[hull]=15;g.progress.turretParts[15].coordination=hull===3?8:1;g.progress.mechanicalLoadout=0;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:1050});g.summonVehicle();a.refresh();},hull);await page.waitForTimeout(1800);
  for(const key of ['ArrowRight','ArrowDown','ArrowLeft']){await page.keyboard.down(key);await page.waitForTimeout(650);await page.screenshot({path:`${dir}/drive-${hull}-${key}.png`});await page.keyboard.up(key);}
  await page.waitForTimeout(2400);await page.screenshot({path:`${dir}/park-${hull}.png`});
  const nodes=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectMechanicalVehicleSpacing(a.game);});results.push({hull,nodes});
 }
 // 工坊连续试射超过原十秒，完整二十名额和更换后的主炮均进入独立会话。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.workshop.open('weapons',16);});await page.locator('#ws-test').click();await page.waitForTimeout(11500);await page.screenshot({path:`${dir}/trial.png`});if(!(await page.locator('#ws-trial-time').innerText()).includes('批'))throw Error('持续试射中断');await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}
