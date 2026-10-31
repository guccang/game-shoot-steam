import growth from './content/growth.json' with {type:'json'};
import monsters from './content/monsters.json' with {type:'json'};
// 玩法数据表：成组条目整体配置，正式执行器和数值目录共用同一份数据。
export const GAMEPLAY_TABLES = {
  "masteryRewards": growth.masteryRewards,
  "enemyAttacks": {
    "normal": {
      "reach": 100,
      "windup": 0.48,
      "lunge": 0.18,
      "returning": 0.32,
      "recovery": 0.55,
      "damage": 8
    },
    "tough": {
      "reach": 116,
      "windup": 0.64,
      "lunge": 0.24,
      "returning": 0.4,
      "recovery": 0.65,
      "damage": 13
    }
  },
  "sporeOffsets": [
    [
      0,
      0
    ],
    [
      -130,
      -60
    ],
    [
      130,
      -60
    ]
  ],
  "featherAngles": [
    -0.76,
    -0.38,
    0,
    0.38,
    0.76
  ],
  "enemyMassByRank": monsters.ranks.enemyMassByRank,
  "enemyHealthByRank": monsters.ranks.enemyHealthByRank,
  "enemyDamageByRank": monsters.ranks.enemyDamageByRank,
  "enemyRadiusByRank": [
    17,
    21,
    25
  ],
  "projectileProfiles": {
    "default": {
      "drag": 0.08,
      "lift": 15,
      "gravity": 160,
      "groundBounces": 0
    },
    "funnel": {
      "drag": 0,
      "lift": 0,
      "gravity": 0,
      "groundBounces": 0
    },
    "drone": {
      "drag": 0,
      "lift": 0,
      "gravity": 0,
      "groundBounces": 0
    },
    "flame": {
      "drag": 0.4,
      "lift": 0,
      "gravity": 0,
      "groundBounces": 0
    },
    "water": {
      "drag": 0.85,
      "lift": 50,
      "gravity": 210,
      "groundBounces": 0
    },
    "shotgun": {
      "drag": 0.6,
      "lift": 15,
      "gravity": 160,
      "groundBounces": 0
    },
    "frost": {
      "drag": 0.08,
      "lift": 0,
      "gravity": 12,
      "groundBounces": 0
    },
    "ricochet": {
      "drag": 0.08,
      "lift": 15,
      "gravity": 80,
      "groundBounces": 2
    }
  },
  "waveRecoveryRelief": [
    0.8,
    0.9,
    0.95
  ],
  "waveEarlyHealth": [
    0.55,
    0.7,
    0.85
  ],
  "environmentTimings": {
    "season": 300000,
    "day": 120000,
    "dusk": 60000,
    "night": 120000,
    "weather": 120000
  },
  // 正式历法五分钟一天、一日一季；白昼、黄昏、夜晚保留原有 3:1:2 比例。
  "calendarTimings": {
    "day": 150000,
    "dusk": 50000,
    "night": 100000,
    "season": 300000
  },
  "dayPhases": [
    {
      "id": "day"
    },
    {
      "id": "dusk"
    },
    {
      "id": "night"
    }
  ]
};
