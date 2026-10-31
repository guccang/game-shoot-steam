// 野外示范田固定位置、规模与首茬作物；坐标是方田左上角田格中心，不参与随机刷新。
export const WILD_FARM_SITES=Object.freeze({
 forest:[{x:1341,y:516,size:2,crop:1},{x:893,y:2752,size:3,crop:3},{x:2853,y:2856,size:4,crop:0}],
 jiuzhaigou:[{x:2405,y:1816,size:2,crop:3},{x:1789,y:2804,size:3,crop:1},{x:4421,y:2544,size:4,crop:0}],
});
// 大世界额外散布小方田：每个区域最多一处，首茬仅使用常见作物，不额外解锁种子。
export const WILD_FARM_SCATTER=Object.freeze({version:1,seed:291029,columns:6,rows:5,attempts:48,minSeparation:480,crops:[0,1,3],minRoadOffset:125,maxRoadOffset:300});
