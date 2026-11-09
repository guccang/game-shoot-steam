// 自动赠种逐批核验真实背包余量，超出时使用已有的营地种子仓。购买和主动领取另行结算。
import {FARM_STOCK_CAP} from '../../config/farm.js';
import {itemDefinition} from '../../config/items.js';
import {catLoad} from '../inventory/load-weight.js';
import {grantFarmSeeds} from '../farming/farm.js';

// 在调用方的候选存档内结算，连续掉落会看到前一批种子的重量和库存。
export function grantSeedReward(game,progress,crop,amount){
 const view=progress===game.progress?game:Object.assign(Object.create(game),{progress});
 const {weight,capacity}=catLoad(view),item=itemDefinition('seed:'+crop),farm=progress.farm;
 const toWarehouse=Math.round((weight+item.mass*amount)*1e6)/1e6>=capacity||farm.seeds[crop]+amount>FARM_STOCK_CAP;
 const discovered=!farm.unlocked[crop];
 let count;
 if(toWarehouse){
  const seeds=progress.warehouse.seeds;
  count=Math.min(amount,FARM_STOCK_CAP-seeds[crop]);
  seeds[crop]+=count;
  farm.unlocked[crop]=true;
 }else count=grantFarmSeeds(farm,crop,amount);
 const receipt=count?item.name+' +'+count+(toWarehouse?' · 已存入营地仓库':''):item.name+'未收取 · 种子仓已满';
 return {crop,count,unlocked:discovered,message:receipt+(discovered?' · 已解锁购买':'')};
}
