// 驿站沿用世界单位；数量上限控制存档和场景标记，建立不消耗材料。
export const WAYSTATIONS=Object.freeze({limit:32,spacing:120,clearance:38,arrival:14,routeBudget:120000,searchSeconds:120,stuckSeconds:2,retries:3,obstacleCheck:.25,slowdownDistance:70});
// 附近按地标边缘计算；名称查询只缓存有限位置，避免反复读档或打开手机重复计算。
export const WAYSTATION_NAMING=Object.freeze({nearby:260,cacheLimit:256});
// 名称组合仅负责中文显示；寻路与存档始终使用从1递增的独立ID。
export const WAYSTATION_NAME_HEADS=Object.freeze(['松风','鹿鸣','晴岚','溪月','竹影','青苔','花露','云杉','落星','晨雾','秋叶','白桦','萤火','远山','麦香','听雨']);
export const WAYSTATION_NAME_TAILS=Object.freeze(['小筑','林舍','草亭','驿站','歇脚亭','木屋','小憩处','风亭']);
// 用途仅用于显示分类，保存稳定标识，旧档或未知值统一归为通用。
export const WAYSTATION_PURPOSES=Object.freeze([
 {id:'scenery',name:'风景'},{id:'fishing',name:'钓鱼'},{id:'camp',name:'营地'},
 {id:'farm',name:'田地'},{id:'equipment',name:'装备'},{id:'general',name:'通用'},
].map(p=>Object.freeze(p)));
// 绘制与手机页面共用同一用途目录，显示文案不作为存档键。
export function waystationPurpose(id){return WAYSTATION_PURPOSES.find(p=>p.id===id)||WAYSTATION_PURPOSES.at(-1);}
// 牌面加宽后点击仍覆盖整块屋檐，落脚点与原导航位置保持一致。
export const WAYSTATION_SIGN=Object.freeze({width:94,height:42,top:-73,roofWidth:102,roofTop:-86,hitHalfWidth:55,hitBottom:12});
