// 奖励收据只读取事务前后的差额，不发放资源、不修改存档或重复领取。
import {campProgress} from '../camp/camp-level.js';
import {heroExperience,heroTotalXp} from '../player/hero-experience.js';
const RESOURCE_KEYS=['coins','wood','parts','crystal','core'];
// 资源达到上限或装备已拥有时，只记录本次确实到账的部分。
export function rewardReceipt(before,after,title){
 const reward={},equipment=[];
 for(const key of RESOURCE_KEYS){const amount=(after.materials?.[key]??after[key]??0)-(before.materials?.[key]??before[key]??0);if(amount>0)reward[key]=amount;}
 for(const [field,kind] of [['vehicleHulls','vehicle'],['weapons','weapon']])for(let index=0;index<(after[field]?.length||0);index++)if(after[field][index]>0&&!(before[field]?.[index]>0))equipment.push({kind,index});
 const q=campProgress(after),previous=campProgress(before),gained=q.xp-previous.xp;
 const hero=after.hero,old=heroExperience(before,hero),now=heroExperience(after,hero),heroGained=heroTotalXp(after,hero)-heroTotalXp(before,hero);
 return {title,reward,equipment,...(heroGained>0?{heroExperience:{...now,index:hero,gained:heroGained,previousLevel:old.level}}:{}),...(gained>0?{challenge:{...q,previousTier:previous.tier,gained}}:{})};
}
