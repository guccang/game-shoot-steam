// 使用真实音频节点和点击/触摸验收解锁、试听、增益与静音；不替换正式音色和音乐。
async page=>{
 if(new URL(page.url()).port!=='4285')throw Error('仅允许隔离端口');
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(window.__audioProbeInstalled)return;window.__audioProbeInstalled=true;
  // 只旁路采样输出，不改变正式扬声器连接。
  const Original=window.AudioContext||window.webkitAudioContext;
  window.AudioContext=class extends Original{
   constructor(...args){super(...args);window.audioProbe={context:this,gains:[],analyser:this.createAnalyser()};audioProbe.analyser.fftSize=2048;}
   createGain(){const gain=super.createGain();audioProbe.gains.push(gain);return gain;}
   createDynamicsCompressor(){const node=super.createDynamicsCompressor();node.connect(audioProbe.analyser);return node;}
  };
 });
 // 多帧采样而不是仅检查声源数量，零增益与非零音频有不同结果。
 async function signal(){return page.evaluate(async()=>{
  let peak=0;const data=new Float32Array(audioProbe.analyser.fftSize);
  for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,16));audioProbe.analyser.getFloatTimeDomainData(data);for(const n of data)peak=Math.max(peak,Math.abs(n));}
  return {peak,gains:audioProbe.gains.slice(0,3).map(g=>g.gain.value),state:audioProbe.context.state};
 });}
 for(const width of [1280,390]){
  await page.evaluate(async()=>{(await import('/src/main.js')).application.destroy();localStorage.clear();});await page.reload();await page.setViewportSize({width,height:844});
  const cold=await page.evaluate(async()=>({device:!!window.audioProbe,preferences:(await import('/src/main.js')).application.audio.preferences}));
  if(cold.device||!cold.preferences.enabled)throw Error('首页提前创建设备或默认静音');
  const cdp=await page.context().newCDPSession(page);
  // 手机上用真实触摸抬指，不用 DOM click 冒充用户手势。
  async function click(selector){if(width!==390)return page.locator(selector).click();await page.waitForFunction(s=>{const e=document.querySelector(s);return e&&!e.disabled&&!e.closest('[inert]')&&e.getBoundingClientRect().width>0;},selector);await page.locator(selector).scrollIntoViewIfNeeded();await page.evaluate(()=>{window.touchClickDone=false;document.addEventListener('click',()=>{window.touchClickDone=true;},{once:true,capture:true});});const b=await page.locator(selector).boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>window.touchClickDone);}
  if(width===390)await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await click('#start');await page.waitForFunction(async()=> (await import('/src/main.js')).application.menu.page==='game');
  await page.waitForFunction(async()=> (await import('/src/main.js')).application.audio.diagnostics.music);
  const entered=await signal();if(entered.peak<.00001||entered.state!=='running')throw Error('进入后音频输出为空');
  await click('#settings-button');await page.locator('#music-volume').fill('100');await page.locator('#effects-volume').fill('0');
  const loud=await signal();await page.locator('#music-volume').fill('10');const quiet=await signal();
  if(loud.peak<.00001||quiet.gains[1]>.2||quiet.gains[1]<.09)throw Error('音乐滑块没有调节正式增益 '+JSON.stringify({loud,quiet}));
  await page.locator('#music-volume').fill('0');await signal();const silent=await signal();if(silent.peak>.00001)throw Error('双音轨归零后仍发声');
  await page.locator('#effects-volume').fill('80');const preview=await signal();if(preview.peak<.00001||preview.gains[2]<.7)throw Error('音效试听无输出');
  await page.screenshot({path:`output/playwright/audio-unlock-settings/settings-${width}.png`});
  await click('#sound');await signal();const muted=await signal();
  if(muted.peak>.00001||!await page.locator('#effects-volume').isDisabled())throw Error('静音没有停止输出');
  await click('#close-settings');await page.reload();
  await click('#start');await page.waitForFunction(async()=> (await import('/src/main.js')).application.menu.page==='game');
  const saved=await page.evaluate(async()=>({device:!!window.audioProbe,prefs:(await import('/src/main.js')).application.audio.preferences}));
  if(saved.device||saved.prefs.enabled||saved.prefs.effects!==.8||saved.prefs.music!==0)throw Error('静音/音量未保存');
  await click('#settings-button');await click('#sound');await page.locator('#music-volume').fill('35');await click('#close-settings');
  const resumed=await signal();if(resumed.peak<.00001)throw Error('重新开启仍无声音');
  // 暂停设置中关闭战斗声，返回战场后真实事件仍能输出枪声。
  await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;a.audio.setVolume('music',0);});await signal();
  const shot=await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;const before=a.audio.diagnostics.cached;a.game.onEvent('shot',{kind:'pistol'});return a.audio.diagnostics.cached>before;});
  const gun=await signal();if(!shot||gun.peak<.00001)throw Error('战场枪声无输出 '+JSON.stringify({shot,gun,phase:await page.evaluate(async()=>{const a=(await import('/src/main.js')).application;return {page:a.menu.page,state:a.game.state};})}));
  checks.push({width,entered,loud,quiet,silent,preview,muted,saved,resumed,gun});await cdp.detach();
 }
 // 首页设置没有游戏帧循环，也必须立即试听并在关闭时停止。
 await page.reload();await page.evaluate(()=>import('/src/main.js'));await page.locator('#title-settings').click();await page.locator('#music-volume').fill('50');
 const titlePreview=await signal();if(titlePreview.peak<.00001)throw Error('首页设置不能试听');await page.locator('#close-settings').click();await signal();const titleSilent=await signal();if(titleSilent.peak>.00001)throw Error('关闭首页设置未停止试听');
 if(errors.length)throw Error(errors.join('\n'));return {checks,titlePreview,titleSilent,errors};
}
