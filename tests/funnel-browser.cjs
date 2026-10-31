// 隔离端口验证真实工坊操作和手机画布；不读取或覆盖正式端口存档。
async (page) => {
  if(new URL(page.url()).port !== '4174') throw Error('仅允许隔离端口 4174');
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application; a.destroy();
    const {freshProgress}=await import('/src/game.js'); const p=freshProgress();
    Object.assign(p,{coins:20000,wood:8000,bosses:17});
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload(); await page.locator('#weapons-button').click();
  await page.locator('[data-category="all"]').click();
  const buy=page.locator('[data-action="buy"][data-index="12"]');
  if(!await buy.isDisabled()) throw Error('终局门槛未生效');
  const order=await page.locator('[data-portrait]').evaluateAll(nodes=>nodes.map(n=>+n.dataset.portrait));
  if(order.length!==14 || order.at(-1)!==12) throw Error('末尾排序错误');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.bosses=18;a.refresh();});
  await buy.click();
  let p=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(p.weapon!==12 || p.coins!==6000 || p.wood!==3000) throw Error('购买扣费错误');
  const card=page.locator('.item-card').filter({has:page.locator('[data-portrait="12"]')});
  for(const text of ['三炮 × 单发伤害','每炮射速','每炮能源','3.2 秒'])
    if(!(await card.innerText()).includes(text)) throw Error('工坊缺少 '+text);
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    a.game.progress.mastery[12]=40;a.game.magazines[12].modules[0].ammo=5;a.refresh();
  });
  await page.locator('[data-weapon-details="12"] summary').click();
  await page.locator('[data-mod="1"][data-index="12"]').click();
  if(!(await card.innerText()).includes('480')) throw Error('巡猎射程未刷新');
  await page.locator('[data-mod="2"][data-index="12"]').click();
  await page.locator('[data-action="upgrade"][data-index="12"]').click();
  if(await page.evaluate(async()=> (await import('/src/main.js')).application.game.magazines[12].modules[0].ammo)!==5) throw Error('养成补充了能源');
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/funnel-workshop.png'});
  await page.reload();
  if((await page.locator('#intro-weapon-name').innerText())!=='星环浮游炮') throw Error('刷新装备丢失');
  if((await page.locator('#intro-resource-label').innerText())!=='能源') throw Error('开始页仍显示弹夹');
  await page.screenshot({path:'output/playwright/funnel-intro.png'});
  p=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(p.mods[12]!==2 || p.weapons[12]!==2) throw Error('改装等级未保存');

  const results=[];
  for(const size of [{width:320,height:568},{width:390,height:844},{width:580,height:928}]) {
    await page.setViewportSize(size);
    for(const mode of ['idle','fire','charge','night','rain']) {
      const result=await page.evaluate(async({size,mode})=>{
        const a=(await import('/src/main.js')).application; a.destroy();
        const g=a.game,r=a.renderer;
        const {EnvironmentTransition}=await import('/src/world/environment.js');
        g.progress.weapon=12;g.progress.weapons[12]=1;g.progress.mastery[12]=0;g.progress.mods[12]=0;
        g.reset();g.start();g.enemies=[];g.spawnTimer=999;
        g.trees=g.trees.filter(t=>Math.hypot(t.x-g.player.x,t.y-g.player.y)>435);
        if(mode!=='idle') {
          for(const [i,angle] of [-2.65,-1.1,0.3].entries()) {
            g.spawnEnemy(angle,240);
            const e=g.enemies.at(-1);e.speed=0;e.hp=e.maxHp=100000;
          }
        }
        for(let i=0;i<86;i++) g.update(1/120);
        if(mode==='fire') for(let i=0;i<4;i++) g.update(1/120);
        if(mode==='charge') {
          g.magazines[12].modules.forEach(m=>Object.assign(m,{ammo:0,remaining:2}));
          for(let i=0;i<24;i++)g.update(1/120);
        }
        Object.assign(a.environment,{time:mode==='night'?'night':'day',weather:mode==='rain'?'thunder':'sun',autoTime:false,autoWeather:false});
        r.light=new EnvironmentTransition(a.environment,performance.now());
        document.getElementById('environment-button').textContent = mode === 'night' ? '☾ 夜晚 · 晴朗' : mode === 'rain' ? 'ϟ 白昼 · 雷阵雨' : '☀ 白昼 · 晴朗';
        g.previewTime=4;r.resize();r.draw();a.refresh();
        document.getElementById('toast').hidden=true;
        const view=r.view,x=(g.player.x-view.x)*view.zoom,y=(g.player.y-view.y)*view.zoom;
        if(view.zoom!==(size.width<500?0.6:0.75)) throw Error('浮游炮缩放错误');
        if(Math.abs(x-r.width/2)>0.01 || Math.abs(y-r.height/2)>0.01) throw Error('镜头未居中');
        const safe=Math.min(x-110*view.zoom,r.width-x-110*view.zoom,y-111,r.height-y-110*view.zoom);
        if(safe<12) throw Error('阵列或提示出屏');
        if(document.documentElement.scrollWidth>innerWidth) throw Error('页面横向溢出');
        return {width:size.width,mode,safe,ammo:g.magazines[12].modules[0].ammo,targets:g.funnel.nodes.map(n=>n.targetId)};
      },{size,mode});
      if(mode==='charge' && !(await page.locator('#funnel-supply').innerText()).includes('补给')) throw Error('HUD 充能提示丢失');
      await page.screenshot({path:`output/playwright/funnel-${size.width}-${mode}.png`});
      results.push(result);
    }
  }
  // 直接检查真实炮体像素和只读性，不把锁定线和飞行弹道计入角色轮廓。
  const pixels=await page.evaluate(async()=>{
    const {drawFunnelArray}=await import('/src/rendering/funnel.js');
    const {createFunnelState,FUNNEL_OPEN,FUNNEL_CHARGING}=await import('/src/combat/funnel.js');
    const {drawCat}=await import('/src/rendering/characters.js');
    const {PLAYER_SCALE}=await import('/src/combat/recoil.js');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=400;const c=canvas.getContext('2d');
    let maxRadius=0;
    for(const charging of [false,true]) for(let direction=0;direction<8;direction++) {
      const state=createFunnelState();state.charging=charging;state.time=2;state.deploy=0;
      state.nodes.forEach((n,i)=>{[n.x,n.y]=(charging?FUNNEL_CHARGING:FUNNEL_OPEN)[i];n.angle=direction*Math.PI/4;n.recoil.kick=5;n.recoil.flash=.05;});
      const snapshot=JSON.stringify(state); c.clearRect(0,0,400,400);
      drawCat(c,200,200,1,direction*Math.PI/4,PLAYER_SCALE,1,12);
      drawFunnelArray(c,{x:200,y:200},state,false);
      if(JSON.stringify(state)!==snapshot) throw Error('渲染修改战斗状态');
      const data=c.getImageData(0,0,400,400).data;
      for(let y=0;y<400;y++) for(let x=0;x<400;x++) if(data[(y*400+x)*4+3]) maxRadius=Math.max(maxRadius,Math.hypot(x-200,y-200));
    }
    if(maxRadius>110) throw Error('炮体像素超出角色安全圈 '+maxRadius);
    return {maxRadius};
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,g=a.game,r=a.renderer;
    g.reducedMotion=true;g.magazines[12].modules.forEach(m=>Object.assign(m,{ammo:0,remaining:2}));
    g.update(.01);r.draw();a.refresh();
    const anchors=g.funnel.nodes.map(n=>[n.x,n.y]);
    for(let i=0;i<10;i++)g.update(.02);
    if(JSON.stringify(anchors)!==JSON.stringify(g.funnel.nodes.map(n=>[n.x,n.y]))) throw Error('减少动态仍漂浮');
    if(!(g.magazines[12].modules[0].remaining<2)) throw Error('减少动态停止了真实充能');
    r.draw();a.refresh();return {anchors,remaining:g.magazines[12].modules[0].remaining};
  });
  await page.screenshot({path:'output/playwright/funnel-reduced.png'});
  if(errors.length) throw Error(errors.join(';'));
  return {purchase:true,mods:true,persistence:true,results,pixels,reduced,errors};
}
