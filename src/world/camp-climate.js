// 地区气候与季节抽签分离，抵达和自然轮换共用同一偏好。
import {REGIONAL_CAMPS} from '../config/regional-camps.js';
import {worldDistance} from './coordinates.js';
import {chooseSeasonWeather} from './season-weather.js';
import {CAMP_CLIMATES,CAMP_CLIMATE_CHANCE,CAMP_CLIMATE_RADIUS} from '../config/camp-climate.js';
export {CAMP_CLIMATES,CAMP_CLIMATE_CHANCE};
// 进入半径1000，离开半径1250，边界小幅移动不会反复抽天气；室内使用门外位置。
export function climateCampAt(game, previous = null) {
  if (game.mapId !== 'forest' || game.realm || game.story) return null;
  const position = game.cottage?.outside || game.player;
  const held = REGIONAL_CAMPS.find(c => c.id === previous);
  if (held && worldDistance(position, held) <= CAMP_CLIMATE_RADIUS.leave) return held.id;
  return REGIONAL_CAMPS.find(c => worldDistance(position, c) <= CAMP_CLIMATE_RADIUS.enter)?.id || null;
}
// 主气候可连续出现，不排除当前天气，以免每轮强制破坏当地特色。
export function chooseCampWeather(season, camp, current = null, random = Math.random) {
  const preferred = CAMP_CLIMATES[camp];
  if (preferred && random() < CAMP_CLIMATE_CHANCE) return preferred;
  return chooseSeasonWeather(season, preferred || current, random);
}
// 仅跨地区时抽取一次；离开后回到当季天气，传送抵达同样有效。
export function updateCampClimate(environment, game, now = Date.now(), random = Math.random) {
  const camp = climateCampAt(game, environment.climateCamp);
  if (camp === (environment.climateCamp || null)) return false;
  environment.climateCamp = camp;
  environment.weather = chooseCampWeather(environment.forestSeason, camp, null, random);
  environment.weatherAt = now;return true;
}
