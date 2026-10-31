// 最终绘制、脉冲攻击与车载混合弹仓的真实界面复核。
async page => {
 if(new URL(page.url()).port!=='4197')throw Error('仅允许隔离端口');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.setViewportSize({width:1280,height:960});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.game.progress.vehicleLoadouts[0]=15;a.game.progress.funnelLoadout=[12,12,12];a.game.progress.weapon=15;a.game.progress.weaponParts[15].coordination=8;a.game.reset();a.game.state='ready';a.refresh();});
 await page.locator('#weapons-button').click();await page.locator('#ws-mechanical').click();await page.locator('[data-mechanical-gun="9"]').click();await page.locator('#mechanical-done').click();
 await page.locator('#ws-test').click();await page.waitForTimeout(8200);await page.screenshot({path:'output/playwright/mechanical-companions/pulse-hits.png'});
 const trial=await page.locator('#ws-trial').innerText();if(!/累计击破 [1-9]/.test(trial))throw Error('脉冲试射没有击破靶标：'+trial);
 await page.locator('#ws-trial-stop').click();await page.locator('[data-ws-mode="vehicle"]').click();await page.locator('[data-ws-item="0"]').click();await page.locator('#ws-kits-tab').click();
 await page.locator('[data-ws-part="12"]').click();await page.locator('#ws-socket').click();await page.locator('#ws-confirm').click();await page.locator('#ws-funnel').click();
 await page.locator('[data-funnel-slot="0"]').click();await page.locator('[data-loadout-weapon="9"]').click();await page.locator('#funnel-done').click();
 await page.locator('#ws-test').click();await page.waitForTimeout(6200);await page.screenshot({path:'output/playwright/mechanical-companions/vehicle-mixed-supply.png'});await page.locator('#ws-trial-stop').click();await page.locator('#ws-close').click();
 const sampled=await page.evaluate(async()=>{
  const {renderVisualCase}=await import('/src/rendering/visual-review.js');
  const canvas=document.createElement('canvas');canvas.id='companion-review';canvas.width=1040;canvas.height=520;canvas.style.cssText='position:fixed;z-index:9999;top:0;left:0;width:1040px;height:520px;background:#efe9c9';document.body.append(canvas);
  const c=canvas.getContext('2d');c.fillStyle='#efe9c9';c.fillRect(0,0,1040,520);const frames=[];
  for(const [i,phase] of [0,.1,.2,.35,.6,.9].entries()) {const frame=document.createElement('canvas');frame.width=520;frame.height=173;await renderVisualCase(frame.getContext('2d'),'mechanical-companions',phase);frames.push(frame.toDataURL());c.drawImage(frame,(i%2)*520,Math.floor(i/2)*173);}
  if(new Set(frames).size!==6)throw Error('连续姿态重复');return frames.length;
 });
 await page.locator('#companion-review').screenshot({path:'output/playwright/mechanical-companions/formal-frames.png'});await page.locator('#companion-review').evaluate(n=>n.remove());
 if(errors.length)throw Error(errors.join('\n'));return {sampled,trial,mixedVehicleSupply:true};
}
