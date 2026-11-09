// 地貌与植被使用固定坐标噪声，独立于战斗随机流，保留现有地图数值。
export function terrainNoise(x,y){
 const n=Math.sin(x*12.9898+y*78.233)*43758.5453;
 return n-Math.floor(n);
}
