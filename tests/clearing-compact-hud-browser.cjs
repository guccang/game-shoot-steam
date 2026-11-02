// 隔离手机浏览器验收清缴进场一次提示、真实触控和结算续接，不读取玩家存档。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;const g=a.game,p=(await import('/src/progression/progress.js')).freshProgress();
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=(await import('/src/config/mainline.js')).MAINLINE_IDS.slice();p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
   g.progress=p;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.vehicle.active=false;g.enemies=[];g.encounterTimer=999;g.attack=()=>false;g.player.invincible=999;
   window.post=(await import('/src/config/clearing.js')).CLEARING_APPROACH;Object.assign(g.player,{x:post.x,y:post.y});a.renderer.camera.time=null;a.refresh();
   window.noticeEvents=0;const previous=g.onEvent;g.onEvent=(type,data)=>{if(type==='clearing-notice-shown')noticeEvents++;previous(type,data);};
   window.noticeTransitions=[];const notice=document.getElementById('clearing-arrival-notice');window.noticeObserver=new MutationObserver(()=>noticeTransitions.push({visible:!notice.hidden,time:performance.now(),state:g.state}));noticeObserver.observe(notice,{attributes:true,attributeFilter:['hidden']});
  });
  await page.locator('#nearby-interaction[data-target="clearing"]').tap();await page.locator('#clearing-accept').tap();
  if(await page.evaluate(()=>noticeEvents)!==0)throw Error('接单赶路时提前弹出');
  await page.evaluate(()=>{const g=a.game;window.site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});a.renderer.camera.time=null;a.refresh();});
  await page.locator('#clearing-arrival-notice').waitFor({state:'visible'});
  const before=await page.evaluate(()=>({x:a.game.player.x,y:a.game.player.y}));
  const client=await context.newCDPSession(page),box=await page.locator('#game-frame').boundingBox(),x=box.x+65,y=box.y+box.height-120;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+42,y}]});
  await page.screenshot({path:'output/playwright/clearing-compact-hud/arrival.png'});
  await page.waitForTimeout(300);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
  await page.locator('#clearing-arrival-notice').waitFor({state:'hidden'});
  const automatic=await page.evaluate(before=>{
   const shown=noticeTransitions.find(t=>t.visible),closed=noticeTransitions.find(t=>!t.visible&&t.time>shown.time);
   return {events:noticeEvents,duration:closed.time-shown.time,states:noticeTransitions.filter(t=>t.time>=shown.time&&t.time<=closed.time).map(t=>t.state),distance:Math.hypot(a.game.player.x-before.x,a.game.player.y-before.y)};
  },before);
  if(automatic.events!==1||automatic.duration<950||automatic.duration>1500||automatic.states.some(s=>s!=='playing')||automatic.distance<10)throw Error('自动提示打断操作或时序错误 '+JSON.stringify(automatic));
  // 同一场清缴离开再进入、手动暂停恢复，均不能再次触发。
  await page.evaluate(()=>{Object.assign(a.game.player,{x:post.x,y:post.y});a.refresh();});await page.waitForTimeout(200);
  await page.evaluate(()=>{Object.assign(a.game.player,{x:site.x,y:site.y});a.refresh();});await page.waitForTimeout(200);
  await page.locator('#settings-button').tap();await page.locator('#settings-done').tap();
  if(await page.evaluate(()=>noticeEvents)!==1)throw Error('同一清缴重复提示');
  // 手动详情一直保留，寻路控制仍可使用，读完关闭才恢复战斗。
  await page.locator('#wave-help').tap();await page.locator('#wave-help-dialog').waitFor({state:'visible'});await page.waitForTimeout(1200);
  if(!await page.locator('#wave-help-dialog').isVisible())throw Error('手动阅读被自动关闭');
  const detail=await page.locator('#wave-help-dialog').innerText();if(!detail.includes('第 1 轮清缴')||!detail.includes('0 / 5 批'))throw Error('清缴详情数据错误 '+detail);
  await page.locator('#clearing-detail-navigation').tap();if(await page.evaluate(()=>a.game.progress.mainline.navigationEnabled)!==false)throw Error('详情无法关闭寻路');
  await page.locator('#clearing-detail-navigation').tap();await page.locator('#wave-help-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  // 真正完成五波与领主，通过正式结算按钮续接，检查本轮只再出现一次。
  await page.evaluate(()=>{const g=a.game;for(let i=0;i<1200&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}if(!g.boss)throw Error('五波未召唤领主');a.refresh();});
  if(!await page.locator('#boss-hud').isVisible()||!await page.locator('#wave-help').isVisible()||await page.locator('#quest').isVisible())throw Error('领主阶段HP或精简状态错误');
  await page.screenshot({path:'output/playwright/clearing-compact-hud/boss.png'});
  await page.evaluate(()=>a.game.hit(a.game.boss,1e9));
  await page.locator('#task-reward-next-clearing').waitFor({state:'visible'});await page.locator('#task-reward-next-clearing').tap();
  await page.locator('#clearing-arrival-notice').waitFor({state:'visible'});if(await page.evaluate(()=>noticeEvents)!==2)throw Error('续接未展示一次');
  if(!(await page.locator('#clearing-notice-round').textContent()).includes('第 2 轮'))throw Error('续接轮次错误');
  await page.locator('#clearing-arrival-notice').waitFor({state:'hidden'});
  // 查看已保存标记；真正重建游戏后也不会再次弹出同一份任务。
  const saved=await page.evaluate(()=>{a.save();return JSON.parse(localStorage.getItem('forest-patrol-v1'));});
  if(saved.living.clearingNotice!=='seen')throw Error('展示资格未持久化');
  await page.evaluate(saved=>{const g=a.game;g.progress=saved;g.reset();g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.player.invincible=999;g.encounterTimer=999;g.enemies=[];Object.assign(g.player,{x:site.x,y:site.y});a.renderer.camera.time=null;a.refresh();},saved);
  await page.waitForTimeout(250);if(await page.evaluate(()=>noticeEvents)!==2)throw Error('读档重复提示');
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});
   await page.evaluate(async time=>{Object.assign(a.environment,{livingPreview:true,autoTime:false,autoWeather:false,time,weather:'sun'});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.renderer.resize();a.refresh();},time);
   await page.waitForTimeout(150);
   const state=await page.evaluate(()=>{
    // 实际DOM几何确认一个问号猫猫紧随HP，设置与原战斗控制不重叠。
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const hp=rect(document.querySelector('.player-hud')),help=rect(document.getElementById('wave-help')),settings=rect(document.getElementById('settings-button'));
    return {hp,help,settings,quest:getComputedStyle(document.getElementById('quest')).display,goal:getComputedStyle(document.getElementById('equipment-goal')).display,navHidden:document.getElementById('task-navigation-toggle').hidden,overflow:document.documentElement.scrollWidth>innerWidth,notice:!document.getElementById('clearing-arrival-notice').hidden};
   });
   if(state.quest!=='none'||state.goal!=='none'||!state.navHidden||state.notice||state.overflow||state.help.width<44||state.help.height<44||state.help.x<state.hp.right||state.help.right>state.settings.x)throw Error('精简HUD布局错误 '+JSON.stringify(state));
   await page.screenshot({path:`output/playwright/clearing-compact-hud/hud-${width}-${time}.png`});samples.push({width,height,time,...state});
  }
  if(errors.length)throw Error(errors.join('\n'));
  return {designCriterion:'clearing-compact-hud',automatic,continued:2,manualDetail:true,reloadNoRepeat:true,samples,errors};
 }finally{await context.close();}
}
