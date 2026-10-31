// 手机工坊验证资格提示、资源门槛、购买扣费与刷新后装备保留。
async (page) => {
  if(new URL(page.url()).port!=='4174')throw Error('仅使用隔离测试端口4174');
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.setViewportSize({width:320,height:568});
  // 新页面载入时再应用夹具，避免旧页面退出保存覆盖待测进度。
  await page.addInitScript(()=>{const seed=sessionStorage.getItem('weapon-progression-fixture');if(seed){localStorage.setItem('forest-patrol-v1',seed);sessionStorage.removeItem('weapon-progression-fixture');}});
  // 仅在隔离测试浏览器写入场景存档，不影响日常游戏进度。
  async function seed(bosses, coins, wood) {
    await page.evaluate(({bosses,coins,wood})=>sessionStorage.setItem('weapon-progression-fixture',JSON.stringify({version:1,coins,wood,bosses,hero:0,weapon:0,heroes:[1,0],weapons:[1,0,0,0,0,0]})),{bosses,coins,wood});
    await page.reload(); await page.locator('#weapons-button').click();
  }
  await seed(0,10000,10000);
  if(await page.locator('[data-action="buy"]:disabled').count()!==12)throw Error('战绩不足仍能购买');
  if(!(await page.locator('.weapon-requirement').first().innerText()).includes('0 / 1'))throw Error('缺少资格进度');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.getElementById('camp-dialog').scrollWidth>document.getElementById('camp-dialog').clientWidth))throw Error('工坊窄屏溢出');
  await page.locator('.item-card').nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/weapon-progression-locked.png'});
  await seed(1,649,220);
  if(!await page.locator('[data-action="buy"][data-index="3"]').isDisabled())throw Error('金币不足仍能购买');
  await seed(1,650,220);
  if(await page.locator('[data-action="buy"][data-index="3"]').isDisabled())throw Error('达标后仍被锁定');
  if(!await page.locator('[data-action="buy"][data-index="1"]').isDisabled())throw Error('越级解锁激光步枪');
  await page.locator('[data-action="buy"][data-index="3"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(saved.coins!==0||saved.wood!==0||saved.bosses!==1||saved.weapon!==3||saved.weapons[3]!==1)throw Error('扣费或保存错误');
  await page.reload();await page.locator('#weapons-button').click();
  if(!(await page.locator('.item-card.equipped h3').innerText()).includes('橡果散弹枪'))throw Error('刷新丢失装备');
  if(errors.length)throw Error(errors.join(';'));
  return {lockedWithFunds:true,resourceGate:true,purchaseAndPersistence:true,mobileOverflow:false,errors};
}
