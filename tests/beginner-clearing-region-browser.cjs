// 浏览器回归：新档初始手枪从告示牌接取，步行到场并检查五波实际生成等级。
async page=>{
 if(new URL(page.url()).port!=='4289')throw Error('仅限隔离验收端口4289');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  (await import('/src/main.js')).application.destroy();
  const p=(await import('/src/progression/progress.js')).freshProgress();
  p.arrival={version:2,phase:'complete',keys:true};p.living.position={x:810,y:965};
  localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));
 });
 await page.reload();await page.locator('#start').click();
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;a.game.update=()=>{};a.game.mainlineSpeech=null;a.renderer.camera.time=null;a.refresh();});
 await page.locator('#clearing-marker').click();
 const status=await page.locator('#clearing-status').innerText();
 if(!status.includes('营地草甸 600–1300'))throw Error('首轮范围文案不正确');
 await page.locator('#clearing-accept').click();
 await page.waitForFunction(()=>a.game.state==='playing');
 const result=await page.evaluate(async()=>{
  const g=a.game,s=g.progress.living.clearingSite;
  const {planQuestRoute}=await import('/src/physics/quest-route.js'),{moveBody}=await import('/src/physics/motion.js');
  const {worldDistance,WORLD}=await import('/src/world/coordinates.js'),{biomeAt}=await import('/src/world/biomes.js');
  if(!s||biomeAt(s.x,s.y).id!=='meadow')throw Error('首轮地点不在草甸');
  const route=planQuestRoute({...g.player,mapId:'forest',livingCollision:true},s,g.trees,16000);
  if(!route.reachable)throw Error('无法步行到达');
  for(const p of route.points.slice(1)){
   const dx=p.x-g.player.x,dy=p.y-g.player.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));
   for(let i=0;i<n;i++){
    moveBody(g.player,dx/n,dy/n,WORLD,12,g.trees);
    if(biomeAt(g.player.x,g.player.y).id!=='meadow')throw Error('导航穿过高等级区');
   }
   if(worldDistance(g.player,p)>1)throw Error('实际移动被碰撞阻断');
  }
  const waves={};let first=null;
  for(let i=0;i<600&&!g.boss;i++){
   g.updateWaves(.5);
   for(const enemy of g.enemies.filter(e=>e.hp>0)){
    if(enemy.level!==1)throw Error(`错误等级 ${enemy.level}`);
    first??={level:enemy.level,hp:enemy.hp,damage:enemy.damage};
    waves[g.wave]=(waves[g.wave]||0)+1;g.hit(enemy,1e9);
   }
  }
  if(!g.boss||Object.keys(waves).length!==5)throw Error('五波未完整结束');
  return {site:s,distance:Math.round(worldDistance(s,s.origin)),routePoints:route.points.length,first,waves,bossHp:g.boss.maxHp,ownedWeapons:g.progress.weapons};
 });
 if(errors.length)throw Error(errors.join('\n'));
 return {status,...result,errors};
}
