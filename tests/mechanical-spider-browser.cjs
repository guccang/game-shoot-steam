// 机械蜘蛛与重装爪的真实工坊、触摸/键盘施工和固定主炮试射验收。
async page=>{
 if(new URL(page.url()).port!=='4197')throw Error('只允许隔离端口');await page.reload();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,p=(await import('/src/progression/progress.js')).freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=15;p.coins=p.wood=999999;p.bosses=100;p.materials={parts:9999,crystal:9999,core:999};a.game.progress=p;a.game.reset();a.game.state='ready';a.save();a.refresh();const {catSprites}=await import('/src/rendering/cat-animation.js');if(!await catSprites.load())throw Error('角色图集缺失');});
 await page.setViewportSize({width:1280,height:960});await page.locator('#weapons-button').click();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 // 使用真实触摸轨迹拖入零件和工具。
 async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y}]});}
 // 货架可横向滚动，拖动开始前保证卡片可见。
 async function drag(selector){await page.locator(selector).scrollIntoViewIfNeeded();const b=await page.locator(selector).boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await touch('touchMove',b.x+b.width/2,b.y+b.height/2-12);const s=await page.locator('#ws-socket').boundingBox();await touch('touchMove',s.x+s.width/2,s.y+s.height/2);await touch('touchEnd');}
 const results=[];
 for(const width of [1280,390,320]) {
  await page.setViewportSize({width,height:width===1280?960:844});await page.locator('[data-ws-item="15"]').click();await page.locator('#ws-mechanical').click();
  if(await page.locator('[data-mechanical-gun="melee"] b').textContent()!=='重装近战爪')throw Error('默认爪未替换');
  await page.locator('[data-mechanical-gun="0"]').click();if(!(await page.locator('#mechanical-hp').textContent()).includes('60'))throw Error('远程生命错误');
  await page.locator('[data-mechanical-gun="melee"]').click();if(!(await page.locator('#mechanical-hp').textContent()).includes('300'))throw Error('重装生命错误');
  if(await page.locator('#mechanical-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+1))throw Error('配置溢出');
  await page.screenshot({path:`output/playwright/mechanical-spider/armor-${width}.png`});await page.locator('#mechanical-done').click();await page.locator('[data-ws-item="16"]').click();
  const before=await page.locator('#ws-stage').evaluate(c=>c.toDataURL());await page.screenshot({path:`output/playwright/mechanical-spider/spider-${width}-before.png`});
  if(width===1280){await page.locator('[data-ws-upgrade="coordination"]').focus();await page.keyboard.press('Enter');await page.locator('#ws-socket').focus();await page.keyboard.press('Enter');}
  else await drag('[data-ws-upgrade="coordination"]');
  await page.waitForTimeout(1200);const after=await page.locator('#ws-stage').evaluate(c=>c.toDataURL());if(before===after)throw Error('协同试装没有增加小蛛外观');
  if(width===1280){await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');await page.waitForTimeout(1700);await page.keyboard.up('Space');}
  else {await drag('#ws-tool');const b=await page.locator('#ws-hold').boundingBox();await touch('touchStart',b.x+b.width/2,b.y+b.height/2);await page.waitForTimeout(1700);await touch('touchEnd');}
  await page.waitForTimeout(1250);if(!(await page.locator('#ws-result-fields').textContent()).includes('近战蜘蛛'))throw Error('完成摘要归属错误');await page.screenshot({path:`output/playwright/mechanical-spider/spider-${width}-upgrade.png`});
  await page.locator('#ws-test').click();await page.waitForTimeout(4600);await page.screenshot({path:`output/playwright/mechanical-spider/trial-${width}-first.png`});await page.waitForTimeout(4000);await page.screenshot({path:`output/playwright/mechanical-spider/trial-${width}-second.png`});
  const trial=await page.locator('#ws-trial-time').textContent();if(!trial.includes('累计击破')||Number(trial.match(/累计击破\s*(\d+)/)?.[1])<1)throw Error('主炮未实际击破靶标');await page.locator('#ws-trial-stop').click();
  const bytes=await page.locator('#workshop-dialog canvas').evaluateAll(ns=>ns.reduce((n,c)=>n+c.width*c.height*4,0));if(bytes>5*1024*1024)throw Error('画布预算超限');results.push({width,trial,bytes});
  for(const index of [9,15,16,9,16])await page.locator(`[data-ws-item="${index}"]`).click();
 }
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 // 正式复核连续帧必须显示八足、收爪与蓄能变化。
 const samples=await page.evaluate(async()=>{const {renderVisualCase}=await import('/src/rendering/visual-review.js'),c=document.createElement('canvas');c.width=560;c.height=360;const out={};for(const id of ['mechanical-armored-claws','mechanical-spider']){const frames=[];for(const t of [0,.15,.35,.55,.8,1.15]){await renderVisualCase(c.getContext('2d'),id,t);frames.push(c.toDataURL());}out[id]=new Set(frames).size;}return out;});
 if(Object.values(samples).some(n=>n<5))throw Error('正式动作采样不足');await page.locator('#ws-close').click();if(errors.length)throw Error(errors.join('\n'));return {results,samples,errors};
}
