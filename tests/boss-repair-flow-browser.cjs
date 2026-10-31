// 旧屋与自由修复实机验收：默认4175；已有服务占用时可对隔离worktree使用4176。
async page=>{
 if(!['4175','4176'].includes(new URL(page.url()).port))throw Error('请使用本地游戏验收端口');
 const errors=[],samples=[];page.on('pageerror',error=>errors.push(error.message));
 await page.evaluate(()=>localStorage.clear());await page.reload();
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
  const g=a.game;g.progress=(await import('/src/progression/progress.js')).freshProgress();g.progress.wood=20;g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.progress.weapon=0;
  g.reset();g.state='playing';g.arrivalScene=null;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.attackTimer=g.fireClock=999;
  window.normalUpdate=g.update.bind(g);g.update=()=>{};window.facilities=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
  Object.assign(a.environment,{livingPreview:true,weather:'sun',autoSeason:false,autoTime:false,autoWeather:false,time:'day',forestSeason:'summer'});a.refresh();
 });
 // 正式房屋与角色、车辆、怪物同屏；冻结逻辑只用于同机位对照，不替代后续真实走位。
 for(const time of ['day','night'])for(const [width,height] of [[320,568],[390,844],[1280,800]]){
  await page.setViewportSize({width,height});
  for(const id of ['cottage','garage','fire']){
   await page.evaluate(async({time,id})=>{
    const g=a.game,f=facilities.find(f=>f.id===id);g.progress.wood=20;g.mainlineSpeech=null;g.vehicle.active=false;g.player.flying=g.player.amphibious=false;
    Object.assign(g.player,{x:f.site.x,y:f.site.y+55,vx:0,vy:0});g.enemies=[];g.spawnEnemy(0,0,{x:g.player.x+95,y:g.player.y+25},{ambient:true});
    g.summonVehicle();g.attackTimer=g.fireClock=999;
    g.progress.living.calendar={day:1,elapsed:time==='day'?400000:1100000};Object.assign(a.environment,{time});
    a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);
    a.renderer.camera.time=null;a.refresh();
   },{time,id});
   await page.mouse.move(5,height-5);
   await page.waitForTimeout(250);
   const s=await page.evaluate(async()=>{a.refresh();return (await import('/src/rendering/visual-review.js')).inspectWeatheredHouses(a.game,document);});
   if(s.overflow||!s.hint?.text.includes('木头 20/')||!s.hint.text.includes('点击修复')||s.hint.rect.width>200||s.hint.rect.height<44)throw Error(JSON.stringify({id,width,time,s}));
   if(await page.locator('#operation-guide').isVisible())throw Error('主线引导不应盖住自选修复提示');
   samples.push({id,width,time,hint:s.hint});await page.screenshot({path:`output/playwright/boss-repair-flow/${id}-${width}-${time}.png`});
  }
 }
 // 实际点击附近按钮查看未来修复设施，窄屏显示资源、方法及独立导航。
 await page.setViewportSize({width:320,height:568});
 await page.evaluate(()=>{const f=facilities.find(f=>f.id==='cottage'),g=a.game;g.vehicle.active=false;Object.assign(g.player,{x:f.site.x,y:f.site.y+55});g.mainlineSpeech=null;g.enemies=[];a.renderer.camera.time=null;a.refresh();});
 await page.locator('#nearby-interaction').click();await page.locator('#restoration-dialog').waitFor({state:'visible'});
 const summary=await page.locator('#restoration-summary').textContent();if(!summary.includes('不受主线顺序限制')||!summary.includes('20 / 80')||!summary.includes('还差 60'))throw Error(summary);
 await page.screenshot({path:'output/playwright/boss-repair-flow/repair-panel-320.png'});
 await page.locator('#restoration-go').click();
 const route=await page.evaluate(async()=>(await import('/src/core/world-navigation.js')).worldNavigationObjective(a.game));if(route?.key!=='visit'||!route.label.includes('采集木头'))throw Error('自选修复采木导航错误');
 // 由真实移动进入范围，完整施工后不重复收费，在已修复小屋门前站定能够进屋。
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const f=facilities.find(f=>f.id==='cottage'),g=a.game;g.progress.wood=80;g.progress.weapon=0;g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.attackTimer=g.fireClock=999;Object.assign(g.player,{x:f.x-160,y:f.y+55,vx:0,vy:0});g.update=normalUpdate;a.renderer.camera.time=null;a.refresh();});
 await page.keyboard.down('ArrowRight');try{await page.waitForFunction(()=>a.game.progress.restoration.build?.id==='cottage',null,{timeout:15000});}finally{await page.keyboard.up('ArrowRight');}
 await page.screenshot({path:'output/playwright/boss-repair-flow/repair-start.png'});
 await page.waitForFunction(()=>a.game.progress.restoration.repaired.includes('cottage'));
 const after=await page.evaluate(()=>{a.game.update=()=>{};return {wood:a.game.progress.wood,repaired:a.game.progress.restoration.repaired};});if(after.wood!==0)throw Error('修复扣费错误 '+JSON.stringify(after));
 await page.screenshot({path:'output/playwright/boss-repair-flow/repaired-cottage.png'});
 await page.evaluate(()=>{const g=a.game,site=facilities.find(f=>f.id==='cottage').site;Object.assign(g.player,{x:site.x,y:site.y+20,vx:0,vy:0});g.cottageDoorLatch=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.update=normalUpdate;a.refresh();});await page.waitForFunction(()=>a.game.cottage?.kind==='cottage');await page.evaluate(()=>{a.game.update=()=>{};});
 // 前、后、侧面实际步行录制，正式碰撞及遮挡不替换。
 await page.evaluate(async()=>{const g=a.game;(await import('/src/core/cottage.js')).leaveCottage(g);g.progress.restoration.repaired=g.progress.restoration.repaired.filter(id=>id!=='cottage');g.progress.wood=0;g.mainlineSpeech=null;g.mainlineTalkDelay=999;const f=facilities.find(f=>f.id==='cottage');Object.assign(g.player,{x:f.x-140,y:f.y+65,vx:0,vy:0});g.update=normalUpdate;a.renderer.camera.time=null;a.refresh();});
 const path=[];
 for(const [key,ms,label] of [['ArrowRight',1300,'front'],['ArrowUp',1700,'side'],['ArrowLeft',1300,'back']]){
  const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);
  const after=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));const moved=Math.hypot(after.x-before.x,after.y-before.y);if(moved<5)throw Error('绕行被堵住 '+label);path.push({label,moved});await page.screenshot({path:`output/playwright/boss-repair-flow/walk-${label}.png`});
 }
 await page.evaluate(()=>{a.game.update=()=>{};});
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'weathered-houses',samples,repair:after,path,errors};
}
