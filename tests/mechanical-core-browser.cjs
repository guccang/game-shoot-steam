// 隔离端口上的实际鼠标、键盘和触控施工；正式工坊、试射与存档使用同一应用。
async page => {
  if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口 4197');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.setViewportSize({width:1280,height:960});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application,{freshProgress}=await import('/src/progression/progress.js');
    const p=freshProgress();p.weapons.fill(1);p.weapon=15;p.mastery.fill(40);p.coins=p.wood=100000;p.bosses=100;
    p.parts=p.crystal=p.core=10000;p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);
    a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();
    const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('正式角色图集缺失');
  });
  await page.locator('#weapons-button').click();
  // 只读取正式状态作为断言，不以直接改等级代替交互施工。
  const state=()=>page.evaluate(async()=>structuredClone((await import('/src/main.js')).application.game.progress));
  // 键盘选择部件、落到安装点，随后工具按住空格完成施工。
  async function keyboardBuild() {
    await page.locator('[data-ws-upgrade="coordination"]').focus();await page.keyboard.press('Enter');
    await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');await page.waitForTimeout(1200);
    await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');await page.waitForTimeout(1700);await page.keyboard.up('Space');
  }
  const initial=await state();
  await page.screenshot({path:'output/playwright/mechanical-core/workshop-three.png'});
  await page.locator('[data-ws-upgrade="coordination"]').focus();await page.keyboard.press('Enter');
  await page.locator('[data-ws-upgrade="coordination"]').dragTo(page.locator('#ws-socket'));await page.waitForTimeout(1200);
  if(JSON.stringify(await state())!==JSON.stringify(initial))throw Error('试装扣费');
  if(!(await page.locator('#ws-stats').innerText()).includes('3 → 4'))throw Error('数量预览缺失');
  await page.screenshot({path:'output/playwright/mechanical-core/coordination-preview.png'});
  const t=await page.locator('#ws-tool').boundingBox(),s=await page.locator('#ws-socket').boundingBox();
  await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();await page.mouse.move(s.x+s.width/2,s.y+s.height/2,{steps:12});await page.waitForTimeout(650);
  await page.screenshot({path:'output/playwright/mechanical-core/tool-in-progress.png'});await page.waitForTimeout(1100);await page.mouse.up();
  if((await state()).weaponParts[15].coordination!==2)throw Error('鼠标施工失败');
  await keyboardBuild();if((await state()).weaponParts[15].coordination!==3)throw Error('键盘施工失败');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  // 通过浏览器触控协议产生真实 pointer/touch 序列，取消不能收费。
  async function touch(type,x,y) {await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y}]});}
  // 拖起后重新读取热点位置，适配横向零件托盘与紧凑屏幕。
  async function drag(selector,hold=0,cancel=false) {
    await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();
    await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchMove',b.x+b.width/2,b.y+b.height/2-12);
    const s=await page.locator('#ws-socket').boundingBox();
    for(let i=1;i<=10;i++)await touch('touchMove',b.x+b.width/2+(s.x+s.width/2-b.x-b.width/2)*i/10,b.y+b.height/2+(s.y+s.height/2-b.y-b.height/2)*i/10);
    if(hold)await page.waitForTimeout(hold);await touch(cancel?'touchCancel':'touchEnd');
  }
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:844});const before=await state();
    await drag('[data-ws-upgrade="coordination"]');await page.waitForTimeout(1200);
    const socket=await page.locator('#ws-socket').boundingBox(),tool=await page.locator('#ws-tool').boundingBox();
    if(socket.y<0||tool.y+tool.height>844)throw Error('工具和连接点不能同屏');
    await page.screenshot({path:`output/playwright/mechanical-core/mobile-${width}-preview.png`});
    await drag('#ws-tool',400,true);if(JSON.stringify(await state())!==JSON.stringify(before))throw Error('取消施工扣费');
    await drag('#ws-tool');
    const hold=await page.locator('#ws-hold').boundingBox();
    await touch('touchStart',hold.x+hold.width/2,hold.y+hold.height/2);await page.waitForTimeout(1800);await touch('touchEnd');if((await state()).weaponParts[15].coordination!==before.weaponParts[15].coordination+1)throw Error('触控施工失败');
  }
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.setViewportSize({width:1280,height:960});
  while((await state()).weaponParts[15].coordination<8)await keyboardBuild();
  const max=await state();if(max.coins!==initial.coins-35*28||max.wood!==initial.wood-15*28)throw Error('七次升级总价错误');
  await page.screenshot({path:'output/playwright/mechanical-core/workshop-ten.png'});
  await page.locator('#ws-test').click();await page.waitForTimeout(3500);await page.screenshot({path:'output/playwright/mechanical-core/trial-ten.png'});
  await page.waitForTimeout(5000);await page.locator('#ws-trial-stop').click();if(JSON.stringify(await state())!==JSON.stringify(max))throw Error('试射污染进度');
  // 所有协同等级、伤害等级、其他部件与动作帧均绑定正式复核入口。
  const sampled=await page.evaluate(async()=>{
    const {renderVisualCase}=await import('/src/rendering/visual-review.js'),{equipmentParts}=await import('/src/config/equipment-parts.js');
    const c=document.createElement('canvas');c.width=500;c.height=360;let samples=0;
    for(const part of equipmentParts('weapons',15)) {let old='';for(let l=1;l<=part.max;l++){
      await renderVisualCase(c.getContext('2d'),`workshop-components-weapons-15-${part.key}`,l-1);
      const value=c.toDataURL();if(value===old)throw Error(`${part.key} 第 ${l} 级外观未变化`);old=value;samples++;
    }}
    const frames=[];for(const phase of [0,.1,.2,.35,.6,.9]){await renderVisualCase(c.getContext('2d'),'mechanical-core-ground-pack',phase);frames.push(c.toDataURL());}
    if(new Set(frames).size!==frames.length)throw Error('关节动画没有连续变化');return samples;
  });
  await page.locator('#ws-close').click();await page.reload();
  if((await state()).weaponParts[15].coordination!==8)throw Error('刷新丢失协同等级');
  if(errors.length)throw Error(errors.join('\n'));return {upgrades:7,count:10,sampled,inputs:['mouse','keyboard','touch320','touch390']};
}
