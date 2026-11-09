// 4175正式入口的生命周期检查；百分比只由后台任务完成推进。
async page=>{
 if(new URL(page.url()).port!=='4175')throw Error('请使用本地测试端口4175');const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 // 隔离应用使用内存存档，不清理当前浏览器的玩家数据。
 async function mount(){await page.evaluate(async()=>{(window.loadingApp||(await import('/src/main.js')).application).destroy();for(const d of document.querySelectorAll('dialog[open]'))d.close();const data=new Map();window.loadingApp=(await import('/src/app/create-app.js')).createApplication({getStorage:()=>({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)})});});}
 // 逐帧记录已经呈现的数字，复核100%出现在正式入场之前。
 async function start(){return page.evaluate(()=>{window.loadingSamples=[];window.loadingRun=(window.loadingRun||0)+1;const run=loadingRun;function sample(){if(run!==loadingRun)return;loadingSamples.push({p:+document.getElementById('start-loading-progress').getAttribute('aria-valuenow'),page:loadingApp.menu.page,hidden:document.getElementById('start-loading').hidden});if(loadingApp.menu.page!=='game')requestAnimationFrame(sample);}loadingApp.menu.enter();sample();return loadingSamples[0];});}
 await mount();await start();await page.waitForFunction(()=>loadingApp.menu.page==='game',null,{timeout:30000});
 if(!await page.evaluate(()=>loadingSamples.some(s=>s.p===100&&s.page==='title'&&!s.hidden)&&loadingSamples.every((s,i)=>!i||s.p>=loadingSamples[i-1].p)))throw Error('真实进度或完成顺序错误');checks.push('实际任务推进，100%后进入');
 await mount();await page.evaluate(()=>{const ready=loadingApp.renderer.ground.ready.bind(loadingApp.renderer.ground);window.releaseLoading=false;loadingApp.renderer.ground.ready=v=>releaseLoading&&ready(v);});await start();await page.waitForFunction(()=>+document.getElementById('start-loading-progress').getAttribute('aria-valuenow')===99,null,{timeout:30000});await page.waitForTimeout(200);if(await page.evaluate(()=>loadingApp.menu.page)!=='title')throw Error('未准备好提前进入');await page.evaluate(()=>releaseLoading=true);await page.waitForFunction(()=>loadingApp.menu.page==='game');checks.push('未就绪停留99，放行后完成');
 await mount();await page.evaluate(()=>{loadingApp.game.initializeWorldSteps=function*(){throw Error('验收建图失败');};});await start();await page.waitForFunction(()=>!document.getElementById('title-save-warning').hidden);if(await page.locator('#start-loading').isVisible())throw Error('失败后未退出过场');checks.push('失败恢复首页');
 await mount();await start();await page.evaluate(()=>loadingApp.destroy());await page.waitForTimeout(300);if(await page.locator('#start-loading').isVisible()||await page.evaluate(()=>loadingApp.menu.page)!=='title')throw Error('销毁后误入场');checks.push('销毁取消加载和入场');
 if(errors.length)throw Error(errors.join('; '));return {designCriterion:'start-game-loading',checks,errors};
}
