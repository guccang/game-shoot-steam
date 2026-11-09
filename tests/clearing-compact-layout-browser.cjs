// 精简生命卡的三路弹药边界检查，使用隔离存档，确保新增详情入口不挤出原控件。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage(),samples=[];
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   p.weapon=(await import('/src/config/weapons.js')).WEAPONS.findIndex(w=>w.independentSupply);p.weapons[p.weapon]=1;p.living.patrolActive=true;p.living.clearingNotice='seen';
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.update=()=>{};const site=(await import('/src/progression/story/clearing-site.js')).clearingSite(p);Object.assign(g.player,{x:site.x,y:site.y});a.renderer.camera.time=null;a.refresh();
  });
  for(const [width,height] of [[320,568],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(200);
   const state=await page.evaluate(()=>{
    const hp=document.querySelector('.player-hud').getBoundingClientRect(),help=document.getElementById('wave-help').getBoundingClientRect(),health=document.getElementById('player-health').getBoundingClientRect(),ammo=document.querySelector('.combat-instruments').getBoundingClientRect();
    return {hp:hp.toJSON(),help:help.toJSON(),health:health.toJSON(),ammo:ammo.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   await page.screenshot({path:`output/playwright/clearing-compact-hud/funnel-${width}.png`});samples.push({width,...state});
   if(state.overflow||state.health.width<40||state.ammo.right>state.hp.right||state.ammo.bottom>state.hp.bottom||state.health.right>state.ammo.left&&state.health.bottom>state.ammo.top||state.help.x<state.hp.right)throw Error('三路弹药挤压HP或详情入口 '+JSON.stringify(state));
  }
  return {samples};
 }finally{await context.close();}
}
