// 角色卡片只列武器和载具的最终加成，合并基础成长与专属天赋。
import {HEROES} from '../config/heroes.js';
import {heroGrowth} from '../config/economy.js';
import {heroTalent} from '../config/hero-talents.js';
// 百分数保留一位，移除末尾零。
function percent(value){return Number((value*100).toFixed(1));}
// 使用正式成长规则汇总当前角色效果，未拥有的角色展示一级预览。
export function heroGrowthMarkup(progress,index){
 const owned=progress.heroes[index]>0,level=Math.max(1,progress.heroes[index]||1),hero=HEROES[index];
 const common=hero.bonus*heroGrowth(level,progress),talent=heroTalent(progress,index,level);
 const hand=common*(talent.stat==='handDamage'?1+talent.bonus:1);
 const turret=common*(talent.stat==='turretDamage'?1+talent.bonus:1);
 const weapon=[`伤害 +${percent(hand-1)}%`],vehicle=[`机炮伤害 +${percent(turret-1)}%`];
 if(talent.stat==='handRate')weapon.push(`射速 +${percent(talent.bonus)}%`);
 if(talent.stat==='handReload')weapon.push(`装填速度 +${percent(talent.bonus)}%`);
 if(talent.stat==='hullHealth')vehicle.push(`最大耐久 +${percent(talent.bonus)}%（固定）`);
 if(talent.stat==='hullSpeed')vehicle.push(`移动速度 +${percent(talent.bonus)}%`);
 return `<section class="hero-growth" data-hero-growth="${index}" aria-label="${hero.name}的装备加成">${owned?'':'<p>1级预览</p>'}<p><b>武器加成</b>：${weapon.join(' · ')}</p><p><b>载具加成</b>：${vehicle.join(' · ')}</p></section>`;
}
