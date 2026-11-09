// 四类鱼从实际本湖概率池选出，实机验证预告、动作、暂停与地下换层调查隔离。
async original=>{
 const out='output/playwright/lake-ecology-surveys',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/behaviors-video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 // 在真实运行时推进控线动作，截图前后继续由正式绘制器渲染。
 async function advance(seconds){await page.evaluate(seconds=>{const g=a.game;for(let t=0;t<seconds&&g.fishing?.phase==='fight';t+=.04){const f=g.fishing;o.fishingControl(g,'lean',-(f.direction||1));o.fishingControl(g,f.tension>.7?'release':f.tension<.4?'press':f.reeling?'press':'release');g.update(.04);}a.refresh();},seconds);}
 try{
  await page.goto(new URL(original.url()).origin);await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.o=await import('/src/core/activities/outdoors.js');window.lf=await import('/src/core/fishing/lake-fishing.js');window.struggle=await import('/src/config/fish-struggles.js');window.sites=await import('/src/world/outdoor-sites.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.outdoors.rods.star=true;p.outdoors.selectedRod='star';p.outdoors.bait=50;p.homeDecor.basement=true;(await import('/src/progression/mining/mining.js')).openBasement(p.mining);p.mining.seed=1847;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=999999;g.enemies=[];g.boss=null;g.progress.living.patrolActive=false;
  });
  for(const kind of ['gentle','sprint','heavy','weave']){
   await page.evaluate(kind=>{
    const g=a.game;g.mapId=kind==='weave'?'jiuzhaigou':'forest';g.fishing=null;let found;
    for(const s of sites.fishingShores(g)){Object.assign(g.player,{x:s.x,y:s.y});if(lf.fishingPreview(g).odds.some(e=>struggle.fishStruggleKind(e.fish)===kind)){found=s;break;}}if(!found)throw Error('缺少习性湖泊 '+kind);
    // 随机源只挑选正式概率区间；没有直接改鱼种或上岸状态。
    g.random=()=>{const odds=g.fishing?.odds||[];let point=0;for(const e of odds){if(struggle.fishStruggleKind(e.fish)===kind)return point+e.probability/2;point+=e.probability;}return .4;};
    const r=o.beginFishing(g);if(!r.ok)throw Error(r.message);o.fishingControl(g,'press');g.update(.5);o.fishingControl(g,'release');
    for(let i=0;i<300&&g.fishing?.phase!=='bite';i++)g.update(.04);if(g.fishing?.phase!=='bite')throw Error('未到咬钩');o.fishingControl(g,'press');a.renderer.camera.time=null;a.refresh();
   },kind);
   await advance(kind==='sprint'?1.4:kind==='heavy'?2:1);
   const detail=await page.evaluate(async()=>{const f=a.game.fishing,report=await(await import('/src/rendering/visual-review.js')).inspectLakeEcologySurveys(a.game,a.renderer);return {kind:f.behavior.kind,message:f.message,motion:f.behavior.motion,phase:f.phase,criterion:report.designCriterion};});if(detail.kind!==kind)throw Error('习性与实钓鱼不同');results.push(detail);
   await page.screenshot({path:out+'/behavior-'+kind+'.png'});await advance(.8);await page.waitForTimeout(200);await page.screenshot({path:out+'/behavior-'+kind+'-next.png'});
   await page.evaluate(()=>{a.game.state='paused';});const before=await page.evaluate(()=>JSON.stringify(a.game.fishing));await page.waitForTimeout(220);if(before!==await page.evaluate(()=>JSON.stringify(a.game.fishing)))throw Error('暂停未冻结挣扎');await page.evaluate(()=>{a.game.state='playing';});await advance(58);if(await page.evaluate(()=>a.game.fishing?.phase)!=='landed')throw Error('习性无法钓上岸 '+kind);await page.locator('[data-fish-release]').tap();
  }
  // 准备已建第二层，正式经过坡道往返；地质相同的位置不能混算两层委托。
  await page.evaluate(async()=>{
   const g=a.game,{MINING}=await import('/src/config/mining.js'),{WORLD}=await import('/src/world/coordinates.js');g.mapId='forest';g.cottage={kind:'cottage',floor:0,outside:MINING.home};Object.assign(g.player,MINING.hatch.goal);(await import('/src/core/mining/mining.js')).enterMine(g);g.cottage.scanWait=g.cottage.hurtWait=99999;
   const layer=g.progress.mining;layer.descent=layer.entry;layer.layers[2]={...structuredClone(layer),bounds:{left:0,top:0,right:WORLD.width*.5,bottom:WORLD.height*.5},coverage:25};delete layer.layers[2].layers;
   const {mineFishingShore}=await import('/src/world/mine-fishing.js'),fish=(await import('/src/world/ambient-fish.js')).mineAmbientFish(layer,{x:0,y:0,w:1800,h:1800},0);let bank;
   outer:for(const f of fish)for(let r=48;r<=200;r+=12)for(let i=0;i<24;i++){Object.assign(g.player,{x:f.x+Math.cos(i*Math.PI/12)*r,y:f.y+Math.sin(i*Math.PI/12)*r});if(mineFishingShore(g)){bank={x:g.player.x,y:g.player.y};break outer;}}if(!bank)throw Error('无地下岸点');
   if(!o.acceptFishingSurvey(g).ok)throw Error('地下接单失败');window.mineBank=bank;window.firstLake=lf.fishingPreview(g).lake.id;Object.assign(g.player,MINING.home);
   const travel=(await import('/src/core/mining/mine-layers.js')).travelMineLayer;if(!travel(g,1).ok)throw Error('坡道下行失败');g.cottage.scanWait=g.cottage.hurtWait=99999;Object.assign(g.player,bank);const second=lf.fishingPreview(g);if(!second.lake||second.lake.id===firstLake||second.lake.depth!==2)throw Error('两层湖身份相同');
   g.random=()=>.4;if(!o.beginFishing(g).ok)throw Error('地下二层不可钓');o.fishingControl(g,'press');g.update(.5);o.fishingControl(g,'release');for(let i=0;i<300&&g.fishing.phase!=='bite';i++)g.update(.04);o.fishingControl(g,'press');a.refresh();
  });await advance(1);await page.screenshot({path:out+'/mine-depth2-fight.png'});await advance(58);
  await page.evaluate(async()=>{const g=a.game;if(!o.finishFishing(g,true).ok)throw Error('二层收鱼失败');if(g.progress.outdoors.surveys.active.count!==0)throw Error('第二层误计第一层调查');const {MINING}=await import('/src/config/mining.js');Object.assign(g.player,MINING.home);if(!(await import('/src/core/mining/mine-layers.js')).travelMineLayer(g,-1).ok)throw Error('坡道上行失败');g.cottage.scanWait=g.cottage.hurtWait=99999;Object.assign(g.player,mineBank);if(lf.fishingPreview(g).lake.id!==firstLake)throw Error('往返湖身份变化');a.refresh();});
  if(errors.length)throw Error(errors.join('\n'));return {errors,results,checks:'四类正式鱼种挣扎、连续画面、暂停恢复、完整上岸及地下坡道往返与跨层调查隔离通过'};
 }catch(e){await page.screenshot({path:out+'/behaviors-failure.png'});throw e;}finally{await context.close();}
}
