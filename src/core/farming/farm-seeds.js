import {shopDelivery,addShopStock} from '../economy/shop-delivery.js';
// 种子屋购买与野外掉落共用库存；购买先保存，掉落并入已有击杀奖励存档。
import {grantSeedReward} from '../../progression/economy/seed-reward.js';
import {recordGardeningAction} from '../../progression/story/mainline-gardening.js';
import {FARM_CROPS,FARM_SEED_DROP,FARM_SEED_DOOR,farmSeedPool} from '../../config/farm.js';
import {validateProgress} from '../../progression/progress.js';
import {commitFarm,storyFarmAllowed} from './farm.js';
import {recordEconomy} from '../../progression/economy/economy-ledger.js';
import {worldDistance} from '../../world/coordinates.js';
// 普通世界在屋内向售货员购种；剧情自由行动保留场景原有的门前交易。
export function canBuyFarmSeeds(game){return ['playing','paused'].includes(game.state)&&game.mapId==='forest'&&!game.realm&&storyFarmAllowed(game)&&(game.cottage?.kind==='seed'||!!game.story&&worldDistance(game.player,FARM_SEED_DOOR)<=125)&&!game.workshopTrial&&!game.fireActive&&!game.campDefense&&!game.arrivalCinematic;}
// 数量、解锁、余额和容量在每次提交时重新校验，失败不扣款。
export function buyFarmSeeds(game,cropId,count=1){
 const crop=FARM_CROPS[cropId];
 if(!Number.isInteger(cropId)||!crop||!Number.isSafeInteger(count)||count<1)return {ok:false,message:'请选择有效的种子与数量。'};
 if(!canBuyFarmSeeds(game))return {ok:false,message:'请进种子小屋与售货员交谈购买。'};
 const next=validateProgress(structuredClone(game.progress)),f=next.farm,cost=crop.cost*count;
 if(!f.unlocked[cropId])return {ok:false,message:'先获得一粒'+crop.name+'种子，即可永久解锁购买。'};
 const delivery=shopDelivery(game,'seed:'+cropId,count);if(!delivery.ok)return delivery;
 if(next.coins<cost)return {ok:false,message:'金币不足，需要 '+cost+' 金币。'};
 next.coins-=cost;
 for(const part of delivery.allocations)addShopStock(next,'seed:'+cropId,part.count,part.where);
 recordGardeningAction(next,'purchase',{crop:cropId,count});recordEconomy(next,'expense','farm:seed-shop',{coins:cost});
 return commitFarm(game,next,{action:'seed-purchased',message:delivery.message});
}
// 仅正式森林/湖谷击杀掉落；试射、预览、副本、活动和树木不会刷出永久种子。
export function awardFarmSeedDrop(game,target){
 if(target.monsterCamp||target.hp>0||!['enemy','boss'].includes(target.type)||!['forest','jiuzhaigou'].includes(game.mapId)||game.realm||game.story||game.workshopTrial||game.livingPreview||game.campDefense||game.fireActive||target.workshopTarget||target.football||target.fireEvent||target.livingRequest||(target.farmSeedSettled&&target.farmSeedSettled.id===target.id))return null;
 target.farmSeedSettled={id:target.id};const f=game.progress.farm,boss=target.type==='boss';
 // 普通野怪与清缴沿用原概率；找种任务只由真实怪物营地清空事务推进。
 if(!boss&&++f.seedDryKills<FARM_SEED_DROP.pity&&game.random()>=FARM_SEED_DROP.chance)return null;
 // 普通掉落、领主与保底共用阶段池，尚未开放的稀有品种不会被随机数抽中。
 f.seedDryKills=0;const pool=farmSeedPool(game.progress);let roll=game.random()*pool.reduce((sum,c)=>sum+c.weight,0),crop=pool.at(-1).index;
 for(const candidate of pool){roll-=candidate.weight;if(roll<0){crop=candidate.index;break;}}
 return grantSeedReward(game,game.progress,crop,boss?FARM_SEED_DROP.bossCount:1);
}
