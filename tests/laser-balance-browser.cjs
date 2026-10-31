// 在隔离端口验证排序后的画像、按钮、购买、升级与刷新存档，正式进度不受影响。
async (page) => {
  if(new URL(page.url()).port!=='4174') throw Error('仅允许隔离端口4174');
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    const a=(await import('/src/main.js')).application;
    a.destroy();
    const {freshProgress}=await import('/src/progression/progress.js');
    const p=freshProgress(); Object.assign(p,{bosses:2,coins:10000,wood:10000});
    localStorage.setItem('forest-patrol-v1',JSON.stringify(p));
  });
  await page.reload();
  await page.locator('#weapons-button').click();
  await page.locator('[data-category="all"]').click();
  const order=await page.locator('#inventory [data-portrait]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.portrait)));
  if(JSON.stringify(order)!=='[0,3,5,1,4,7,2,11,6,10,8,9,13,12]') throw Error('列表顺序错误');
  const cards=page.locator('#inventory .item-card');
  if(!(await cards.nth(1).innerText()).includes('橡果散弹枪')) throw Error('第二项名称错误');
  await cards.nth(1).locator('[data-action="buy"]').click();
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(state.weapon!==3||state.weapons[3]!==1||state.coins!==9350) throw Error('排序后购买错枪');
  const laser=cards.filter({has:page.locator('[data-portrait="1"]')});
  const text=await laser.innerText();
  for(const value of ['萤火激光步枪','4.2/秒','300','20','2.2 秒','最多 3 个目标'])
    if(!text.includes(value)) throw Error('激光参数显示不匹配：'+value);
  await laser.locator('[data-action="buy"]').click();
  await laser.locator('[data-action="upgrade"]').click();
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem('forest-patrol-v1')));
  if(state.weapon!==1||state.weapons[1]!==2||state.weapons[3]!==1||state.coins!==8115) throw Error('激光购买升级错位');
  await laser.scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/laser-balance-workshop.png'});
  await page.reload();
  if(!(await page.locator('#intro-weapon-name').innerText()).includes('激光')) throw Error('刷新后枪械错位');
  if((await page.locator('#intro-weapon-ammo').innerText())!=='20 发') throw Error('开始页弹夹未同步');
  await page.locator('#weapons-button').click();
  await page.locator('[data-category="all"]').click();
  if(!(await page.locator('.item-card.equipped').innerText()).includes('Lv.2')) throw Error('等级未保存');
  await page.setViewportSize({width:320,height:568});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('手机横向溢出');
  if(errors.length) throw Error(errors.join(';'));
  return {order,purchase:true,upgrade:true,persistence:true,errors};
}
