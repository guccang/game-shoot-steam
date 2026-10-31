// 树冠物候、麦田安全边与原装备面板的补充验收，仅测试此次涉及的表现。
async page=>{
 const root='C:/Users/zhengtingjun/.codex/worktrees/art-style-options/game-shoot/output/playwright/idle-cat-pine-v2/';
 await page.goto('http://localhost:4176/?artPreview=idle-cat-pine');await page.waitForFunction(()=>document.getElementById('vehicle-button')?.getAttribute('aria-pressed')==='true',{},{timeout:60000});
 await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;});await page.setViewportSize({width:390,height:844});
 await page.locator('#field-menu-toggle').click();await page.locator('#vehicles-button').click();await page.screenshot({path:root+'vehicle-menu.png'});
 await page.locator('#ws-close').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&a.game.state==='playing');
 await page.locator('#field-menu-toggle').click();
 // 选择真实营地外树木，保留其风摆和图集，不添加验收专用装饰。
 const tree=await page.evaluate(()=>{const t=[...a.game.trees].filter(t=>['round','pine'].includes(t.variant||'round')).sort((a,b)=>Math.hypot(a.x-850,a.y-600)-Math.hypot(b.x-850,b.y-600))[0];t.hp=t.maxHp=100000;Object.assign(a.game.player,{x:t.x+110,y:t.y+80,vx:0,vy:0});a.renderer.camera.time=null;return {x:t.x,y:t.y,variant:t.variant};});
 const states=[];
 for(const [season,time]of [['summer','day'],['summer','night'],['autumn','day']]){
  await page.evaluate(async({season,time})=>{document.querySelector(`button[data-forest-season="${season}"]`).click();document.querySelector(`button[data-time="${time}"]`).click();a.renderer.seasons.reset(season);a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);},{season,time});await page.waitForTimeout(350);await page.screenshot({path:root+`forest-${season}-${time}.png`});states.push({season,time});
 }
 // 连续真实时钟采样，不改树木风摆或车轮相位。
 const first=await page.evaluate(()=>a.game.time);await page.waitForTimeout(450);const last=await page.evaluate(()=>a.game.time);if(last<=first)throw Error('主循环未运行');
 const field=await page.evaluate(async()=>(await import('/src/world/scenery.js')).WHEAT_FIELDS[0]);
 for(const [label,y]of [['behind',field.y-12],['front',field.y+(field.rows-1)*12+32]]){await page.evaluate(({x,y})=>{Object.assign(a.game.player,{x,y,vx:0,vy:0});a.renderer.camera.time=null;},{x:field.x+42,y});await page.waitForTimeout(250);await page.screenshot({path:root+`wheat-${label}.png`});}
 await page.goto('http://localhost:4176/?artPreview=idle-cat-pine');await page.waitForFunction(()=>document.getElementById('vehicle-button')?.getAttribute('aria-pressed')==='true',{},{timeout:60000});
 return {passed:true,tree,states,clock:[first,last],wheatRows:field.rows};
}
