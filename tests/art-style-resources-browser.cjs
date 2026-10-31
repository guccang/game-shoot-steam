// 验证缺失风格资源不会半切换，并在真实场景继续射击、地图和装备图标检查。
async page=>{
 const root='output/playwright/shared-art-rendering/';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 const p=await context.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/assets/art-styles/'))requests.push(r.url());});
 try{
  await context.route('**/assets/art-styles/classic/cozy-cottage/cottage.png',route=>route.abort());
  await p.goto(new URL('/?artPreview=idle-cat-pine',page.url()).href);await p.waitForFunction(()=>document.querySelector('#vehicle-button')?.getAttribute('aria-pressed')==='true',null,{timeout:60000});
  await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;window.style=await import('/src/art-styles/state.js');a.game.spawnTimer=999;});
  // 在正式切换提交时读取共用图集，确认旧纹理已释放而不是另存一套。
  await p.evaluate(async()=>{
   const scenery=await import('/src/rendering/scenery.js'),trees=await import('/src/rendering/tree-art.js'),terrain=await import('/src/rendering/natural-terrain.js'),monsters=await import('/src/rendering/monster-atlas.js');
   window.cacheResets=[];style.onArtStyleChange(()=>cacheResets.push({scenery:scenery.sceneryAtlasStats(),trees:trees.treeAtlasStats(),mountains:terrain.naturalAtlasStats(),monsters:monsters.monsterAtlasStats()}));
  });
  await p.locator('#settings-button').tap();const before=await p.evaluate(()=>JSON.stringify({time:a.game.time,progress:a.game.progress,player:a.game.player,vehicle:a.game.vehicle}));
  await p.locator('[data-art-style="classic"]').tap();await p.waitForFunction(()=>document.querySelector('#art-style-hint').textContent.includes('切换失败'));
  const failed=await p.evaluate(()=>({style:style.artStyle(),message:document.querySelector('#art-style-hint').textContent,snapshot:JSON.stringify({time:a.game.time,progress:a.game.progress,player:a.game.player,vehicle:a.game.vehicle})}));
  if(failed.style!=='clear'||failed.snapshot!==before)throw Error('缺图时损坏当前状态');
  await p.screenshot({path:root+'missing-resource.png'});await context.unroute('**/assets/art-styles/classic/cozy-cottage/cottage.png');
  await p.locator('[data-art-style="classic"]').tap();await p.waitForFunction(()=>style.artStyle()==='classic'&&!document.querySelector('#art-style-options').hasAttribute('aria-busy'));
  await p.locator('#close-settings').tap();
  const firing=[],icons=[];
  for(const id of ['classic','clear']){
   if(id==='clear'){await p.locator('#settings-button').tap();await p.locator('[data-art-style="clear"]').tap();await p.waitForFunction(()=>style.artStyle()==='clear'&&!document.querySelector('#art-style-options').hasAttribute('aria-busy'));await p.locator('#close-settings').tap();}
   await p.evaluate(()=>{const g=a.game;g.enemies=[];Object.assign(g.player,{x:1030,y:800,vx:0,vy:0});const e=g.spawnEnemy(0,0,{x:1130,y:845});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});a.renderer.camera.time=null;window.ammo=g.vehicle.module.magazine.ammo;});
   await p.waitForFunction(()=>a.game.vehicle.module.magazine.ammo<ammo,null,{timeout:6000});await p.waitForFunction(()=>a.game.vehicle.recoil.kick>.01,null,{timeout:4000});
   firing.push(await p.evaluate(()=>({style:style.artStyle(),ammo:a.game.vehicle.module.magazine.ammo,kick:a.game.vehicle.recoil.kick})));await p.screenshot({path:root+id+'-firing.png'});
   icons.push(await p.locator('#vehicle-menu-icon').evaluate(c=>c.toDataURL()));
   if(!await p.locator('#phone-button').isVisible())await p.locator('#field-menu-toggle').tap();await p.locator('#phone-button').tap();await p.locator('#phone-dialog [data-pack-action=map]').tap();await p.waitForFunction(()=>a.renderer.ground.mapPreview.stats().count>0&&!a.renderer.ground.mapPreview.failure);await p.waitForTimeout(250);await p.screenshot({path:root+id+'-map.png'});await p.locator('#close-map').tap();await p.locator('#phone-close').tap();
  }
  if(icons[0]===icons[1])throw Error('载具快捷图标未跟随切换');
  const inactive=await p.evaluate(()=>cacheResets);
  if(inactive.length<2||inactive.some(reset=>Object.values(reset).some(s=>s.bytes!==0)))throw Error('切换未释放共用图集');
  await p.setViewportSize({width:320,height:568});await p.locator('#settings-button').tap();await p.locator('[data-art-style="classic"]').scrollIntoViewIfNeeded();await p.screenshot({path:root+'settings-320.png'});
  for(const id of ['classic','clear'])if(!requests.some(url=>url.includes('/'+id+'/map-preview/')))throw Error('地图未加载独立风格资源');
  if(errors.length)throw Error(errors.join('\n'));return {passed:true,failureRetained:true,retrySucceeded:true,firing,iconsChanged:true,inactive,requests,errors};
 }finally{await context.close();}
}
