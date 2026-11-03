// 鱼竿和鱼饵的价格、负重、可钓等级与偏好倍率；概率预览和正式抽取共用。
export const FISHING_RODS={
 rod:{name:'湖岸鱼竿套装',coins:80,mass:1.2,tier:1,control:1,description:'入门鱼竿，可钓常见鱼。'},
 reed:{name:'青苇柔韧竿',coins:240,mass:1.3,tier:2,control:1.08,description:'可钓常见、少见鱼，收线更稳定。'},
 cedar:{name:'杉木强韧竿',coins:650,mass:1.4,tier:3,control:1.16,description:'可钓稀有及以下鱼种，适合探索不同湖泊。'},
 crystal:{name:'晶丝精工竿',coins:1600,mass:1.5,tier:4,control:1.24,description:'可钓珍奇及以下鱼种，提高高阶鱼的相对权重。'},
 star:{name:'星辉大师竿',coins:3800,mass:1.6,tier:5,control:1.32,description:'可钓全部等级，包括传说鱼；仍需正确控竿。'}
};
export const FISHING_BAITS={
 bait:{name:'谷物鱼饵',coins:10,mass:.01,pack:20,description:'谷物香味，适合偏好谷物的鳞鱼与叶鱼。'},
 worm:{name:'蚯蚓鱼饵',coins:24,mass:.012,pack:20,description:'适合须鱼、溪鱼与部分洞鱼。'},
 insect:{name:'昆虫鱼饵',coins:32,mass:.008,pack:20,description:'适合溪鱼、帆鱼与部分灯鱼。'},
 shrimp:{name:'鲜虾鱼饵',coins:40,mass:.015,pack:20,description:'适合鲈鱼、珠鱼与甲鱼。'},
 algae:{name:'水藻鱼饵',coins:20,mass:.01,pack:20,description:'适合叶鱼和带鱼。'},
 glow:{name:'荧菌鱼饵',coins:50,mass:.01,pack:20,description:'适合地下洞鱼、灯鱼和部分甲鱼。'}
};
export const FISH_BASE_WEIGHTS=[100,45,18,5,1];
// 旧档竿和谷物仍沿用原字段，扩展装备使用独立库存，避免重复计重。
export function rodOwned(p,id){return id==='rod'?p.rod===true:p.rods?.[id]===true;}
export function baitCount(p,id){return id==='bait'?p.bait||0:p.baits?.[id]||0;}
// 每档鱼竿均保留低阶鱼，高阶竿逐步提升高阶鱼的相对权重。
export function fishCatchWeight(fish,rodId,baitId,water){const rod=FISHING_RODS[rodId];if(!Object.hasOwn(FISHING_RODS,rodId)||!Object.hasOwn(FISHING_BAITS,baitId)||fish.tier>rod.tier||!fish.waters.includes(water))return 0;return FISH_BASE_WEIGHTS[fish.tier-1]*(fish.favoriteBait===baitId?4:1)*(1+.2*(rod.tier-1)*(fish.tier-1));}
