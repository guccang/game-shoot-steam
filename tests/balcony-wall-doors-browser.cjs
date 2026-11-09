// 手机短按四面墙门，检查真实走近、候停、返回楼层及一楼独立出屋路径。
async page=>{
 await page.goto('http://localhost:4175');await page.locator('#start').tap();
 await page.evaluate(async()=>{
  window.a=(await import('/src/main.js')).application;await a.ready;
  const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(v=>v.id);
  p.homeDecor.balconies[0]=p.homeDecor.balconies[1]=['north','south','east','west'];
  p.homeDecor=(await import('/src/progression/home/home-decor.js')).normalizeHome(p.homeDecor,p.living.calendar);
  g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.vehicle.active=false;
  Object.assign(g.player,(await import('/src/config/cottage.js')).COTTAGE.door);
  if(!(await import('/src/core/home/cottage.js')).enterCottage(g))throw Error('入屋失败');
  g.cottage.floor=1;a.refresh();
 });
 for(const [side,width,height,time] of [['north',390,844,'day'],['east',320,568,'night'],['west',580,844,'day'],['south',390,844,'day']]){
  await page.setViewportSize({width,height});
  await page.evaluate(async({side,time})=>{
   const g=a.game;const phase=(await import('/src/config/living-world.js')).LIVING_PHASES.find(s=>s.id===time);
   g.progress.living.calendar.elapsed=phase.start+10;
   const door=(await import('/src/config/home-construction.js')).HOME_DIRECTIONS[side].door;
   Object.assign(g.player,{x:(240+door.x)/2,y:(310+door.y)/2,vx:0,vy:0});
   if(side==='south')g.cottage.floor=0;
   a.refresh();
  },{side,time});
  await page.waitForTimeout(250);
  await page.screenshot({path:`output/balcony-doors/${side}-${width}.png`});
  const button=page.locator(`[data-cottage-target="balcony-${side}"]`);await button.tap({timeout:3500});
  await page.waitForFunction(side=>a.game.cottage?.balcony===side,side,{timeout:8000});
  await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).HOME_BALCONY.exit,{vx:0,vy:0}));
  await page.waitForFunction(()=>a.game.cottage&&!a.game.cottage.balcony);
 }
 await page.evaluate(async()=>Object.assign(a.game.player,(await import('/src/config/home-construction.js')).cottageStreetExit(a.game.progress.homeDecor)));
 await page.waitForFunction(()=>!a.game.cottage);return true;
}
