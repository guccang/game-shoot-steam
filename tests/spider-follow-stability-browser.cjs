// 正式森林键盘/触摸行走，检查母体近身减速、小蛛收步及手持/车载独立编队。
async page=>{
 if(new URL(page.url()).port!=='4214')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(!await a.ready)throw Error('正式素材缺失');window.spiderApp=a;});
 const scenes=[];
 for(const width of [1280,390,320])for(const time of ['day','night']){
  await page.setViewportSize({width,height:width===1280?960:844});
  await page.evaluate(async time=>{
   const a=spiderApp,g=a.game,{freshProgress,validateProgress}=await import('/src/progression/progress.js'),{updateSpider}=await import('/src/combat/spider.js'),{vehicleCompanionContext}=await import('/src/combat/vehicle-companions.js');
   const p=freshProgress();p.weapons.fill(1);p.weapon=16;p.weaponParts[16].coordination=13;p.vehicleWeapons[16]=1;p.turretParts[16].coordination=13;p.vehicleHulls[0]=1;p.vehicleIndex=0;p.vehicleLoadouts[0]=16;
   if(time==='night')p.weapon=0;g.progress=validateProgress(p);g.reset();g.start();g.updateWaves=()=>{};g.waveWarning=0;g.enemies=[];g.boss=null;Object.assign(g.player,{x:1150,y:950,invincible:0});g.trees=g.trees.filter(t=>Math.hypot(t.x-1050,t.y-1050)>470);
   if(time==='night')g.summonVehicle();
   const local=time==='night'?vehicleCompanionContext(g):g;window.spiderLocal=local;
   for(let i=0;i<2700;i++){local.magazines[16].ammo=100;updateSpider(local,1/60);}
   const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');
   Object.assign(a.environment,{time,weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false});a.renderer.light=new EnvironmentTransition(a.environment);a.renderer.tone=new SceneTone(a.environment);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();
   window.spiderMetrics={frames:0,switches:0};const original=g.update;
   g.update=function(dt,input){const m=spiderLocal.spider.mother,before=m.moving;original.call(this,dt,input);if(dt>0&&this.state==='playing'){spiderMetrics.frames++;if(spiderMetrics.frames>45&&before!==m.moving)spiderMetrics.switches++;}};
   window.spiderOriginalUpdate=original;
  },time);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(2100);
  await page.screenshot({path:`output/playwright/spider-follow/moving-${width}-${time}.png`});await page.keyboard.up('ArrowLeft');
  const motion=await page.evaluate(()=>({...spiderMetrics,position:{x:spiderApp.game.player.x,y:spiderApp.game.player.y}}));
  await page.keyboard.down('ArrowDown');await page.waitForTimeout(550);await page.keyboard.up('ArrowDown');await page.waitForTimeout(1600);
  await page.screenshot({path:`output/playwright/spider-follow/settled-${width}-${time}.png`});
  const review=await page.evaluate(async()=>{const g=spiderApp.game;g.update=spiderOriginalUpdate;return (await import('/src/rendering/visual-review.js')).inspectSpiderFollow(spiderLocal);});
  if(review.nodes.length!==21)throw Error('满编未完整进入正式场景');scenes.push({width,time,motion,review,canvases:await page.locator('canvas').count()});
 }
 // 手机触摸急转与减少动态不改运动规则；原森林树干仍参与碰撞。
 const box=await page.locator('canvas').first().boundingBox(),cdp=await page.context().newCDPSession(page),x=box.x+box.width*.35,y=box.y+box.height*.7;
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y:y-20}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(900);await page.screenshot({path:'output/playwright/spider-follow/reduced-touch.png'});
 // 同屏加入真实可攻击敌人，确认归队改动没有替换近战/脉冲攻击。
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{const g=spiderApp.game,e=g.spawnEnemy(0,0,{x:g.player.x+90,y:g.player.y+30});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});});await page.waitForTimeout(1400);
 await page.screenshot({path:'output/playwright/spider-follow/combat-320-night.png'});
 if(errors.length)throw Error(errors.join('\n'));return {scenes,errors,touch:true};
}
