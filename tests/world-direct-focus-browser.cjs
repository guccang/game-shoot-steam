// 只补验热点持续聚焦、触屏轮廓、入职工坊与角色绕行，不重复整套昼夜截图。
async page=>{
 const checks=[];
 // 正式场景走位录像保留原载具动作和建筑前后遮挡。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.state==='paused')a.game.state='playing';a.game.mainlineSpeech=null;a.game.mainlineTalkDelay=999;window.sceneRecording={chunks:[]};const r=window.sceneRecording;r.stream=a.renderer.canvas.captureStream(20);r.recorder=new MediaRecorder(r.stream,{mimeType:'video/webm'});r.recorder.ondataavailable=e=>{if(e.data.size)r.chunks.push(e.data);};r.recorder.start();});
 for(const key of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']){await page.keyboard.down(key);await page.waitForTimeout(700);await page.keyboard.up(key);}
 const download=page.waitForEvent('download');await page.evaluate(async()=>{const r=window.sceneRecording;await new Promise(resolve=>{r.recorder.onstop=resolve;r.recorder.stop();});const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(r.chunks,{type:'video/webm'}));link.download='scene-walk.webm';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);for(const t of r.stream.getTracks())t.stop();});await(await download).saveAs('output/playwright/world-direct-interaction/scene-walk.webm');checks.push('正式镜头与载具绕行录像');
 // 入职阶段仍通过同一建筑修复和制作，不能因为去掉标签而失去入口。
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival={version:2,phase:'repair',elapsed:0,wood:100,keys:true,parked:true,x:480,y:700};p.wood=100;localStorage.setItem('forest-patrol-v1',JSON.stringify(p));});await page.reload();await page.locator('#start').click();await page.waitForTimeout(400);
 const n=page.locator('[data-workshop-kind="weapons"].scene-hit');await n.focus();await page.waitForTimeout(400);if(await page.evaluate(()=>document.activeElement.dataset.workshopKind)!=='weapons')throw Error('持续焦点丢失');await page.keyboard.press('Enter');if(!await page.locator('#arrival-workshop-dialog').isVisible())throw Error('入职工坊入口失效');checks.push('入职建筑直接进入及持续键盘焦点');await page.screenshot({path:'output/playwright/world-direct-interaction/arrival-building.png'});
 return {checks};
}
