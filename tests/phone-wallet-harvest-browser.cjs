// 钱包搬入手机后的收获落点回归，使用正式收割事务而非伪造收益事件。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.farm.lessonRewarded=true;p.farm.wildMaps=['forest','jiuzhaigou'];
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.update=()=>{};g.enemies=[];
   const {farmLandReason,snapFarmPoint,farmApproach}=await import('/src/world/farm-land.js');
   for(let y=400;y<1200&&!window.site;y+=52)for(let x=1500;x<2600&&!window.site;x+=56){const point=snapFarmPoint({x,y},'forest');if(!farmLandReason(g,point)&&farmApproach(g,point))window.site=point;}
   if(!site)throw Error('未找到合法农田');Object.assign(g.player,{x:site.x,y:site.y+50});a.renderer.camera.time=null;a.refresh();
  });await page.waitForTimeout(150);
  const result=await page.evaluate(async()=>{
   const g=a.game,now=Date.now(),before=g.progress.coins;g.progress.farm.plots=[{...site,id:0,mapId:'forest',crop:0,plantedAt:now-500000,readyAt:now-1000,watered:false}];g.progress.farm.nextId=1;
   const harvested=(await import('/src/core/farming/farm.js')).farmAction(g,'harvest',{plot:0});if(!harvested.ok)throw Error(harvested.message);a.farm.render();
   const animation=document.querySelector('.farm-coin-flight').getAnimations()[0],end=animation.effect.getKeyframes().at(-1).transform,match=end.match(/translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)/);
   animation.playbackRate=0;animation.currentTime=120;
   return {coins:g.progress.coins-before,reward:harvested.coins,duration:animation.effect.getTiming().duration,dx:Number(match?.[1]),dy:Number(match?.[2]),expectedDy:50*a.renderer.view.zoom,walletHidden:document.querySelector('[data-coins]').getBoundingClientRect().width===0};
  });
  if(!result.walletHidden||result.coins!==result.reward||result.duration!==360||!Number.isFinite(result.dx)||!Number.isFinite(result.dy)||Math.abs(result.dx)>.01||Math.abs(result.dy-result.expectedDy)>.01)throw Error('收获反馈落点错误 '+JSON.stringify(result));
  await page.screenshot({path:'output/playwright/phone-wallet/harvest.png'});
  await page.evaluate(()=>document.querySelector('.farm-coin-flight').getAnimations()[0].playbackRate=1);await page.waitForFunction(()=>!document.querySelector('.farm-coin-flight'));
  return {designCriterion:'phone-wallet',result};
 }finally{await context.close();}
}
