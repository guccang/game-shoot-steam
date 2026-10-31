import { i18nText } from "../i18n/index.js";
// 秘境沿用主场景地形，仅叠加可活动区域边界与守护方格。
import { drawGuardianGround } from './guardian.js';
import { REALMS } from '../config/realms.js';
import { oval } from './primitives.js';
import {drawRaceGround} from './forest-race.js';
import { drawFootballGround } from './slime-football.js';
// 边界不遮盖原森林；虚线与内侧光带标示三倍面积的活动范围。
export function drawRealmGround(c, view, realm, time, reduced) {
  if(realm.mode==='race'){drawRaceGround(c,realm,time,reduced);return;}
  if(realm.mode==='football'){drawFootballGround(c,realm,time,reduced);return;}
  const a = realm.arena;
  if (!a) throw Error(i18nText("rendering.realms.3a3c47bdf1"));
  c.save();
  c.beginPath(); c.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
  c.strokeStyle = '#fff0bc66'; c.lineWidth = 12; c.stroke();
  c.strokeStyle = REALMS[realm.mode].color; c.lineWidth = 3;
  c.setLineDash([12, 10]); c.stroke(); c.setLineDash([]);
  c.restore();
  if (realm.mode === 'guardian') drawGuardianGround(c, view, realm, time);
}
// 女神分层绘制：底座接触阴影、裙摆暗面、发冠与光环，受击闪白。
export function drawGoddess(c, goddess, time, reduced) {
  const { x, y } = goddess;
  c.save(); c.translate(x, y);
  oval(c, 4, 8, 44, 18, '#3c6c6160');
  oval(c, 0, 2, 34, 18, '#7b9590', '#4b6b66', 2);
  oval(c, 0, -5, 34, 16, '#dce2c7', '#7d9b8c', 2);
  oval(c, 0, -7, 26, 11, '#b4ccbc', '#f6efd1', 2);
  c.strokeStyle = '#f8e9a4'; c.lineWidth = 3;
  c.beginPath(); c.arc(0, -64, 26, 0, Math.PI * 2); c.stroke();
  c.fillStyle = goddess.flash > 0 ? '#fff6df' : '#f0ecd3'; c.strokeStyle = '#688e83'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-10, -48); c.quadraticCurveTo(-12, -25, -23, -11);
  c.quadraticCurveTo(0, -1, 23, -11); c.lineTo(10, -48); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#a3c7b7'; c.beginPath(); c.moveTo(3, -45); c.lineTo(21, -11); c.lineTo(6, -8); c.closePath(); c.fill();
  oval(c, 0, -57, 13, 16, '#f4debe', '#688e83', 2);
  c.fillStyle = '#c2d8c4'; c.beginPath(); c.moveTo(-14, -57); c.quadraticCurveTo(-15, -81, 7, -73); c.quadraticCurveTo(19, -68, 14, -48); c.lineTo(6, -65); c.lineTo(-5, -59); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#668e85'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -54); c.lineTo(-2, -54); c.moveTo(3, -54); c.lineTo(7, -54); c.stroke();
  const bob = reduced ? 0 : Math.sin(time * 2) * 2;
  oval(c, 0, -35 + bob, 7, 7, '#dcffff', '#7cc8be', 2);
  c.fillStyle = '#476c63'; c.fillRect(-30, 20, 60, 6);
  c.fillStyle = goddess.hp < 180 ? '#d58b72' : '#95e5be';
  c.fillRect(-29, 21, 58 * Math.max(0, goddess.hp / goddess.maxHp), 4);
  c.restore();
}
