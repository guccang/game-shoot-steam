// 手机正式入口与真实点击完成两个小游戏，计分由运行时命中和抓取产生，不直接修改分数。
async original=>{
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'output/playwright/home-mine-minigames/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reviews=[];page.on('pageerror',e=>errors.push(e.message));
 // 只切换正式历法和光照，不切换绘制器或替换场景。
 async function phase(id){await page.evaluate(async id=>{const p=(await import('/src/config/living-world.js')).LIVING_PHASES.find(p=>p.id===id);a.game.progress.living.calendar.elapsed=p.start+p.duration*.5;(await import('/src/world/living-calendar.js')).projectLivingCalendar(a.environment,a.game.progress.living.calendar);Object.assign(a.environment,{weather:'sun',autoWeather:false,livingPreview:false});a.renderer.light=new (await import('/src/world/environment.js')).EnvironmentTransition(a.environment,performance.now()-22000);a.renderer.tone=new (await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,performance.now()-22000);},id);await page.waitForTimeout(100);}
 // 当前正式画面截图与触控尺寸一起记录，不用预览图代替运行检查。
 async function review(name){await page.screenshot({path:`output/playwright/home-mine-minigames/${name}.png`});const r=await page.evaluate(async()=>(await import('/src/rendering/visual-review.js')).inspectHomeArcade(a.game,a.renderer,document));if(r.overflow||r.buttons.some(b=>b.width<44||b.height<44))throw Error('手机界面尺寸不合格 '+JSON.stringify(r));reviews.push(r);}
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;window.arc=await import('/src/core/home/home-arcade.js');window.hc=await import('/src/core/home/home-construction.js');window.hcfg=await import('/src/config/home-construction.js');
   const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;p.wood=10000;Object.assign(p.materials,{stone:1000,iron:1000,copper:1000});p.homeDecor.floors=9;p.homeDecor.balconies={8:['east']};
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=999999;g.enemies=[];g.spawnTimer=999999;g.cottage={kind:'cottage',floor:8,outside:{x:600,y:370}};Object.assign(g.player,hcfg.HOME_DIRECTIONS.east.door);if(!hc.enterHomeBalcony(g,'east'))throw Error('九楼阳台入口失败');a.refresh();
  });
  if(!await page.locator('#home-bird-game').isDisabled())throw Error('九楼不应解锁');await page.screenshot({path:'output/playwright/home-mine-minigames/ninth-floor-locked.png'});
  await page.evaluate(()=>{const g=a.game;g.cottage={kind:'construction',outside:{x:600,y:370}};for(const [kind,options] of [['floor',{}],['balcony',{floor:9,side:'east'}],['basement',{}]])if(!hc.buildHome(g,kind,options).ok)throw Error('正式建筑事务失败 '+kind);g.cottage={kind:'cottage',floor:9,outside:{x:600,y:370}};Object.assign(g.player,hcfg.HOME_DIRECTIONS.east.door);hc.enterHomeBalcony(g,'east');});
  await page.locator('#home-bird-game').tap();await review('birds-ready');await page.locator('#arcade-action').tap();await page.waitForTimeout(500);
  // 真实触屏点当前鸟的位置，射击间隔与装填都由游戏决定。
  for(let i=0;i<65;i++){
   if(await page.evaluate(()=>a.game.cottage.arcade.score)>=120)break;
   const point=await page.evaluate(()=>{const r=a.renderer.canvas.getBoundingClientRect(),v=a.renderer.arcadeView,b=a.game.cottage.arcade.birds.find(b=>!b.hit&&b.x>25&&b.x<335);return b?{x:r.left+v.x+b.x/360*v.width,y:r.top+v.y+b.y/240*v.height}:null;});if(point)await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(260);
  }
  if(await page.evaluate(()=>a.game.cottage.arcade.score)<120)throw Error('真实触屏射击未达目标');
  for(let i=0;i<3;i++){await page.waitForTimeout(120);await review(`bird-wing-${i}`);}
  await page.locator('#arcade-pause').tap();const frozen=await page.evaluate(()=>JSON.stringify(a.game.cottage.arcade));await page.waitForTimeout(350);if(await page.evaluate(()=>JSON.stringify(a.game.cottage.arcade))!==frozen)throw Error('飞鸟暂停未冻结');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);for(const time of ['day','night']){await phase(time);await review(`birds-${size.width}-${time}`);await page.locator('#arcade-pause').tap();await page.waitForTimeout(150);await review(`birds-${size.width}-${time}-active`);await page.locator('#arcade-pause').tap();}}
  await page.setViewportSize({width:390,height:844});await page.locator('#arcade-pause').tap();
  // 系统暂停与触屏继续必须回到同一回合，不能留下无法恢复的遮罩。
  await page.evaluate(()=>a.game.pause());await page.waitForFunction(()=>document.querySelector('#arcade-pause').textContent==='继续');await page.locator('#arcade-pause').tap();if(await page.evaluate(()=>a.game.state)!=='playing')throw Error('系统暂停无法继续');
  // 已通过真实命中达标，仅缩短剩余等待，结算仍由正式倒计时完成。
  await page.evaluate(()=>{a.game.cottage.arcade.remaining=.1;});await page.waitForFunction(()=>a.game.cottage.arcade.phase==='result');await review('birds-result');await page.locator('#arcade-exit').tap();await page.waitForFunction(()=>!a.game.cottage.arcade);
  await page.evaluate(async()=>{const g=a.game,mc=await import('/src/config/mining.js'),mi=await import('/src/core/mining/mining.js');g.cottage={kind:'cottage',floor:0,outside:{x:600,y:370}};Object.assign(g.player,mc.MINING.hatch.goal);if(!mi.enterMine(g))throw Error('地下一层入口失败');});
  await page.locator('#mine-gold-game').tap();await review('gold-ready');await page.locator('#arcade-action').tap();
  // 从实际生成的矿物选无遮挡的高价值路径，真实摆动经过目标角度才按放钩。
  for(let turn=0;turn<8;turn++){
   if(await page.evaluate(()=>a.game.cottage.arcade.score)>=250)break;
   const angle=await page.evaluate(()=>{const s=a.game.cottage.arcade,items=s.items.filter(i=>!i.removed),c={x:180,y:48};return items.filter(m=>{const dx=m.x-c.x,dy=m.y-c.y,n=Math.hypot(dx,dy);return !items.some(o=>{if(o.id===m.id)return false;const along=((o.x-c.x)*dx+(o.y-c.y)*dy)/n,side=Math.abs((o.x-c.x)*dy-(o.y-c.y)*dx)/n;return along>0&&along<n-m.radius&&side<o.radius+5;});}).sort((p,q)=>q.value/q.weight-p.value/p.weight).map(m=>Math.atan2(m.x-c.x,m.y-c.y))[0];});
   if(angle===undefined)throw Error('没有可达矿物');await page.waitForFunction(angle=>{const s=a.game.cottage.arcade;return s.phase!=='playing'||s.claw.phase==='swing'&&Math.abs(s.claw.angle-angle)<.035;},angle,{timeout:10000});if(await page.evaluate(()=>a.game.cottage.arcade.phase)!=='playing')throw Error('矿工回合提前耗尽');
   await page.locator('#arcade-action').tap();await page.waitForFunction(()=>a.game.cottage.arcade.claw.phase==='retract',null,{timeout:10000});
   if(turn===0){for(let i=0;i<3;i++){await review(`claw-motion-${i}`);await page.waitForTimeout(160);}}
   await page.waitForFunction(()=>a.game.cottage.arcade.claw.phase==='swing'||a.game.cottage.arcade.phase==='result',null,{timeout:15000});
  }
  if(await page.evaluate(()=>a.game.cottage.arcade.score)<250)throw Error('真实抓取未达目标');
  await page.locator('#arcade-pause').tap();const goldFrozen=await page.evaluate(()=>JSON.stringify(a.game.cottage.arcade));await page.waitForTimeout(350);if(await page.evaluate(()=>JSON.stringify(a.game.cottage.arcade))!==goldFrozen)throw Error('抓钩暂停未冻结');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);for(const time of ['day','night']){await phase(time);await review(`gold-${size.width}-${time}`);await page.locator('#arcade-pause').tap();await page.waitForTimeout(150);await review(`gold-${size.width}-${time}-active`);await page.locator('#arcade-pause').tap();}}
  await page.setViewportSize({width:390,height:844});await page.locator('#arcade-pause').tap();await page.evaluate(()=>{a.game.cottage.arcade.remaining=.1;});await page.waitForFunction(()=>a.game.cottage.arcade.phase==='result');await review('gold-result');await page.locator('#arcade-exit').tap();await page.waitForFunction(()=>!a.game.cottage.arcade);
  const saved=await page.evaluate(async()=>({records:a.game.progress.homeArcade,cat:(await import('/src/rendering/cat-animation.js')).catSprites.stats()}));if(saved.cat.status!=='ready'||saved.records.birds.wins!==1||saved.records.gold.wins!==1)throw Error('记录或原角色图集不完整');
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;});const restored=await page.evaluate(()=>a.game.progress.homeArcade);if(JSON.stringify(saved.records)!==JSON.stringify(restored))throw Error('刷新丢失成绩与奖励');if(errors.length)throw Error(errors.join('\n'));return {saved,restored,reviews,errors};
 }catch(error){await page.screenshot({path:'output/playwright/home-mine-minigames/failure.png'});throw error;}finally{await context.close();}
}
