// 补充小屋附近真实泊车、绕行和载具/怪物/持枪角色同屏证据。
async page=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{
    const g=a.game;g.cottage=null;g.cottageDoorLatch=false;g.cottageEntry=null;g.enemies=[];g.mainlineSpeech=null;
    g.progress.campParking.owned=g.progress.campParking.owned.filter(r=>r.hull!==0&&r.spot!=='cottage');g.parking=null;g.player.parkingBarriers=[];
    g.spawnTimer=g.fireClock=g.attackTimer=999;g.update=originalUpdate;g.state='playing';
    Object.assign(g.player,{x:850,y:455,vx:0,vy:0});g.vehicle.active=true;g.vehicle.index=0;a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('#nearby-interaction[data-interaction="parking"]').click();
  await page.waitForFunction(()=>a.game.parking?.phase==='parked',null,{timeout:10000});
  if(await page.evaluate(()=>a.game.vehicle.active||!!a.game.cottage))throw Error('停车后未留在室外下车');
  const walks=[];
  // 直接按键沿左右外侧、屋后和屋前行走，保留正式碰撞、持枪和腿部动画。
  for(const [x,y,key] of [[745,310,'ArrowUp'],[950,190,'ArrowDown'],[810,155,'ArrowRight'],[790,320,'ArrowRight']]){
    await page.evaluate(({x,y})=>{Object.assign(a.game.player,{x,y,vx:0,vy:0});a.game.cottageDoorLatch=false;}, {x,y});
    await page.keyboard.down(key);await page.waitForTimeout(650);await page.keyboard.up(key);
    const p=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
    if(Math.hypot(p.x-x,p.y-y)<15)throw Error('建筑附近行走受阻：'+JSON.stringify({x,y,key,p}));walks.push(p);
  }
  await page.evaluate(()=>{
    const g=a.game;g.update=()=>{};Object.assign(g.player,{x:912,y:355,vx:0,vy:0});
    g.spawnEnemy(0,0,{x:980,y:340},{ambient:true});g.spawnEnemy(1,0,{x:1020,y:390},{ambient:true});
    a.renderer.seasons.reset('summer',performance.now());Object.assign(a.environment,{forestSeason:'summer'});a.renderer.camera.time=null;
  });
  for(const time of ['day','night']){
    await page.evaluate(async time=>{
      Object.assign(a.environment,{time});a.game.progress.living.calendar.elapsed=time==='day'?400000:1100000;
      a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);
      a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.refresh();
    },time);
    await page.waitForTimeout(400);await page.screenshot({path:`docs/art-reference/cozy-cottage/company-${time}.png`});
  }
  if(errors.length)throw Error(errors.join('\n'));return {parking:'实际点击泊车并下车通过',walks,errors};
}
