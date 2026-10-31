// 补查装备追踪、Boss切换、安全区恢复及载具昼夜同屏，使用正式DOM和绘制器。
async page=>{
 if(new URL(page.url()).port!=='4260')throw Error('仅使用隔离端口');
 const samples=[];await page.setViewportSize({width:390,height:900});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.enemies=[];g.boss=null;g.bossReady=false;g.wave=2;g.bossWave=4;g.waveRest=g.waveWarning=0;g.waveKills=0;g.waveSpawned=18;g.spawnTimer=999;g.attackTimer=999;g.player.invincible=999;g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});g.progress.equipmentGoal={kind:'vehicle',index:1};g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;g.vehicle=(await import('/src/combat/vehicle.js')).createVehicle(g.progress,g.maxHp(),0);g.vehicles[0]=g.vehicle;g.vehicle.active=true;a.refresh();});
 for(const phase of ['day','night']){
 await page.evaluate(async phase=>{const a=(await import('/src/main.js')).application;a.game.progress.living.calendar={day:1,elapsed:phase==='day'?400000:1100000};a.environment.autoWeather=false;a.environment.weather='sun';},phase);await page.waitForTimeout(21000);
 const sample=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.player.invincible=0;a.refresh();return (await import('/src/rendering/visual-review.js')).inspectWaveEncounterFlow(a.game,document);});if(!sample.goal||sample.goal.top<sample.wave.bottom+5)throw Error('装备条遮挡波次');samples.push({phase,...sample});await page.screenshot({path:'output/playwright/wave-encounter-flow/vehicle-'+phase+'.png'});
 }
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.player.invincible=999;g.bossReady=true;if(!g.summonBoss())throw Error('Boss未开始');a.refresh();});await page.waitForTimeout(250);
 const boss=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectWaveEncounterFlow(a.game,document);});if(!boss.boss||boss.boss.top<boss.task.bottom+5||boss.goal.top<boss.boss.bottom+5)throw Error('Boss与任务/装备遮挡');samples.push({boss});await page.screenshot({path:'output/playwright/wave-encounter-flow/boss-goal.png'});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.boss=null;g.bossReady=false;Object.assign(g.player,{x:700,y:700});a.refresh();});await page.waitForTimeout(250);
 const safe=await page.evaluate(()=>({waveHidden:document.getElementById('quest').hidden,top:document.getElementById('quest').style.top}));if(!safe.waveHidden||safe.top)throw Error('安全区波次或布局未恢复');samples.push({safe});return samples;
}
