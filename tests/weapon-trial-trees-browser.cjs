// 真正走近采伐树与林缘，观察前后遮挡和实砍。
async page=>{
 if(new URL(page.url()).port!=='4292')throw Error('仅限隔离验收端口');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},recordVideo:{dir:'output/playwright/weapon-trial-trees',size:{width:390,height:844}}}),t=await context.newPage();
 await t.goto('http://localhost:4292');
 await t.evaluate(async()=>{(await import('/src/main.js')).application.destroy();const p=(await import('/src/progression/progress.js')).freshProgress();p.arrival=null;p.mainline.completed=[...(await import('/src/config/mainline.js')).MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=(await import('/src/config/town-restoration.js')).TOWN_RESTORATIONS.map(f=>f.id);p.weapons.fill(1);localStorage.setItem('forest-patrol-v1',JSON.stringify(p));localStorage.setItem('forest-patrol-gameplay-v1',JSON.stringify({pauseOnBlur:false}));});
 await t.reload();await t.locator('#start').click();
 await t.waitForFunction(async()=>{window.a=(await import('/src/main.js')).application;return a.menu.page==='game';});
 await t.evaluate(async()=>{window.readTrial=(await import('/src/ui/workshop/trial-scene.js')).inspectWeaponTrialScene;a.workshop.open('weapons',14);});
 await t.locator('#ws-test').click();await t.waitForFunction(()=>!!readTrial(document.getElementById('weapon-trial-dialog')));
 await t.keyboard.down('ArrowLeft');await t.keyboard.down('ArrowUp');await t.waitForTimeout(650);await t.keyboard.up('ArrowLeft');await t.keyboard.up('ArrowUp');
 await t.waitForFunction(()=>readTrial(document.getElementById('weapon-trial-dialog')).treesCut>0,{},{timeout:15000});
 await t.screenshot({path:'output/playwright/trial-chainsaw-cut.png'});
 const cut=await t.evaluate(()=>readTrial(document.getElementById('weapon-trial-dialog')).treesCut);
 await t.keyboard.down('ArrowDown');await t.waitForTimeout(3600);await t.keyboard.up('ArrowDown');
 await t.screenshot({path:'output/playwright/trial-tree-front.png'});
 await t.keyboard.down('ArrowUp');await t.waitForTimeout(900);await t.keyboard.up('ArrowUp');
 await t.screenshot({path:'output/playwright/trial-tree-behind.png'});
 await t.keyboard.down('ArrowRight');await t.waitForTimeout(800);await t.keyboard.up('ArrowRight');
 await t.screenshot({path:'output/playwright/trial-tree-side.png'});
 const video=await t.video().path();await context.close();await page.evaluate(result=>window.weaponTrialTreeResult=result,{cut,video});
}
