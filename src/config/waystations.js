// 驿站沿用世界单位；数量上限控制存档和场景标记，建立不消耗材料。
export const WAYSTATIONS=Object.freeze({limit:32,spacing:120,clearance:38,arrival:14,routeBudget:120000,searchSeconds:120,stuckSeconds:2,retries:3,obstacleCheck:.25,slowdownDistance:70});
// 名称组合仅负责中文显示；寻路与存档始终使用从1递增的独立ID。
export const WAYSTATION_NAME_HEADS=Object.freeze(['松风','鹿鸣','晴岚','溪月','竹影','青苔','花露','云杉','落星','晨雾','秋叶','白桦','萤火','远山','麦香','听雨']);
export const WAYSTATION_NAME_TAILS=Object.freeze(['小筑','林舍','草亭','驿站','歇脚亭','木屋','小憩处','风亭']);
