// 季节天气分布共用于自动天气和图片随机切换，不影响战斗随机序列。
import { normalizeSeason } from './seasons.js';
export const SEASON_WEATHER_WEIGHTS = {
  spring: { sun:50, cloud:10, rain:35, thunder:5, snow:0 },
  summer: { sun:45, cloud:10, rain:35, thunder:10, snow:0 },
  autumn: { sun:55, cloud:25, rain:18, thunder:2, snow:0 },
  winter: { sun:20, cloud:15, rain:5, thunder:0, snow:60 },
};
// 排除当前天气后重新归一化权重；明确选择仍允许非当季天气。
export function chooseSeasonWeather(season,current,random=Math.random) {
  const choices=Object.entries(SEASON_WEATHER_WEIGHTS[normalizeSeason(season)]).filter(([id,weight])=>id!==current&&weight>0);
  const total=choices.reduce((sum,[,weight])=>sum+weight,0);
  let roll=Math.max(0,Math.min(.999999,Number(random())||0))*total;
  for(const [id,weight] of choices) { if(roll<weight)return id;roll-=weight; }
  return choices.at(-1)?.[0]||current;
}

// 雨天与雷雨都产生降雨，阴天和降雪不按雨水处理。
export function isRainWeather(weather){return weather==='rain'||weather==='thunder';}
