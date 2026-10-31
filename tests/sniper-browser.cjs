// 独立浏览器验证购买门槛、升级装备、实际贯穿与击飞画面，不触碰日常浏览器存档。
async (page) => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async()=>{
    // 停用旧页面的自动保存，避免刷新时覆盖本测试的独立成长档。
    (await import('/src/main.js')).application.destroy();
    localStorage.setItem('forest-patrol-v1',JSON.stringify({version:1,coins:20000,wood:8000,hero:0,weapon:0,heroes:[1,0],weapons:[1,0,0,0,0,0,0,0],bosses:5}));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload(); await page.locator('#start').click(); await page.locator('#weapons-button').click();
  const buy=page.locator('[data-action="buy"][data-index="8"]');
  if(!(await buy.isDisabled()))throw Error('未达领主门槛也能购买狙击枪');
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.bosses=6;a.refresh();});
  await buy.click(); await page.locator('[data-action="upgrade"][data-index="8"]').click();
  const card=page.locator('.item-card').filter({has:page.getByRole('heading',{name:/苍隼狙击枪/})});
  await card.scrollIntoViewIfNeeded();
  if(!(await card.innerText()).includes('112') || !(await card.innerText()).includes('700'))throw Error('狙击养成数值未同步');
  await page.screenshot({path:'output/playwright/sniper-shop.png'});
  await page.locator('#close-camp').click(); await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(saved.weapon!==8||saved.weapons[8]!==2)throw Error('刷新后狙击枪丢失');
  await page.locator('#start').click(); await page.locator('#sound').click();
  // 使用生产射击和物理步进构造可重复的纵向穿透场景，便于检查各阶段真实画面。
  const result=await page.evaluate(async()=>{
    const {application:a}=await import('/src/main.js');
    const {createEnemyAttack}=await import('/src/combat/enemy-attack.js');
    a.destroy(); const g=a.game,r=a.renderer;
    window.sniperView={a,g,r};
    g.state='playing';g.random=()=>0.5;
    // 独立种子让碎片保留自然散布，截图之间仍可重复对比。
    let fragmentSeed=42;
    g.fx.random=()=>{fragmentSeed=(fragmentSeed*1664525+1013904223)>>>0;return fragmentSeed/4294967296;};
    g.progress.weapons[8]=1;g.progress.weapon=8;
    Object.assign(g.player,{x:900,y:700,invincible:0});
    g.trees=g.trees.filter(t=>Math.abs(t.x-900)>95 || t.y>800);
    g.addTree(900,600,{hp:55,maxHp:55});
    g.enemies=[560,480,410].map((y,i)=>({id:2000+i,x:900,y,type:'enemy',hp:40,maxHp:40,radius:17,mass:1,speed:0,phase:0,biome:'pine',level:4,rank:0,assault:createEnemyAttack()}));
    g.attackTimer=g.spawnTimer=999;g.remnants=[];g.projectiles=[];
    g.attack(); a.refresh();
    const sheet=document.createElement('canvas');sheet.width=1560;sheet.height=900;
    const c=sheet.getContext('2d');c.fillStyle='#263e46';c.fillRect(0,0,1560,900);
    let time=0;
    for(const [i,end] of [0.025,0.1,0.2,0.42].entries()){
      while(time<end-1e-8){const dt=Math.min(1/120,end-time);g.update(dt);time+=dt;}
      r.draw();c.drawImage(r.canvas,0,0,r.canvas.width,r.canvas.height,i*390,44,390,844);
      c.fillStyle='#e5f0ed';c.font='bold 16px sans-serif';c.fillText(['枪口冲击 · 高速曳光','贯穿树木 · 定向碎裂','穿透怪群 · 腾空击飞','残骸翻滚 · 重力回落'][i],i*390+12,28);
    }
    if(g.kills!==3||g.chopped!==1)throw Error(`实际贯穿错误 ${g.kills}/${g.chopped}`);
    sheet.id='sniper-sheet';sheet.style='position:fixed;inset:0;z-index:9999;width:1560px;height:900px';document.body.append(sheet);
    return {kills:g.kills,trees:g.chopped,remnants:g.remnants.length,fragments:g.fx.items.length};
  });
  await page.setViewportSize({width:1560,height:900}); await page.screenshot({path:'output/playwright/sniper-sequence.png'});
  await page.evaluate(()=>document.getElementById('sniper-sheet').remove());
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{sniperView.r.resize();sniperView.r.draw();});
  await page.screenshot({path:'output/playwright/sniper-impact-mobile.png'});
  // 低动态不发生镜头位移，新的高能光效被过滤，窄屏仍可操作工坊。
  await page.emulateMedia({reducedMotion:'reduce'});
  const stable=await page.evaluate(()=>{
    const {g,r}=sniperView;g.fx.shake.life=.12;r.draw();
    const before=r.c.getImageData(0,0,r.canvas.width,r.canvas.height).data;
    g.fx.shake.life=0;r.draw();const after=r.c.getImageData(0,0,r.canvas.width,r.canvas.height).data;
    return before.every((v,i)=>v===after[i]);
  });
  if(!stable)throw Error('减少动态仍存在镜头震动');
  await page.reload(); await page.setViewportSize({width:320,height:568});
  await page.locator('#weapons-button').click();
  await page.locator('[data-action="upgrade"][data-index="8"]').scrollIntoViewIfNeeded();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight))throw Error('320像素布局溢出');
  await page.screenshot({path:'output/playwright/sniper-shop-320.png'});
  if(errors.length)throw Error(errors.join(';'));
  return {...result,purchase:true,upgrade:true,saved:true,reducedMotion:true,mobileOverflow:false,errors};
}
