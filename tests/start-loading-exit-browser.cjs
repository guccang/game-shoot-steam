// 正式手机入口逐帧记录100%后的车体与轮辐，保证驶出屏幕后才入场。
async original=>{
 const assert=require('node:assert/strict'),fs=require('node:fs'),out='output/playwright/start-loading-exit';fs.mkdirSync(out,{recursive:true});
 const context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:out+'/video',size:{width:390,height:844}}}),page=await context.newPage(),errors=[],reports=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://localhost:4175');await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;});
  for(const [width,height]of [[390,844],[320,568],[844,390]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{if(a.menu.page==='game'){a.game.pause();a.refresh();a.menu.home();}window.exitSamples=[];window.entryDone=false;
    // 采集正式DOM的呈现位置，不修改动画时钟或缩放动画时长。
    function sample(){const panel=document.getElementById('start-loading'),van=document.getElementById('start-loading-van'),box=van.getBoundingClientRect(),edge=document.getElementById('game-frame').getBoundingClientRect().right;exitSamples.push({time:performance.now(),percent:+document.getElementById('start-loading-progress').getAttribute('aria-valuenow'),hidden:panel.hidden,page:a.menu.page,x:box.x,right:box.right,edge,wheel:getComputedStyle(document.querySelector('.start-loading-wheel')).transform});if(a.menu.page==='game'){entryDone=true;return;}requestAnimationFrame(sample);}a.menu.enter();sample();
   });
   await page.waitForFunction(()=>exitSamples.some(s=>s.percent===100&&!s.hidden),null,{timeout:30000});await page.screenshot({path:`${out}/exit-${width}.png`});await page.waitForFunction(()=>entryDone);
   const samples=await page.evaluate(()=>exitSamples),exit=samples.filter(s=>s.percent===100&&!s.hidden);assert.ok(exit.length>=5);assert.ok(Math.abs(exit[0].right-exit[0].edge)<5);assert.ok(exit.at(-1).x-exit[0].x>80);assert.ok(exit.every((s,i)=>s.page==='title'&&(!i||s.x>=exit[i-1].x)));assert.ok(new Set(exit.map(s=>s.wheel)).size>1);assert.ok(samples.at(-1).time-exit[0].time>=400);reports.push({width,height,samples});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{a.game.pause();a.refresh();a.menu.home();a.menu.enter();});await page.waitForFunction(()=>a.menu.page==='game');assert.equal(await page.locator('#start-loading-road').evaluate(n=>n.style.transform),'');
  assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({designCriterion:'start-game-loading',reports,errors},null,2));return {sizes:reports.map(r=>({width:r.width,exitFrames:r.samples.filter(s=>s.percent===100&&!s.hidden).length})),errors};
 }finally{await context.close();}
}
