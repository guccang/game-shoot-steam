// 在正式试射界面观察击破、整批补靶与继续攻击，三种尺寸复核隔离状态和重新开始。
async page => {
  if(new URL(page.url()).port!=='4175')throw Error('游戏测试使用4175端口');
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application; await a.ready;
    const p=(await import('/src/progression/progress.js')).freshProgress();
    p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);
    p.vehicleLoadouts=[0,3,8,9];p.coins=p.wood=100000;p.mastery.fill(40);
    a.game.progress=p;
  });
  // 正式资源、熟练度、弹药与击杀数在试射前后必须完全相同。
  const state=()=>page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return JSON.stringify([g.progress,g.magazines,g.kills]);});
  const result=[];
  for(const [width,kind,index,preview] of [[1280,'weapons',16,false],[320,'weapons',16,true],[390,'vehicle',3,false]]){
    await page.bringToFront();
    await page.setViewportSize({width,height:width===1280?960:844});
    await page.evaluate(async({kind,index})=>(await import('/src/main.js')).application.workshop.open(kind,index),{kind,index});
    if(preview){await page.locator('[data-ws-upgrade="rate"]').click();await page.locator('#ws-socket').click();await page.waitForTimeout(1200);}
    const before=await state();
    await page.locator('#ws-test').click();
    await page.waitForFunction(()=>Number(document.getElementById('ws-trial-time').textContent.match(/第(\d+)批/)?.[1])>=2,{},{timeout:30000});
    await page.screenshot({path:`output/playwright/continuous-trial/refill-${width}.png`});
    await page.waitForFunction(()=>parseFloat(document.getElementById('ws-trial-time').textContent)>=10,{},{timeout:45000});
    const atTen=await page.locator('#ws-trial-time').innerText();
    await page.waitForFunction(()=>parseFloat(document.getElementById('ws-trial-time').textContent)>=13,{},{timeout:30000});
    const status=await page.locator('#ws-trial-time').innerText();
    if(Number(status.match(/累计击破 (\d+)/)?.[1])<=5)throw Error('补靶后没有继续击破 '+status);
    if(await state()!==before)throw Error('试射改变正式状态');
    await page.screenshot({path:`output/playwright/continuous-trial/end-${width}.png`});
    if(Number(status.match(/累计击破 (\d+)/)?.[1])<=Number(atTen.match(/累计击破 (\d+)/)?.[1]))throw Error('十秒后未继续攻击');
    await page.locator('#ws-trial-stop').click();
    if(await page.locator('#ws-trial').isVisible())throw Error('结束按钮未关闭试射');
    const stopped=await page.locator('#ws-trial-time').textContent();
    await page.waitForTimeout(400);
    if(await page.locator('#ws-trial-time').textContent()!==stopped)throw Error('结束后试射仍更新');
    result.push({width,kind,preview,atTen,status,stopped:true});
    await page.locator('#ws-test').click();
    await page.waitForFunction(()=>document.getElementById('ws-trial-time').textContent.startsWith('0.')&&document.getElementById('ws-trial-time').textContent.includes('第1批 · 累计击破 0'));
    await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
    if(await page.locator('#workshop-dialog').isVisible())throw Error('关闭仍然拦截');
  }
  if(errors.length)throw Error(errors.join('\n'));
  return result;
}
