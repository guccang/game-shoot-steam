// 真实触屏交谈、分层线索、读档与购物回归；固定准备状态后使用正式 UI 接话。
async original=>{
 const out='output/playwright/npc-story-dialogue/',context=await original.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
  await page.goto('http://localhost:4175');await page.locator('#start').tap();
  await page.evaluate(async()=>{
   window.a=(await import('/src/main.js')).application;await a.ready;await document.fonts.ready;
   const p=(await import('/src/progression/progress.js')).freshProgress(),ids=(await import('/src/config/mainline.js')).MAINLINE_IDS,repairs=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS;
   window.living=await import('/src/core/camp/living-world.js');window.camp=await import('/src/core/camp/camp-routines.js');window.rooms=await import('/src/config/workshop-interiors.js');window.cottage=await import('/src/core/home/cottage.js');window.wild=await import('/src/config/monster-camps.js');
   p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...ids];p.mainline.phase='complete';p.restoration.repaired=repairs.map(f=>f.id);p.restoration.cottageRested=true;p.coins=1000;
   const g=a.game;g.progress=p;g.reset();g.state='playing';g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.vehicle.active=false;g.attackTimer=g.spawnTimer=g.fireClock=999;g.player.invincible=999;
   const actor=camp.campResidents(g).find(n=>n.id==='oak');actor.remaining=999;Object.assign(g.player,{x:actor.x,y:actor.y+65});a.renderer.camera.time=null;a.refresh();
  });
  await page.locator('[data-camp-conversation=oak]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();
  if(await page.locator('#npc-conversation-title').textContent()!=='阿栎师傅')throw Error('营地人物身份错误');
  const first=await page.locator('[data-npc-text]').textContent();await page.waitForTimeout(250);if(await page.evaluate(()=>a.game.progress.npcDialogue['camp:oak'].count)!==1)throw Error('重绘增加交情');
  await page.locator('[data-npc-next]').tap();if(await page.locator('[data-npc-text]').textContent()===first)throw Error('连续对白重复');
  await page.locator('[data-npc-close]').tap();await page.waitForFunction(()=>a.game.state==='playing');if(await page.locator('#npc-conversation-dialog').isVisible())throw Error('关闭后对白仍显示');
  // 正式居民点击与任务按钮共存，初次聊天不能直接发放全部探索线索。
  await page.evaluate(()=>{const r=living.livingResidents(a.game).find(r=>r.id==='owl');Object.assign(a.game.player,{x:r.x,y:r.y+65});a.renderer.camera.time=null;});
  await page.locator('[data-resident=owl]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();
  if(await page.evaluate(()=>a.game.progress.treasure.clues.length)!==0)throw Error('初识提前给秘密');
  for(let i=0;i<6;i++)await page.locator('[data-npc-next]').tap();
  if(await page.locator('[data-npc-stage]').textContent()!=='交心'||!await page.locator('[data-npc-note]').textContent())throw Error('第七次未解锁线索');
  const before=await page.evaluate(()=>({count:a.game.progress.npcDialogue['resident:owl'].count,clues:[...a.game.progress.treasure.clues],tasks:JSON.stringify(a.game.progress.living.requests)}));
  if(before.clues.join()!=='bastion')throw Error('线索错配');
  // 320短屏与390长屏的昼夜纸面、滚动正文、44像素按钮和关闭入口。
  for(const [width,height] of [[320,568],[390,844]])for(const time of ['day','night']){
   await page.setViewportSize({width,height});await page.evaluate(async time=>{Object.assign(a.environment,{time,weather:'sun',autoTime:false,autoWeather:false,livingPreview:true});a.renderer.light=new(await import('/src/world/environment.js')).EnvironmentTransition(a.environment,0);a.renderer.tone=new(await import('/src/rendering/scene-tone.js')).SceneTone(a.environment,0);a.renderer.camera.time=null;a.refresh();},time);await page.waitForTimeout(100);
   const metrics=await page.locator('#npc-conversation-dialog').evaluate(node=>{const r=node.getBoundingClientRect(),buttons=[...node.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>{const p=b.getBoundingClientRect();return {width:p.width,height:p.height,top:p.top,bottom:p.bottom};});return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:node.scrollWidth<=node.clientWidth,buttons};});
   if(metrics.left<-.5||metrics.right>width+.5||metrics.bottom>height+.5||!metrics.scroll||metrics.buttons.some(b=>b.width<44||b.height<44||b.top<metrics.top||b.bottom>metrics.bottom))throw Error('手机对白溢出 '+JSON.stringify(metrics));
   await page.screenshot({path:out+width+'-'+time+'.png'});checks.push({width,height,time,metrics});
  }
  await page.locator('[data-npc-service]').tap();await page.locator('#living-dialog[open]').waitFor();if(await page.evaluate(()=>JSON.stringify(a.game.progress.living.requests))!==before.tasks)throw Error('查看事务自动接单');await page.locator('#living-close').tap();await page.waitForFunction(()=>a.game.state==='playing');
  if(!await page.locator('#phone-button').isVisible())await page.locator('#field-menu-toggle').tap();await page.locator('#phone-button').tap();await page.locator('[data-pack-action=treasure]').tap();await page.locator('[data-treasure-site=bastion]').waitFor();await page.screenshot({path:out+'phone-clue.png'});
  // 刷新加载正式持久化，不手工复制交情；关闭事务页不增加次数。
  await page.reload();await page.locator('#start').tap();await page.evaluate(async()=>{window.a=(await import('/src/main.js')).application;await a.ready;window.rooms=await import('/src/config/workshop-interiors.js');window.cottage=await import('/src/core/home/cottage.js');window.wild=await import('/src/config/monster-camps.js');a.game.attackTimer=a.game.spawnTimer=a.game.fireClock=999;a.game.enemies=[];a.game.trees=[];a.game.mainlineSpeech=null;a.game.player.invincible=999;});
  const restored=await page.evaluate(()=>({count:a.game.progress.npcDialogue['resident:owl'].count,clues:a.game.progress.treasure.clues}));if(restored.count!==7||restored.clues.join()!=='bastion')throw Error('读档丢失交情或线索');
  // 实际走入补给铺，点击店员先闲聊，再转入原购买服务并验证扣款。
  await page.evaluate(()=>{Object.assign(a.game.player,rooms.WORKSHOP_INTERIORS.ammo.door,{vx:0,vy:0});a.game.cottageDoorLatch=false;a.renderer.camera.time=null;});await page.waitForFunction(()=>a.game.cottage?.kind==='ammo');
  await page.locator('[data-room-item=shopkeeper]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();if(await page.locator('#npc-conversation-title').textContent()!=='弹药补给员')throw Error('店员对白未接入');
  await page.locator('[data-npc-service]').tap();await page.locator('#field-equipment-dialog[open]').waitFor();await page.locator('[data-supply-target=hand]').tap();const coins=await page.evaluate(()=>a.game.progress.coins);await page.locator('[data-ammo-buy=light]').tap();if(await page.evaluate(()=>a.game.progress.coins)!==coins-30)throw Error('购买流程被闲聊阻断');await page.screenshot({path:out+'shop-service.png'});
  // 野外具名人物仍通过正式附近交互，读旧故事不会提前给灰堆秘密。
  await page.evaluate(()=>{for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();});await page.waitForFunction(()=>a.game.state==='playing');
  await page.evaluate(()=>{cottage.leaveCottage(a.game);const c=wild.MONSTER_CAMPS.find(c=>c.id==='ember-pot');Object.assign(a.game.player,wild.campCharacterSite(c));a.game.player.invincible=999;a.game.attackTimer=999;a.renderer.camera.time=null;});
  await page.locator('#nearby-interaction[data-target=ember-pot-character]').tap();await page.locator('#npc-conversation-dialog[open]').waitFor();if(await page.locator('#npc-conversation-title').textContent()!=='灰耳')throw Error('野外人物没有接入');
  await page.locator('[data-npc-service]').tap();await page.locator('#monster-camps-dialog[open]').waitFor();await page.locator('[data-camp-next]').tap();await page.locator('[data-camp-next]').tap();if(await page.evaluate(()=>a.game.progress.monsterCamps.clues.length)!==0)throw Error('旧故事绕过熟悉程度');
  if(errors.length)throw Error(errors.join('\n'));return {designCriterion:'npc-story-dialogue',checks,before,restored,shopPurchase:true,wildStory:true,errors};
 }catch(e){await page.screenshot({path:out+'failure.png'});throw e;}finally{await context.close();}
}
