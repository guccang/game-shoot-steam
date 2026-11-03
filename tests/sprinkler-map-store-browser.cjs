// 手机真实触控验收：地图直接收回、走远收纳、失败重试与持久背包。
async original=>{
 const base=original.url().startsWith('http://localhost:')?new URL(original.url()).origin:'http://localhost:4175',out='output/playwright/sprinkler-map-store';
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}});const page=await context.newPage(),errors=[],shots=[];page.on('pageerror',e=>errors.push(e.message));
 // 断言真实状态，所有拿起、收回及取消通过UI触发。
 function check(ok,message){if(!ok)throw Error(message);}
 // 把正式世界坐标换算成触屏坐标，不绕开场景点击链。
 async function tapWorld(point){const pos=await page.evaluate(p=>{const v=a.renderer.view,r=a.renderer.canvas.getBoundingClientRect();return {x:r.left+(p.x-v.x)/v.w*r.width,y:r.top+(p.y-v.y)/v.h*r.height};},point);await page.touchscreen.tap(pos.x,pos.y);}
 // 设置真实历法输入，仍由正式渲染器完成昼夜转换。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(150);}

 try{
 await page.goto(base);await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(x=>x.id);p.wood=1000;p.mining.ore=100;p.production.returned=true;p.production.minedOre=12;p.production.seedGift=true;p.production.stock.meal=3;const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.vehicles=[];g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=999999;g.livingWeather='sun';window.prod=await import('/src/core/farm-production.js');window.review=await import('/src/rendering/visual-review.js');let site=null;
 for(let y=2200;y<4400&&!site;y+=104)for(let x=1800;x<4500&&!site;x+=112){let valid=true;for(let dx=0;dx<=392;dx+=56){Object.assign(g.player,{x:x+dx,y});if(prod.productionPlacement(g,{x:x+dx,y,mapId:'forest'},'sprinkler').reason){valid=false;break;}}if(valid)site={x,y,mapId:'forest'};}if(!site)throw Error('找不到搬移草地');window.origin=site;Object.assign(g.player,{x:site.x-40,y:site.y+20});g.progress.production.sprinklers=[{...site,id:1}];g.progress.production.bench={...site,x:site.x+112};a.renderer.camera.time=null;a.refresh();});await page.waitForTimeout(400);

 // 直接触摸场景设备，不经过任何生产菜单。
 await tapWorld(await page.evaluate(()=>({x:origin.x,y:origin.y-14})));await page.waitForFunction(()=>!!a.game.productionCarry);
 check(!await page.locator('#production-dialog').evaluate(d=>d.open),'不应打开生产菜单');
 check(await page.locator('[data-production-store-held]').isVisible(),'缺少直接收回按钮');
 check(await page.locator('[data-production-place]').isDisabled(),'收回不应要求落点');
 await page.locator('[data-production-cancel]').tap();check(await page.evaluate(()=>!a.game.productionCarry&&a.game.progress.production.sprinklerInventory===0),'取消错误收纳');
 await tapWorld(await page.evaluate(()=>({x:origin.x,y:origin.y-14})));await page.waitForFunction(()=>!!a.game.productionCarry);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1800);await page.keyboard.up('ArrowRight');check(await page.evaluate(()=>Math.abs(a.game.player.x-origin.x)>130),'未走离原位置');
 const before=await page.evaluate(()=>({wood:a.game.progress.wood,ore:a.game.progress.mining.ore}));
 for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);
  for(const light of ['day','night']){
   await phase(light);const ui=await page.evaluate(()=>{const n=document.querySelector('#production-placement'),r=n.getBoundingClientRect();return {visible:r.top>=0&&r.bottom<=innerHeight,small:[...n.querySelectorAll('button')].filter(b=>!b.hidden).some(b=>b.getBoundingClientRect().height<44||b.getBoundingClientRect().width<44),overflow:document.documentElement.scrollWidth>innerWidth};});
   check(ui.visible&&!ui.small&&!ui.overflow,'操作栏布局不合格');const path=out+'/'+size.width+'-'+light+'.png';await page.screenshot({path});shots.push(path);
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.persist=a.game.livingPersist;a.game.livingPersist=()=>false;});
 await page.locator('[data-production-store-held]').tap();check(await page.evaluate(()=>!!a.game.productionCarry&&a.game.progress.production.sprinklerInventory===0&&a.game.progress.production.sprinklers.length===1),'保存失败丢设备');
 check((await page.locator('#production-placement p').innerText()).includes('保存失败'),'失败提示未保留');
 await page.screenshot({path:out+'/failure-retained.png'});
 await page.evaluate(()=>a.game.livingPersist=window.persist);await page.locator('[data-production-store-held]').tap();
 await page.waitForFunction(()=>!a.game.productionCarry&&a.game.progress.production.sprinklerInventory===1&&!a.game.progress.production.sprinklers.length);
 check(await page.locator('#production-placement').isHidden(),'收回后操作栏未关闭');
 check(await page.evaluate(b=>!document.querySelector('#production-dialog').open&&a.game.progress.wood===b.wood&&a.game.progress.mining.ore===b.ore,before),'收回打开菜单或变更建材');
 await page.screenshot({path:out+'/stored.png'});
 await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.enemies=[];g.spawnTimer=999999;});
 check(await page.evaluate(()=>a.game.progress.production.sprinklerInventory===1&&!a.game.progress.production.sprinklers.length),'刷新未保留背包');
 if(!await page.locator('#heroes-button').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#heroes-button').tap();await page.locator('[data-cat-tab=items]').tap();await page.locator('[data-keepsake="facility:sprinkler"]').tap();await page.locator('[data-pack-action=place-sprinkler]').tap();await page.waitForFunction(()=>!!a.game.productionCursor);
 check(await page.locator('[data-production-store-held]').isHidden(),'背包放置错误显示收回按钮');await page.locator('[data-production-cancel]').tap();check(await page.evaluate(()=>a.game.progress.production.sprinklerInventory===1),'取消重新布置丢设备');
 check(!errors.length,errors.join('\n'));return {errors,shots,checks:'地图直接点击、取消、走远收回、失败重试、关闭操作栏、刷新背包保留、背包放置隐藏收回按钮通过'};
 }catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await context.close();}
}
