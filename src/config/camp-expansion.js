// 面积扩建费用按用户确认标准：每次+10%，金币和材料逐次上涨50%。
export const CAMP_EXPANSION={rate:1.1,baseArea:1.2,maxLevel:27,cost:{coins:10000,wood:2000,stone:500},priceRate:1.5};
// 向上取整保证展示和扣款完全一致，层数同时约束世界北界。
export function campExpansionCost(level){return Object.fromEntries(Object.entries(CAMP_EXPANSION.cost).map(([k,n])=>[k,Math.ceil(n*Math.pow(CAMP_EXPANSION.priceRate,level))]));}
