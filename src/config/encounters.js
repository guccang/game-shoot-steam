// 地图遭遇独立于波次：仅移动时累计等待，每次一只，限制周围额外战斗密度。
export const ENCOUNTERS = Object.freeze({ minSeconds: 2, maxSeconds: 4, maxAlive: 14, retrySeconds: 1, minDistance: 200, maxDistance: 340 });

// 地图遭遇使用当地基础属性，不随怪潮波数、死亡减压或波次名额成长。
export const ENCOUNTER_DIFFICULTY = Object.freeze({ health: 1, damage: 1, speed: 1, rankBonus: 0, rankCap: .999 });
