// 每只猫独立保存本级经验，等级沿用 heroes，旧档不降级、不补发历史经验。
import {HEROES} from '../../config/heroes.js';
import {HERO_MAX_LEVEL,HERO_XP_PER_LEVEL} from '../../config/hero-experience.js';
export {HERO_MAX_LEVEL,HERO_TASK_XP} from '../../config/hero-experience.js';
// 每级所需经验递增，满级不再储存溢出经验。
export function heroNextXp(level){return level>=HERO_MAX_LEVEL?null:Math.max(1,level)*HERO_XP_PER_LEVEL;}
// 缺项、负数和非法数值归零，未拥有的猫不能预存经验。
export function normalizeHeroXp(raw,levels){return HEROES.map((_,i)=>levels[i]>0&&levels[i]<HERO_MAX_LEVEL&&Number.isFinite(raw?.[i])?Math.max(0,Math.min(1e7,Math.floor(raw[i]))):0);}
// 显示当前等级与本级进度，不改变玩家存档。
export function heroExperience(progress,index=progress.hero){const level=progress.heroes[index]||0,next=level?heroNextXp(level):null;return {level,xp:next?Math.min(next-1,Math.max(0,progress.heroXp?.[index]||0)):0,next};}
// 收据以累计经验差额表达跨级奖励，和升级门槛使用同一配置。
export function heroTotalXp(progress,index=progress.hero){const e=heroExperience(progress,index);return e.level*(e.level-1)*HERO_XP_PER_LEVEL/2+e.xp;}
// 升级不花资源，不治疗或改变车辆状态；超额经验可连续升多级。
export function awardHeroXp(progress,amount,index=progress.hero){
 if(!Number.isInteger(index)||!progress.heroes[index]||!Number.isFinite(amount)||amount<=0)return {gained:0,levels:0};
 progress.heroXp=normalizeHeroXp(progress.heroXp,progress.heroes);const before=progress.heroes[index],start=progress.heroXp[index];let left=start+Math.min(1e7,Math.floor(amount)),spent=0;
 while(progress.heroes[index]<HERO_MAX_LEVEL&&left>=heroNextXp(progress.heroes[index])){const cost=heroNextXp(progress.heroes[index]);left-=cost;spent+=cost;progress.heroes[index]++;}
 progress.heroXp[index]=progress.heroes[index]>=HERO_MAX_LEVEL?0:left;
 return {gained:spent+progress.heroXp[index]-start,levels:progress.heroes[index]-before,index,level:progress.heroes[index]};
}
