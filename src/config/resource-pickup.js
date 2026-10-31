// 拾取表现预算与经济收益分离，多枚图标只表示一笔实际到账奖励。
// 发射保持连续，单枚快速吸入；减少动态独立保留缓速与低密度，不添加拖尾。
export const RESOURCE_PICKUP=Object.freeze({emitSeconds:1.6,flightSeconds:.32,flightVariation:.12,reducedFlightSeconds:.75,life:2.65,minIcons:6,maxIcons:12,drawLimit:96});
// 木材只用少量图标代表整笔收益，半秒左右收束，避免连续伐木时堆满角色周围。
export const WOOD_PICKUP=Object.freeze({emitSeconds:.18,flightSeconds:.26,flightVariation:.08,reducedFlightSeconds:.42,life:.7,minIcons:2,maxIcons:3});
