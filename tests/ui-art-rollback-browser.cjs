// 回退验收使用隔离存档，默认4175；临时worktree预览可复用当前localhost地址。
async page=>{
 const origin=new URL(page.url()).hostname==='localhost'?new URL(page.url()).origin:'http://localhost:4175';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:'output/playwright/ui-art-rollback/video',size:{width:390,height:844}}});
 const p=await context.newPage(),errors=[],pngRequests=[],checks=[],layouts=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/\/assets\/(ui|environment)\/[^/]+\.png/.test(r.url()))pngRequests.push(r.url());});
 // 读取正式图片及布局，不能以另画的样品替代运行结果。
 async function inspect(){
  await p.locator('.environment-picture img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
  const r=await p.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectUiArtRollback(document));
  if(r.pngNodes||r.overflow||r.environment.some(i=>!i.loaded||!i.source.endsWith('.svg')))throw Error(JSON.stringify(r));return r;
 }
 try{
  await p.goto(origin);await p.waitForFunction(()=>!document.getElementById('start').disabled);
  await p.evaluate(async()=>{
   (await import('/src/main.js')).application.destroy();const progress=(await import('/src/progression/progress.js')).freshProgress();
   progress.arrival={version:2,phase:'complete',keys:true};progress.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];progress.mainline.phase='complete';
   progress.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(v=>v.id);progress.living.position={x:1030,y:710};progress.vehicleHulls[0]=1;progress.vehicleIndex=0;
   localStorage.setItem('forest-patrol-v1',JSON.stringify(progress));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
  });
  await p.reload();await p.waitForFunction(()=>!document.getElementById('start').disabled);
  // 连续采样实际加载轮辐，避免两个瞬时角度恰好相同。
  await p.evaluate(()=>{window.wheelSamples=[];function sample(){const panel=document.getElementById('start-loading');if(!panel.hidden)wheelSamples.push(getComputedStyle(panel.querySelector('.start-loading-wheel')).transform);if(document.getElementById('game-frame').dataset.page!=='game')requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  await p.locator('#start').tap();await p.waitForTimeout(180);await p.screenshot({path:'output/playwright/ui-art-rollback/loading.png'});
  await p.waitForFunction(()=>document.getElementById('game-frame').dataset.page==='game');
  if(await p.evaluate(()=>new Set(wheelSamples.filter(v=>v!=='none')).size)<2)throw Error('加载轮子未运动');
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.update=()=>{};g.mainlineSpeech=null;g.enemies=[];g.summonVehicle();for(const [x,y]of [[1090,770],[940,770]]){const e=g.spawnEnemy(0,0,{x,y});e.speed=0;}a.refresh();});
  checks.push('原SVG加载车身与独立轮辐');
  await p.locator('.hud-resources [data-resource-info="coins"]').tap();await p.locator('#resource-help-art svg').waitFor({state:'visible'});await p.keyboard.press('Escape');checks.push('原资源SVG与说明交互');
  await p.locator('#field-menu-toggle').tap();await inspect();await p.screenshot({path:'output/playwright/ui-art-rollback/menu.png'});
  // 实际菜单像素必须来自正式武器/载具绘制器，选择变化后也须一致。
  const equipment=await p.evaluate(async()=>{
   const {drawWeapon}=await import('/src/rendering/characters.js'),{drawFunnelIcon}=await import('/src/rendering/funnel.js'),{drawVehicleIcon}=await import('/src/rendering/vehicle.js');
   const {effectiveWeapon}=await import('/src/config/weapon-mods.js'),{WEAPONS}=await import('/src/config/weapons.js'),results=[];
   // 比对真实菜单画布和相同正式绘制入口的输出，捕获固定PNG或错误装备映射；通道均值允许1/255的抗锯齿差异并记录实际误差。
   function compare(actual,paint){const expected=document.createElement('canvas');expected.width=actual.width;expected.height=actual.height;const source=actual.getContext('2d'),target=expected.getContext('2d');for(const key of ['lineJoin','lineCap','lineWidth','miterLimit','globalAlpha','globalCompositeOperation','imageSmoothingEnabled','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY'])target[key]=source[key];target.setLineDash(source.getLineDash());paint(target);const left=actual.getContext('2d').getImageData(0,0,actual.width,actual.height).data,right=expected.getContext('2d').getImageData(0,0,expected.width,expected.height).data;const meanDelta=left.reduce((sum,v,i)=>sum+Math.abs(v-right[i]),0)/left.length;return {equal:meanDelta<=1&&left.some((v,i)=>i%4===3&&v>0),meanDelta};}
   const old=a.game.progress.weapon;
   for(const index of [0,2,12]){a.game.progress.weapon=index;a.refresh();const equal=compare(document.getElementById('weapon-button-icon'),c=>{if(['funnel','drone'].includes(WEAPONS[index].controller)){drawFunnelIcon(c,56,54,1,WEAPONS[index].controller);return;}c.translate(index>=8?40:54,56);c.rotate(-.4);drawWeapon(c,index,0,0,index>=8?1.15:index?1.9:2.2,0,0,0,effectiveWeapon(a.game.loadout).modChoice);});results.push({kind:'weapon',index,...equal});}
   a.game.progress.weapon=old;a.refresh();const index=a.game.vehicle.index;results.push({kind:'vehicle',index,...compare(document.getElementById('vehicle-menu-icon'),c=>drawVehicleIcon(c,index))});return results;
  });
  if(equipment.some(e=>!e.equal))throw Error('图标与正式装备绘制器不一致 '+JSON.stringify(equipment));checks.push('三种武器与载具菜单像素匹配正式绘制器');
  await p.locator('#weapons-button').tap();await p.locator('#workshop-dialog').waitFor({state:'visible'});await p.screenshot({path:'output/playwright/ui-art-rollback/workshop.png'});await p.locator('#ws-close').tap();
  if(!await p.locator('#map-button').isVisible())await p.locator('#field-menu-toggle').tap();await p.locator('#map-button').tap();await p.locator('#map-dialog').waitFor({state:'visible'});await p.keyboard.press('Escape');checks.push('原工坊货架与地图入口');
  if(!await p.locator('#settings-button').isVisible())await p.locator('#field-menu-toggle').tap();await p.locator('#settings-button').tap();
  const sound=await p.locator('#sound').getAttribute('aria-pressed');await p.locator('#sound').tap();await p.waitForFunction(before=>document.getElementById('sound').getAttribute('aria-pressed')!==before,sound);
  await p.locator('#settings-advanced > summary').tap();await p.locator('#debug-toggle').tap();await p.locator('#living-preview').check();await p.locator('#environment-button').tap();await p.locator('#auto-time').uncheck();await p.locator('#auto-weather').uncheck();await p.locator('#environment-ok').tap();await p.locator('#close-settings').tap();
  for(const [width,height]of [[320,568],[390,844],[844,390],[1100,844]])for(const time of ['day','night']){
   await p.setViewportSize({width,height});await p.evaluate(async time=>{document.querySelector('button[data-time="'+time+'"]').click();document.querySelector('button[data-forest-season="summer"]').click();document.querySelector('button[data-weather="sun"]').click();a.renderer.seasons.reset(a.environment.forestSeason);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();a.renderer.draw();},time);
   layouts.push({width,height,time,...await inspect()});await p.screenshot({path:'output/playwright/ui-art-rollback/hud-'+width+'-'+time+'.png'});
  }checks.push('八组昼夜同屏布局与环境SVG');
  await p.setViewportSize({width:390,height:844});
  const ring=await p.evaluate(async()=>{const {updateRing}=await import('/src/ui/status-rings.js'),node=document.querySelector('.status-ring'),original=node.querySelector('.ring-meter');updateRing(node,{fill:.25,inner:.65,state:'reloading',icon:'ammo',mark:'reload',count:0,label:'验收装填',max:100,value:25});const r={same:node.querySelector('.ring-meter')===original,fill:node.querySelector('.ring-value').style.strokeDasharray,inner:node.querySelector('.ring-inner').style.strokeDasharray,svg:!!node.querySelector('.ring-icon svg')};a.refresh();return r;});
  if(!ring.same||!ring.svg||!ring.fill.startsWith('25')||!ring.inner.startsWith('65'))throw Error('状态图标或圆环异常');checks.push('原状态SVG与独立双圆环');
  await p.evaluate(async()=>{const fresh=(await import('/src/progression/progress.js')).freshProgress();a.game.progress.mainline=fresh.mainline;a.game.progress.mainline.phase='doing';a.game.progress.mainline.seen.map=1;Object.assign(a.game.player,{x:800,y:900});a.game.mainlineSpeech=null;a.game.state='playing';a.refresh();});
  await p.locator('#task-navigation-toggle').waitFor({state:'visible'});const before=await p.evaluate(()=>JSON.stringify(a.game.progress.mainline.completed));await p.locator('#task-navigation-toggle').tap();
  if(await p.locator('#task-navigation-toggle').getAttribute('data-enabled')!=='false'||before!==await p.evaluate(()=>JSON.stringify(a.game.progress.mainline.completed)))throw Error('导航开关改变任务');await p.screenshot({path:'output/playwright/ui-art-rollback/navigation-off.png'});await p.locator('#task-navigation-toggle').tap();checks.push('SVG导航两态与任务独立');
  await p.evaluate(()=>{const g=a.game;g.state='playing';g.player.hp=g.maxHp();g.enterRealm('rogue');for(const kind of ['weapon','vehicle','turret'])g.rollRealmEquipment(kind);g.readyRealm();g.realm.offers=['power','haste','armor'];a.refresh();});
  await p.locator('[data-realm-blessing="power"] svg').waitFor({state:'visible'});await p.screenshot({path:'output/playwright/ui-art-rollback/blessings.png'});const count=await p.evaluate(()=>a.game.realm.blessingCounts?.power||0);await p.locator('[data-realm-blessing="power"]').tap();if(await p.evaluate(()=>a.game.realm.blessingCounts?.power||0)!==count+1)throw Error('祝福选择未生效');checks.push('祝福原SVG与实际选择');
  if(errors.length||pngRequests.length)throw Error(JSON.stringify({errors,pngRequests}));
  return {designCriterion:'ui-art-rollback',passed:true,origin,equipment,checks,ring,layouts,errors,pngRequests};
 }catch(error){await p.screenshot({path:'output/playwright/ui-art-rollback/failure.png'});throw error;}
 finally{await context.close();}
}
