// 隔离手机存档，所有售货员从正式入口点击服务；默认4175，工作树占用时使用4176。
async original=>{
 const out='output/playwright/shopkeeper-counters/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'video/',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 // 截图读取正式验收器中的柜台与售货员，同时检查弹窗和页面边界。
 async function shot(name){const row=await page.evaluate(async()=>({...await(await import('/src/rendering/visual-review.js')).inspectShopkeeperCounters(a.game),overflow:document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('dialog[open]')].some(d=>{const r=d.getBoundingClientRect();return r.x<0||r.y<0||r.right>innerWidth+1||r.bottom>innerHeight+1;})}));if(row.overflow||row.counters.length!==1)throw Error(name+' '+JSON.stringify(row));checks.push({name,...row});await page.screenshot({path:out+name+'.png'});}
 // 夹具只放到门口，进入和离开仍使用正式的一秒候停。
 async function door(kind){await page.evaluate(async kind=>{const g=a.game,l=(await import('/src/config/workshop-interiors.js')).interiorLayout({kind});Object.assign(g.player,l.door,{vx:0,vy:0});g.cottageDoorLatch=false;g.mainlineSpeech=null;a.renderer.camera.time=null;},kind);await page.waitForFunction(kind=>a.game.cottage?.kind===kind,kind);}
 // 已验证的出口落点用于切换验收房间，不调用瞬间离开接口。
 async function leave(){await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/workshop-interiors.js')).interiorLayout(a.game.cottage).exit,{vx:0,vy:0}));await page.waitForFunction(()=>!a.game.cottage);}
 // 室内使用正式历法夜色，保持柜台和人物处于同一绘制路径。
 async function time(id){await page.evaluate(async id=>{a.game.progress.living.calendar.elapsed=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id).start;},id);await page.waitForTimeout(100);}
 try{
  await page.goto(original.url());await page.locator('#start').tap();await page.locator('#game-frame[data-page=game]').waitFor({timeout:60000});
  await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.coins=100000;p.vehicleHulls[6]=1;p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999;g.enemies=[];a.refresh();});
  for(const [kind,dialog,close] of [['weapons','workshop-dialog','ws-close'],['vehicle','workshop-dialog','ws-close'],['furniture','home-decor-dialog','home-close'],['seed','seed-shop-dialog','seed-shop-close'],['repair','vehicle-repair-dialog','vehicle-repair-close'],['fire','fire-dialog','fire-close'],['tower','realm-dialog','close-realm'],['legendary','legendary-dialog','legendary-close'],['relay','living-dialog','living-close'],['kitchen','living-dialog','living-close']]){
   await door(kind);await time('day');await shot(kind+'-day');await time('night');await shot(kind+'-night');
   if(['weapons','vehicle'].includes(kind)){await page.keyboard.down('ArrowUp');await page.waitForTimeout(1400);await page.keyboard.up('ArrowUp');if(!await page.evaluate(async()=>{const c=(await import('/src/config/workshop-interiors.js')).interiorCounter(a.game.cottage);return a.game.player.y>=c.y+28;}))throw Error('柜台可穿透 '+kind);await shot(kind+'-blocked');}
   await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#'+dialog+'[open]').waitFor();await shot(kind+'-service');await page.locator(kind==='fire'?'[data-fire-close]':'#'+close).first().tap();await page.waitForFunction(()=>a.game.state==='playing');await leave();
  }
  for(const [width,height] of [[320,568],[844,390],[900,1280]]){await page.setViewportSize({width,height});for(const kind of ['weapons','vehicle']){await door(kind);for(const id of ['day','night']){await time(id);await shot(kind+'-'+width+'-'+id);}if(!await page.locator('[data-room-item=shopkeeper]').isVisible()){await page.keyboard.down('ArrowUp');await page.waitForTimeout(700);await page.keyboard.up('ArrowUp');}await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#workshop-dialog[open]').waitFor();await shot(kind+'-'+width+'-service');await page.locator('#ws-close').tap();await page.waitForFunction(()=>a.game.state==='playing');await leave();}}
  if(errors.length)throw Error(errors.join('\n'));return {checks,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
