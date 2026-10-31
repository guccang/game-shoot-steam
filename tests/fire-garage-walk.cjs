// 从车库门前连续绕到侧面与背后，原脚步、武器、遮挡和世界碰撞均运行。
async page=>{
 const samples=[];
 // 保存每个实际到达的落点和截图，不通过改坐标制造绕行结果。
 async function capture(label){const state=await page.evaluate(async()=>{const g=(await import('/src/main.js')).application.game;return {x:g.player.x,y:g.player.y,parked:g.fireGarageParked,driving:g.vehicle.active,hp:g.vehicles[4].hp,wheel:g.vehicles[4].wheelPhase};});if(!state.parked||state.driving)throw Error('绕行时车库状态丢失');samples.push({label,...state});await page.screenshot({path:`output/playwright/fire-garage/walk-${label}.png`});}
 // 使用真实持续按键，停下后让原动作系统自然收步。
 async function walk(key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(180);}
 await capture('front');await walk('d',570);await capture('side');await walk('w',740);await walk('a',530);await capture('behind');await walk('d',530);await walk('s',740);await walk('a',530);await capture('return');
 if(Math.hypot(samples[1].x-samples[0].x,samples[1].y-samples[0].y)<30||samples[2].y>=1100)throw Error('未实际走到侧面和屋后');
 if(samples[0].wheel!==samples[3].wheel)throw Error('停驻车轮随步行转动');await page.evaluate(async()=>{(await import('/src/main.js')).application.game.pause();});return {designCriterion:'fire-station-garage',samples};
}
