// 录下正式 Canvas 中的木门开合、步行与驾驶，不用独立动画预览替代。
async page=>{
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application,g=a.game;g.progress.arrival.phase='complete';g.arrivalScene=null;g.mainlineTalkDelay=999;g.progress.fireDispatch.pending=null;Object.assign(g.player,{x:415,y:1850});g.vehicle=g.vehicles[0];if(!g.vehicle.active)g.summonVehicle();a.refresh();
  const stream=a.renderer.canvas.captureStream(15),chunks=[];window.qaGateRecorder=new MediaRecorder(stream,{mimeType:'video/webm'});window.qaGateRecorder.ondataavailable=e=>chunks.push(e.data);window.qaGateRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));link.download='gate-passage.webm';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);};window.qaGateRecorder.start();});
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1400);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(500);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1600);await page.keyboard.up('ArrowRight');
 await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;if(a.game.vehicle.active)a.game.summonVehicle();Object.assign(a.game.player,{x:145,y:1040});a.refresh();});
 await page.keyboard.down('ArrowDown');await page.waitForTimeout(1100);await page.keyboard.up('ArrowDown');
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(800);await page.keyboard.up('ArrowRight');
 const download=page.waitForEvent('download');await page.evaluate(()=>window.qaGateRecorder.stop());await (await download).saveAs('output/playwright/arrival-world-polish/gate-passage.webm');
 return {recorded:true};
}
