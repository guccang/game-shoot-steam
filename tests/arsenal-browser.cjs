// 浏览器端覆盖全部枪械的实际营地事务、保存与矢量渲染，像素对比验证河水持续流动。
async (page) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>sessionStorage.removeItem('arsenal-seed'));
  await page.addInitScript(() => {
    if(sessionStorage.getItem('arsenal-seed'))return;
    sessionStorage.setItem('arsenal-seed','1');
    localStorage.setItem('forest-patrol-v1',JSON.stringify({version:1,coins:30000,wood:12000,hero:0,weapon:0,heroes:[1,0],weapons:[1,0],bosses:6}));
    localStorage.setItem('forest-patrol-environment-v1',JSON.stringify({time:'day',weather:'sun',autoTime:false,autoWeather:false}));
  });
  await page.reload(); await page.locator('#start').click(); await page.locator('#weapons-button').click();
  const weaponCount=await page.evaluate(async()=>(await import('/src/config/weapons.js')).WEAPONS.length);
  if(await page.locator('.item-card').count()!==weaponCount)throw Error('武器目录不完整');
  for(let index=1;index<weaponCount;index++) {
    await page.locator(`[data-action="buy"][data-index="${index}"]`).click();
    await page.locator(`[data-action="upgrade"][data-index="${index}"]`).click();
    if(!await page.locator('.item-card.equipped .level').innerText().then(t=>t.includes('2')))throw Error('升级装备未同步');
  }
  await page.locator('[data-action="equip"][data-index="2"]').click();
  await page.locator('#camp-dialog').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'output/playwright/arsenal-shop.png'});
  await page.locator('#close-camp').click();await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(saved.weapon!==2||saved.weapons.slice(1).some(n=>n!==2))throw Error('新武器成长未保存');
  await page.locator('#start').click();await page.waitForTimeout(800);
  await page.screenshot({path:'output/playwright/arsenal-forest-mobile.png'});
  // 使用正式模块生成桥梁与战斗联系图，测试状态仅存在于本次浏览器页面中。
  const visual=await page.evaluate(async()=>{
    const {Game,freshProgress,WEAPONS}=await import('/src/game.js');
    const {Renderer,drawCat,drawWeapon}=await import('/src/render.js');
    const {RiverRenderer,BRIDGE}=await import('/src/rendering/river.js');
    const {fireBallistics}=await import('/src/combat/ballistics.js');
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;canvas.style='position:fixed;inset:0;z-index:99999;width:1080px;height:1440px';document.body.append(canvas);
    const c=canvas.getContext('2d');c.fillStyle='#f5f0de';c.fillRect(0,0,1080,1440);
    let seed=743;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    const game=new Game(freshProgress(),random);game.player.x=1180;game.player.y=729;game.previewTime=2;game.enemies=[];
    const scene=document.createElement('canvas');scene.width=540;scene.height=760;
    const renderer=new Renderer(scene,game,{time:'day',weather:'sun'});renderer.width=540;renderer.height=760;renderer.dpr=1;renderer.draw();c.drawImage(scene,0,0);
    const before=scene.getContext('2d').getImageData(0,0,540,760).data.slice();game.previewTime=3;renderer.draw();
    const after=scene.getContext('2d').getImageData(0,0,540,760).data;let changes=0;for(let i=0;i<before.length;i+=4)if(before[i]!==after[i])changes++;
    if(changes<100)throw Error('流水或树木动画没有变化');
    game.player.x=650;game.player.y=570;renderer.draw();c.drawImage(scene,540,0);
    // 六种武器同一尺度对比，目标设置较高生命以保留命中和飞行混合画面。
    for(let index=0;index<6;index++) {
      const x=(index%3)*360,y=770+Math.floor(index/3)*220;c.save();c.translate(x,y);c.fillStyle='#e1e8bb';c.fillRect(8,8,344,204);c.fillStyle='#395740';c.font='bold 18px sans-serif';c.fillText(WEAPONS[index].name,22,34);
      const g=new Game(freshProgress(),()=>.5);g.trees=[];g.enemies=[];g.player.x=60;g.player.y=145;g.progress.weapon=index;g.progress.weapons[index]=1;g.start();
      g.addTree(250,148);g.trees[0].hp=1000;
      fireBallistics(g,WEAPONS[index],{x:90,y:137},{x:1,y:0},12,false);g.updateProjectiles(.1);
      drawCat(c,55,148,0,0,1.2,0,index);drawWeapon(c,index,265,43,1.6);
      const {drawBallistics}=await import('/src/rendering/projectiles.js');drawBallistics(c,g.projectiles);
      g.fx.impact({target:{type:index%2?'enemy':'tree',x:260,y:150},x:250,y:140},{x:1,y:0},false,index===1,true,index===5);g.fx.update(.15);(await import('/src/rendering/particles.js')).drawCombatFX(c,g.fx.items);
      for(const s of g.shots){c.strokeStyle='#d9ff9c';c.lineWidth=5;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(310,s.ey);c.stroke();}c.restore();
    }
    return {animatedPixels:changes,bridge:BRIDGE,newWeapons:WEAPONS.length};
  });
  await page.setViewportSize({width:1080,height:1440});await page.screenshot({path:'output/playwright/arsenal-contact-sheet.png'});
  await page.reload();if(errors.length)throw Error(errors.join('; '));return {shop:true,persistence:true,...visual,errors};
}
