// 独立内存试玩的真实输入、昼夜、分层与资源验收；不替换游戏更新或绘制函数。
async page=>{
 const root='C:/Users/zhengtingjun/.codex/worktrees/art-style-options/game-shoot/output/playwright/idle-cat-pine-v2/';
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:root,size:{width:390,height:844}}});
 const p=await context.newPage(),errors=[],samples=[];p.on('pageerror',e=>errors.push(e.message));
 try{
 await p.goto('http://localhost:4176/?artPreview=idle-cat-pine');
 await p.waitForFunction(()=>document.getElementById('vehicle-button')?.getAttribute('aria-pressed')==='true',{},{timeout:60000});
 await p.evaluate(async()=>{window.a=(await import('/src/main.js')).application;window.inspect=()=>import('/src/rendering/visual-review.js').then(m=>m.inspectIdleCatPine(a.renderer,document));});
 const storageBefore=await p.evaluate(()=>JSON.stringify({...localStorage}));
 // 正式快捷按钮上下车；不直接改active字段冒充交互。
 await p.locator('#vehicle-button').tap();await p.waitForFunction(()=>!a.game.vehicle.active);
 await p.locator('#vehicle-button').tap();await p.waitForFunction(()=>a.game.vehicle.active);
 await p.evaluate(()=>{const g=a.game;Object.assign(g.player,{x:1000,y:830,vx:0,vy:0});g.enemies=[];g.spawnTimer=999;g.mainlineSpeech=null;a.renderer.camera.time=null;});
 const before=await p.evaluate(()=>inspect());await p.keyboard.down('ArrowRight');await p.waitForTimeout(350);await p.keyboard.up('ArrowRight');await p.waitForTimeout(550);
 const moved=await p.evaluate(()=>inspect());if(moved.player.x<=before.player.x||moved.vehicle.wheelPhase===before.vehicle.wheelPhase)throw Error('实际移动未带动车轮');
 const stopped=moved.vehicle.wheelPhase;await p.waitForTimeout(220);if(Math.abs((await p.evaluate(()=>a.game.vehicle.wheelPhase))-stopped)>1e-5)throw Error('停止后车轮空转');
 // 窄屏触摸摇杆通过浏览器触摸事件进入正式输入系统。
 const cdp=await context.newCDPSession(p),canvas=await p.locator('#game').boundingBox(),x=canvas.x+canvas.width*.27,y=canvas.y+canvas.height*.65;
 const touchBefore=await p.evaluate(()=>a.game.player.y);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-60}]});await p.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 if(await p.evaluate(()=>a.game.player.y)>=touchBefore)throw Error('触摸未驱动战车');
 // 设置弹窗真实暂停动作时钟，关闭继续，不重置轮角。
 await p.locator('#settings-button').tap();const pause=await p.evaluate(()=>({phase:a.game.vehicle.wheelPhase,time:a.game.time}));await p.waitForTimeout(220);
 if(!await p.evaluate(v=>a.game.time===v.time&&a.game.vehicle.wheelPhase===v.phase,pause))throw Error('设置暂停未冻结动作');await p.locator('#close-settings').tap();
 // 目标仅作为验收夹具提高生命；瞄准、弹道、后坐与供弹全部由正式战斗推进。
 await p.evaluate(()=>{const g=a.game;Object.assign(g.player,{x:1030,y:800,vx:0,vy:0});const e=g.spawnEnemy(0,0,{x:1130,y:845});Object.assign(e,{hp:100000,maxHp:100000,speed:0,damage:0});a.renderer.camera.time=null;window.shotStart=g.vehicle.module.magazine.ammo;});
 await p.waitForFunction(()=>a.game.vehicle.module.magazine.ammo<shotStart,{},{timeout:6000});
 await p.waitForFunction(()=>a.game.vehicle.recoil.kick>.01,{},{timeout:4000});const firing=await p.evaluate(()=>inspect());
 await p.screenshot({path:root+'firing-390.png'});
 // 顶部时段按钮使用现有15秒光照过渡，完整过渡另由idle-cat-night-browser录制。
 await p.locator('#time-picture').tap();await p.waitForTimeout(700);await p.locator('#time-picture').tap();
 await p.waitForFunction(()=>a.environment.time==='night');await p.waitForTimeout(1000);
 const transition=await p.evaluate(()=>a.renderer.light.sample(performance.now()));
 // 静态端点截图直接令已有过渡器采样目标；不替换任何绘制器或素材。
 for(const width of [390,320,1100])for(const time of ['day','night']){
  await p.setViewportSize({width,height:width===320?568:844});
  await p.evaluate(async time=>{document.querySelector(`button[data-time="${time}"]`).click();a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.seasons.reset('summer');a.renderer.camera.time=null;a.refresh();},time);
  await p.waitForTimeout(250);await p.screenshot({path:root+`field-${width}-${time}.png`});
  const sample=await p.evaluate(()=>inspect());if(sample.overflow||sample.time!==time)throw Error('昼夜或小屏布局不正确');samples.push({width,...sample});
 }
 // 麦田仍是独立行，前后位置各留同屏证据；不改变麦田或玩家碰撞。
 await p.setViewportSize({width:390,height:844});
 const field=await p.evaluate(async()=>(await import('/src/world/scenery.js')).WHEAT_FIELDS[0]);
 for(const [label,y]of [['behind',field.y-12],['front',field.y+(field.rows-1)*12+32]]){await p.evaluate(({x,y})=>{Object.assign(a.game.player,{x,y,vx:0,vy:0});a.renderer.camera.time=null;},{x:field.x,y});await p.waitForTimeout(220);await p.screenshot({path:root+`wheat-${label}.png`});}
 // 桥面使用真实输入往返，桥外水界由针对性单测验证。
 const bridge=await p.evaluate(async()=>(await import('/src/world/river-geometry.js')).BRIDGE);
 for(const direction of [1,-1]){await p.evaluate(({b,d})=>{Object.assign(a.game.player,{x:d===1?b.x-25:b.x+b.width+25,y:b.y+b.height/2,vx:0,vy:0});a.renderer.camera.time=null;},{b:bridge,d:direction});const key=direction===1?'ArrowRight':'ArrowLeft';await p.keyboard.down(key);await p.waitForFunction(({b,d})=>d===1?a.game.player.x>b.x+b.width+15:a.game.player.x<b.x-15,{b:bridge,d:direction},{timeout:10000});await p.keyboard.up(key);}
 await p.screenshot({path:root+'bridge.png'});
 const storageAfter=await p.evaluate(()=>JSON.stringify({...localStorage}));if(storageBefore!==storageAfter)throw Error('内存试玩写入了浏览器存档');
 if(errors.length)throw Error(errors.join('\n'));
 const result={designCriterion:'idle-cat-pine-runtime',passed:true,before,moved,pause,firing,transition,samples,bridgeCrossings:2,storageUnchanged:true,errors};
 return result;
 }finally{await context.close();await p.video().saveAs(root+'runtime.webm');}
}
