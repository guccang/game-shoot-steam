// 由 playwright-cli run-code --filename 执行；连续四次分别验收午餐、夜班、集市和视觉。
// 使用独立4248端口的测试存档；只在初始夹具和视觉采样摆位，委托靠实际按键与按钮推进。
async page => {
  await page.bringToFront();
  const phase=await page.evaluate(()=>window.__livingQA?.phase||Number(sessionStorage.getItem('living-qa-phase'))||0);
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  // 短步按键避免越过目标，读取正式角色位置验证实际可通行。
  async function walk(x,y){
    for(let i=0;i<180;i++){
      const p=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y,state:g.state};});
      const dx=x-p.x,dy=y-p.y;if(Math.hypot(dx,dy)<22)return;
      if(p.state!=='playing')throw Error('行走被中断：'+JSON.stringify(p));
      const keys=[];if(Math.abs(dx)>12)keys.push(dx>0?'ArrowRight':'ArrowLeft');if(Math.abs(dy)>12)keys.push(dy>0?'ArrowDown':'ArrowUp');
      for(const key of keys)await page.keyboard.down(key);
      await page.waitForTimeout(Math.min(280,Math.max(50,Math.hypot(dx,dy)*4)));
      for(const key of keys)await page.keyboard.up(key);
    }throw Error('无法到达 '+x+','+y);
  }
  // 面板入口由正式界面服务打开，接取、交付、休息均点击真实按钮。
  async function panel(){await page.evaluate(async()=>(await import('/src/main.js')).application.living.open());}
  async function close(){if(await page.locator('#living-dialog').evaluate(n=>n.open))await page.locator('#living-close').click();await page.waitForFunction(async()=>(await import('/src/main.js')).application.game.state==='playing',{},{timeout:5000});}
  async function accept(id){await panel();await page.locator('[data-living-accept="'+id+'"]').click();await close();}
  async function step(id){
    await panel();const button=page.locator('[data-living-do="'+id+'"]');
    if(await button.isDisabled()){
      await close();
      // 居民会换班移动，沿正式生活道路追踪当前目标，而非假定固定站桩。
      const route=await page.evaluate(async id=>{const g=(await import('/src/main.js')).application.game,c=await import('/src/config/living-world.js'),t=(await import('/src/core/living-world.js')).livingRequestTarget(g,c.LIVING_REQUESTS.find(q=>q.id===id));const nodes=[],edges=[];
        function add(p){let i=nodes.findIndex(n=>n.x===p.x&&n.y===p.y);if(i<0){i=nodes.length;nodes.push(p);edges.push([]);}return i;}
        for(const road of c.LIVING_ROADS)for(let i=1;i<road.length;i++){const a=add(road[i-1]),b=add(road[i]);edges[a].push(b);edges[b].push(a);}
        const near=p=>nodes.reduce((best,n,i)=>Math.hypot(p.x-n.x,p.y-n.y)<Math.hypot(p.x-nodes[best].x,p.y-nodes[best].y)?i:best,0),start=near(g.player),end=near(t),queue=[start],prev=new Map([[start,null]]);
        while(queue.length){const n=queue.shift();for(const next of edges[n])if(!prev.has(next)){prev.set(next,n);queue.push(next);}}
        const out=[];for(let n=end;n!=null;n=prev.get(n))out.unshift(nodes[n]);return [...out,{x:t.x,y:t.y}];},id);
      for(const point of route)await walk(point.x,point.y);await panel();
    }
    await button.click();await close();
  }
  async function status(){return page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {state:a.game.state,position:{x:a.game.player.x,y:a.game.player.y},calendar:a.game.progress.living.calendar,requests:a.game.progress.living.requests,coins:a.game.progress.coins,errors:a.game.profiler.events.filter(e=>e.type==='frame-error')};});}
  if(phase===0){
    await page.setViewportSize({width:1280,height:900});
    await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;await a.menu.home();a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.living.position={x:650,y:1840};p.weapon=1;p.weapons[1]=5;p.heroes[0]=8;p.fireDispatch.next=600;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({weather:'sun',autoWeather:false}));});
    await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.environment.weather='sun';a.environment.autoWeather=false;});await page.waitForTimeout(1600);
    await accept('neighbors-lunch');await walk(570,1850);await step('neighbors-lunch');await walk(650,1850);await walk(700,1580);await walk(690,1310);await step('neighbors-lunch');await walk(700,1580);await walk(650,1850);await walk(740,1860);await step('neighbors-lunch');await walk(570,1850);await step('neighbors-lunch');
    await page.screenshot({path:'output/playwright/living-world/lunch-desktop.png'});
    await page.evaluate(()=>window.__livingQA={phase:1});
  }else if(phase===1){
    const started=(await status()).requests['neighbors-night'].stage;
    if(started===5){await step('neighbors-night');await page.evaluate(()=>window.__livingQA={phase:2});return {phase,errors,status:await status()};}
    if(started<4){
    await walk(650,1840);await accept('neighbors-night');await walk(650,1730);await walk(580,1730);await step('neighbors-night');
    await walk(650,1730);await walk(700,1580);await walk(690,1250);await walk(690,890);await walk(875,890);await step('neighbors-night');
    await walk(690,890);await walk(690,1250);await walk(700,1580);await walk(790,1580);await step('neighbors-night');await step('neighbors-night');
    }
    await walk(700,1580);await walk(650,1850);await walk(780,1850);await walk(780,2040);await walk(940,2140);await step('neighbors-night');
    for(let i=0;i<90;i++){const s=await status();if(s.state==='dead')throw Error('真实护路战斗未通过');if(s.requests['neighbors-night'].battleKills===5)break;await page.waitForTimeout(500);}
    if((await status()).requests['neighbors-night'].battleKills!==5)throw Error('护路未清场');
    await walk(940,2140);await step('neighbors-night');await walk(780,2040);await walk(780,1850);await walk(650,1850);await walk(650,1730);await walk(580,1730);await step('neighbors-night');
    await page.evaluate(()=>window.__livingQA.phase=2);
  }else if(phase===2){
    await walk(650,1840);await accept('neighbors-market');await walk(570,1850);await step('neighbors-market');await walk(650,1850);await walk(700,1580);await walk(790,1580);await step('neighbors-market');await walk(700,1580);await walk(650,1850);await walk(780,1850);await walk(780,1990);await walk(880,1990);await step('neighbors-market');await walk(780,1990);await walk(750,1850);await step('neighbors-market');await walk(650,1850);await walk(650,1730);await walk(580,1730);await step('neighbors-market');
    await page.evaluate(async()=>{(await import('/src/main.js')).application.save();});
    const before=await status();await page.reload();await page.getByRole('button',{name:'继续游戏',exact:true}).click();await page.waitForTimeout(1200);const after=await status();
    if(before.coins!==after.coins||!Object.values(after.requests).every(q=>q.completed))throw Error('刷新丢失结果或重复发奖');
    await page.evaluate(()=>window.__livingQA={phase:3});
  }else{
    const samples=[];
    for(const width of [1280,390,320]){
      await page.setViewportSize({width,height:900});
      for(const phase of ['day','night']){
        await page.evaluate(async({phase})=>{const a=(await import('/src/main.js')).application;Object.assign(a.game.player,{x:650,y:1790});a.game.progress.living.calendar={day:1,elapsed:phase==='day'?500000:1000000};a.environment.weather='sun';a.environment.autoWeather=false;},{phase});
        await page.waitForTimeout(22000);await page.screenshot({path:`output/playwright/living-world/world-${width}-${phase}.png`});
        samples.push(await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectLivingWorld(a.game,document);}));
      }
      await panel();await page.screenshot({path:`output/playwright/living-world/panel-${width}.png`});
      const check=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return (await import('/src/rendering/visual-review.js')).inspectLivingWorld(a.game,document);});
      if(check.overflow||check.activeButtons.some(b=>b.height<44))throw Error('窄屏溢出或按钮过小');
      const before=await status();await page.waitForTimeout(700);const after=await status();if(before.calendar.elapsed!==after.calendar.elapsed)throw Error('对话中时间仍推进');
      await page.locator('#living-rest').click();await close();
    }
    return {phase,samples,errors,status:await status()};
  }
  return {phase,errors,status:await status()};
}
