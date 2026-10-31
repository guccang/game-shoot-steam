// 实际鼠标与键盘施工回归，仅允许隔离端口；不会读取玩家正式存档。
async page => {
  if(new URL(page.url()).port!=='4186')throw Error('仅允许隔离端口 4186');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.reload();await page.setViewportSize({width:1280,height:960});await page.locator('#weapons-button').click();
  // 读取正式状态，只用于断言；所有工坊操作走可见交互。
  const state=()=>page.evaluate(async()=>JSON.parse(JSON.stringify((await import('/src/main.js')).application.game.progress)));
  // 选择部件后拖动到其真实连接点，确保鼠标和触控都使用局部热点。
  async function part(key) {await page.locator(`[data-ws-upgrade="${key}"]`).focus();await page.keyboard.press('Enter');await page.locator(`[data-ws-upgrade="${key}"]`).dragTo(page.locator('#ws-socket'));await page.waitForTimeout(1200);}
  // 工具头移动到连接点后按住施工，松开不重复提交。
  async function build(duration=1800) {
    const t=await page.locator('#ws-tool').boundingBox(),s=await page.locator('#ws-socket').boundingBox();
    await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();await page.mouse.move(s.x+s.width/2,s.y+s.height/2,{steps:12});await page.waitForTimeout(duration);await page.mouse.up();
  }
  const initial=await state();await part('rate');if(JSON.stringify(await state())!==JSON.stringify(initial))throw Error('试装扣费');
  await page.screenshot({path:'output/playwright/workshop-components/desktop-part-preview.png'});
  await build(450);if((await state()).weaponParts[0].rate!==initial.weaponParts[0].rate)throw Error('施工提前提交');
  await page.locator('[data-ws-item="14"]').click();if(await page.locator('#ws-discard').isVisible())throw Error('切换仍弹拦截');
  await page.locator('[data-ws-item="0"]').click();await part('rate');await build();
  const upgraded=await state();if(upgraded.weaponParts[0].rate!==initial.weaponParts[0].rate+1||upgraded.coins!==initial.coins-35*initial.weaponParts[0].rate)throw Error('工具施工未正确提交');
  await part('capacity');await page.locator('#ws-tool').focus();await page.keyboard.press('Enter');await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up('Space');
  if((await state()).weaponParts[0].capacity!==initial.weaponParts[0].capacity+1)throw Error('键盘施工失败');
  await part('reload');await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('quota');};});
  const beforeFailure=JSON.stringify(await state());await build();if(JSON.stringify(await state())!==beforeFailure)throw Error('保存失败污染状态');
  if(!(await page.locator('#ws-feedback').innerText()).includes('保存失败'))throw Error('缺少保存失败提示');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;delete window.originalStorageSet;});await build();
  if((await state()).weaponParts[0].reload!==initial.weaponParts[0].reload+1)throw Error('保存失败重试失败');
  // 在原截图的气垫船与脉冲炮路径后切换电锯，检查画布能够继续更新。
  await page.locator('[data-ws-mode="vehicle"]').click();const bounds=await page.locator('#workshop-dialog').boundingBox(),stage=await page.locator('#ws-stage').boundingBox();
  await page.locator('[data-ws-item="3"]').click();await page.locator('#ws-kits-tab').click();await page.locator('[data-ws-part="9"]').click();await page.locator('#ws-turret-upgrade').click();
  const expanded=await page.locator('#workshop-dialog').boundingBox(),nextStage=await page.locator('#ws-stage').boundingBox();
  if(Math.abs(bounds.width-expanded.width)>1||Math.abs(bounds.y-expanded.y)>1||Math.abs(stage.height-nextStage.height)>1)throw Error('炮塔检修引起整体缩放');
  await part('rate');await build();if((await state()).turretParts[9].rate!==2||(await state()).weaponParts[9].rate!==1)throw Error('炮塔成长串用手持等级');
  const vehicleImage=await page.locator('#ws-stage').evaluate(c=>c.toDataURL());
  await page.locator('[data-ws-mode="weapons"]').click();await page.locator('[data-ws-item="14"]').click();
  if(vehicleImage===await page.locator('#ws-stage').evaluate(c=>c.toDataURL()))throw Error('电锯预览残留载具');
  await page.screenshot({path:'output/playwright/workshop-components/chainsaw-after-pulse.png'});
  // 全部车体与可用炮塔经过实际挂载预览，不提交或切换出战对象。
  const beforeLoop=JSON.stringify(await state());
  for(let i=0;i<4;i++)for(const turret of [0,1,2,3,4,5,6,7,8,9,10,11,14]){
    await page.locator('[data-ws-mode="vehicle"]').click();await page.locator(`[data-ws-item="${i}"]`).click();await page.locator('#ws-kits-tab').click();await page.locator(`[data-ws-part="${turret}"]`).focus();await page.keyboard.press('Enter');await page.locator('#ws-socket').click();
    const matrix=await page.locator('#ws-stage').evaluate(c=>{const m=c.getContext('2d').getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f];});
    if(matrix.join(',')!=='1,0,0,1,0,0')throw Error('画布矩阵泄漏');
  }
  if(JSON.stringify(await state())!==beforeLoop)throw Error('反复试装改变正式进度');
  for(let n=0;n<12;n++){await page.locator('[data-ws-mode="weapons"]').click();await page.locator('[data-ws-mode="vehicle"]').click();}
  await page.locator('[data-ws-mode="weapons"]').click();await page.locator('#ws-test').click();await page.waitForTimeout(1500);await page.screenshot({path:'output/playwright/workshop-components/desktop-trial.png'});await page.locator('#ws-trial-stop').click();
  if(errors.length)throw Error(errors.join('\n'));console.log('鼠标、键盘、取消、保存失败、52 种炮塔预览与稳定布局通过');
}
