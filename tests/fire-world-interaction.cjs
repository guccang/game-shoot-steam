// 世界消防真实键盘/拖动输入、站前后连续走位、动画采样与撤退归还检查。
async page=>{
 if(new URL(page.url()).port!=='4198')throw Error('隔离端口错误');const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewportSize({width:1280,height:900});await page.reload();
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.ready;const g=a.game;g.dismissFireRescue();g.player.hp=g.maxHp();g.pause();a.refresh();});
 await page.locator('#start').click();if(await page.locator('#fire-notice [data-fire-open]').isVisible()){await page.locator('#fire-notice [data-fire-open]').click();}else{if(!await page.locator('#realm-button').isVisible())await page.locator('#field-menu-toggle').click();await page.locator('#realm-button').click();await page.locator('[data-enter-realm="fire"]').click();}
 // 返回主菜单只通过设置，世界火警在首页冻结，继续后仍能出发。
 await page.locator('#fire-dialog .fire-dialog-head [data-fire-close]').click();await page.locator('#settings-button').click();await page.locator('#settings-home').click();
 const frozen=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return [a.menu.page,a.game.fireRescue.phase,a.game.fireRescue.remaining,a.game.fireRescue.water];});await page.waitForTimeout(250);
 const unchanged=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return [a.menu.page,a.game.fireRescue.phase,a.game.fireRescue.remaining,a.game.fireRescue.water];});if(frozen[0]!=='title'||JSON.stringify(frozen)!==JSON.stringify(unchanged))throw Error('首页没有冻结世界火警');
 await page.locator('#start').click();await page.locator('#fire-notice [data-fire-open]').click();await page.locator('[data-fire-accept]').click();
 const before=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y,wheel:g.vehicle.wheelPhase,owned:g.progress.vehicleHulls[4]};});
 await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');await page.waitForTimeout(150);
 const keyboard=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y,wheel:g.vehicle.wheelPhase};});if(keyboard.y>=before.y-8||keyboard.wheel===before.wheel)throw Error('真实键盘或车轮未移动');
 await page.setViewportSize({width:390,height:844});const bounds=await page.locator('#game').boundingBox();
 const dragBefore=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y};});
 await page.mouse.move(bounds.x+bounds.width*.4,bounds.y+bounds.height*.55);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.72,bounds.y+bounds.height*.55,{steps:8});await page.waitForTimeout(400);await page.mouse.up();await page.waitForTimeout(150);
 const dragAfter=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y};});if(dragAfter.x<=dragBefore.x+8)throw Error('手机拖动没有行驶');
 // 手机原菜单仍可点击，救援弹窗自动暂停且关闭后继续。
 await page.locator('#fire-notice [data-fire-open]').click();
 const paused=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {time:g.fireRescue.remaining,state:g.state};});await page.waitForTimeout(300);
 const still=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return g.fireRescue.remaining;});if(paused.state!=='paused'||paused.time!==still)throw Error('救援面板未暂停');await page.locator('#fire-dialog .fire-dialog-head [data-fire-close]').click();
 // 连续经过站前、侧面和身后；起点固定用于可重复构图，过程由正常输入推进。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.dismountVehicle();Object.assign(g.player,{x:1420,y:1145,vx:0,vy:0});const {EnvironmentTransition}=await import('/src/world/environment.js'),{SceneTone}=await import('/src/rendering/scene-tone.js');Object.assign(a.environment,{time:'day',weather:'sun',forestSeason:'summer',autoTime:false,autoWeather:false,autoSeason:false});a.renderer.seasons.reset('summer',performance.now());a.renderer.light=new EnvironmentTransition(a.environment,0);a.renderer.tone=new SceneTone(a.environment,0);a.refresh();});
 await page.screenshot({path:'output/playwright/fire-world/station-front.png'});
 await page.keyboard.down('a');await page.waitForTimeout(420);await page.keyboard.up('a');await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/fire-world/station-side.png'});
 await page.keyboard.down('d');await page.waitForTimeout(420);await page.keyboard.up('d');await page.waitForTimeout(100);await page.screenshot({path:'output/playwright/fire-world/station-behind.png'});
 const review=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;const {inspectFireWorld,renderVisualCase}=await import('/src/rendering/visual-review.js');const c=document.createElement('canvas');c.width=480;c.height=320;const frames=[];for(let i=0;i<8;i++){await renderVisualCase(c.getContext('2d'),'forest-fire-world',i/8);frames.push(c.toDataURL());}return {...inspectFireWorld(g,document),uniqueFrames:new Set(frames).size,position:{x:g.player.x,y:g.player.y},graphNodes:(await import('/src/world/fire-navigation.js')).fireRoads(g).nodes.length};});if(!review.menuClear||review.overflow||review.uniqueFrames!==8||review.realm||review.arena||!review.originalTrees)throw Error('世界消防复核失败:'+JSON.stringify(review));
 await page.locator('#fire-notice [data-fire-open]').click();await page.locator('#fire-dialog [data-fire-dismiss]').click();
 const retired=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;a.save();return {phase:g.fireRescue,owned:g.progress.vehicleHulls[4],markers:g.trees.filter(t=>t.fireRescue).length};});if(retired.phase||retired.markers||retired.owned!==before.owned)throw Error('撤退归还损坏原世界或永久车');
 if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'forest-fire-world',keyboardDelta:keyboard.y-before.y,dragDelta:dragAfter.x-dragBefore.x,paused,review,retired,errors};
}
