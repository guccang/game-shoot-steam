// 真实底栏点击、鼠标/触摸拖放、键盘、无效取消与资源零扣费回归。
async page=>{
 if(new URL(page.url()).port!=='4200')throw Error('仅允许隔离端口');
 await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.mastery.fill(40);p.coins=p.wood=100000;p.bosses=100;const g=a.game;g.progress=p;g.reset();g.start();g.updateWaves=()=>{};g.hurt=()=>{};g.enemies=[];Object.assign(g.player,{x:1030,y:710});for(const [x,y] of [[900,820],[1080,820],[1180,750]]){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0});}g.summonVehicle();a.refresh();if(!await (await import('/src/rendering/cat-animation.js')).catSprites.load())throw Error('角色资源缺失');});
 const results=[];
 // 通过正式复核入口量测可视区域，不以测试页面替代运行时布局。
 async function inspect(){return page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectWorkshopDetails(document));}
 // 比较钱包与成长字段，保证仅选择和试装不提交。
 async function progress(){return page.evaluate(async()=>JSON.stringify((await import('/src/main.js')).application.game.progress));}
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.state='ready';a.workshop.open('weapons',0);});
  const initial=await inspect(),saved=await progress();
  await page.locator('[data-ws-upgrade="rate"]').click();
  let state=await inspect();if(!state.purpose.includes('加快攻击频率')||!state.resources.includes('/ 35'))throw Error('点击部件未显示用途与正式报价');
  if(await page.locator('#ws-confirm').isVisible()||await progress()!==saved)throw Error('点击部件意外提交');
  await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-part="1"]').click();
  state=await inspect();if(!state.purpose.includes('快拔机匣')||!state.resources.includes('/ 180'))throw Error('点击套件未显示费用');
  await page.screenshot({path:`output/playwright/workshop-inline-details/${width}-selected.png`});
  // 桌面使用鼠标拖放；手机分发真实触摸，起点和装配位都在实际可见区域。
  const card=page.locator('[data-ws-part="1"]');await card.scrollIntoViewIfNeeded();const b=await card.boundingBox(),s=await page.locator('#ws-socket').boundingBox();
  if(width===1280){await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(s.x+s.width/2,s.y+s.height/2,{steps:8});await page.mouse.up();}
  else {const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});for(const [type,x,y] of [['touchStart',b.x+b.width/2,b.y+b.height/2],['touchMove',b.x+b.width/2,b.y+b.height/2-15],['touchMove',s.x+s.width/2,s.y+s.height/2],['touchEnd',0,0]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();}
  if(!await page.locator('#ws-confirm').isVisible())throw Error('未成功拖入');
  state=await inspect();if(state.footerHeight!==initial.footerHeight||state.stageHeight!==initial.stageHeight||!state.noOverlay)throw Error('拖放改变底栏或舞台尺寸');
  await page.locator('#ws-stats').scrollIntoViewIfNeeded();state=await inspect();if(!state.statsVisible)throw Error('属性无法完整查看');
  await page.screenshot({path:`output/playwright/workshop-inline-details/${width}-stats.png`});
  if(await progress()!==saved)throw Error('试装扣费');
  results.push({width,...state});
  await page.locator('[data-ws-part="2"]').click();if(await page.locator('#ws-confirm').isVisible()||!(await inspect()).purpose.includes('重弹枪管')||await progress()!==saved)throw Error('新选择残留旧草稿');
  // 无效落点不安装，也不把报价误当成已提交方案。
  if(width===1280){const c=await page.locator('[data-ws-part="2"]').boundingBox();await page.mouse.move(c.x+c.width/2,c.y+c.height/2);await page.mouse.down();await page.mouse.move(30,40,{steps:5});await page.mouse.up();if(await page.locator('#ws-confirm').isVisible()||await progress()!==saved)throw Error('无效落点扣费或形成草稿');}
  await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-part="9"]').focus();await page.keyboard.press('Enter');
  if(!(await inspect()).purpose.includes('脉冲'))throw Error('键盘炮塔详情缺失');
  await page.locator('#ws-turret-upgrade').click();await page.locator('[data-ws-upgrade="range"]').click();if(!(await inspect()).purpose.includes('扩大有效攻击范围'))throw Error('炮塔部件详情错误');
  await page.locator('#ws-close').click();if(await page.locator('#ws-discard').isVisible())throw Error('仅查看费用触发草稿提示');
 }
 // 资源不足仍显示报价及缺口，不启用施工；切换后旧说明消失。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.coins=0;a.workshop.open('weapons',0);});await page.locator('[data-ws-upgrade="damage"]').click();if(!(await inspect()).resources.includes('缺 35'))throw Error('缺口未展示');await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');if(!await page.locator('#ws-hold').isDisabled())throw Error('不足仍可施工');await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('#ws-close').click();
 // 同一正式场景昼夜检查：角色、敌人、载具与工坊界面沿用现有渲染。
 await page.setViewportSize({width:1440,height:960});
 await page.locator('#settings-button').click();await page.locator('#environment-button').click();await page.locator('#auto-time').uncheck();await page.locator('#auto-weather').uncheck();await page.locator('button[data-weather="sun"]').click();await page.locator('#close-environment').click();await page.locator('#close-settings').click();
 for(const width of [1440,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1440?960:844});
  const label=time==='day'?'当前白昼':'当前夜晚';for(let i=0;i<3&&!(await page.locator('#time-picture').getAttribute('aria-label')).startsWith(label);i++)await page.locator('#time-picture').click();
  await page.evaluate(async time=>{const a=(await import('/src/main.js')).application,{EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.camera.time=null;a.renderer.resize();a.game.progress.coins=100000;a.game.start();a.refresh();},time);
  await page.waitForTimeout(200);await page.screenshot({path:`output/playwright/workshop-inline-details/scene-${width}-${time}.png`});
  if(!await page.locator('#weapons-button').isVisible())await page.getByRole('button',{name:'展开功能菜单'}).click();
  await page.locator('#weapons-button').click();await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-part="2"]').click();await page.screenshot({path:`output/playwright/workshop-inline-details/workshop-${width}-${time}.png`});await page.locator('#ws-close').click();
 }
 if(errors.length)throw Error(errors.join('\n'));return {results,errors};
}


