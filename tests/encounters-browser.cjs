// 隔离存档实机验收；节点和末击使用显式夹具，移动、出生、攻击和按钮走正式运行时。
async(page)=>{
 if(new URL(page.url()).port!=='4228')throw Error('仅允许隔离测试端口4228');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:900});
 await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();
 await page.locator('#start').click();
 await page.evaluate(async()=>{
  window.encApp=(await import('/src/main.js')).application;await encApp.ready;
  const g=encApp.game,{waveDifficulty}=await import('/src/config/waves.js');
  g.enemies=[];g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.waveWarning=0;g.updateWaves(.01);
  g.player.invincible=999;g.encounterTimer=4;g.attackTimer=999;encApp.refresh();
 });
 const initial=await page.evaluate(()=>({x:encApp.game.player.x,y:encApp.game.player.y,wave:encApp.game.wave,kills:encApp.game.waveKills}));
 // 实机帧率会限制累计游戏时间；沿营地道路往返，直到正式四秒移动计时结束。
 for(let i=0;i<8;i++){
  const key=i%2?'a':'d';await page.keyboard.down(key);await page.waitForTimeout(2500);await page.keyboard.up(key);
  if(await page.evaluate(()=>encApp.game.encounterSpawned>0))break;
 }
 const moved=await page.evaluate(()=>({x:encApp.game.player.x,y:encApp.game.player.y,count:encApp.game.encounterSpawned,timer:encApp.game.encounterTimer,state:encApp.game.state}));
 if(moved.count<1||Math.hypot(moved.x-initial.x,moved.y-initial.y)<1)throw Error('真实移动未触发遭遇 '+JSON.stringify(moved));
 await page.waitForTimeout(1800);
 const stopped=await page.evaluate(()=>({count:encApp.game.encounterSpawned,timer:encApp.game.encounterTimer,kills:encApp.game.waveKills,ready:encApp.game.bossReady}));
 if(stopped.count!==moved.count||stopped.timer!==moved.timer||stopped.kills!==initial.kills||!stopped.ready)throw Error('停止或波次隔离失败');
 // 用靠近镜头的低血遭遇怪验证正常自动射击结算，保留身份与正式攻击流程。
 await page.evaluate(()=>{const g=encApp.game,e=g.enemies.find(e=>e.ambient);e.x=g.player.x+100;e.y=g.player.y;e.hp=1;g.attackTimer=0;});
 await page.waitForFunction(()=>encApp.game.kills>0);
 if(!await page.evaluate(k=>encApp.game.waveKills===k,initial.kills))throw Error('遭遇击杀污染波次');
 // 建立并存场景检查昼夜和窄屏，复用原怪物绘制，没有新增美术。
 await page.evaluate(async()=>{const g=encApp.game,{updateEncounters}=await import('/src/core/encounter-manager.js');g.encounterTimer=0;updateEncounters(g,.1,true);g.attackTimer=999;g.player.invincible=999;});
 for(const [width,height,time] of [[1280,900,'day'],[390,844,'night']]){
  await page.setViewportSize({width,height});
  await page.evaluate(async time=>{const a=encApp;Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-20000);a.renderer.draw();a.refresh();},time);
  await page.waitForTimeout(350);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('页面水平溢出');
  await page.screenshot({path:`output/playwright/encounters/${width}-${time}.png`});
 }
 const retained=await page.evaluate(()=>encApp.game.enemies.filter(e=>e.ambient&&e.hp>0).map(e=>e.id));
 await page.locator('#boss-button').click();await page.waitForFunction(()=>!!encApp.game.boss);
 if(!await page.evaluate(ids=>ids.length>0&&ids.every(id=>encApp.game.enemies.some(e=>e.id===id)),retained))throw Error('开战不应清退已有怪物');
 // 末击夹具只验证衔接；下一组继续波次刷怪，移动也不增加随机遭遇。
 await page.evaluate(()=>{const g=encApp.game;g.hit(g.boss,1e9);g.attackTimer=999;g.encounterTimer=.1;encApp.refresh();});
 await page.waitForFunction(()=>encApp.game.enemies.some(e=>e.hp>0&&e.wave===encApp.game.wave));
 const beforeWaveMove=await page.evaluate(()=>({count:encApp.game.encounterSpawned,timer:encApp.game.encounterTimer}));
 await page.keyboard.down('a');await page.waitForTimeout(800);await page.keyboard.up('a');
 const coexist=await page.evaluate(()=>({wave:encApp.game.enemies.filter(e=>e.hp>0&&e.wave===encApp.game.wave).length,ambient:encApp.game.enemies.filter(e=>e.hp>0&&e.ambient).length,quota:encApp.game.waveSpawned,count:encApp.game.encounterSpawned,timer:encApp.game.encounterTimer}));
 if(!coexist.wave||coexist.count!==beforeWaveMove.count||coexist.timer!==beforeWaveMove.timer)throw Error('波次期间仍在随机刷怪 '+JSON.stringify(coexist));
 await page.screenshot({path:'output/playwright/encounters/coexist.png'});
 if(errors.length)throw Error(errors.join('\n'));
 return {passed:true,initial,moved,stopped,coexist,errors};
}
