// 召唤物行动与取景预算；不改变装备属性、伤害或实体碰撞体。
export const SUMMON_PERCEPTION={radius:420,edgePixels:24,trialEdgePixels:8};
export const MECHANICAL_ESCORT={footRadius:65,vehicleRadius:112,largePackPadding:22,
  personalGap:56,bodyGap:46,footClearance:54,vehicleClearance:92,reselectDistance:52,stopDistance:9};

// 观察时长错峰；追赶有开始/结束距离滞回，防止边界来回切换。
export const SUMMON_RECOVERY={observeSeconds:.55,observeStagger:.12,returnEase:.4,
  fastSpeed:145,catchupExtra:105,settleExtra:35,maxGroundSpeed:600};
